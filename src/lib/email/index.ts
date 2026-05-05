import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = "Luna <noreply@luna.a3ro.dev>";

/* ──────────────────────────────────────────────────────────────
   Shared layout — every email wraps its body in this shell
   ────────────────────────────────────────────────────────────── */

function emailShell(bodyHtml: string, footerText: string = "") {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Luna</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0; padding:0; background-color:#FFF9F9; -webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFF9F9; min-height:100vh;">
    <tr>
      <td align="center" style="padding:48px 24px;">

        <!-- Outer card -->
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px; width:100%; background:rgba(255,255,255,0.70); border:1px solid rgba(255,221,224,0.45); border-radius:40px; backdrop-filter:blur(24px); overflow:hidden;">
          <tr>
            <td style="padding:48px 44px 40px 44px;">

              <!-- Logo -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:36px; text-align:center;">
                    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFgAAABYCAMAAABGS8AGAAAA+VBMVEVMaXHLuuXGt+L+nbv+1t/IuOS3nNf+09/hw9vmvuv+o779mLjgt9z+1d+zmta5odn9k7b+qcH+vsnXs9Latd27mtTKt+LtvNK4mtXRsdDStN3CruDvp8vJteDepdDMtt3Ftd/qq9Dju9H1ncLDstzMrdv0wdb2q8q9p9z+y9X+1+DZueD91eHJt+L1yd78u8v+ucj7v83+1eDGteHDndPQnNH5t8r9y9jKtt3HuOP+s8XGtuDestj2sM/NueP91+Hfud3RuOLFpdf91N//3OXGqNm8ntbVxPH+tMr+r8X/5O7Qv+z+v9L/2uT+zNXuu93/3+nhwuvvxep9dHZQAAAAR3RSTlMA/v3+/v7+/gMB/v79+/7+/v79EP3+/Sj+CP3+/rL+YHr+Gf45/jz+/mG++6vd/uScT+HH/v7Jdk3x94uY/suTuaH91e7c+CluI20AAAAJcEhZcwAACxMAAAsTAQCanBgAAAQaSURBVHja7ZhbU+JKFIU7IZfuYIhcQ4gIclABRQUUBC8zOp4iMeHm//8xZ3cnYTyXMY3mZepkPUhhVT5Wrd69u3cQSpUqVar/tTAmvw2VMGqrayKSONac9KTzYqJgwBa7Pf31pZssFqPiZLher3stlGTMGJHu8HWhr38AN8l0kdlbL3R9MTQT5nZf1rquSuogUS7B3yAFSZWkq0S5yDp/1SXgLmdJFjBwe5QrSbqfpGFCCPMLhgvuSYJgjL4FfqWlO8ZxSRDCz+2uA640cziSINwBmy8LunCq5GtONwZMULvIbTgIGBJ2NSeuiDF6uuNbBYwGi5C71LTYtcOoOeVrfAT1WMKQRCGjuWYsuDFv8ljG6GShMq4q5TM8jhvzEeawHJWaSpMAcHzGTU9s85ROcRiUBICzmfiqwOjOEziyYEkEUUg+BV/FllvdE+rxUWA0edUBSh072UzGHZO4rtKXxb4VS2ZFrDIxsJb/uLlh1BZFccpzFECxvQNnnMmHz0DEc1EUYlePIPxj8Tdw/vKj8oe17gui6N3Gg63hT/A+zeJDy6zYRHHe2Ans72ehLvKzXwcICXdkTjBEoYbgJQNrztj6xWNw7RjZwOWI4v3iqcssyyLvX8HR+p9cq27b1LEcv/XelZsqaUEWQMb/fhB+q1i3DWpYnpocdTz5CXb2w5T9cesfd1n67eRP22ARC1wb5CTKmIa8H4Qx8y+7hNIwnLMEPoDTuj/uKApLwuPY0qwJbcn50LI7KyzHA+vd77fvSyVFUVgSIldDhra5XT0ouNAyJS8vrwZmq1hsmYP78d7qOacoOWaYZ+1YFrQDqXq4fEHJ5d1CAdDLwiXoYbVaHT7nckrOkEVZFr1HwnM2EXQeWtaZ5WxgmZJBvu8/HB0dHV7nqAALYL6jiVq+UCPPkhuC865DuY7zQLk3ZcgBghCoYWHa4rtawIH+FqWsqhoLmVp2QKenB9RutapAEB15F8PswrK3utiW3B9U1LLrAvbg6PCmXK1WIQcj4Hp97rEHDt63LVryGfmUKcIqwFXkQFx9Yku+f9vbC9mSfxAKqNeAVWi8OUMMg7jb4TYKzfM7JVP2xYW6OqS6YdQtVw65I2uXeznsv4BcKtG/x9dlEEDLihJwOxH3cce5ckum7FotINMtzLiGLUTcnQc16LWQcylQ7fj4uQwZGAYFG7YccIV5/RNzMLTbxtmmVDqjjin52WDq2JXQLlyACPnE3EMHyO+bzdlZjYFtuwOyxQrzWpG9+aj92TkYuu7tY4iuhKLYiix4837D+vzUAw0d39Zrm40nCBG5IgjzuTCiWPy11wqo1aj3ARbJm46abYLIV4c0FqNlNppPddDTXaPdItFrly+P6zjmH18a2dlBitlH+k4vVapUqVL9hvoL4xSQaFnUrQAAAAAASUVORK5CYII=" alt="Luna" width="44" height="44" style="border-radius:50%; display:inline-block; vertical-align:middle; margin-bottom:8px;" />
                    <h1 style="font-family:Georgia,'Times New Roman',serif; font-weight:300; font-size:36px; color:#6D5A60; margin:0; letter-spacing:-0.02em;">
                      Luna
                    </h1>
                    <div style="width:40px; height:3px; background:linear-gradient(90deg,#FFB5C0,#D6CBE3); border-radius:2px; margin:14px auto 0;"></div>
                  </td>
                </tr>
              </table>

              <!-- Body content -->
              ${bodyHtml}

            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px; width:100%;">
          <tr>
            <td style="padding:28px 44px 0 44px; text-align:center;">
              ${
                footerText
                  ? `<p style="font-family:'DM Sans',Helvetica,Arial,sans-serif; font-size:12px; line-height:1.6; color:#8E7D82; opacity:0.55; margin:0 0 8px 0;">${footerText}</p>`
                  : ""
              }
              <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif; font-size:10px; letter-spacing:0.25em; text-transform:uppercase; color:#8E7D82; opacity:0.35; margin:0;">
                Luna &mdash; your caring cycle companion
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ──────────────────────────────────────────────────────────────
   Reusable styled elements
   ────────────────────────────────────────────────────────────── */

const paragraph = (text: string) =>
  `<p style="font-family:'DM Sans',Helvetica,Arial,sans-serif; font-size:15px; line-height:1.75; color:#8E7D82; margin:0 0 20px 0;">${text}</p>`;

const heading = (text: string) =>
  `<h2 style="font-family:Georgia,'Times New Roman',serif; font-weight:300; font-size:24px; color:#6D5A60; margin:0 0 20px 0; line-height:1.3;">${text}</h2>`;

const ctaButton = (label: string, url: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 28px 0;">
    <tr>
      <td style="background:#6D5A60; border-radius:999px;">
        <a href="${url}" target="_blank" style="display:inline-block; padding:15px 36px; font-family:'DM Sans',Helvetica,Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:0.22em; text-transform:uppercase; color:#ffffff; text-decoration:none;">${label}</a>
      </td>
    </tr>
  </table>`;

const softDivider = () =>
  `<div style="height:1px; background:linear-gradient(90deg,transparent,rgba(255,181,192,0.35),transparent); margin:28px 0;"></div>`;

const infoRow = (label: string, value: string) =>
  `<tr>
    <td style="font-family:'DM Sans',Helvetica,Arial,sans-serif; font-size:11px; letter-spacing:0.2em; text-transform:uppercase; color:#FFB5C0; padding:6px 16px 6px 0; white-space:nowrap; vertical-align:top;">${label}</td>
    <td style="font-family:'DM Sans',Helvetica,Arial,sans-serif; font-size:14px; color:#6D5A60; padding:6px 0; vertical-align:top;">${value}</td>
  </tr>`;

const smallMuted = (text: string) =>
  `<p style="font-family:'DM Sans',Helvetica,Arial,sans-serif; font-size:12px; line-height:1.6; color:#8E7D82; opacity:0.6; margin:8px 0 0 0;">${text}</p>`;

/* ──────────────────────────────────────────────────────────────
   1. Welcome email — sent on signup
   ────────────────────────────────────────────────────────────── */

interface SendWelcomeEmailParams {
  to: string;
  userName?: string;
}

export async function sendWelcomeEmail({
  to,
  userName,
}: SendWelcomeEmailParams) {
  const greeting = userName ? `hey ${userName}` : "hey there";

  const body = `
    ${heading("Welcome to Luna ✨")}
    ${paragraph(`${greeting}, your cycle companion is ready.`)}
    ${paragraph("Luna learns your rhythm without making your body feel like a dashboard. No clinical tone, no harsh numbers — just soft, personal tracking that adapts as you go.")}
    ${softDivider()}
    ${paragraph('<strong style="color:#6D5A60;">Here\'s how to get started:</strong>')}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
      <tr>
        <td style="padding:8px 0; vertical-align:top;">
          <span style="display:inline-block; width:28px; height:28px; line-height:28px; text-align:center; background:#FFDDE0; border-radius:50%; font-family:Georgia,serif; font-size:13px; color:#6D5A60; margin-right:14px;">1</span>
        </td>
        <td style="padding:8px 0; font-family:'DM Sans',Helvetica,Arial,sans-serif; font-size:14px; color:#6D5A60; line-height:1.6;">
          <strong>Complete onboarding</strong> — tell us your birthday, timezone, and a bit about your health so we can personalize predictions.
        </td>
      </tr>
      <tr>
        <td style="padding:8px 0; vertical-align:top;">
          <span style="display:inline-block; width:28px; height:28px; line-height:28px; text-align:center; background:#D6CBE3; border-radius:50%; font-family:Georgia,serif; font-size:13px; color:#6D5A60; margin-right:14px;">2</span>
        </td>
        <td style="padding:8px 0; font-family:'DM Sans',Helvetica,Arial,sans-serif; font-size:14px; color:#6D5A60; line-height:1.6;">
          <strong>Log your period</strong> — type naturally in chat or tap the button on your dashboard.
        </td>
      </tr>
      <tr>
        <td style="padding:8px 0; vertical-align:top;">
          <span style="display:inline-block; width:28px; height:28px; line-height:28px; text-align:center; background:#FBE6B6; border-radius:50%; font-family:Georgia,serif; font-size:13px; color:#6D5A60; margin-right:14px;">3</span>
        </td>
        <td style="padding:8px 0; font-family:'DM Sans',Helvetica,Arial,sans-serif; font-size:14px; color:#6D5A60; line-height:1.6;">
          <strong>Let Luna learn</strong> — predictions improve with every cycle you log. The more you share, the softer and smarter it gets.
        </td>
      </tr>
    </table>
    ${softDivider()}
    ${paragraph("We're so glad you're here 💕")}
  `;

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "Welcome to Luna ✨",
    html: emailShell(
      body,
      "You're receiving this because you signed up for Luna.",
    ),
  });

  if (error) {
    console.error("Resend welcome email error:", error);
    return null;
  }

  return data;
}

/* ──────────────────────────────────────────────────────────────
   2. Login notification — sent on sign-in from a new device/location
   ────────────────────────────────────────────────────────────── */

export interface LoginLocationInfo {
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  browser?: string;
  os?: string;
  device?: string;
  timestamp: string;
}

interface SendLoginNotificationParams {
  to: string;
  userName?: string;
  location: LoginLocationInfo;
}

export async function sendLoginNotification({
  to,
  userName,
  location,
}: SendLoginNotificationParams) {
  const greeting = userName ? `${userName}` : "there";

  const locationLabel = [location.city, location.region, location.country]
    .filter(Boolean)
    .join(", ");

  const body = `
    ${heading("New sign-in to Luna")}
    ${paragraph(`Hey ${greeting}, we noticed a new sign-in to your Luna account. If this was you, no further action is needed.`)}
    ${softDivider()}
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin:0 0 24px 0; background:rgba(255,221,224,0.12); border-radius:20px; overflow:hidden;">
      <tr>
        <td style="padding:24px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
            ${locationLabel ? infoRow("Location", locationLabel) : ""}
            ${location.ip ? infoRow("IP address", location.ip) : ""}
            ${location.browser ? infoRow("Browser", location.browser) : ""}
            ${location.os ? infoRow("Operating system", location.os) : ""}
            ${location.device ? infoRow("Device", location.device) : ""}
            ${infoRow("Time", location.timestamp)}
          </table>
        </td>
      </tr>
    </table>
    ${softDivider()}
    ${paragraph('<strong style="color:#6D5A60;">Wasn\'t you?</strong>')}
    ${paragraph("If you don't recognise this activity, please change your password immediately and reach out to us.")}
    ${ctaButton("Change password", `${process.env.NEXT_PUBLIC_APP_URL || "https://luna.app"}/settings`)}
  `;

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "New sign-in to your Luna account",
    html: emailShell(
      body,
      "You're receiving this because a new sign-in was detected on your Luna account.",
    ),
  });

  if (error) {
    console.error("Resend login notification error:", error);
    return null;
  }

  return data;
}

/* ──────────────────────────────────────────────────────────────
   3. Password reset email
   ────────────────────────────────────────────────────────────── */

interface SendPasswordResetEmailParams {
  to: string;
  resetUrl: string;
  userName?: string;
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
  userName,
}: SendPasswordResetEmailParams) {
  const greeting = userName ? `hey ${userName}` : "hey there";

  const body = `
    ${heading("Reset your password")}
    ${paragraph(`${greeting}, we got a request to reset the password for your Luna account. Tap the button below and we'll get you sorted.`)}
    ${ctaButton("Reset password", resetUrl)}
    ${softDivider()}
    ${smallMuted("This link expires in <strong>1 hour</strong>. After that, you'll need to request a new one.")}
    ${paragraph("If you didn't ask to reset your password, you can safely ignore this email — your account is safe 💕")}
  `;

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "Reset your Luna password",
    html: emailShell(
      body,
      "You're receiving this because a password reset was requested for your Luna account.",
    ),
  });

  if (error) {
    console.error("Resend password reset error:", error);
    throw new Error("Failed to send password reset email");
  }

  return data;
}

/* ──────────────────────────────────────────────────────────────
   4. OTP verification email — sent during onboarding
   ────────────────────────────────────────────────────────────── */

interface SendOtpEmailParams {
  to: string;
  otp: string;
  userName?: string;
}

export async function sendOtpEmail({ to, otp, userName }: SendOtpEmailParams) {
  const greeting = userName ? `hey ${userName}` : "hey there";

  const body = `
    ${heading("Verify your email")}
    ${paragraph(`${greeting}, here's your verification code. It expires in 10 minutes.`)}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:12px 0 28px 0;">
      <tr>
        <td style="background:linear-gradient(135deg,#FFDDE0 0%,#D6CBE3 100%); border-radius:20px; padding:20px 40px; text-align:center;">
          <span style="font-family:'DM Sans',Helvetica,Arial,sans-serif; font-size:36px; font-weight:600; letter-spacing:0.35em; color:#6D5A60;">${otp}</span>
        </td>
      </tr>
    </table>
    ${smallMuted("If you didn't create a Luna account, you can safely ignore this email.")}
  `;

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "Your Luna verification code",
    html: emailShell(
      body,
      "You're receiving this because you signed up for Luna.",
    ),
  });

  if (error) {
    console.error("Resend OTP email error:", error);
    throw new Error("Failed to send verification email");
  }

  return data;
}

/* ──────────────────────────────────────────────────────────────
   IP → Location helper (uses free ip-api.com)
   ────────────────────────────────────────────────────────────── */

interface IpGeoResult {
  city?: string;
  region?: string;
  country?: string;
}

export async function geoLocateIp(ip: string): Promise<IpGeoResult> {
  try {
    // Skip local/private IPs
    if (
      !ip ||
      ip === "127.0.0.1" ||
      ip === "::1" ||
      ip.startsWith("192.168.") ||
      ip.startsWith("10.")
    ) {
      return {};
    }
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,city,regionName,country`,
      {
        signal: AbortSignal.timeout(3000),
      },
    );
    const data = await res.json();
    if (data?.status === "success") {
      return {
        city: data.city || undefined,
        region: data.regionName || undefined,
        country: data.country || undefined,
      };
    }
    return {};
  } catch {
    return {};
  }
}

