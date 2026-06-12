import nodemailer from "nodemailer";

function getTransporter() {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.trim();
  if (!user || !pass) return null;
  return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
}

function getNotifyEmail() {
  return (
    process.env.NOTIFY_EMAIL?.trim() ||
    process.env.GMAIL_USER?.trim() ||
    ""
  );
}

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://flowsoundzradio.com"
  ).replace(/\/$/, "");
}

export async function sendContactNotification(msg: {
  name: string;
  email: string;
  topic: string;
  message: string;
  id: string;
}) {
  const transporter = getTransporter();
  if (!transporter) return;

  const to = getNotifyEmail();
  const siteUrl = getSiteUrl();
  const topicLabel =
    msg.topic === "artist"
      ? "Artist Submission"
      : msg.topic === "partnership"
        ? "Partnership / Sponsorship"
        : "General Inquiry";

  await transporter.sendMail({
    from: `"FlowSoundz Contact" <${to}>`,
    to,
    replyTo: msg.email,
    subject: `[${topicLabel}] Message from ${msg.name}`,
    text: [
      `From: ${msg.name} <${msg.email}>`,
      `Topic: ${topicLabel}`,
      `ID: ${msg.id}`,
      ``,
      msg.message,
      ``,
      `—`,
      `Reply to this email to respond directly to ${msg.name}.`,
      `Or open the admin inbox: ${siteUrl}/admin/contact`,
    ].join("\n"),
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
        <div style="background:#07111f;padding:24px 28px;border-radius:12px 12px 0 0">
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#00e5ff">FlowSoundz Radio</p>
          <h1 style="margin:8px 0 0;font-size:20px;color:#fff">New ${topicLabel}</h1>
        </div>
        <div style="background:#f8fafc;padding:24px 28px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none">
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr><td style="padding:6px 0;font-size:13px;color:#64748b;width:80px">From</td><td style="padding:6px 0;font-size:13px;font-weight:600">${msg.name}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#64748b">Email</td><td style="padding:6px 0;font-size:13px"><a href="mailto:${msg.email}" style="color:#0ea5e9">${msg.email}</a></td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#64748b">Topic</td><td style="padding:6px 0;font-size:13px">${topicLabel}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#64748b">Ref</td><td style="padding:6px 0;font-size:13px;font-family:monospace;color:#94a3b8">${msg.id}</td></tr>
          </table>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;font-size:14px;line-height:1.7;white-space:pre-wrap">${msg.message}</div>
          <div style="margin-top:20px;display:flex;gap:12px">
            <a href="mailto:${msg.email}" style="display:inline-block;background:linear-gradient(135deg,#00e5ff,#7c4dff);color:#fff;font-weight:700;font-size:13px;padding:10px 20px;border-radius:999px;text-decoration:none">Reply to ${msg.name}</a>
          </div>
        </div>
      </div>
    `,
  });
}

export async function sendArtistSubmissionNotification(data: {
  artistName: string;
  contactName: string;
  email: string;
  songTitle: string;
  genre: string;
  vibe: string;
  artistType: string;
  description: string;
  songLink: string;
  versionType: string;
  producerCredit?: string;
  streamingLink?: string;
  coverArtLink?: string;
  socialLink?: string;
  aiUsed: boolean;
  aiTool?: string;
  rightsConfirmed: boolean;
  samplesConfirmed: boolean;
  promotionPermissionConfirmed: boolean;
  removalPolicyConfirmed: boolean;
  notes?: string;
  bio: string;
  promoBlurb: string;
  radioIntro: string;
  socialCaptions: string[];
  suggestedVibe: string;
  submittedAt: string;
}) {
  const transporter = getTransporter();
  if (!transporter) return;

  const to = getNotifyEmail();
  const siteUrl = getSiteUrl();

  const linkRow = (label: string, url: string | undefined) =>
    url
      ? `<tr><td style="padding:5px 0;font-size:13px;color:#64748b;width:110px">${label}</td><td style="padding:5px 0;font-size:13px"><a href="${url}" style="color:#0ea5e9">${url}</a></td></tr>`
      : "";

  await transporter.sendMail({
    from: `"FlowSoundz Creator Hub" <${to}>`,
    to,
    replyTo: data.email,
    subject: `[New Submission] ${data.artistName} — "${data.songTitle}"`,
    text: [
      `New track submission on FlowSoundz Creator Hub.`,
      ``,
      `Artist: ${data.artistName} <${data.email}>`,
      `Contact: ${data.contactName}`,
      `Track: ${data.songTitle}`,
      `Genre: ${data.genre}`,
      `Vibe: ${data.vibe}`,
      `Artist type: ${data.artistType}`,
      `Version: ${data.versionType}`,
      data.producerCredit ? `Producer credit: ${data.producerCredit}` : "",
      `AI used: ${data.aiUsed ? `Yes — ${data.aiTool || "unspecified"}` : "No"}`,
      `Submitted: ${data.submittedAt}`,
      ``,
      `Description:`,
      data.description,
      ``,
      `Song link: ${data.songLink}`,
      data.streamingLink ? `Streaming: ${data.streamingLink}` : "",
      data.coverArtLink ? `Cover art: ${data.coverArtLink}` : "",
      data.socialLink ? `Social: ${data.socialLink}` : "",
      ``,
      `Rights confirmed: ${data.rightsConfirmed ? "Yes" : "No"}`,
      `Samples confirmed: ${data.samplesConfirmed ? "Yes" : "No"}`,
      `Promotion permission confirmed: ${data.promotionPermissionConfirmed ? "Yes" : "No"}`,
      `Removal policy acknowledged: ${data.removalPolicyConfirmed ? "Yes" : "No"}`,
      data.notes ? `\nNotes:\n${data.notes}` : "",
      ``,
      `── AI-Generated Promo Assets ──`,
      ``,
      `Bio:`,
      data.bio,
      ``,
      `Suggested vibe: ${data.suggestedVibe}`,
      ``,
      `Promo blurb:`,
      data.promoBlurb,
      ``,
      `Social captions:`,
      ...data.socialCaptions.map((caption, index) => `${index + 1}. ${caption}`),
      ``,
      `Radio intro:`,
      data.radioIntro,
      ``,
      `—`,
      `Reply to this email to contact ${data.artistName} directly.`,
      `Admin: ${siteUrl}/admin`,
    ]
      .filter((line) => line !== "")
      .join("\n"),
    html: `
      <div style="font-family:sans-serif;max-width:640px;margin:0 auto;color:#1e293b">
        <div style="background:#07111f;padding:24px 28px;border-radius:12px 12px 0 0">
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#00e5ff">FlowSoundz Creator Hub</p>
          <h1 style="margin:8px 0 0;font-size:20px;color:#fff">New Track Submission</h1>
          <p style="margin:6px 0 0;font-size:14px;color:#94a3b8">${data.artistName} — "${data.songTitle}"</p>
        </div>
        <div style="background:#f8fafc;padding:24px 28px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none">
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr><td style="padding:5px 0;font-size:13px;color:#64748b;width:110px">Artist</td><td style="padding:5px 0;font-size:13px;font-weight:600">${data.artistName}</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:#64748b">Contact</td><td style="padding:5px 0;font-size:13px">${data.contactName}</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:#64748b">Email</td><td style="padding:5px 0;font-size:13px"><a href="mailto:${data.email}" style="color:#0ea5e9">${data.email}</a></td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:#64748b">Track</td><td style="padding:5px 0;font-size:13px;font-weight:600">"${data.songTitle}"</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:#64748b">Genre</td><td style="padding:5px 0;font-size:13px">${data.genre}</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:#64748b">Vibe</td><td style="padding:5px 0;font-size:13px">${data.vibe}</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:#64748b">Artist type</td><td style="padding:5px 0;font-size:13px">${data.artistType}</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:#64748b">Version</td><td style="padding:5px 0;font-size:13px">${data.versionType}</td></tr>
            ${data.producerCredit ? `<tr><td style="padding:5px 0;font-size:13px;color:#64748b">Producer</td><td style="padding:5px 0;font-size:13px">${data.producerCredit}</td></tr>` : ""}
            <tr><td style="padding:5px 0;font-size:13px;color:#64748b">AI used</td><td style="padding:5px 0;font-size:13px">${data.aiUsed ? `Yes — ${data.aiTool || "unspecified"}` : "No"}</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:#64748b">Submitted</td><td style="padding:5px 0;font-size:13px;color:#94a3b8">${data.submittedAt}</td></tr>
            ${linkRow("Song link", data.songLink)}
            ${linkRow("Streaming", data.streamingLink)}
            ${linkRow("Cover art", data.coverArtLink)}
            ${linkRow("Social", data.socialLink)}
          </table>

          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px;margin-bottom:20px">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b">Artist Description</p>
            <p style="margin:0;font-size:14px;line-height:1.7;color:#1e293b">${data.description}</p>
          </div>

          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px;margin-bottom:20px">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b">Permissions Confirmed</p>
            <p style="margin:0;font-size:14px;line-height:1.8;color:#1e293b">
              Rights to recording: ${data.rightsConfirmed ? "Yes" : "No"}<br/>
              Sample clearance: ${data.samplesConfirmed ? "Yes" : "No"}<br/>
              FlowSoundz streaming and promotion permission: ${data.promotionPermissionConfirmed ? "Yes" : "No"}<br/>
              Removal policy acknowledged: ${data.removalPolicyConfirmed ? "Yes" : "No"}
            </p>
          </div>

          ${data.notes ? `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px;margin-bottom:20px"><p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b">Additional Notes</p><p style="margin:0;font-size:14px;line-height:1.7;color:#1e293b">${data.notes}</p></div>` : ""}

          <div style="background:#07111f;border-radius:10px;padding:18px 22px;margin-bottom:20px">
            <p style="margin:0 0 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:#00e5ff">AI-Generated Promo Assets</p>
            <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em">Artist Bio</p>
            <p style="margin:0 0 14px;font-size:13px;line-height:1.7;color:#e2e8f0">${data.bio}</p>
            <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em">Suggested Vibe</p>
            <p style="margin:0 0 14px;font-size:13px;color:#7c4dff;font-weight:700">${data.suggestedVibe}</p>
            <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em">Station Promo Blurb</p>
            <p style="margin:0 0 14px;font-size:13px;line-height:1.7;color:#e2e8f0">${data.promoBlurb}</p>
            <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em">Social Captions</p>
            <div style="margin:0 0 14px;font-size:13px;line-height:1.7;color:#e2e8f0">
              ${data.socialCaptions.map((caption) => `<p style="margin:0 0 8px">${caption}</p>`).join("")}
            </div>
            <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em">Radio Intro Line</p>
            <p style="margin:0;font-size:13px;line-height:1.7;color:#e2e8f0">${data.radioIntro}</p>
          </div>

          <div style="display:flex;gap:12px">
            <a href="mailto:${data.email}" style="display:inline-block;background:linear-gradient(135deg,#00e5ff,#7c4dff);color:#fff;font-weight:700;font-size:13px;padding:10px 20px;border-radius:999px;text-decoration:none">Reply to Artist</a>
            <a href="${siteUrl}/admin" style="display:inline-block;background:#f1f5f9;color:#1e293b;font-weight:600;font-size:13px;padding:10px 20px;border-radius:999px;text-decoration:none">Open Admin</a>
          </div>
        </div>
      </div>
    `,
  });
}

export async function sendPromoLeadNotification(data: {
  artistName: string;
  trackLink: string;
  budgetRange: string;
  email: string;
  submittedAt: string;
}) {
  const transporter = getTransporter();
  if (!transporter) return;

  const to = getNotifyEmail();

  await transporter.sendMail({
    from: `"FlowSoundz Promo" <${to}>`,
    to,
    replyTo: data.email,
    subject: `[Promo Lead] ${data.artistName}`,
    text: [
      `New promo lead on FlowSoundz.`,
      ``,
      `Artist: ${data.artistName}`,
      `Email: ${data.email}`,
      data.trackLink ? `Track: ${data.trackLink}` : "",
      data.budgetRange ? `Budget: ${data.budgetRange}` : "",
      `Submitted: ${data.submittedAt}`,
    ]
      .filter(Boolean)
      .join("\n"),
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
        <div style="background:#07111f;padding:24px 28px;border-radius:12px 12px 0 0">
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#00e5ff">FlowSoundz Radio</p>
          <h1 style="margin:8px 0 0;font-size:20px;color:#fff">New Promo Lead</h1>
        </div>
        <div style="background:#f8fafc;padding:24px 28px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none">
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:5px 0;font-size:13px;color:#64748b;width:80px">Artist</td><td style="padding:5px 0;font-size:13px;font-weight:600">${data.artistName}</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:#64748b">Email</td><td style="padding:5px 0;font-size:13px"><a href="mailto:${data.email}">${data.email}</a></td></tr>
            ${data.trackLink ? `<tr><td style="padding:5px 0;font-size:13px;color:#64748b">Track</td><td style="padding:5px 0;font-size:13px"><a href="${data.trackLink}">${data.trackLink}</a></td></tr>` : ""}
            ${data.budgetRange ? `<tr><td style="padding:5px 0;font-size:13px;color:#64748b">Budget</td><td style="padding:5px 0;font-size:13px">${data.budgetRange}</td></tr>` : ""}
          </table>
          <a href="mailto:${data.email}" style="display:inline-block;margin-top:16px;background:linear-gradient(135deg,#00e5ff,#7c4dff);color:#fff;font-weight:700;font-size:13px;padding:10px 20px;border-radius:999px;text-decoration:none">Reply to Artist</a>
        </div>
      </div>
    `,
  });
}

