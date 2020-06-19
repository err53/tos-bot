// Load config
const config = require("config");
// Load dependencies
const Discord = require("discord.js");
const CronJob = require("cron").CronJob;
const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert(config.get("service_account")),
});

let db = admin.firestore();

// Create client instance
const client = new Discord.Client({
  partials: ["MESSAGE", "CHANNEL", "REACTION"],
});

// Get Reactions Function
let getReactions = async (datetime, channel) => {
  if (channel.partial) {
    await tryGetObject(channel);
  }

  await channel.send(
    `These are the reactions on ${datetime.toLocaleString(
      config.get("locale"),
      {
        timeZone: config.get("timezone"),
      }
    )}\n`
  );
  let messages = await channel.messages.fetch({ limit: 100 });

  messages = messages.filter((message) => {
    return message.reactions.cache.size != 0 && !message.author.bot;
  });

  await Promise.all(
    messages.map(async (message) => {
      if (message.partial) {
        await tryGetObject(message);
      }

      let content = message.cleanContent;
      content =
        content.length < 100 ? content : content.substring(0, 100) + "...";
      content = content.replace("\n", " ");
      content = content.replace(/(?:\*|_|#)/g, "");
      let messageOutput = `**${content}:**\n`;
      await Promise.all(
        message.reactions.cache.map(async (reaction) => {
          if (reaction.partial) {
            await tryGetObject(reaction);
          }

          let reactionOutput = `\t${reaction.emoji}\n`;

          let users = await reaction.users.fetch();
          users.map((user) => {
            reactionOutput += `\t\t${user.username}\n`;
          });
          messageOutput += reactionOutput;
        })
      );
      await channel.send(messageOutput);
      console.log(messageOutput);
    })
  );
};

// Tasks Init
let tasks = {};
let tasksRef = db.collection("tasks");

// Schedule Task Function
let scheduleTask = async (minute, hour, channel) => {
  console.log(
    `Task scheduled in channel ${channel} on ${hour
      .toString()
      .padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
  );
  return new CronJob(
    `0 ${minute} ${hour} * * *`,
    async () => {
      let datetime = new Date();
      await getReactions(datetime, channel);
    },
    null,
    true,
    config.get("timezone")
  );
};

let tryGetObject = async (object) => {
  try {
    await object.fetch();
  } catch (err) {
    console.error(`Error fetching ${typeof object}: `, err);
  }
};

// Start App Function
let startApp = async () => {
  tasksRef.get().then((snapshot) => {
    console.log(snapshot);
    snapshot.forEach((doc) => {
      client.channels.fetch(doc.id).then(async (channel) => {
        if (channel.partial) {
          await tryGetObject(channel);
        }
        tasks[doc.id] = await scheduleTask(
          doc.data().minute,
          doc.data().hour,
          channel
        );
        tasks[doc.id].start();
      });
    });
  });
};

// Log once client is ready
client.once("ready", async () => {
  await startApp();
  console.log("Ready!");
});

client.on("message", async (message) => {
  if (!message.content.startsWith(config.get("prefix")) || message.author.bot)
    return;

  const args = message.content.slice(config.get("prefix").length).split(/ +/);
  const command = args.shift().toLowerCase();

  // console.log(args);
  // console.log(command);
  if (command == "ping") {
    message.channel.send("Pong!");
  }

  if (command == "help") {
    message.channel.send(`\
Thank you for trying TOS Bot!
\`\`\`
${config.get("prefix")}help: Get help.
${config.get("prefix")}ping: Ping the bot.
${config.get("prefix")}reacts: Get current reactions in the channel.
${config.get(
  "prefix"
)}settime HOUR MINUTE: Set time to collect reactions in this channel.
\t Separate hour and minute using a space or a colon. Make sure to use 24 hour time!
${config.get("prefix")}deletetime: Cancel reaction collection in this channel.
\`\`\``);
  }

  if (command == "reacts") {
    let datetime = new Date();
    await getReactions(datetime, message.channel);
  }
  if (command == "settime") {
    if (!message.member.permissions.has("MANAGE_GUILD")) {
      message.channel.send("You don't have permission to do this!");
    } else {
      // Check if time pas passed in
      if (typeof args[0] === "undefined") {
        message.channel.send("Error! No time provided!");
        return;
      }

      // Parse time
      let hour, minute;
      if (args[0].includes(":")) {
        [hour, minute] = args[0].split(":");
      } else if (!isNaN(args[0])) {
        hour = args[0];
        minute = typeof args[1] === "undefined" ? 0 : args[1];
      } else {
        message.channel.send("Error! Invalid time provided!");
        return;
      }

      console.log(hour, minute);

      // Stop and delete old tasks
      if (typeof tasks[message.channel.id] !== "undefined") {
        tasks[message.channel.id].stop();
        delete tasks[message.channel.id];
      }

      // Schedule and start task
      tasks[message.channel.id] = await scheduleTask(
        minute,
        hour,
        message.channel
      );
      tasks[message.channel.id].start();

      // Save to Firebase
      tasksRef.doc(message.channel.id).set({
        hour: hour,
        minute: minute,
      });

      message.channel.send(
        `Reaction collection has been set for ${hour
          .toString()
          .padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
      );
    }
  }
  if (command == "deletetime") {
    if (!message.member.permissions.has("MANAGE_GUILD")) {
      message.channel.send("You don't have permission to do this!");
    } else {
      let output = "Reaction collection has been canceled in this channel!";
      if (typeof tasks[message.channel.id] === "undefined") {
        output = "There is no reaction colection scheduled in this channel!";
      } else {
        tasks[message.channel.id].stop();
        delete tasks[message.channel.id];
        tasksRef.doc(message.channel.id).delete();
        // Add firebase delete here
      }
      message.channel.send(output);
    }
  }
  console.log(tasks);
});
client.login(config.get("token"));
