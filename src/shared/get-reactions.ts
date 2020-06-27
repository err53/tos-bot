import Discord = require('discord.js');

const shortenMessage = (content: string): string => {
    return content.length < 100 ? content : content.substring(0, 100) + '...';
};

const removeNewLines = (content: string): string => {
    return content.replace('\n', ' ');
};
const removeMarkdown = (content: string): string => {
    return content.replace(/(?:\*|_|#)/g, '');
};

const getMessage = async (message: Discord.Message): Promise<string> => {
    let messageOutput: string;
    if (message.partial) {
        try {
            await message.fetch();
        } catch (err) {
            console.error('getMessage: ', err);
            return 'There was an error getting this message';
        }
    }

    // Format content
    const content = shortenMessage(removeMarkdown(removeNewLines(message.cleanContent)));

    messageOutput = `**${content}:**\n`;
    await Promise.all(
        message.reactions.cache.map(async (reaction) => {
            messageOutput += await getReaction(reaction);
        }),
    );
    return messageOutput;
};

const getReaction = async (reaction: Discord.MessageReaction): Promise<string> => {
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (err) {
            console.error('getReaction - reaction: ' + err);
            return '\tThere was an error getting this reaction';
        }
    }

    let reactionOutput = `\t${reaction.emoji.toString()}\n`;

    try {
        const users = await reaction.users.fetch();
        users.map((user) => {
            reactionOutput += `\t\t${user.toString()}\n`;
        });
    } catch (err) {
        console.error('getReaction - users: ' + err);
        reactionOutput += '\t\tThere was an error getting the users for this reaction';
    }

    return reactionOutput;
};

const GetChannelReactions = async (
    reactionLookbackLimit: number,
    locale: string,
    timezone: string,
    datetime: Date,
    inputChannel: Discord.TextChannel | Discord.DMChannel | Discord.NewsChannel,
): Promise<Array<string>> => {
    const output = [
        `These are the reactions on ${datetime.toLocaleString(locale, {
            timeZone: timezone,
        })}\n`,
    ];

    let messages = await inputChannel.messages.fetch({ limit: reactionLookbackLimit });

    messages = messages.filter((message) => {
        return message.reactions.cache.size != 0 && !message.author.bot;
    });

    await Promise.all(
        messages.map(async (message) => {
            const messageOutput = await getMessage(message);
            output.push(messageOutput);
            console.log(messageOutput);
        }),
    );
    return output;
};

export default GetChannelReactions;
