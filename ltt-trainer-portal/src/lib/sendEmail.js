/**
 * LTT Trainer Portal — Resend email utility
 *
 * Usage:
 *   import { sendEmail } from "../lib/sendEmail";
 *   await sendEmail("trainerInvite", { trainerName, trainerEmail, loginUrl });
 *
 * All templates live in this file. To change copy or add a template,
 * edit the TEMPLATES object below.
 *
 * Environment variable required:
 *   VITE_RESEND_API_KEY=re_xxxxxxxxxxxx
 */

const FROM = "LTT Trainer Portal <noreply@ltt.edu.au>";
const ADMIN_EMAIL = "emma.rosier@ltt.edu.au";
const PORTAL_URL = window.location.origin;

// ── Shared HTML wrapper ────────────────────────────────────────────────────────
function wrap(body) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LTT Trainer Portal</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#081a47;padding:28px 40px;">
              <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">
                LTT Trainer Competency Portal
              </p>
              <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.55);">
                Standards for RTOs 2025
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 32px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
                This is an automated message from the LTT Trainer Competency Portal.
                Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

// ── Button helper ──────────────────────────────────────────────────────────────
function btn(label, url, color = "#1c5ea8") {
  return `
<table cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
  <tr>
    <td style="background:${color};border-radius:8px;">
      <a href="${url}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
        ${label}
      </a>
    </td>
  </tr>
</table>`.trim();
}

