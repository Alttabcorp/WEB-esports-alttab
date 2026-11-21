"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  championIconUrl,
  resolveChampionKey,
} from "@/lib/ddragon";

type Props = {
  ddragonVersion: string;
  championId?: number | null;
  /** Nome LCU / Riot / chave DDragon. */
  nameOrKey?: string | null;
  idToKey?: Record<number, string>;
  keyToId?: Record<string, number>;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
};

/**
 * Ícone de campeão com resolução robusta de chave + fallback se a imagem falhar.
 */
export function ChampionIcon({
  ddragonVersion,
  championId = null,
  nameOrKey = null,
  idToKey = {},
  keyToId = {},
  alt = "",
  width = 40,
  height = 40,
  className = "rounded-[var(--radius)]",
}: Props) {
  const [broken, setBroken] = useState(false);

  const key = useMemo(
    () =>
      resolveChampionKey(
        { championId, nameOrKey },
        { idToKey, keyToId },
      ),
    [championId, nameOrKey, idToKey, keyToId],
  );

  if (!key || broken) {
    return (
      <span
        className={`inline-flex items-center justify-center bg-[var(--surface-2)] text-[10px] font-semibold text-[var(--muted)] ring-1 ring-[var(--border)] ${className}`}
        style={{ width, height }}
        title={alt || nameOrKey || (championId ? `#${championId}` : "champ")}
        aria-hidden={!alt}
      >
        {(alt || nameOrKey || "?").slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    <Image
      src={championIconUrl(ddragonVersion, key)}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={() => setBroken(true)}
    />
  );
}
