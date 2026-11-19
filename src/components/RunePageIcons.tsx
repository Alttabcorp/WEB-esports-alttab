import Image from "next/image";
import {
  runeIconUrl,
  runeStyleLabel,
  type RuneCatalog,
} from "@/lib/ddragon";

type Props = {
  primaryStyle: number;
  subStyle: number;
  keystone: number;
  primaryPerkIds?: number[];
  subPerkIds?: number[];
  perkIds?: number[];
  runeCatalog: RuneCatalog;
  size?: "sm" | "md";
  showLabels?: boolean;
};

/**
 * Exibe a página completa: árvore + keystone + minors primárias | árvore + secundárias.
 */
export function RunePageIcons({
  primaryStyle,
  subStyle,
  keystone,
  primaryPerkIds,
  subPerkIds,
  perkIds,
  runeCatalog,
  size = "md",
  showLabels = true,
}: Props) {
  const primary =
    primaryPerkIds && primaryPerkIds.length > 0
      ? primaryPerkIds
      : perkIds && perkIds.length > 0
        ? perkIds.slice(0, Math.max(1, perkIds.length - 2))
        : [keystone];
  const secondary =
    subPerkIds && subPerkIds.length > 0
      ? subPerkIds
      : perkIds && perkIds.length > primary.length
        ? perkIds.slice(primary.length)
        : [];

  const primaryTree = runeCatalog.styles[primaryStyle];
  const subTree = runeCatalog.styles[subStyle];
  const icon = size === "sm" ? 22 : 28;
  const keyIcon = size === "sm" ? 28 : 36;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {primaryTree ? (
          <Image
            src={runeIconUrl(primaryTree.icon)}
            alt={primaryTree.name}
            width={icon}
            height={icon}
            className="rounded-md opacity-90"
            title={primaryTree.name}
          />
        ) : null}
        {showLabels ? (
          <span className="text-xs text-zinc-500">
            {primaryTree?.name ?? runeStyleLabel(primaryStyle)}
          </span>
        ) : null}
        {primary.map((id, index) => {
          const meta = runeCatalog.byId[id];
          const dim = index === 0 ? keyIcon : icon;
          if (!meta) {
            return (
              <span
                key={`p-${id}-${index}`}
                className="rounded bg-white/10 px-1 text-[10px] text-zinc-400"
              >
                {id}
              </span>
            );
          }
          return (
            <Image
              key={`p-${id}-${index}`}
              src={runeIconUrl(meta.icon)}
              alt={meta.name}
              width={dim}
              height={dim}
              className="rounded-md bg-black/40"
              title={meta.name}
            />
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {subTree ? (
          <Image
            src={runeIconUrl(subTree.icon)}
            alt={subTree.name}
            width={icon}
            height={icon}
            className="rounded-md opacity-90"
            title={subTree.name}
          />
        ) : null}
        {showLabels ? (
          <span className="text-xs text-zinc-500">
            {subTree?.name ?? runeStyleLabel(subStyle)}
          </span>
        ) : null}
        {secondary.map((id, index) => {
          const meta = runeCatalog.byId[id];
          if (!meta) {
            return (
              <span
                key={`s-${id}-${index}`}
                className="rounded bg-white/10 px-1 text-[10px] text-zinc-400"
              >
                {id}
              </span>
            );
          }
          return (
            <Image
              key={`s-${id}-${index}`}
              src={runeIconUrl(meta.icon)}
              alt={meta.name}
              width={icon}
              height={icon}
              className="rounded-md bg-black/40"
              title={meta.name}
            />
          );
        })}
      </div>
    </div>
  );
}
