import { MainNav } from "@/components/MainNav";
import { getAppProfile } from "@/lib/db/persist";
import { encodeRiotId } from "@/lib/format";

export async function NavLinks() {
  const profile = await getAppProfile();
  if (!profile) {
    return <MainNav prepHref={null} />;
  }

  const slug = encodeRiotId(profile.gameName, profile.tagLine);
  const qs = `queue=${profile.queue}&count=${profile.matchCount}`;
  const prepHref = `/summoner/${profile.platform}/${slug}?${qs}`;

  return <MainNav prepHref={prepHref} />;
}
