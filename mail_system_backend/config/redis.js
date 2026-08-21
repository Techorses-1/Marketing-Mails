// const IORedis = require("ioredis");
// require("dotenv").config();

// const connection = new IORedis({
//     host: process.env.REDIS_HOST,
//     port: process.env.REDIS_PORT,
//     maxRetriesPerRequest: null   // required by BullMQ
// });

// connection.on("connect", () => {
//     console.log("Redis connected successfully");
// });

// connection.on("error", (err) => {
//     console.error("Redis connection error:", err);
// });

// module.exports = connection;


const IORedis = require("ioredis");
require("dotenv").config();

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,   // required by BullMQ
  tls: {}                       // required for Upstash's secure connection
});

connection.on("connect", () => {
  console.log("Redis connected successfully");
});

connection.on("error", (err) => {
  console.error("Redis connection error:", err);
});

module.exports = connection;