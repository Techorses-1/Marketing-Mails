require("dotenv").config();
const emailQueue = require("./queues/emailQueue");

const addTestJob = async () => {
  const job = await emailQueue.add("send-email", {
    to: "sodagaramaan78692@gmail.com",   // put a real email you can check
    fromName: "Techorses",
    fromEmail: "ashish@techorses.com",
    replyTo: "sodagaramaanwork@gmail.com",
    subject: "Test via Queue",
    html: "<h1>Hello from the queue!</h1><p>This email was sent through BullMQ + Redis + SES.</p>",
    text: "Hello from the queue! This email was sent through BullMQ + Redis + SES."
  });

  console.log("Job added to queue with ID:", job.id);
  process.exit(0);
};

addTestJob();