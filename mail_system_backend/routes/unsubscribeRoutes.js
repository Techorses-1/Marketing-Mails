const express = require("express");
const router = express.Router();
const Contact = require("../models/contact");

// GET /unsubscribe/:contactId - one-click unsubscribe, shows a simple confirmation page
router.get("/:contactId", async (req, res) => {
    try {
        const { contactId } = req.params;

        const contact = await Contact.findOne({ contactId });

        if (!contact) {
            return res.status(404).send(`
        <html>
          <body style="font-family: sans-serif; text-align: center; padding: 40px;">
            <h2>Contact not found</h2>
            <p>This unsubscribe link is invalid.</p>
          </body>
        </html>
      `);
        }

        if (contact.status !== "UNSUBSCRIBED") {
            contact.status = "UNSUBSCRIBED";
            await contact.save();
        }

        res.status(200).send(`
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 40px;">
          <h2>You've been unsubscribed</h2>
          <p>${contact.email} will no longer receive emails from us.</p>
        </body>
      </html>
    `);
    } catch (error) {
        console.error("Unsubscribe error:", error);
        res.status(500).send(`
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 40px;">
          <h2>Something went wrong</h2>
          <p>Please try again later.</p>
        </body>
      </html>
    `);
    }
});

module.exports = router;