// ── Email templates ────────────────────────────────────────────────────────────
const TEMPLATES = {
  // 1. Trainer invited — sent to the new trainer
  trainerInvite: ({ trainerName, trainerEmail, tempPassword }) => ({
    to: trainerEmail,
    subject: "Welcome to the LTT Trainer Competency Portal",
    html: wrap(`
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#081a47;">Welcome, ${trainerName} 👋</h2>
      <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
        You've been invited to complete your trainer competency profile on the
        <strong>LTT Trainer Competency Portal</strong>. This portal is used to
        verify your qualifications, credentials and industry experience in line
        with Standards for RTOs 2025.
      </p>
      <p style="margin:0 0 6px;font-size:14px;color:#374151;">Your login details:</p>
      <table cellpadding="0" cellspacing="0" style="background:#f3f4f6;border-radius:8px;padding:16px 20px;margin-bottom:8px;">
        <tr><td style="font-size:13px;color:#6b7280;padding-bottom:6px;">Email</td></tr>
        <tr><td style="font-size:15px;font-weight:600;color:#111827;padding-bottom:12px;">${trainerEmail}</td></tr>
        <tr><td style="font-size:13px;color:#6b7280;padding-bottom:6px;">Temporary password</td></tr>
        <tr><td style="font-size:15px;font-weight:600;color:#111827;">${tempPassword}</td></tr>
      </table>
      <p style="margin:12px 0 4px;font-size:13px;color:#6b7280;">You will be prompted to change your password on first login.</p>
      ${btn("Log in to the portal", PORTAL_URL, "#32ba9a")}
      <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;">
        If you have any questions, contact your compliance officer.
      </p>
    `),
  }),

  // 2. Trainer submits profile — sent to admin
  trainerSubmitted: ({ trainerName, trainerEmail }) => ({
    to: ADMIN_EMAIL,
    subject: `${trainerName} has submitted their competency profile`,
    html: wrap(`
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#081a47;">Profile submission received</h2>
      <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
        <strong>${trainerName}</strong> (${trainerEmail}) has submitted their trainer
        competency profile and industry experience for quality review.
      </p>
      <table cellpadding="0" cellspacing="0" style="background:#fffdf5;border:1px solid #f5d78a;border-radius:8px;padding:16px 20px;margin-bottom:8px;">
        <tr>
          <td>
            <p style="margin:0;font-size:13px;font-weight:600;color:#92500a;">⏳ Awaiting quality review</p>
            <p style="margin:6px 0 0;font-size:13px;color:#374151;">
              Please log in to review their credentials, industry qualifications,
              declaration and industry experience units.
            </p>
          </td>
        </tr>
      </table>
      ${btn("Review trainer profile", `${PORTAL_URL}/trainers`)}
    `),
  }),

  // 3. Section approved — sent to trainer
  sectionApproved: ({ trainerName, trainerEmail, sectionName }) => ({
    to: trainerEmail,
    subject: `✓ ${sectionName} approved — LTT Trainer Portal`,
    html: wrap(`
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#166534;">Section approved ✓</h2>
      <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
        Hi ${trainerName}, your <strong>${sectionName}</strong> has been reviewed
        and approved by the quality team.
      </p>
      <table cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px 20px;margin-bottom:8px;">
        <tr>
          <td>
            <p style="margin:0;font-size:13px;font-weight:600;color:#166534;">✓ ${sectionName} — Approved</p>
            <p style="margin:6px 0 0;font-size:13px;color:#374151;">
              No further action is required for this section.
              Log in to check the status of your other sections.
            </p>
          </td>
        </tr>
      </table>
      ${btn("View your profile", `${PORTAL_URL}/dashboard`)}
    `),
  }),

  // 4. Section rejected — sent to trainer
  sectionRejected: ({ trainerName, trainerEmail, sectionName, notes }) => ({
    to: trainerEmail,
    subject: `Action required: ${sectionName} — LTT Trainer Portal`,
    html: wrap(`
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#c93535;">Action required</h2>
      <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
        Hi ${trainerName}, your <strong>${sectionName}</strong> has been reviewed
        and requires attention before your profile can be approved.
      </p>
      <table cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px 20px;margin-bottom:8px;width:100%;">
        <tr>
          <td>
            <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#c93535;">✗ ${sectionName} — Not approved</p>
            ${
              notes
                ? `
            <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Feedback from the quality team:</p>
            <p style="margin:0;font-size:14px;color:#374151;font-style:italic;line-height:1.6;">"${notes}"</p>
            `
                : `
            <p style="margin:0;font-size:13px;color:#374151;">
              Please review this section and update your information or upload
              additional evidence as required.
            </p>
            `
            }
          </td>
        </tr>
      </table>
      ${btn("Update your profile", `${PORTAL_URL}/profile`, "#c93535")}
      <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;">
        Once you have made the required changes, your compliance officer will be notified to re-review.
      </p>
    `),
  }),

  // 5. Under Review — sent to trainer
  profileUnderReview: ({ trainerName, trainerEmail, notes }) => ({
    to: trainerEmail,
    subject: "Your profile is under review — action required",
    html: wrap(`
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#c93535;">Your profile requires attention</h2>
      <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
        Hi ${trainerName}, your compliance officer has reviewed your trainer
        competency profile and has placed it <strong>Under Review</strong>.
        Please log in to check which sections require attention and follow
        the instructions provided.
      </p>
      ${
        notes
          ? `
      <table cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px 20px;margin-bottom:8px;width:100%;">
        <tr>
          <td>
            <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Notes from your compliance officer:</p>
            <p style="margin:0;font-size:14px;color:#374151;font-style:italic;line-height:1.6;">"${notes}"</p>
          </td>
        </tr>
      </table>
      `
          : ""
      }
      ${btn("View your profile", `${PORTAL_URL}/dashboard`, "#c93535")}
      <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;">
        Once you have addressed all flagged sections, your compliance officer will be notified automatically.
      </p>
    `),
  }),
};

// ── Core send function ─────────────────────────────────────────────────────────
/**
 * Send a transactional email via Resend.
 *
 * @param {keyof typeof TEMPLATES} templateKey
 * @param {object} data  — variables passed to the template
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function sendEmail(templateKey, data) {
  const apiKey = import.meta.env.VITE_RESEND_API_KEY;

  if (!apiKey) {
    console.warn("[sendEmail] VITE_RESEND_API_KEY is not set — skipping email send.");
    return { ok: false, error: "API key not configured" };
  }

  const template = TEMPLATES[templateKey];
  if (!template) {
    console.error(`[sendEmail] Unknown template: "${templateKey}"`);
    return { ok: false, error: `Unknown template: ${templateKey}` };
  }

  const { to, subject, html } = template(data);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body?.message || res.statusText;
      console.error(`[sendEmail] Resend error (${res.status}):`, msg);
      return { ok: false, error: msg };
    }

    return { ok: true };
  } catch (err) {
    console.error("[sendEmail] Network error:", err);
    return { ok: false, error: err.message };
  }
}
