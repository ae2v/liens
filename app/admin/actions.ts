"use server";

import { redirect } from "next/navigation";
import { createAdminSession, destroyAdminSession, passwordMatches } from "@/lib/auth";

export type LoginState = { error: string };

export async function loginAction(_: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  if (!passwordMatches(password)) return { error: "Mot de passe incorrect." };
  await createAdminSession();
  redirect("/admin");
}

export async function logoutAction() {
  await destroyAdminSession();
  redirect("/admin/login");
}
