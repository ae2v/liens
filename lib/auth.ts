import { cookies } from "next/headers";
import { session, validAdmin } from "./sso";
export async function destroyAdminSession() {
  (await session()).destroy();
  (await cookies()).delete("ae2v_admin");
}
export async function isAdmin() { return validAdmin((await session()).user); }