export async function sendArtistSubmissionConfirmation(data: {
  artistName: string;
  contactName: string;
  email: string;
  songTitle: string;
  genre: string;
  vibe: string;
  bio: string;
  promoBlurb: string;
  radioIntro: string;
  suggestedVibe: string;
  submissionId?: string | null;
}) {
  const transporter = getTransporter();
  if (!transporter) return;

  const from = getNotifyEmail();

  await transporter.sendMail({
    from: `"FlowSoundz Radio" <${from}>`,
    to: data.email,
    replyTo: from,
    subject: `Your FlowSoundz submission: "${data.songTitle}"`,
    text: [
      `Hi ${data.contactName},`,
      ``,
      `Your submission has been received by FlowSoundz Radio.`,
      ``,
      `Track: "${data.songTitle}" by ${data.artistName}`,
      `Genre: ${data.genre}  •  Vibe: ${data.vibe}`,
      data.submissionId ? `Reference: ${data.submissionId}` : "",
      ``,
      `── What happens next ──`,
      ``,
      `Our curation team will review your track manually. This process is not automatic — every submission gets a real listen.`,
      ``,
      `Approval is not guaranteed. If your track is accepted for rotation, you will be contacted at this email address.`,
      ``,
      `── Your AI-Assisted Promo Preview ──`,
      ``,
      `These are starter assets generated from your submission. Review and edit them in your confirmation page before use.`,
      ``,
      `Artist Bio:`,
      data.bio,
      ``,
      `Suggested Vibe: ${data.suggestedVibe}`,
      ``,
      `Station Promo Blurb:`,
      data.promoBlurb,
      ``,
      `Radio Intro:`,
      data.radioIntro,
      ``,
      `──`,
      `Questions? Reply to this email or visit our contact page.`,
      ``,
      `FlowSoundz Radio — Discovery-first curation for independent music.`,
    ]
      .filter((line) => line !== null && line !== undefined)
      .join("\n"),
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
        <div style="background:#07111f;padding:24px 28px;border-radius:12px 12px 0 0">
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#00e5ff">FlowSoundz Radio</p>
          <h1 style="margin:8px 0 4px;font-size:20px;color:#fff">Submission Received</h1>
          <p style="margin:0;font-size:14px;color:#94a3b8">${data.artistName} — &ldquo;${data.songTitle}&rdquo;</p>
        </div>
        <div style="background:#f8fafc;padding:24px 28px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none">

          <p style="font-size:14px;line-height:1.7;margin:0 0 16px">Hi ${data.contactName},</p>
          <p style="font-size:14px;line-height:1.7;margin:0 0 16px">Your submission has been received by FlowSoundz Radio.</p>

          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px;margin-bottom:20px">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:4px 0;font-size:13px;color:#64748b;width:80px">Track</td><td style="padding:4px 0;font-size:13px;font-weight:600">&ldquo;${data.songTitle}&rdquo;</td></tr>
              <tr><td style="padding:4px 0;font-size:13px;color:#64748b">Artist</td><td style="padding:4px 0;font-size:13px">${data.artistName}</td></tr>
              <tr><td style="padding:4px 0;font-size:13px;color:#64748b">Genre</td><td style="padding:4px 0;font-size:13px">${data.genre}</td></tr>
              <tr><td style="padding:4px 0;font-size:13px;color:#64748b">Vibe</td><td style="padding:4px 0;font-size:13px">${data.vibe}</td></tr>
              ${data.submissionId ? `<tr><td style="padding:4px 0;font-size:13px;color:#64748b">Ref</td><td style="padding:4px 0;font-size:12px;font-family:monospace;color:#94a3b8">${data.submissionId}</td></tr>` : ""}
            </table>
          </div>

          <div style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:8px;padding:14px 18px;margin-bottom:20px">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#065f46">What happens next</p>
            <p style="margin:0;font-size:13px;line-height:1.7;color:#064e3b">
              Our curation team will review your track manually — every submission gets a real listen.
              <strong>Approval is not automatic or guaranteed.</strong>
              If your track is accepted for rotation, we will contact you at this email address.
            </p>
          </div>

          <div style="background:#07111f;border-radius:10px;padding:18px 22px;margin-bottom:20px">
            <p style="margin:0 0 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:#00e5ff">Your AI-Assisted Promo Preview</p>
            <p style="margin:0 0 10px;font-size:12px;line-height:1.6;color:#94a3b8">These are starter assets generated from your submission. You can review and edit them on your confirmation page — they are suggestions, not final copy.</p>
            <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em">Artist Bio</p>
            <p style="margin:0 0 14px;font-size:13px;line-height:1.7;color:#e2e8f0">${data.bio}</p>
            <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em">Suggested Vibe</p>
            <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#7c4dff">${data.suggestedVibe}</p>
            <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em">Station Promo Blurb</p>
            <p style="margin:0 0 14px;font-size:13px;line-height:1.7;color:#e2e8f0">${data.promoBlurb}</p>
            <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em">Radio Intro</p>
            <p style="margin:0;font-size:13px;line-height:1.7;color:#e2e8f0">${data.radioIntro}</p>
          </div>

          <p style="font-size:13px;color:#64748b;margin:0">Questions? Reply to this email or visit our contact page.</p>
          <p style="font-size:12px;color:#94a3b8;margin:8px 0 0">FlowSoundz Radio — Discovery-first curation for independent music.</p>
        </div>
      </div>
    `,
  });
}

export async function sendWaitlistNotification(entry: {
  email: string;
  id: string;
}) {
  const transporter = getTransporter();
  if (!transporter) return;

  const to = getNotifyEmail();
  const siteUrl = getSiteUrl();

  await transporter.sendMail({
    from: `"FlowSoundz Waitlist" <${to}>`,
    to,
    subject: `New waitlist signup — ${entry.email}`,
    text: [
      `New signup on the FlowSoundz waitlist.`,
      ``,
      `Email: ${entry.email}`,
      `ID: ${entry.id}`,
      ``,
      `View all signups: ${siteUrl}/admin/waitlist`,
    ].join("\n"),
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
        <div style="background:#07111f;padding:24px 28px;border-radius:12px 12px 0 0">
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#00e5ff">FlowSoundz Radio</p>
          <h1 style="margin:8px 0 0;font-size:20px;color:#fff">New Waitlist Signup</h1>
        </div>
        <div style="background:#f8fafc;padding:24px 28px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none">
          <p style="font-size:14px;margin:0 0 16px"><strong>${entry.email}</strong> just joined the waitlist.</p>
          <p style="font-size:12px;color:#94a3b8;margin:0;font-family:monospace">${entry.id}</p>
        </div>
      </div>
    `,
  });
}

