// Load config
import config = require('config');
// Load dependencies
import Discord = require('discord.js');
import cron = require('cron');
const CronJob = cron.CronJob;
import admin = require('firebase-admin');

admin.initializeApp({
    credential: admin.credential.cert(config.get('service_account')),
});

const db = admin.firestore();
const tasksRef = db.collection('tasks');
const guildsRef = db.collection('guilds');

// Tasks Init
const tasks = {};

// Create client instance
const client = new Discord.Client({
    partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
});

// Get Reactions Function
const getReactions = async (datetime: Date, channel: Discord.TextChannel | Discord.DMChannel | Discord.NewsChannel) => {
    await channel.send(
        `These are the reactions on ${datetime.toLocaleString(config.get('locale'), {
            timeZone: config.get('timezone'),
        })}\n`,
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

            // Format content
            let content = message.cleanContent;
            content = content.length < 100 ? content : content.substring(0, 100) + '...';
            content = content.replace('\n', ' ');
            content = content.replace(/(?:\*|_|#)/g, '');

            let messageOutput = `**${content}:**\n`;
            await Promise.all(
                message.reactions.cache.map(async (reaction: Discord.MessageReaction) => {
                    if (reaction.partial) {
                        await tryGetObject(reaction);
                    }

                    let reactionOutput = `\t${reaction.emoji.toString()}\n`;

                    const users = await reaction.users.fetch();
                    users.map((user) => {
                        reactionOutput += `\t\t${user.toString()}\n`;
                    });
                    messageOutput += reactionOutput;
                }),
            );
            await channel.send(messageOutput);
            console.log(messageOutput);
        }),
    );
};

// Schedule Task Function
const scheduleTask = async (
    minute: number,
    hour: number,
    channel: Discord.TextChannel | Discord.DMChannel | Discord.NewsChannel,
) => {
    console.log(
        `Task scheduled in channel ${channel} on ${hour.toString().padStart(2, '0')}:${minute
            .toString()
            .padStart(2, '0')}`,
    );
    return new CronJob(
        `0 ${minute} ${hour} * * *`,
        async () => {
            const datetime = new Date();
            await getReactions(datetime, channel);
        },
        null,
        true,
        config.get('timezone'),
    );
};

const tryGetObject = async (object: Discord.Message | Discord.MessageReaction) => {
    try {
        await object.fetch();
    } catch (err) {
        console.error(`Error fetching ${typeof object}: `, err);
    }
};

const isAdmin = (guildMember: Discord.GuildMember) => {
    if (
        guildMember.permissions.has('MANAGE_CHANNELS') ||
        guildMember.permissions.has('MANAGE_GUILD') ||
        guildMember.permissions.has('MANAGE_ROLES')
    )
        return true;
    const userRef = guildsRef.doc(guildMember.guild.id).collection('users').doc(guildMember.id);
    return userRef.get().then((doc) => {
        if (!doc.exists) {
            return false;
        } else {
            //   console.log(doc.id, "=>", doc.data());
            //   console.log(doc.data().admin);
            if (doc.data().admin) {
                return true;
            }
        }
    });
};

// Start App Function
const startApp = async () => {
    tasksRef.get().then((snapshot) => {
        // console.log(snapshot);
        snapshot.forEach((doc) => {
            client.channels.fetch(doc.id).then(async (channel: Discord.TextChannel) => {
                tasks[doc.id] = await scheduleTask(doc.data().minute, doc.data().hour, channel);
                tasks[doc.id].start();
            });
        });
    });
};

// Log once client is ready
client.once('ready', async () => {
    await startApp().then(() => {
        console.log('Ready!');
    });
});

