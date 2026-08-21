// Pre-designed base templates used by the Template Gallery (Option 3).
// Each html string uses a hybrid responsive layout: fixed 600px table on
// desktop (safe for Outlook/older clients), fluid 100% width on mobile via
// a media query. Placeholders ({{heading}}, {{bodyText}}, {{buttonText}},
// {{buttonLink}}, {{imageUrl}}) are replaced on the frontend before the
// final HTML is submitted to POST /templates.
//
// NOTE: static chrome text (wordmark, "Limited time offer" ribbon, footer
// legal line, etc.) is not tied to a form field yet - it can be edited via
// the "Write HTML" mode after picking a template. If we want these editable
// from the Gallery fill-form too, that needs new fields (logoText, footerText)
// added to TemplateFillForm - flagging for a later pass.

const baseTemplates = [
  {
    id: "newsletter",
    name: "Newsletter",
    description: "Editorial-style layout with a wordmark header, serif headline, and a light footer. Good for weekly digests and updates.",
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  @media only screen and (max-width: 620px) {
    .email-container { width: 100% !important; }
    .email-padding { padding: 32px 22px !important; }
    .email-headline { font-size: 24px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#eef1f0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef1f0;">
<tr><td align="center" style="padding:30px 10px;">
<table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background-color:#fffdf9;border-radius:10px;overflow:hidden;">

<!-- Header / wordmark -->
<tr><td style="padding:26px 40px;border-bottom:1px solid #e4e1d8;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="font-family:Georgia,'Times New Roman',serif;font-size:15px;letter-spacing:1.5px;color:#1a1a2e;text-transform:uppercase;">Techorses</td>
<td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1px;color:#8a8578;text-transform:uppercase;">The Weekly Digest</td>
</tr>
</table>
</td></tr>

<!-- Hero -->
<tr><td class="email-padding" style="padding:44px 40px 8px;">
<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#2c6e6e;text-transform:uppercase;margin-bottom:14px;">This Week</div>
<h1 class="email-headline" style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.3;color:#1a1a2e;font-weight:normal;">{{heading}}</h1>
<div style="width:48px;height:3px;background-color:#c9a227;margin:0 0 22px;"></div>
<p style="margin:0 0 30px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#4a4a4a;">{{bodyText}}</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-bottom:2px solid #1a1a2e;">
<a href="{{buttonLink}}" target="_blank" style="display:inline-block;padding:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#1a1a2e;text-decoration:none;letter-spacing:0.3px;">{{buttonText}} &rarr;</a>
</td></tr></table>
</td></tr>

<!-- Divider -->
<tr><td style="padding:36px 40px 0;">
<div style="border-top:1px solid #e4e1d8;"></div>
</td></tr>

<!-- Footer -->
<tr><td style="padding:22px 40px 30px;">
<p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#8a8578;">Twitter &middot; Instagram &middot; LinkedIn</p>
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#a8a494;">You're receiving this because you subscribed to our updates.</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
  },
  {
    id: "marketing",
    name: "Marketing",
    description: "Bold banner-led layout with a dark header bar, hero image, and strong CTA. Good for product launches and feature announcements.",
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  @media only screen and (max-width: 620px) {
    .email-container { width: 100% !important; }
    .email-padding { padding: 32px 22px !important; }
    .email-banner img { width: 100% !important; height: auto !important; }
    .email-headline { font-size: 24px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#eef1f5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef1f5;">
<tr><td align="center" style="padding:30px 10px;">
<table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background-color:#ffffff;border-radius:10px;overflow:hidden;">

<!-- Header bar -->
<tr><td style="padding:20px 40px;background-color:#101828;">
<span style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;letter-spacing:1px;color:#ffffff;text-transform:uppercase;">Techorses</span>
</td></tr>

<!-- Hero banner -->
<tr><td class="email-banner">
<img src="{{imageUrl}}" width="600" alt="" style="display:block;width:100%;max-width:600px;height:auto;border:0;">
</td></tr>

<!-- Headline + body -->
<tr><td class="email-padding" style="padding:40px 40px 8px;text-align:center;">
<h1 class="email-headline" style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:1.25;color:#101828;font-weight:800;">{{heading}}</h1>
<p style="margin:0 0 30px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#4a5568;">{{bodyText}}</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr><td style="border-radius:6px;background-color:#ff6b4a;">
<a href="{{buttonLink}}" target="_blank" style="display:inline-block;padding:15px 40px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;">{{buttonText}}</a>
</td></tr></table>
<p style="margin:16px 0 0;"><a href="{{buttonLink}}" target="_blank" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#101828;text-decoration:underline;">Learn more</a></p>
</td></tr>

<!-- Footer -->
<tr><td style="padding:30px 40px;border-top:1px solid #e2e8f0;text-align:center;">
<p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#a0aec0;">&copy; Techorses. All rights reserved.</p>
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#c3ccd9;"> &middot; <a href="#" style="color:#c3ccd9;">Preferences</a></p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
  },
  {
    id: "promotion",
    name: "Promotion",
    description: "High-urgency layout with a ribbon header, hero banner, and a large CTA. Good for sales, discounts, and time-limited offers.",
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  @media only screen and (max-width: 620px) {
    .email-container { width: 100% !important; }
    .email-padding { padding: 30px 22px !important; }
    .email-banner img { width: 100% !important; height: auto !important; }
    .email-headline { font-size: 30px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;">
<tr><td align="center" style="padding:30px 10px;">
<table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background-color:#ffffff;border-radius:10px;overflow:hidden;">

<!-- Urgency ribbon -->
<tr><td style="padding:12px 40px;background:linear-gradient(135deg,#d6336c,#7048e8);text-align:center;">
<span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:1.5px;color:#ffffff;text-transform:uppercase;">Limited Time Offer</span>
</td></tr>

<!-- Hero banner -->
<tr><td class="email-banner">
<img src="{{imageUrl}}" width="600" alt="" style="display:block;width:100%;max-width:600px;height:auto;border:0;">
</td></tr>

<!-- Headline + body -->
<tr><td class="email-padding" style="padding:40px 40px 10px;text-align:center;">
<h1 class="email-headline" style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:32px;line-height:1.2;color:#1a202c;font-weight:800;">{{heading}}</h1>
<p style="margin:0 0 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#4a5568;">{{bodyText}}</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr><td style="border-radius:8px;background:linear-gradient(135deg,#d6336c,#7048e8);">
<a href="{{buttonLink}}" target="_blank" style="display:inline-block;padding:17px 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;">{{buttonText}}</a>
</td></tr></table>
</td></tr>

<!-- Offer note -->
<tr><td style="padding:6px 40px 34px;text-align:center;">
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#a0aec0;">Offer ends soon &middot; While supplies last</p>
</td></tr>

<!-- Footer -->
<tr><td style="padding:22px 40px;border-top:1px solid #e2e8f0;text-align:center;">
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#c3ccd9;">&copy; Techorses.</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
  }
];

module.exports = baseTemplates;