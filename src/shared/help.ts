import { Channel } from 'discord.js';

export const helpGuild = (prefix: string): string => {
    return (
        `\
Commands:
(Anything within square brackets \`[]\` is optional)\
        ` +
        '```' +
        `\
${prefix}help
    Get help.

${prefix}ping
    Ping the bot.

${prefix}reacts
    Get current reactions in the channel.

${prefix}settime HOUR:MINUTE
    Set time to collect reactions.
    Make sure to use 24 hour time, and to include both hour and minute!

${prefix}deletetime
    Cancel reaction collection in this channel.

${prefix}addadmin @person1 [@person2...]
    Add person(s) to admins

${prefix}deleteadmin @person1 [@person2...]
    Delete person(s) from admins

${prefix}listadmins
    List the currently added admins\
` +
        '```'
    );
};
