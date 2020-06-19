// Load Env Vars
require("dotenv").config();

// Load dependencies
const Discord = require("discord.js");
const config = require("./config.json");
const CronJob = require("cron").CronJob;
const fs = require("fs");

// Create client instance
const client = new Discord.Client({
  partials: ["MESSAGE", "CHANNEL", "REACTION"],
});

// Get Reactions Function
let getReactions = async (datetime, channel) => {
  await channel.send(`These are the reactions on ${datetime}\n`);
  let messages = await channel.messages.fetch({ limit: 100 });

  messages = messages.filter((message) => {
    return message.reactions.cache.size != 0 && !message.author.bot;
  });

  await Promise.all(
    messages.map(async (message) => {
      let content = message.cleanContent;
      content =
        content.length < 100 ? content : content.substring(0, 100) + "...";
      content = content.replace("\n", " ");
      content = content.replace(/(?:\*|_|#)/g, "");
      let messageOutput = `**${content}:**\n`;
      await Promise.all(
        message.reactions.cache.map(async (reaction) => {
          if (reaction.partial) {
            try {
              await reaction.fetch();
            } catch (error) {
              console.error("Error fetching reaction: " + error);
            }
          }

          let reactionOutput = `\t${reaction.emoji.toString()}\n`;

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
let state = {};

// Tasks Write Function
let writeTasks = () => {
  fs.writeFileSync(config.statefile, JSON.stringify(state));
};

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
      let datetime = new Date().toString();
      await getReactions(datetime, channel);
    },
    null,
    true,
    config.timezone
  );
};

// Start App Function
let startApp = async () => {
  try {
    let file = fs.readFileSync(config.statefile, { encoding: "utf8" });
    state = JSON.parse(file);
  } catch (err) {
    console.log("State does not exsist! Starting fresh...");
  }

  console.log(state);
  // Initialize tasks from state
  for (var channelId in state) {
    let taskTime = state[channelId];
    console.log(channelId);
    console.log(taskTime);
    let channel = await client.channels.fetch(channelId);
    if (channel.partial) {
      try {
        channel.fetch();
      } catch (err) {
        console.error(
          "Something went wrong when fetching the channel during init: " + err
        );
      }
    }
    tasks[channelId] = await scheduleTask(
      taskTime.minute,
      taskTime.hour,
      channel
    );
    tasks[channelId].start();
  }
};

// Log once client is ready
client.once("ready", async () => {
  await startApp();
  console.log("Ready!");
});

client.on("message", async (message) => {
  if (!message.content.startsWith(config.prefix) || message.author.bot) return;

  const args = message.content.slice(config.prefix.length).split(/ +/);
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
${config.prefix}help: Get help.
${config.prefix}ping: Ping the bot.
${config.prefix}reacts: Get current reactions in the channel.
${config.prefix}settime HOUR MINUTE: Set time to collect reactions in this channel.
\t Separate hour and minute using a space or a colon.
${config.prefix}deletetime: Cancel reaction collection in this channel.
\`\`\``);
  }

  if (command == "reacts") {
    let datetime = new Date().toString();
    await getReactions(datetime, message.channel);
  }
  if (command == "settime") {
    if (!message.member.permissions.has("MANAGE_GUILD")) {
      message.channel.send("You don't have permission to do this!");
    } else {
      if (typeof args[0] === "undefined") {
        message.channel.send("Error! No time provided!");
        return;
      }
      if (typeof tasks[message.channel.id] !== "undefined") {
        tasks[message.channel.id].stop();
        delete tasks[message.channel.id];
      }
      let hour = args[0];
      let minute = typeof args[1] === "undefined" ? 0 : args[1];
      if (typeof hour === "string") {
        if (hour.includes(":")) {
          [hour, minute] = hour.split(":");
        }
      }
      console.log(hour, minute);

      tasks[message.channel.id] = await scheduleTask(
        minute,
        hour,
        message.channel
      );
      tasks[message.channel.id].start();

      state[message.channel.id] = {
        hour: hour,
        minute: minute,
      };
      writeTasks();
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
        delete state[message.channel.id];
        writeTasks();
      }
      message.channel.send(output);
    }
  }
  console.log(tasks);
});
client.login(process.env.TOKEN);
