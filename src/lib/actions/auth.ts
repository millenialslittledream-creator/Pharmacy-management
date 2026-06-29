"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const fullName = String(formData.get("full_name"));
  const orgName = String(formData.get("org_name"));

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
  if (signUpError) {
    redirect(`/signup?error=${encodeURIComponent(signUpError.message)}`);
  }

  // With email confirmation enabled, signUp returns no session — the user must
  // confirm via email first. Onboarding (org + profile creation) then happens
  // on first login via the /onboarding fallback in middleware.
  if (!signUpData.session) {
    redirect("/login?message=Check your email to confirm your account, then sign in.");
  }

  const { error: rpcError } = await supabase.rpc("bootstrap_organization", {
    p_org_name: orgName,
    p_full_name: fullName,
  });
  if (rpcError) {
    redirect(`/signup?error=${encodeURIComponent(rpcError.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function acceptInviteSignup(formData: FormData) {
  const supabase = await createClient();
  const token = String(formData.get("token"));
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const fullName = String(formData.get("full_name"));

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
  if (signUpError) {
    redirect(`/invite/${token}?error=${encodeURIComponent(signUpError.message)}`);
  }

  if (!signUpData.session) {
    redirect("/login?message=Check your email to confirm your account, then sign in to accept the invite.");
  }

  const { error: rpcError } = await supabase.rpc("accept_invite", {
    p_token: token,
    p_full_name: fullName,
  });
  if (rpcError) {
    redirect(`/invite/${token}?error=${encodeURIComponent(rpcError.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
