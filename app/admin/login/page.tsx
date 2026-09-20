import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return <main className="login-page"><LoginForm /></main>;
}
