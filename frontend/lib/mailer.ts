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
    "http://localhost:3000"
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
