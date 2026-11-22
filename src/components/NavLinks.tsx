import { MainNav } from "@/components/MainNav";
import { QueueTrackSwitch } from "@/components/QueueTrackSwitch";
import { getAppProfile } from "@/lib/db/persist";

export async function NavLinks() {
  const profile = await getAppProfile();
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
      {profile ? <QueueTrackSwitch current={profile.queue} /> : null}
      <MainNav hasProfile={Boolean(profile)} />
    </div>
  );
}
