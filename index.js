// Load dependencies
const Discord = require("discord.js");
const config = require("./config.json");

// Create client instance
const client = new Discord.Client({
  partials: ["MESSAGE", "CHANNEL", "REACTION"],
});

// Log once client is ready
client.once("ready", () => {
  console.log("Ready!");
});

let reactions = {};

let isEmpty = (obj) => {
  return Object.getOwnPropertyNames(obj).length === 0;
};

client.on("message", async (message) => {
  if (!message.content.startsWith(config.prefix) || message.author.bot) return;

  const args = message.content.slice(config.prefix.length).split(/ +/);
  const command = args.shift().toLowerCase();

  console.log(args);
  console.log(command);
  if (command == "ping") {
    message.channel.send("Pong!");
  }
  if (command == "reacts") {
    let output = "These are the reactions for each message\n";
    try {
      for (let messageId in reactions) {
        if (!Object.prototype.hasOwnProperty.call(reactions, messageId))
          continue;

        let local_message = await message.channel.messages.fetch(messageId);

        output += `**${local_message.content}:**\n`;

        let users = reactions[messageId];
        for (let userId in users) {
          if (!Object.prototype.hasOwnProperty.call(users, userId)) continue;

          output += `${(await client.users.fetch(userId)).username}:\n`;

          let emojis = users[userId];
          for (let emoji in emojis) {
            if (!Object.prototype.hasOwnProperty.call(emojis, emoji)) continue;

            output += `\t${emoji}\n`;
          }
        }
      }
    } catch (error) {
      console.log("Something went wrong: ", error);
      // Return as `reaction.message.author` may be undefined/null
      return;
    }
    message.channel.send(output);
  }
});

client.on("messageReactionAdd", async (reaction, user) => {
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.log("Something went wrong when fetching the message: ", error);
      // Return as `reaction.message.author` may be undefined/null
      return;
    }
  }
  console.log(reaction);
  reactions[reaction.message.id] = reactions[reaction.message.id] || {};
  reactions[reaction.message.id][user.id] =
    reactions[reaction.message.id][user.id] || {};

  reactions[reaction.message.id][user.id][reaction.emoji] = true;
  console.log(reactions);
});

client.on("messageReactionRemove", async (reaction, user) => {
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.log("Something went wrong when fetching the message: ", error);
      // Return as `reaction.message.author` may be undefined/null
      return;
    }
  }
  console.log(reaction);
  delete reactions[reaction.message.id][user.id][reaction.emoji];
  if (isEmpty(reactions[reaction.message.id][user.id])) {
    delete reactions[reaction.message.id][user.id];
  }
  if (isEmpty(reactions[reaction.message.id])) {
    delete reactions[reaction.message.id];
  }
  console.log(reactions);
});

client.on("messageDelete", async (message) => {
  if (reactions[message.id]) {
    delete reactions[message.id];
    console.log(reactions);
  }
});

// Login with app token
client.login(config.token);
