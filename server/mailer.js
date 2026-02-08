const { Resend } = require("resend");

function makeMailer() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL;

  if (!apiKey) throw new Error("Missing RESEND_API_KEY in .env");
  if (!from) throw new Error("Missing FROM_EMAIL in .env");

  const resend = new Resend(apiKey);

  return async function sendEmail({ to, subject, text }) {
    await resend.emails.send({
      from,
      to,
      subject,
      text,
    });
  };
}

module.exports = { makeMailer };
