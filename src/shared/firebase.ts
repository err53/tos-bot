import admin = require('firebase-admin');
import * as Discord from 'discord.js';
import { CronJob } from 'cron';
import { ScheduleTask } from './task';
import { Bot } from '../bot';

// const db = admin.firestore();
// const tasksRef = db.collection('tasks');
// const guildsRef = db.collection('guilds');

export const InitializeFirebase = (service_account: admin.ServiceAccount): admin.app.App => {
    return admin.initializeApp({
        credential: admin.credential.cert(service_account),
    });
};

// Restore Tasks
export const RestoreTasks = async (
    reactionLookbackLimit: number,
    client: Discord.Client,
    timezone: string,
    firebaseApp: admin.app.App,
): Promise<Map<string, CronJob>> => {
    // Firebase Vars
    const db = admin.firestore(firebaseApp);
    const guildsRef = db.collection('guilds');

    const bot = new Bot();

    // TODO: switch tasks to new bot format
    // TODO: setup new firebase structure

    return guildsRef.get().then((snapshot) => {
        bot = snapshot.map((guild) => {
            return {
                guild.id,
                {
                    guild.
                }
            };
        });
    });

    // return tasksRef.get().then((snapshot) => {
    //     console.log(snapshot);

    //     snapshot.forEach((doc) => {
    //         client.channels.fetch(doc.id).then(async (channel: Discord.TextChannel) => {
    //             // tasks[doc.id] = await scheduleTask(doc.data().minute, doc.data().hour, channel);
    //             const newTask = await ScheduleTask(
    //                 reactionLookbackLimit,
    //                 doc.data().minute,
    //                 doc.data().hour,
    //                 channel,
    //                 timezone,
    //             );
    //             newTask.start();
    //             tasks.set(doc.id, newTask);
    //         });
    //     });
    //     return tasks;
    // });
};

export const HasAdminRole = async (guildMember: Discord.GuildMember, firebaseApp: admin.app.App): Promise<boolean> => {
    // Firebase Vars
    const db = admin.firestore(firebaseApp);
    const guildsRef = db.collection('guilds');

    const userRef = guildsRef.doc(guildMember.guild.id).collection('users').doc(guildMember.id);
    const doc = await userRef.get();
    if (!doc.exists) {
        return false;
    } else {
        //   console.log(doc.id, "=>", doc.data());
        //   console.log(doc.data().admin);
        if (doc.data()?.admin) {
            return true;
        }
    }
    return false;
};

export const DeleteTask = async () => {};
