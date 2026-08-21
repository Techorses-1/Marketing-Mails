const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Contact = require("../models/contact");
const List = require("../models/list");
const Campaign = require("../models/campaign");

const auth = async (req, res, next) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({ message: "No token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ userId: decoded.userId });

        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("Auth middleware error:", error);
        res.status(401).json({ message: "Invalid token" });
    }
};

// Safe percentage helper - avoids divide-by-zero showing NaN
const percent = (part, whole) => {
    if (!whole || whole === 0) return 0;
    return Math.round((part / whole) * 1000) / 10; // one decimal place
};

// GET /dashboard - all aggregate stats in one response
router.get("/", auth, async (req, res) => {
    try {
        // Run every independent query in parallel instead of sequentially -
        // this is the main optimization since none of these depend on each other
        const [
            contactStatusCounts,
            totalLists,
            campaignTotals,
            recentCampaigns
        ] = await Promise.all([
            // Single aggregate query groups contacts by status in one pass,
            // instead of 4-5 separate countDocuments() calls
            Contact.aggregate([
                { $group: { _id: "$status", count: { $sum: 1 } } }
            ]),

            List.countDocuments(),

            // Single aggregate sums every campaign statistic across all campaigns
            // in one database round-trip instead of fetching every campaign document
            Campaign.aggregate([
                {
                    $group: {
                        _id: null,
                        totalCampaigns: { $sum: 1 },
                        completedCampaigns: {
                            $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] }
                        },
                        totalAttempted: { $sum: "$statistics.attempted" },
                        totalSent: { $sum: "$statistics.sent" },
                        totalDelivered: { $sum: "$statistics.delivered" },
                        totalBounced: { $sum: "$statistics.bounced" },
                        totalComplained: { $sum: "$statistics.complained" },
                        totalOpened: { $sum: "$statistics.opened" },
                        totalClicked: { $sum: "$statistics.clicked" }
                    }
                }
            ]),

            // Only fetch the fields actually needed for the recent-campaigns list,
            // not the full document (skips subject/html/attachments payload)
            Campaign.find(
                {},
                { name: 1, status: 1, statistics: 1, createdAt: 1, campaignId: 1 }
            )
                .sort({ createdAt: -1 })
                .limit(5)
        ]);

        // Turn the grouped array [{_id: "ACTIVE", count: 10}, ...] into a lookup object
        const statusMap = {};
        let totalContacts = 0;
        contactStatusCounts.forEach((row) => {
            statusMap[row._id] = row.count;
            totalContacts += row.count;
        });

        const activeContacts = statusMap.ACTIVE || 0;
        const bouncedContacts = statusMap.BOUNCED || 0;
        const complainedContacts = statusMap.COMPLAINED || 0;
        const unsubscribedContacts = statusMap.UNSUBSCRIBED || 0;
        const invalidContacts = statusMap.INVALID || 0;
        const suppressedContacts = bouncedContacts + complainedContacts + unsubscribedContacts + invalidContacts;

        const totals = campaignTotals[0] || {
            totalCampaigns: 0,
            completedCampaigns: 0,
            totalAttempted: 0,
            totalSent: 0,
            totalDelivered: 0,
            totalBounced: 0,
            totalComplained: 0,
            totalOpened: 0,
            totalClicked: 0
        };

        res.status(200).json({
            overview: {
                totalContacts,
                activeContacts,
                suppressedContacts,
                totalLists,
                totalCampaigns: totals.totalCampaigns,
                completedCampaigns: totals.completedCampaigns,
                totalEmailsSent: totals.totalSent
            },
            deliverability: {
                deliveryRate: percent(totals.totalDelivered, totals.totalSent),
                bounceRate: percent(totals.totalBounced, totals.totalSent),
                complaintRate: percent(totals.totalComplained, totals.totalSent)
            },
            engagement: {
                openRate: percent(totals.totalOpened, totals.totalDelivered),
                clickRate: percent(totals.totalClicked, totals.totalDelivered)
            },
            suppressionBreakdown: {
                bounced: bouncedContacts,
                complained: complainedContacts,
                unsubscribed: unsubscribedContacts,
                invalid: invalidContacts
            },
            recentCampaigns
        });
    } catch (error) {
        console.error("Dashboard fetch error:", error);
        res.status(500).json({ message: "Failed to load dashboard", error: error.message });
    }
});

module.exports = router;