client.on('message', async (message) => {
    const prefix: string = config.get('prefix');
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();

    // console.log(args);
    // console.log(command);
    if (command == 'ping') {
        message.channel.send('Pong!');
    }

    if (command == 'help') {
        message.channel.send(`\
\`\`\`
${prefix}help
\t Get help.

${prefix}ping
\t Ping the bot.

${prefix}reacts
\t Get current reactions in the channel.

${prefix}settime HOUR:MINUTE
\t Set time to collect reactions.
\t Make sure to use 24 hour time, and to include both hour and minute!

${prefix}deletetime
\t Cancel reaction collection in this channel.

${prefix}addadmin @person1 [@person2...]
\t Add person(s) to admins

${prefix}deleteadmin @person1 [@person2...]
\t Delete person(s) from admins

${prefix}listadmins
\t List the currently added admins
\`\`\``);
    }

    if (command == 'reacts') {
        const datetime = new Date();
        await getReactions(datetime, message.channel);
    }

    const adminCommands = ['settime', 'deletetime', 'addadmin', 'removeadmin', 'listadmins'];
    if (isAdmin(message.member)) {
        if (command == 'settime') {
            // Check if time pas passed in
            if (typeof args[0] === 'undefined') {
                message.channel.send('Error! No time provided!');
                return;
            }

            // Parse time
            let hour, minute;
            if (args[0].includes(':')) {
                [hour, minute] = args[0].split(':');
            } else if (!isNaN(Number(args[0]))) {
                hour = args[0];
                minute = typeof args[1] === 'undefined' ? 0 : args[1];
            } else {
                message.channel.send('Error! Invalid time provided!');
                return;
            }

            console.log(hour, minute);

            // Stop and delete old tasks
            if (typeof tasks[message.channel.id] !== 'undefined') {
                tasks[message.channel.id].stop();
                delete tasks[message.channel.id];
            }

            // Schedule and start task
            tasks[message.channel.id] = await scheduleTask(minute, hour, message.channel);
            tasks[message.channel.id].start();

            // Save to Firebase
            tasksRef.doc(message.channel.id).set({
                hour: hour,
                minute: minute,
            });

            message.channel.send(
                `Reaction collection has been set for ${hour.toString().padStart(2, '0')}:${minute
                    .toString()
                    .padStart(2, '0')}`,
            );
        }
        if (command == 'deletetime') {
            let output = 'Reaction collection has been canceled in this channel!';
            if (typeof tasks[message.channel.id] === 'undefined') {
                output = 'There is no reaction colection scheduled in this channel!';
            } else {
                tasks[message.channel.id].stop();
                delete tasks[message.channel.id];
                tasksRef.doc(message.channel.id).delete();
                // Add firebase delete here
            }
            message.channel.send(output);
        }
        if (command == 'addadmin') {
            if (message.mentions.members.size == 0) {
                message.channel.send('No members selected!');
                return;
            }
            message.mentions.members.each((member) => {
                const guild = message.guild.id;
                const userRef = guildsRef.doc(guild).collection('users').doc(member.id);
                userRef.set({
                    admin: true,
                });
                message.channel.send(`${member} is now an admin!`);
            });
        }
        if (command == 'removeadmin') {
            if (message.mentions.members.size == 0) {
                message.channel.send('No members selected!');
                return;
            }
            message.mentions.members.each((member) => {
                const guild = message.guild.id;
                const userRef = guildsRef.doc(guild).collection('users').doc(member.id);
                userRef.set({
                    admin: false,
                });
                message.channel.send(`${member} is no longer an admin!`);
            });
        }
        if (command == 'listadmins') {
            const guildId = message.guild.id;
            guildsRef
                .doc(guildId)
                .collection('users')
                .where('admin', '==', true)
                .get()
                .then((snapshot) => {
                    if (snapshot.empty) {
                        message.channel.send('There are no additional added admins on this server.');
                        return;
                    }
                    message.channel.send('These are the added admins in this server: ');
                    snapshot.forEach((doc) => {
                        message.guild.members.fetch(doc.id).then((guildMember) => {
                            console.log(guildMember.toString());
                            message.channel.send(guildMember.toString());
                        });
                    });
                })
                .catch((err) => {
                    message.channel.send('There was an error completing your request.');
                    console.log('Error getting documents', err);
                });
        }
    } else if (adminCommands.includes(command)) {
        message.channel.send("You don't have permission to do this!");
    }
    console.log(tasks);
});
client.login(config.get('token'));
