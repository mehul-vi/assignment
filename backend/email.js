import nodemailer from "nodemailer";

let transporter;

// build or reuse the SMTP transporter
function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = (process.env.SMTP_USER || "").trim();
  // Gmail App Passwords often come with spaces — strip them
  const pass = (process.env.SMTP_PASS || "").replace(/\s+/g, "").trim();

  if (!host || !user || !pass) {
    throw new Error(
      "Email delivery is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS."
    );
  }

  const isGmail = host.toLowerCase().includes("gmail");

  transporter = nodemailer.createTransport(
    isGmail
      ? { service: "gmail", auth: { user, pass } }
      : {
          host,
          port,
          secure: process.env.SMTP_SECURE === "true" || port === 465,
          auth: { user, pass }
        }
  );

  return transporter;
}

// pick a valid "from" address
function getSender() {
  const raw = process.env.MAIL_FROM || process.env.SMTP_USER || "";
  const sender = raw.replace(/^["']|["']$/g, "").trim();

  if (!sender) {
    throw new Error("Set MAIL_FROM or SMTP_USER to configure the email sender.");
  }

  return sender;
}

// ---------- public API ----------

export async function sendLoginCode(email, code) {
  await getTransporter().sendMail({
    from: getSender(),
    to: email,
    subject: "Your Zava HR Assistant sign-in code",
    text:
      `Your sign-in code is ${code}.\n\n` +
      `It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
    html:
      `<p>Your sign-in code is <strong>${code}</strong>.</p>` +
      `<p>It expires in 10 minutes. If you did not request this code, you can ignore this email.</p>`
  });
}

export async function sendBookingConfirmation({ email, name, slot, referenceId }) {
  if (!email || !slot || !referenceId) {
    throw new Error("sendBookingConfirmation requires email, slot, and referenceId.");
  }

  const displayName = name || "there";

  await getTransporter().sendMail({
    from: getSender(),
    to: email,
    subject: "Your performance review booking is confirmed",
    text:
      `Hi ${displayName},\n\n` +
      `Your 1-on-1 Performance Review is confirmed.\n\n` +
      `Time: ${slot} IST\n` +
      `Reference: ${referenceId}\n\n` +
      `— Zava HR Assistant`,
    html:
      `<p>Hi ${displayName},</p>` +
      `<p>Your <strong>1-on-1 Performance Review</strong> is confirmed.</p>` +
      `<ul>` +
      `<li><strong>Time:</strong> ${slot} IST</li>` +
      `<li><strong>Reference:</strong> <code>${referenceId}</code></li>` +
      `</ul>` +
      `<p>— Zava HR Assistant</p>`
  });
}