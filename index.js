// Load dependencies
const Discord = require("discord.js");
const { token } = require("./config");

// Create client instance
const client = new Discord.Client();
const PREFIX = '!';

// Log once client is ready
client.once("ready", () => {
  console.log("Ready!");
});

client.on('message', async message => {
  if (message.content.startsWith(PREFIX)) {
    const input = message.content.slice(PREFIX.length).split(' ');
    
  }
})

// Login with app token
client.login(token);