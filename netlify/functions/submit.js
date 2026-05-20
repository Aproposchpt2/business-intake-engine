exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true })
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        ok: false,
        error: "Method not allowed"
      })
    };
  }

  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;
    const RESEND_TO_EMAIL = process.env.RESEND_TO_EMAIL;

    if (!RESEND_API_KEY || !RESEND_FROM_EMAIL || !RESEND_TO_EMAIL) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "Missing required environment variables"
        })
      };
    }

    const data = JSON.parse(event.body || "{}");

    const fullName = String(data.fullName || "").trim();
    const email = String(data.email || "").trim();
    const phone = String(data.phone || "").trim();
    const company = String(data.company || "").trim();
    const serviceInterest = String(data.serviceInterest || "").trim();
    const message = String(data.message || "").trim();
    const submittedAt = new Date().toISOString();
    const source = "ai4businesses.org";

    if (!fullName || !email || !phone || !serviceInterest || !message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "Full name, email, phone, service interest, and message are required"
        })
      };
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "Invalid email address"
        })
      };
    }

    const subject = `New AI4Businesses Consultation Request — ${fullName}`;

    const textBody = `
New Consultation Request

Name: ${fullName}
Email: ${email}
Phone: ${phone}
Company: ${company || "Not provided"}
Service Interest: ${serviceInterest}
Message: ${message}
Source: ${source}
Submitted At: ${submittedAt}
`.trim();

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6;">
        <h2 style="margin-bottom: 16px;">New Consultation Request</h2>
        <p><strong>Name:</strong> ${escapeHtml(fullName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
        <p><strong>Company:</strong> ${escapeHtml(company || "Not provided")}</p>
        <p><strong>Service Interest:</strong> ${escapeHtml(serviceInterest)}</p>
        <p><strong>Message:</strong><br>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
        <p><strong>Source:</strong> ${source}</p>
        <p><strong>Submitted At:</strong> ${submittedAt}</p>
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [RESEND_TO_EMAIL],
        reply_to: email,
        subject,
        text: textBody,
        html: htmlBody
      })
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "Resend API error",
          details: resendResult
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: "Consultation request submitted successfully"
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: "Server error",
        details: error.message
      })
    };
  }
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}