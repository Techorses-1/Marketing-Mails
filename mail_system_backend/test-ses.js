require("dotenv").config();
const { sendEmail } = require("./providers/ses/ses.service");

const runTest = async () => {
    try {
        const result = await sendEmail({
            to: "meetkoladiya857@gmail.com",   // put a real email you can check
            fromName: "Techorses",
            fromEmail: "ashish@techorses.com",
            replyTo: "sodagaramaanwork@gmail.com",
            subject: "Test from my Node backend",
            html: "<h1>Hello!</h1><p>This test email was sent via my own SES service code.</p>",
            text: "Hello! This test email was sent via my own SES service code."
        });

        console.log("Email sent successfully! Message ID:", result.messageId);
    } catch (error) {
        console.error("Failed to send email:", error.message);
    }
};

runTest();