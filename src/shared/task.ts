import * as Discord from 'discord.js';
import { CronJob } from 'cron';
import GetChannelReactions from './get-reactions';

// Schedule Task Function
export const ScheduleTask = async (
    reactionLookbackLimit: number,
    minute: number,
    hour: number,
    inputChannel: Discord.TextChannel | Discord.DMChannel | Discord.NewsChannel,
    timezone: string,
): Promise<CronJob> => {
    console.log(
        `Task scheduled in channel ${channel} on ${hour.toString().padStart(2, '0')}:${minute
            .toString()
            .padStart(2, '0')}`,
    );
    return new CronJob(
        `0 ${minute} ${hour} * * *`,
        async () => {
            const datetime = new Date();
            const messages = await GetChannelReactions(reactionLookbackLimit, locale, timezone, datetime, inputChannel);
            // await getReactions(datetime, channel);
        },
        null,
        true,
        timezone,
    );
};
