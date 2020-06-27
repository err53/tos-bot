import Discord = require('discord.js');
import GetChannelReactions from '../shared/get-reactions';
import { helpGuild } from '../shared/help';
import { isAdmin, RunAdminCommand } from '../shared/admin';
import admin = require('firebase-admin');
import { Bot } from '../bot';

const guildCommands = async (
    reactionLookbackLimit: number,
    message: Discord.Message & { member: Discord.GuildMember; channel: Discord.TextChannel; guild: Discord.Guild },
    prefix: string,
    locale: string,
    timezone: string,
    guildsRef: admin.firestore.CollectionReference,
    bot: Bot,
    firebaseApp: admin.app.App,
): Promise<void> => {
    const adminCommands = ['settime', 'deletetime', 'addadmin', 'removeadmin', 'listadmins'];

    const args = message.content.slice(prefix.length).split(/ +/);
    if (typeof args === 'undefined') {
        message.channel.send('Error, please specify an argument!');
        return;
    }

    const command = args.shift()?.toLowerCase() ?? '';

    if (!adminCommands.includes(command)) {
        // normal command
    } else if (isAdmin(message.member)) {
        // admin commands
    } else {
        // user does not have permission
    }

    switch (command) {
        case 'help': {
            message.channel.send(helpGuild(prefix));
            break;
        }
        case 'ping': {
            message.channel.send('Pong!');
            break;
        }
        case 'reacts': {
            const newMessages = await GetChannelReactions(
                reactionLookbackLimit,
                locale,
                timezone,
                new Date(),
                message.channel,
            );
            newMessages.forEach((newMessage) => {
                message.channel.send(newMessage);
            });
            break;
        }
        case 'settime': {
            RunAdminCommand(message.member, message.channel, () => {
                // Check if time pas passed in
                if (typeof args[0] === 'undefined') {
                    message.channel.send('Error! No time provided!');
                    return;
                }

                // Parse time
                let hour, minute;
                if (args[0].includes(':')) {
                    [hour, minute] = args[0].split(':');
                } else {
                    message.channel.send('Error! Invalid time provided!');
                    return;
                }
                // Set time
                // TODO: Add code, add error checking

                // Send confirmation message
                message.channel.send(
                    `Reaction collection has been set for ${hour
                        .toString()
                        .padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
                );
            });
            break;
        }
        case 'deletetime': {
            RunAdminCommand(message.member, message.channel, () => {
                // TODO: Broken, port to new class system
                let output = 'Reaction collection has been canceled in this channel!';
                if (typeof bot.guilds.get(message.guild.id)?.channels.get(message.channel.id) === 'undefined') {
                    output = 'There is no reaction colection scheduled in this channel!';
                } else {
                }
                // if (typeof tasks[message.channel.id] === 'undefined') {
                //     output = 'There is no reaction colection scheduled in this channel!';
                // } else {

                //     // Add firebase delete here
                // }
                message.channel.send(output);
            });
            break;
        }
        case 'addadmin': {
            RunAdminCommand(message.member, message.channel, () => {
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
                break;
            });
        }
        case 'removeadmin': {
            RunAdminCommand(message.member, message.channel, () => {
                if (message.mentions.members) {
                    const members = message.mentions.members;
                    if (members.size == 0) {
                        message.channel.send('No members selected!');
                    } else {
                        members.each((member) => {
                            const guild = message.guild.id;
                            const userRef = guildsRef.doc(guild).collection('users').doc(member.id);
                            userRef.set({
                                admin: false,
                            });
                            message.channel.send(`${member} is no longer an admin!`);
                        });
                    }
                }
            });
        }
        case 'listadmins': {
            RunAdminCommand(message.member, message.channel, () => {
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
            });
            break;
        }
        default: {
            message.channel.send('Invalid Command!');
        }
    }
};

export default guildCommands;
