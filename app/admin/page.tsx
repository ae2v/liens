import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getAdminData } from "@/lib/db";
import { AdminDashboard } from "./admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  const data = await getAdminData();
  return <AdminDashboard initialData={data} />;
}