export async function sendWaitlistConfirmation(email: string) {
  const transporter = getTransporter();
  if (!transporter) return;

  const from = getNotifyEmail();
  const siteUrl = getSiteUrl();

  await transporter.sendMail({
    from: `"FlowSoundz Radio" <${from}>`,
    to: email,
    subject: "You're on the FlowSoundz waitlist 🎵",
    text: [
      `You're on the list.`,
      ``,
      `We'll hit you first when FlowSoundz Radio goes fully live — new drops, exclusive features, and early access before anyone else.`,
      ``,
      `In the meantime, check out the station: ${siteUrl}`,
      ``,
      `— FlowSoundz Radio`,
    ].join("\n"),
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#050816;border-radius:16px;overflow:hidden">
        <div style="padding:32px 32px 24px;background:linear-gradient(135deg,#0c1328 0%,#07111f 100%);border-bottom:1px solid rgba(0,229,255,0.15)">
          <p style="margin:0 0 16px;font-size:11px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#00e5ff">FlowSoundz Radio</p>
          <h1 style="margin:0;font-size:26px;font-weight:700;color:#fff;line-height:1.2">You're on the list.</h1>
        </div>
        <div style="padding:28px 32px 32px">
          <p style="font-size:15px;line-height:1.7;color:#cbd5e1;margin:0 0 20px">
            We'll hit you <strong style="color:#fff">first</strong> when FlowSoundz Radio goes fully live — new drops, exclusive features, and early access before anyone else hears it.
          </p>
          <p style="font-size:14px;line-height:1.7;color:#94a3b8;margin:0 0 28px">
            Underground music, programmed like radio. Discovery before the algorithm catches up.
          </p>
          <a href="${siteUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#00e5ff 0%,#7c4dff 100%);color:#fff;font-size:14px;font-weight:700;text-decoration:none;border-radius:999px">
            Check out the station →
          </a>
          <p style="font-size:11px;color:#475569;margin:28px 0 0">
            No spam. You joined from flowsoundzradio.com. <a href="${siteUrl}/contact" style="color:#64748b">Unsubscribe</a> any time.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendLaunchAnnouncement(email: string, magicLink?: string) {
  const transporter = getTransporter();
  if (!transporter) return;

  const from = getNotifyEmail();
  const siteUrl = getSiteUrl();
  const signInUrl = magicLink ?? `${siteUrl}/signin`;

  await transporter.sendMail({
    from: `"FlowSoundz Radio" <${from}>`,
    to: email,
    subject: "FlowSoundz Radio is live — you're in first 🎙️",
    text: [
      `It's live.`,
      ``,
      `FlowSoundz Radio is now fully open. You're getting this because you were on the waitlist — which means you're in before anyone else.`,
      ``,
      `Click the link below to sign in instantly — no password needed:`,
      signInUrl,
      ``,
      `Link expires in 24 hours. After that, just sign in at ${siteUrl}/signin.`,
      ``,
      `— FlowSoundz Radio`,
    ].join("\n"),
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#050816;border-radius:16px;overflow:hidden">
        <div style="padding:32px 32px 24px;background:linear-gradient(135deg,#0c1328 0%,#07111f 100%);border-bottom:1px solid rgba(0,229,255,0.15)">
          <p style="margin:0 0 16px;font-size:11px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#00e5ff">FlowSoundz Radio</p>
          <h1 style="margin:0;font-size:28px;font-weight:700;color:#fff;line-height:1.2">It&apos;s live.</h1>
        </div>
        <div style="padding:28px 32px 32px">
          <p style="font-size:15px;line-height:1.7;color:#cbd5e1;margin:0 0 16px">
            FlowSoundz Radio is now <strong style="color:#fff">fully open</strong>. You&apos;re getting this because you were on the waitlist — which means you&apos;re in before anyone else.
          </p>
          <p style="font-size:14px;line-height:1.7;color:#94a3b8;margin:0 0 28px">
            Underground music, curated and programmed like radio. Drop in, discover something new, and grab your membership spot while it&apos;s early.
          </p>

          <div style="margin:0 0 16px;padding:20px 24px;background:rgba(0,229,255,0.06);border:1px solid rgba(0,229,255,0.18);border-radius:14px">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#00e5ff">Option 1 — instant email sign-in</p>
            <p style="margin:0 0 14px;font-size:13px;color:#94a3b8">One click, no password. Works with the email you used to join.</p>
            <a href="${signInUrl}" style="display:inline-block;padding:13px 26px;background:linear-gradient(135deg,#00e5ff 0%,#7c4dff 100%);color:#fff;font-size:14px;font-weight:700;text-decoration:none;border-radius:999px">
              Sign me in instantly →
            </a>
            <p style="margin:10px 0 0;font-size:11px;color:#64748b">Expires in 24 hours · single use</p>
          </div>

          <div style="margin:0 0 24px;padding:20px 24px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#94a3b8">Option 2 — sign in with Google</p>
            <p style="margin:0 0 14px;font-size:13px;color:#94a3b8">One click — takes you straight to Google sign-in.</p>
            <a href="${siteUrl}/signin?next=/radio&google=1" style="display:inline-flex;align-items:center;gap:10px;padding:12px 22px;background:#fff;color:#1e293b;font-size:13px;font-weight:700;text-decoration:none;border-radius:999px">
              <img src="https://www.google.com/favicon.ico" width="16" height="16" alt="" style="border-radius:2px" />
              Continue with Google
            </a>
          </div>

          <a href="${siteUrl}/membership" style="display:inline-block;padding:12px 24px;border:1.5px solid rgba(255,255,255,0.12);color:#cbd5e1;font-size:13px;font-weight:600;text-decoration:none;border-radius:999px">
            View membership →
          </a>

          <p style="font-size:11px;color:#475569;margin:28px 0 0">
            You&apos;re receiving this because you joined the FlowSoundz waitlist.<br/>
            If the instant sign-in button doesn&apos;t work, copy this into your browser:<br/>
            <span style="color:#64748b;word-break:break-all">${signInUrl}</span>
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendArtistApprovalEmail(data: {
  contactName: string;
  email: string;
  artistName: string;
  songTitle: string;
}) {
  const transporter = getTransporter();
  if (!transporter) return;
  const from = getNotifyEmail();
  const siteUrl = getSiteUrl();

  await transporter.sendMail({
    from: `"FlowSoundz Radio" <${from}>`,
    to: data.email,
    replyTo: from,
    subject: `Your track is approved for FlowSoundz Radio rotation`,
    text: [
      `Hi ${data.contactName},`,
      ``,
      `Great news — "${data.songTitle}" by ${data.artistName} has been approved for FlowSoundz Radio rotation.`,
      ``,
      `Your track will be added to our curation queue and you'll hear it on the station.`,
      ``,
      `Tune in: ${siteUrl}/radio`,
      ``,
      `Thank you for submitting — we're excited to share your music.`,
      ``,
      `FlowSoundz Radio — Discovery-first curation for independent music.`,
    ].join("\n"),
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
        <div style="background:#07111f;padding:24px 28px;border-radius:12px 12px 0 0">
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#00e5ff">FlowSoundz Radio</p>
          <h1 style="margin:8px 0 4px;font-size:20px;color:#fff">Your track is approved</h1>
          <p style="margin:0;font-size:14px;color:#94a3b8">${data.artistName} — &ldquo;${data.songTitle}&rdquo;</p>
        </div>
        <div style="background:#0f172a;padding:28px;border-radius:0 0 12px 12px">
          <p style="font-size:15px;color:#e2e8f0;margin:0 0 16px">Hi ${data.contactName},</p>
          <p style="font-size:14px;color:#94a3b8;line-height:1.7;margin:0 0 20px">
            Great news — <strong style="color:#fff">&ldquo;${data.songTitle}&rdquo;</strong> has been approved for <strong style="color:#fff">FlowSoundz Radio</strong> rotation.
          </p>
          <div style="border-left:3px solid #00e5ff;padding:12px 16px;background:rgba(0,229,255,0.06);border-radius:0 8px 8px 0;margin:0 0 24px">
            <p style="margin:0;font-size:13px;color:#cbd5e1;line-height:1.6">
              Your track will be added to our curation queue. Tune in to hear it on the station.
            </p>
          </div>
          <a href="${siteUrl}/radio" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#00e5ff 0%,#7c4dff 100%);color:#fff;font-size:13px;font-weight:700;text-decoration:none;border-radius:999px">
            Tune in to FlowSoundz Radio →
          </a>
          <p style="font-size:12px;color:#475569;margin:28px 0 0">
            Thank you for submitting — we&apos;re excited to share your music.<br/>
            FlowSoundz Radio — Discovery-first curation for independent music.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendArtistRejectionEmail(data: {
  contactName: string;
  email: string;
  artistName: string;
  songTitle: string;
}) {
  const transporter = getTransporter();
  if (!transporter) return;
  const from = getNotifyEmail();
  const siteUrl = getSiteUrl();

  await transporter.sendMail({
    from: `"FlowSoundz Radio" <${from}>`,
    to: data.email,
    replyTo: from,
    subject: `FlowSoundz Radio — update on your submission`,
    text: [
      `Hi ${data.contactName},`,
      ``,
      `Thank you for submitting "${data.songTitle}" by ${data.artistName} to FlowSoundz Radio.`,
      ``,
      `After review, we're not adding this track to our rotation at this time. This is a curation decision and does not reflect the quality of your work.`,
      ``,
      `We encourage you to keep creating and submit again in the future.`,
      ``,
      `Submit again: ${siteUrl}/artist/submit`,
      ``,
      `FlowSoundz Radio — Discovery-first curation for independent music.`,
    ].join("\n"),
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
        <div style="background:#07111f;padding:24px 28px;border-radius:12px 12px 0 0">
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#00e5ff">FlowSoundz Radio</p>
          <h1 style="margin:8px 0 4px;font-size:20px;color:#fff">Submission update</h1>
          <p style="margin:0;font-size:14px;color:#94a3b8">${data.artistName} — &ldquo;${data.songTitle}&rdquo;</p>
        </div>
        <div style="background:#0f172a;padding:28px;border-radius:0 0 12px 12px">
          <p style="font-size:15px;color:#e2e8f0;margin:0 0 16px">Hi ${data.contactName},</p>
          <p style="font-size:14px;color:#94a3b8;line-height:1.7;margin:0 0 16px">
            Thank you for submitting <strong style="color:#fff">&ldquo;${data.songTitle}&rdquo;</strong> to FlowSoundz Radio.
          </p>
          <p style="font-size:14px;color:#94a3b8;line-height:1.7;margin:0 0 20px">
            After review, we&apos;re not adding this track to our rotation at this time. This is a curation decision and does not reflect the quality of your work — we encourage you to keep creating and submit again.
          </p>
          <a href="${siteUrl}/artist/submit" style="display:inline-block;padding:12px 24px;border:1.5px solid rgba(255,255,255,0.15);color:#cbd5e1;font-size:13px;font-weight:600;text-decoration:none;border-radius:999px">
            Submit another track →
          </a>
          <p style="font-size:12px;color:#475569;margin:28px 0 0">
            FlowSoundz Radio — Discovery-first curation for independent music.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendMembershipWelcomeEmail(data: {
  email: string;
  tier: "INSIDER" | "VAULT";
}) {
  const transporter = getTransporter();
  if (!transporter) return;
  const from = getNotifyEmail();
  const siteUrl = getSiteUrl();
  const tierLabel = data.tier === "VAULT" ? "Vault" : "Insider";
  const tierColor = data.tier === "VAULT" ? "#d946ef" : "#00e5ff";
  const tierPerks = data.tier === "VAULT"
    ? ["Full Vault exclusive library", "Earliest entry to every drop window", "Deep production context + Behind the Mix"]
    : ["Day One Access to new releases", "Behind the Mix creator notes", "Early Midnight Drop access"];

  await transporter.sendMail({
    from: `"FlowSoundz Radio" <${from}>`,
    to: data.email,
    subject: `Welcome to FlowSoundz ${tierLabel} — you're in`,
    text: [
      `Welcome to FlowSoundz ${tierLabel}.`,
      ``,
      `Your membership is active. Here's what you've unlocked:`,
      tierPerks.map((p) => `  · ${p}`).join("\n"),
      ``,
      `Start listening: ${siteUrl}/radio`,
      ``,
      `Manage billing any time from the account menu.`,
      ``,
      `— FlowSoundz Radio`,
    ].join("\n"),
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
        <div style="background:#07070f;padding:32px 28px;border-radius:12px 12px 0 0">
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:${tierColor}">FlowSoundz Radio · ${tierLabel}</p>
          <h1 style="margin:10px 0 4px;font-size:22px;color:#fff;font-weight:800">Welcome to ${tierLabel}</h1>
          <p style="margin:0;font-size:14px;color:#94a3b8">Your membership is active.</p>
        </div>
        <div style="background:#f8fafc;padding:28px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none">
          <p style="font-size:14px;color:#334155;margin:0 0 20px">Here's what you've unlocked:</p>
          <ul style="margin:0 0 24px;padding:0;list-style:none">
            ${tierPerks.map((p) => `<li style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#1e293b"><span style="color:${tierColor};margin-right:8px">✓</span>${p}</li>`).join("")}
          </ul>
          <a href="${siteUrl}/radio" style="display:inline-block;background:linear-gradient(135deg,#00e5ff,#7c4dff);color:#fff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:999px;text-decoration:none">
            Start Listening →
          </a>
          <p style="margin-top:24px;font-size:12px;color:#94a3b8">
            Cancel any time from the Account menu. Questions? Reply to this email.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendFoundingMemberEmail(email: string, spotNumber: number) {
  const transporter = getTransporter();
  if (!transporter) return;

  const from = getNotifyEmail();
  const siteUrl = getSiteUrl();
  const signInUrl = `${siteUrl}/signin`;

  await transporter.sendMail({
    from: `"FlowSoundz Radio" <${from}>`,
    to: email,
    subject: `You're Founding Member #${spotNumber} — FlowSoundz Early Access`,
    text: [
      `You made it.`,
      ``,
      `You're Founding Member #${spotNumber} on FlowSoundz Radio. That means you get free INSIDER access — unlimited listening, all vibes, before anyone else.`,
      ``,
      `Sign in to start listening: ${signInUrl}`,
      ``,
      `Enter your email on that page and we'll send you a magic link — no password needed.`,
      ``,
      `— FlowSoundz Radio`,
    ].join("\n"),
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#050816;border-radius:16px;overflow:hidden">
        <div style="padding:32px 32px 24px;background:linear-gradient(135deg,#0c1328 0%,#07111f 100%);border-bottom:1px solid rgba(139,92,246,0.3)">
          <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#8B5CF6">FlowSoundz Radio · Founding Member</p>
          <h1 style="margin:0;font-size:28px;font-weight:700;color:#fff;line-height:1.2">You're in. 🎧</h1>
        </div>
        <div style="padding:28px 32px 32px">
          <p style="font-size:22px;font-weight:700;color:#c4b5fd;margin:0 0 16px">Founding Member #${spotNumber}</p>
          <p style="font-size:15px;line-height:1.7;color:#cbd5e1;margin:0 0 16px">
            You signed up early — so you get <strong style="color:#fff">free INSIDER access</strong> from day one. Full listening on all vibes, no restrictions.
          </p>
          <p style="font-size:15px;line-height:1.7;color:#cbd5e1;margin:0 0 28px">
            Sign in with your email and you're set. No password, no credit card.
          </p>
          <a href="${signInUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#8B5CF6 0%,#00e5ff 100%);color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:999px">
            Sign in &amp; Start Listening →
          </a>
          <p style="font-size:12px;color:#475569;margin:28px 0 0">
            Enter <strong style="color:#64748b">${email}</strong> on the sign-in page — we'll send a magic link. No password needed.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendWeeklyDigest(data: {
  recipients: string[];
  topSongs: Array<{ title: string; artist: string; plays: number; vibe: string }>;
  newSongsCount: number;
  weekLabel: string;
}) {
  const transporter = getTransporter();
  if (!transporter || data.recipients.length === 0) return { sent: 0, skipped: data.recipients.length };

  const siteUrl = getSiteUrl();
  const from = getNotifyEmail();

  const songRows = data.topSongs
    .map(
      (s) =>
        `<tr>
          <td style="padding:10px 0;border-bottom:1px solid #e2e8f0">
            <span style="font-size:14px;font-weight:600;color:#0f172a">${s.title}</span><br/>
            <span style="font-size:12px;color:#64748b">${s.artist} · ${s.vibe}</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;text-align:right;font-size:12px;color:#64748b;white-space:nowrap">
            ${s.plays} plays
          </td>
        </tr>`,
    )
    .join("");

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
      <div style="background:linear-gradient(135deg,#07070f 0%,#0d1528 100%);padding:32px 28px;border-radius:12px 12px 0 0">
        <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#00e5ff">FlowSoundz Radio</p>
        <h1 style="margin:10px 0 0;font-size:24px;color:#fff;font-weight:800">Weekly Pulse</h1>
        <p style="margin:8px 0 0;font-size:14px;color:#94a3b8">${data.weekLabel}</p>
      </div>
      <div style="background:#f8fafc;padding:28px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none">
        ${data.newSongsCount > 0 ? `<p style="font-size:14px;color:#334155;margin:0 0 20px"><strong>${data.newSongsCount} new track${data.newSongsCount === 1 ? "" : "s"}</strong> added to the rotation this week.</p>` : ""}
        <h2 style="font-size:13px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;margin:0 0 12px">Top Tracks This Week</h2>
        <table style="width:100%;border-collapse:collapse">${songRows}</table>
        <div style="margin-top:28px;text-align:center">
          <a href="${siteUrl}/radio" style="display:inline-block;background:linear-gradient(135deg,#00e5ff,#7c4dff);color:#fff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:999px;text-decoration:none">
            Listen Now →
          </a>
        </div>
        <p style="margin-top:24px;font-size:11px;color:#94a3b8;text-align:center">
          You are receiving this because you are on the FlowSoundz list.
        </p>
      </div>
    </div>
  `;

  let sent = 0;
  for (const recipient of data.recipients) {
    try {
      await transporter.sendMail({
        from: `"FlowSoundz Radio" <${from}>`,
        to: recipient,
        subject: `FlowSoundz Weekly Pulse — ${data.weekLabel}`,
        html,
        text: `FlowSoundz Weekly Pulse — ${data.weekLabel}\n\nTop tracks:\n${data.topSongs.map((s) => `${s.title} by ${s.artist} (${s.plays} plays)`).join("\n")}\n\nListen: ${siteUrl}/radio`,
      });
      sent++;
    } catch {
      // continue
    }
  }

  return { sent, skipped: data.recipients.length - sent };
}

// The golden moment: an artist's track finished mastering and is in rotation.
// Air times come from the deterministic station clock — a promise no
// traditional station can make.
export async function sendTrackLiveEmail(
  email: string,
  data: { artistName: string; trackTitle: string; airings: string[] },
) {
  const transporter = getTransporter();
  if (!transporter) return;

  const from = getNotifyEmail();
  const siteUrl = getSiteUrl();
  const airingsText = data.airings.length
    ? data.airings.map((a) => `  • ${a}`).join("\n")
    : "  • Entering rotation now — airs within the next few hours.";
  const airingsHtml = data.airings.length
    ? data.airings
        .map(
          (a) =>
            `<li style="margin:0 0 8px;font-size:15px;color:#fff;font-weight:600">${a}</li>`,
        )
        .join("")
    : `<li style="margin:0 0 8px;font-size:15px;color:#fff">Entering rotation now — airs within the next few hours.</li>`;

  await transporter.sendMail({
    from: `"FlowSoundz Radio" <${from}>`,
    to: email,
    subject: `🎙️ "${data.trackTitle}" is ON THE AIR — here's exactly when it plays`,
    text: [
      `${data.artistName} — your track is live.`,
      ``,
      `"${data.trackTitle}" has been mastered to broadcast loudness and is now in the FlowSoundz Radio rotation.`,
      ``,
      `Your next air times:`,
      airingsText,
      ``,
      `Tell your fans to tune in WITH you — FlowSoundz is synchronized radio, so everyone hears your track at the same moment. Get them firing 🔥 votes and your rotation climbs.`,
      ``,
      `Listen + share: ${siteUrl}`,
      ``,
      `— FlowSoundz Radio`,
    ].join("\n"),
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#050816;border-radius:16px;overflow:hidden">
        <div style="padding:32px 32px 24px;background:linear-gradient(135deg,#0c1328 0%,#07111f 100%);border-bottom:1px solid rgba(0,229,255,0.15)">
          <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#00FF88">On The Air</p>
          <h1 style="margin:0;font-size:26px;font-weight:700;color:#fff;line-height:1.25">"${data.trackTitle}" is live on FlowSoundz Radio.</h1>
        </div>
        <div style="padding:28px 32px 32px">
          <p style="font-size:15px;line-height:1.7;color:#cbd5e1;margin:0 0 18px">
            ${data.artistName} — your track has been mastered to broadcast loudness and is in rotation. Because FlowSoundz runs on a synchronized station clock, we can tell you <strong style="color:#fff">exactly</strong> when it plays:
          </p>
          <ul style="margin:0 0 22px;padding:16px 20px 8px 36px;background:rgba(0,229,255,0.06);border:1px solid rgba(0,229,255,0.15);border-radius:12px">
            ${airingsHtml}
          </ul>
          <p style="font-size:14px;line-height:1.7;color:#94a3b8;margin:0 0 26px">
            Tell your fans to tune in <strong style="color:#fff">with</strong> you — everyone hears your track at the same moment. When they fire 🔥 votes together, the whole station lights up and your rotation climbs.
          </p>
          <a href="${siteUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#00e5ff 0%,#00FF88 100%);color:#04110b;font-size:14px;font-weight:700;text-decoration:none;border-radius:999px">
            Listen + share →
          </a>
        </div>
      </div>
    `,
  });
}
