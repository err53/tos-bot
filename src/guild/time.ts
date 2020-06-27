import admin = require('firebase-admin');
const tasksRef = db.collection('tasks');

export const SetTime = (bot, message, hour, minute): void => {
    console.log(hour, minute);

    // TODO: Switch old tasks system to new bot system
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
};

export const DeleteTime = () => {
    //     tasks[message.channel.id].stop();
    //     delete tasks[message.channel.id];
    //     tasksRef.doc(message.channel.id).delete();
};
