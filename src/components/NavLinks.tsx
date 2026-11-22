import { MainNav } from "@/components/MainNav";
import { QueueContextChip } from "@/components/QueueContextChip";
import { QueueTrackSwitch } from "@/components/QueueTrackSwitch";
import {
  getAppProfile,
  getDayLpByQueue,
} from "@/lib/db/persist";
import type { QueueFilter } from "@/lib/riot/types";

export async function NavLinks() {
  const profile = await getAppProfile();
  if (!profile) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
        <MainNav hasProfile={false} />
      </div>
    );
  }

  const queue = profile.queue as QueueFilter;
  let dayLp = null as Awaited<ReturnType<typeof getDayLpByQueue>> | null;
  try {
    dayLp = await getDayLpByQueue(profile.playerId, profile.puuid, {
      prefer: queue,
    });
  } catch {
    dayLp = null;
  }
  const active = dayLp?.active ?? null;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
      <QueueContextChip
        trackQueue={queue}
        queueType={active?.queueType ?? null}
        lpDelta={active?.lpDelta ?? null}
        winsToday={active?.winsToday ?? 0}
        lossesToday={active?.lossesToday ?? 0}
      />
      <QueueTrackSwitch current={queue} />
      <MainNav hasProfile />
    </div>
  );
}
