import { auth } from "@/lib/auth";
import { getGscAuthStatus } from "@/lib/gsc";
import SeoClient from "./seo-client";

export const dynamic = "force-dynamic";

export default async function AdminSeoPage() {
  const session = await auth();
  const status = await getGscAuthStatus(session?.user?.id);
  return <SeoClient authStatus={status} />;
}
