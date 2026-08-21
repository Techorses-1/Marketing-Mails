const { Queue } = require("bullmq");
const connection = require("../config/redis");

const emailQueue = new Queue("email-send", { connection });

module.exports = emailQueue;