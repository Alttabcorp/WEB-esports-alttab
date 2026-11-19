/**
 * Backfill PlayerMatch contextual columns from Match.payload.
 * Does not call Riot API.
 *
 * Usage: npm run db:backfill-runes
 */
import "dotenv/config";
import { db } from "../src/lib/db";
import { findAllies, findLanerEnemy } from "../src/lib/stats/aggregate";
import { extractRunesFromParticipant } from "../src/lib/stats/runes";
import { extractSpells } from "../src/lib/stats/spells";
import { normalizeRole } from "../src/lib/stats/roles";
import type { MatchDto } from "../src/lib/riot/types";

const BATCH = 100;

async function main() {
  let cursor: string | undefined;
  let updated = 0;
  let scanned = 0;

  for (;;) {
    const rows = await db.playerMatch.findMany({
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      include: {
        player: { select: { puuid: true } },
        match: { select: { payload: true } },
      },
    });

    if (rows.length === 0) break;

    for (const row of rows) {
      scanned += 1;
      cursor = row.id;
      const match = row.match.payload as unknown as MatchDto;
      const me = match.info?.participants?.find(
        (p) => p.puuid === row.player.puuid,
      );
      if (!me) continue;

      const role = normalizeRole(me.teamPosition, me.individualPosition);
      const enemy = findLanerEnemy(match, me);
      const allies = findAllies(match, me);
      const runes = extractRunesFromParticipant(me);
      const spells = extractSpells(me);
      const items = [
        me.item0,
        me.item1,
        me.item2,
        me.item3,
        me.item4,
        me.item5,
      ];

      await db.playerMatch.update({
        where: { id: row.id },
        data: {
          role,
          items,
          enemyChampionId: enemy?.championId ?? null,
          allyChampionIds: allies.map((a) => a.championId),
          primaryStyle: runes.primaryStyle,
          subStyle: runes.subStyle,
          keystone: runes.keystone,
          perkIds: runes.perkIds,
          runeFingerprint: runes.runeFingerprint,
          summoner1Id: spells.summoner1Id,
          summoner2Id: spells.summoner2Id,
          spellFingerprint: spells.spellFingerprint,
        },
      });
      updated += 1;
    }

    if (rows.length < BATCH) break;
  }

  console.log(`Backfill done. scanned=${scanned} updated=${updated}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
