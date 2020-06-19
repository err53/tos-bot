// Load Env Vars
require("dotenv").config();

// Load dependencies
const Discord = require("discord.js");
const config = require("./config.json");

// Custom Vars and Functions
let reactions = {};

let isEmpty = (obj) => {
  return Object.getOwnPropertyNames(obj).length === 0;
};

// Create client instance
const client = new Discord.Client({
  partials: ["MESSAGE", "CHANNEL", "REACTION"],
});

// Log once client is ready
client.once("ready", () => {
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
  if (command == "reacts") {
    let output = "These are the reactions for each message\n";
    let messages = await message.channel.messages.fetch({ limit: 100 });

    messages
      .filter((message) => {
        message.reactions.cache.size != 0;
      })
      .each(async (message) => {
        output += `**${message.content}:**\n`;
        message.reactions.cache.each((reaction) => {
          if (reaction.partial) {
            try {
              reaction.fetch();
            } catch (error) {
              console.error("Error fetching reaction: " + error);
            }
          }

          output += `\t${reaction.emoji.toString()}\n`;

          reaction.users.fetch().then((users) => {
            users.each((user) => {
              output += `\t\t${user.username}\n`;
            });
          });
        });

        // .each(async (selectedMessage) => {
        //   let selectedReactions = selectedMessage.reactions.cache;
        //   if (selectedReactions.size != 0) {
        //     console.log(selectedMessage.content);
        //     output += `**${selectedMessage.content}:**\n`;

        //     selectedReactions.each((reaction) => {
        //       if (reaction.partial) {
        //         try {
        //           reaction.fetch();
        //         } catch (error) {
        //           console.error("Error fetching reaction: " + error);
        //         }
        //       }
        //       // console.log(reaction.emoji.toString());
        //       output += `\t${reaction.emoji.toString()}\n`;

        //       reaction.users.fetch().then((users) => {
        //         users.each((user) => {
        //           // console.log(user.username);
        //           output += `\t\t${user.username}\n`;
        //         });
        //       });
        //     });
        //   }
        // });
      });
    console.log(output);
    await message.channel.send(output);
  }
});

// Login with app token
client.login(process.env.TOKEN);
