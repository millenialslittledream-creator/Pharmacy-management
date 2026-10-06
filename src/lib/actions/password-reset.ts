"use server";

import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { redirect } from "next/navigation";
import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_HOUR = 3;
const MIN_PASSWORD_LENGTH = 8;

function hashCode(userId: string, code: string) {
  return createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!)
    .update(`${userId}:${code}`)
    .digest("hex");
}

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

async function sendOtpEmail(to: string, code: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: "Your password reset code",
    text: `Your password reset code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes. If you didn't ask for this, you can ignore this email.`,
  });
}

// Always answers the same way whether or not the email belongs to a CEO,
// so this can't be used to discover which emails have accounts. Teammate
// accounts have no self-service recovery — their CEO resets for them.
export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) redirect("/forgot-password?error=Enter your email");

  const admin = createAdminClient();
  const { data: userId } = await admin.rpc("find_ceo_by_email", { p_email: email });

  if (userId) {
    if (!smtpConfigured()) {
      redirect("/forgot-password?error=Email sending isn't set up yet. Please contact support.");
    }

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("password_reset_otps")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since);

    if ((count ?? 0) < MAX_SENDS_PER_HOUR) {
      const code = String(randomInt(100000, 1000000));
      await admin
        .from("password_reset_otps")
        .update({ used_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("used_at", null);
      await admin.from("password_reset_otps").insert({
        user_id: userId,
        code_hash: hashCode(userId, code),
        expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString(),
      });
      try {
        await sendOtpEmail(email, code);
      } catch {
        redirect("/forgot-password?error=Couldn't send the email. Please try again later.");
      }
    }
  }

  redirect(`/forgot-password?step=verify&email=${encodeURIComponent(email)}`);
}

export async function resetPasswordWithOtp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const code = String(formData.get("code") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const back = `/forgot-password?step=verify&email=${encodeURIComponent(email)}`;

  if (password.length < MIN_PASSWORD_LENGTH) {
    redirect(`${back}&error=Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  if (password !== confirm) redirect(`${back}&error=Passwords don't match`);

  const admin = createAdminClient();
  const { data: userId } = await admin.rpc("find_ceo_by_email", { p_email: email });
  const invalid = `${back}&error=That code is invalid or has expired`;
  if (!userId) redirect(invalid);

  const { data: otp } = await admin
    .from("password_reset_otps")
    .select("id, code_hash, attempts")
    .eq("user_id", userId)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!otp || otp.attempts >= MAX_ATTEMPTS) redirect(invalid);

  await admin
    .from("password_reset_otps")
    .update({ attempts: otp.attempts + 1 })
    .eq("id", otp.id);

  const expected = Buffer.from(otp.code_hash, "hex");
  const actual = Buffer.from(hashCode(userId, code), "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) redirect(invalid);

  await admin
    .from("password_reset_otps")
    .update({ used_at: new Date().toISOString() })
    .eq("id", otp.id);

  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) redirect(`${back}&error=${encodeURIComponent(error.message)}`);

  redirect("/login?message=Password updated. Sign in with your new password.");
}
