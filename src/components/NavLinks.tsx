import { MainNav } from "@/components/MainNav";
import { getAppProfile } from "@/lib/db/persist";

export async function NavLinks() {
  const profile = await getAppProfile();
  return <MainNav hasProfile={Boolean(profile)} />;
}
