"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/* ===========================
   REGISTRO (SIGN UP)
=========================== */
export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  if (!email || !password) {
    return encodedRedirect("error", "/sign-up", "Email y contraseña son requeridos.");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error(error.code, error.message);
    return encodedRedirect("error", "/sign-up", error.message);
  }

  /**
   * ⚠️ IMPORTANTE
   * El perfil (edu_profiles) se crea:
   * - por trigger en la BD, o
   * - manualmente desde SuperAdmin
   */

  return encodedRedirect(
    "success",
    "/sign-up",
    "Registro exitoso. Revisa tu correo para verificar tu cuenta."
  );
};

/* ===========================
   INICIO DE SESIÓN (SIGN IN)
=========================== */
export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    console.error(error?.message);
    return encodedRedirect(
      "error",
      "/sign-in",
      "Credenciales incorrectas o usuario no encontrado."
    );
  }

  const user = data.user;

  // 🔎 Buscar perfil y rol global
  const { data: profile, error: profileErr } = await supabase
    .from("edu_profiles")
    .select("id, global_role, active")
    .eq("id", user.id)
    .single();

  if (profileErr || !profile) {
    console.error(profileErr);
    return encodedRedirect(
      "error",
      "/sign-in",
      "Tu perfil no existe. Contacta al administrador."
    );
  }

  if (!profile.active) {
    return encodedRedirect(
      "error",
      "/sign-in",
      "Tu cuenta está desactivada. Contacta al administrador."
    );
  }

  // 🚦 Redirect por rol GLOBAL
  switch (profile.global_role) {
    case "admin":
      // Redirect to admin-access page to choose institution
      return redirect("/admin-access");

    case "teacher":
      return redirect("/dashboard/teacher");

    case "student":
      return redirect("/student/exams");

    case "parent":
      return redirect("/parent");

    default:
      return encodedRedirect(
        "error",
        "/sign-in",
        "Tu cuenta no tiene un rol asignado. Contacta al administrador."
      );
  }
};

/* ===========================
   OLVIDÉ MI CONTRASEÑA
=========================== */
export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email requerido");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/protected/reset-password`,
  });

  if (error) {
    console.error(error.message);
    return encodedRedirect(
      "error",
      "/forgot-password",
      "No se pudo enviar el correo de recuperación."
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Revisa tu correo para restablecer tu contraseña."
  );
};

/* ===========================
   RESETEAR CONTRASEÑA
=========================== */
export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return encodedRedirect(
      "error",
      "/protected/reset-password",
      "Contraseña y confirmación son requeridas."
    );
  }

  if (password !== confirmPassword) {
    return encodedRedirect(
      "error",
      "/protected/reset-password",
      "Las contraseñas no coinciden."
    );
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return encodedRedirect(
      "error",
      "/protected/reset-password",
      "Error al actualizar la contraseña."
    );
  }

  return encodedRedirect(
    "success",
    "/protected/reset-password",
    "Contraseña actualizada correctamente."
  );
};

/* ===========================
   CERRAR SESIÓN
=========================== */
export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/sign-in");
};
