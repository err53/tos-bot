import * as Discord from 'discord.js';
import { HasAdminRole } from './firebase';

export const isAdmin = async (guildMember: Discord.GuildMember): Promise<boolean> => {
    if (
        guildMember.permissions.has('MANAGE_CHANNELS') ||
        guildMember.permissions.has('MANAGE_GUILD') ||
        guildMember.permissions.has('MANAGE_ROLES')
    )
        return true;
    return await HasAdminRole(guildMember);
};

export const RunAdminCommand = async (
    guildMember: Discord.GuildMember,
    channel: Discord.TextChannel,
    callback: () => void,
): Promise<() => void> => {
    if (isAdmin(guildMember)) {
        return callback;
    } else {
        return () => {
            channel.send("You don't have permissions to run this command!");
        };
    }
};