/* ──────────────────────────────────────────────────────────────
   User-Agent parser (lightweight, no deps)
   ────────────────────────────────────────────────────────────── */

export function parseUserAgent(ua: string): {
  browser?: string;
  os?: string;
  device?: string;
} {
  if (!ua) return {};

  let browser: string | undefined;
  let os: string | undefined;
  let device: string | undefined;

  // Browser detection
  if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/") && !ua.includes("Edg/")) browser = "Chrome";
  else if (ua.includes("Safari/") && !ua.includes("Chrome/"))
    browser = "Safari";
  else if (ua.includes("OPR/") || ua.includes("Opera/")) browser = "Opera";

  // OS detection
  if (ua.includes("Windows NT")) os = "Windows";
  else if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Linux") && !ua.includes("Android")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  // Device type
  if (ua.includes("Mobile") || ua.includes("iPhone") || ua.includes("Android"))
    device = "Mobile";
  else if (ua.includes("iPad") || ua.includes("Tablet")) device = "Tablet";
  else device = "Desktop";

  return { browser, os, device };
}

/* ──────────────────────────────────────────────────────────────
   5. Subscription request — notifies admin of a new paid plan interest
   ────────────────────────────────────────────────────────────── */

interface SendSubscriptionRequestParams {
  subscriberEmail: string;
  planName: string;
  subscriberName?: string;
}

