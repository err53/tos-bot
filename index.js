// Load dependencies
const Discord = require("discord.js");
const config = require("./config.json");

// Create client instance
const client = new Discord.Client();

// Log once client is ready
client.once("ready", () => {
  console.log("Ready!");
});

client.on("message", async (message) => {
  if (!message.content.startsWith(config.prefix) || message.author.bot) return;

  const args = message.content.slice(config.prefix.length).split(/ +/);
  const command = args.shift().toLowerCase();

  console.log(args);
  console.log(command);
  if (command == "ping") {
    message.channel.send("Pong!");
  }
});

// Login with app token
client.login(config.token);
