// Load config
import config = require('config');
// Load dependencies
import Discord = require('discord.js');
import { CronJob } from 'cron';
import { InitializeFirebase, RestoreTasks } from './shared/firebase';

// Tasks Init
// let tasks: Map<string, CronJob>;

// Init State

export class Bot {
    guilds: Discord.Collection<
        Discord.Snowflake,
        {
            channels: Discord.Collection<
                Discord.Snowflake,
                {
                    reactionsTasks: Array<CronJob>;
                }
            >;
            users: Discord.Collection<
                Discord.Snowflake,
                {
                    admin: boolean;
                }
            >;
        }
    >;
}

const bot = new Bot();

// Create client instance
const client = new Discord.Client({
    partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
});

// Initialize App
client.login(config.get('token'));
const firebaseApp = InitializeFirebase(config.get('service_account'));

// Log once client is ready
client.once('ready', async () => {
    console.log('Discord is ready!');
    await RestoreTasks(config.get('reactionLookbackLimit'), client, config.get('timezone'));
});

client.on('message', async (message) => {
    const prefix: string = config.get('prefix');
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    // console.log(args);
    // console.log(command);
    // add check for guild message here, then redirect to guild cmds
    // console.log(tasks);
});