export async function sendSubscriptionRequestEmail({
  subscriberEmail,
  planName,
  subscriberName,
}: SendSubscriptionRequestParams) {
  const adminEmail = "akshatsingh14372@outlook.com";
  const now = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "full",
    timeStyle: "short",
  });

  const body = `
    ${heading("New Subscription Request ✨")}
    ${paragraph("Someone wants to subscribe to Luna! Here are the details:")}
    ${softDivider()}
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin:0 0 24px 0; background:rgba(255,221,224,0.12); border-radius:20px; overflow:hidden;">
      <tr>
        <td style="padding:24px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
            ${infoRow("Plan", planName)}
            ${infoRow("Email", subscriberEmail)}
            ${subscriberName ? infoRow("Name", subscriberName) : ""}
            ${infoRow("Requested at", now)}
          </table>
        </td>
      </tr>
    </table>
    ${softDivider()}
    ${paragraph("Reply directly to this person or add them to your subscription list manually.")}
    ${ctaButton("Reply to subscriber", `mailto:${subscriberEmail}?subject=Welcome to Luna ${planName}!`)}
  `;

  // Also send a confirmation to the subscriber
  const subscriberBody = `
    ${heading("We got your request! 💕")}
    ${paragraph(`${subscriberName ? `hey ${subscriberName}` : "hey there"}, thanks for your interest in <strong style="color:#6D5A60;">${planName}</strong>!`)}
    ${paragraph("We're handling subscriptions personally right now to make sure every Luna experience feels right. You'll hear from us soon with next steps.")}
    ${softDivider()}
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin:0 0 24px 0; background:rgba(214,203,227,0.12); border-radius:20px; overflow:hidden;">
      <tr>
        <td style="padding:24px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
            ${infoRow("Plan", planName)}
            ${infoRow("Your email", subscriberEmail)}
          </table>
        </td>
      </tr>
    </table>
    ${paragraph("In the meantime, you can keep using Luna Free — we're just a chat away ✨")}
  `;

  const results = await Promise.allSettled([
    // Notify admin
    resend.emails.send({
      from: FROM_ADDRESS,
      to: adminEmail,
      subject: `🌙 New subscription request: ${planName}`,
      replyTo: subscriberEmail,
      html: emailShell(
        body,
        "Luna subscription notification — sent automatically.",
      ),
    }),
    // Confirm to subscriber
    resend.emails.send({
      from: FROM_ADDRESS,
      to: subscriberEmail,
      subject: "We got your Luna subscription request ✨",
      html: emailShell(
        subscriberBody,
        "You're receiving this because you requested a Luna subscription.",
      ),
    }),
  ]);

  const adminResult = results[0];
  if (adminResult.status === "rejected") {
    console.error("Failed to send admin notification:", adminResult.reason);
  }
  const subscriberResult = results[1];
  if (subscriberResult.status === "rejected") {
    console.error(
      "Failed to send subscriber confirmation:",
      subscriberResult.reason,
    );
  }

  return {
    adminSent: adminResult.status === "fulfilled",
    subscriberSent: subscriberResult.status === "fulfilled",
  };
}
