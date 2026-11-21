"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import type { ChampionCatalogEntry, ItemCatalogEntry } from "@/lib/ddragon";
import { itemIconUrl } from "@/lib/ddragon";
import type { SavedChampionBuildView } from "@/lib/db/persist";
import { ROLE_LABELS, type RoleKey } from "@/lib/stats/roles";
import { ChampionIcon } from "./ChampionIcon";
import { Button, Panel } from "@/components/ui";

const ROLES: RoleKey[] = [
  "UNKNOWN",
  "TOP",
  "JUNGLE",
  "MIDDLE",
  "BOTTOM",
  "UTILITY",
];

type Props = {
  initialBuilds: SavedChampionBuildView[];
  champions: ChampionCatalogEntry[];
  items: ItemCatalogEntry[];
  ddragonVersion: string;
  idToKey: Record<number, string>;
};

export function SavedBuildsManager({
  initialBuilds,
  champions,
  items,
  ddragonVersion,
  idToKey,
}: Props) {
  const [builds, setBuilds] = useState(initialBuilds);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const champIdsWithBuilds = useMemo(() => {
    const ids = new Set(builds.map((b) => b.championId));
    return [...ids].sort((a, b) => {
      const na = builds.find((x) => x.championId === a)?.championName ?? "";
      const nb = builds.find((x) => x.championId === b)?.championName ?? "";
      return na.localeCompare(nb);
    });
  }, [builds]);

  const [selectedId, setSelectedId] = useState<number | null>(
    champIdsWithBuilds[0] ?? null,
  );
  const [champQuery, setChampQuery] = useState("");
  const [itemQuery, setItemQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState<RoleKey>("UNKNOWN");
  const [formItems, setFormItems] = useState<number[]>([]);
  const [formEnemyId, setFormEnemyId] = useState<number | null>(null);
  const [formEnemyQuery, setFormEnemyQuery] = useState("");
  const [formDefault, setFormDefault] = useState(false);
  const [formNotes, setFormNotes] = useState("");

  const selectedChamp =
    champions.find((c) => c.id === selectedId) ??
    (selectedId
      ? {
          id: selectedId,
          key: idToKey[selectedId] ?? String(selectedId),
          name:
            builds.find((b) => b.championId === selectedId)?.championName ??
            "Campeão",
        }
      : null);

  const selectedBuilds = useMemo(
    () =>
      builds
        .filter((b) => b.championId === selectedId)
        .sort(
          (a, b) =>
            Number(b.isDefault) - Number(a.isDefault) ||
            a.sortOrder - b.sortOrder,
        ),
    [builds, selectedId],
  );

  const filteredChamps = useMemo(() => {
    const q = champQuery.trim().toLowerCase();
    if (!q) return champions.slice(0, 40);
    return champions
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 40);
  }, [champions, champQuery]);

  const filteredItems = useMemo(() => {
    const q = itemQuery.trim().toLowerCase();
    const completed = items.filter((i) => i.into.length === 0);
    const pool = completed.length ? completed : items;
    if (!q) return pool.slice(0, 48);
    return pool.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 48);
  }, [items, itemQuery]);

  const enemyOptions = useMemo(() => {
    const q = formEnemyQuery.trim().toLowerCase();
    if (!q) return [];
    return champions
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 12);
  }, [champions, formEnemyQuery]);

  function resetForm() {
    setEditingId(null);
    setFormName("");
    setFormRole("UNKNOWN");
    setFormItems([]);
    setFormEnemyId(null);
    setFormEnemyQuery("");
    setFormDefault(false);
    setFormNotes("");
    setItemQuery("");
  }

  function loadForEdit(b: SavedChampionBuildView) {
    setEditingId(b.id);
    setFormName(b.name);
    setFormRole((b.role as RoleKey) || "UNKNOWN");
    setFormItems(b.items);
    setFormEnemyId(b.enemyChampionId);
    setFormEnemyQuery(b.enemyChampionName ?? "");
    setFormDefault(b.isDefault);
    setFormNotes(b.notes ?? "");
  }

  function addItem(id: number) {
    setFormItems((prev) => {
      if (prev.length >= 6) return prev;
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
  }

  function removeItemAt(idx: number) {
    setFormItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function selectChampion(c: ChampionCatalogEntry) {
    setSelectedId(c.id);
    setChampQuery("");
    resetForm();
  }

  function saveBuild() {
    if (!selectedChamp) {
      setError("Selecione um campeão");
      return;
    }
    if (formItems.length < 1) {
      setError("Adicione ao menos 1 item");
      return;
    }
    setError(null);
    setMessage(null);

    const enemy = formEnemyId
      ? champions.find((c) => c.id === formEnemyId)
      : null;

    startTransition(async () => {
      try {
        const res = await fetch("/api/builds", {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(editingId ? { id: editingId } : {}),
            championId: selectedChamp.id,
            championName: selectedChamp.name,
            name: formName.trim() || "Build",
            role: formRole,
            items: formItems,
            enemyChampionId: formEnemyId,
            enemyChampionName: enemy?.name ?? null,
            isDefault: formDefault,
            notes: formNotes.trim() || null,
          }),
        });
        const data = (await res.json()) as {
          error?: string;
          builds?: SavedChampionBuildView[];
        };
        if (!res.ok) {
          setError(data.error ?? "Falha ao salvar");
          return;
        }
        if (data.builds) {
          setBuilds((prev) => {
            const others = prev.filter(
              (b) => b.championId !== selectedChamp.id,
            );
            return [...others, ...data.builds!];
          });
        }
        setMessage(editingId ? "Build atualizada." : "Build criada.");
        resetForm();
      } catch {
        setError("Erro de rede");
      }
    });
  }

  function removeBuild(id: string) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/builds?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        const data = (await res.json()) as {
          error?: string;
          builds?: SavedChampionBuildView[];
        };
        if (!res.ok) {
          setError(data.error ?? "Falha ao remover");
          return;
        }
        if (data.builds) {
          const champId = builds.find((b) => b.id === id)?.championId;
          setBuilds((prev) => {
            if (champId == null) return data.builds!;
            const others = prev.filter((b) => b.championId !== champId);
            return [...others, ...data.builds!];
          });
        } else {
          setBuilds((prev) => prev.filter((b) => b.id !== id));
        }
        if (editingId === id) resetForm();
        setMessage("Build removida.");
      } catch {
        setError("Erro de rede");
      }
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
      <Panel className="space-y-4 p-4">
        <div>
          <p className="data-label">Campeões</p>
          <input
            value={champQuery}
            onChange={(e) => setChampQuery(e.target.value)}
            placeholder="Buscar campeão para adicionar…"
            className="mt-2 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--alttab)]"
          />
          {champQuery.trim() ? (
            <ul className="mt-2 max-h-48 space-y-1 overflow-auto">
              {filteredChamps.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => selectChampion(c)}
                    className="flex w-full items-center gap-2 rounded-[var(--radius)] px-2 py-1.5 text-left text-sm hover:bg-[var(--surface-2)]"
                  >
                    <ChampionIcon
                      ddragonVersion={ddragonVersion}
                      championId={c.id}
                      nameOrKey={c.key}
                      idToKey={idToKey}
                      alt={c.name}
                      width={28}
                      height={28}
                      className="rounded-md"
                    />
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div>
          <p className="data-label mb-2">Com builds salvas</p>
          {champIdsWithBuilds.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Nenhuma ainda. Busque um campeão acima.
            </p>
          ) : (
            <ul className="space-y-1">
              {champIdsWithBuilds.map((id) => {
                const name =
                  builds.find((b) => b.championId === id)?.championName ??
                  String(id);
                const count = builds.filter((b) => b.championId === id).length;
                const active = id === selectedId;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(id);
                        resetForm();
                      }}
                      className={`flex w-full items-center gap-2 rounded-[var(--radius)] px-2 py-2 text-left text-sm transition ${
                        active
                          ? "bg-[var(--alttab)]/15 ring-1 ring-[var(--alttab)]/40"
                          : "hover:bg-[var(--surface-2)]"
                      }`}
                    >
                      <ChampionIcon
                        ddragonVersion={ddragonVersion}
                        championId={id}
                        nameOrKey={idToKey[id] ?? name}
                        idToKey={idToKey}
                        alt={name}
                        width={32}
                        height={32}
                        className="rounded-md"
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {name}
                      </span>
                      <span className="tabular text-xs text-[var(--muted)]">
                        {count}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Panel>

      <div className="space-y-4">
        {!selectedChamp ? (
          <Panel className="p-5 text-sm text-[var(--muted)]">
            Selecione ou busque um campeão para cadastrar builds.
          </Panel>
        ) : (
          <>
            <Panel className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-3">
                <ChampionIcon
                  ddragonVersion={ddragonVersion}
                  championId={selectedChamp.id}
                  nameOrKey={selectedChamp.key}
                  idToKey={idToKey}
                  alt={selectedChamp.name}
                  width={48}
                  height={48}
                  className="rounded-[var(--radius)]"
                />
                <div>
                  <h2 className="text-xl font-semibold text-[var(--foreground)]">
                    {selectedChamp.name}
                  </h2>
                  <p className="text-sm text-[var(--muted)]">
                    {selectedBuilds.length} build
                    {selectedBuilds.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              {selectedBuilds.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">
                  Nenhuma build neste campeão ainda.
                </p>
              ) : (
                <ul className="space-y-2">
                  {selectedBuilds.map((b) => (
                    <li
                      key={b.id}
                      className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-[var(--foreground)]">
                            {b.name}
                            {b.isDefault ? (
                              <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-[var(--alttab)]">
                                padrão
                              </span>
                            ) : null}
                          </p>
                          <p className="text-xs text-[var(--muted)]">
                            {ROLE_LABELS[(b.role as RoleKey) ?? "UNKNOWN"] ??
                              b.role}
                            {b.enemyChampionName
                              ? ` · vs ${b.enemyChampionName}`
                              : ""}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => loadForEdit(b)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeBuild(b.id)}
                            disabled={pending}
                          >
                            Remover
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {b.items.map((id, idx) => (
                          <Image
                            key={`${b.id}-${id}-${idx}`}
                            src={itemIconUrl(ddragonVersion, id)}
                            alt=""
                            width={36}
                            height={36}
                            className="rounded-md ring-1 ring-[var(--border)]"
                          />
                        ))}
                      </div>
                      {b.notes ? (
                        <p className="mt-2 text-xs text-[var(--muted-strong)]">
                          {b.notes}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel className="space-y-4 p-4 sm:p-5">
              <div>
                <p className="data-label">
                  {editingId ? "Editar build" : "Nova build"}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                  {editingId ? "Atualizar" : "Cadastrar"} · {selectedChamp.name}
                </h3>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="data-label">Nome</span>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex.: Burst AP, Tanky…"
                    className="mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--alttab)]"
                  />
                </label>
                <label className="block text-sm">
                  <span className="data-label">Lane</span>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as RoleKey)}
                    className="mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--alttab)]"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r === "UNKNOWN" ? "Qualquer" : ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <p className="data-label mb-1.5">
                  Ordem dos itens ({formItems.length}/6)
                </p>
                <div className="flex min-h-12 flex-wrap gap-1.5">
                  {formItems.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">
                      Clique nos itens abaixo para montar a ordem.
                    </p>
                  ) : (
                    formItems.map((id, idx) => (
                      <button
                        key={`slot-${id}-${idx}`}
                        type="button"
                        title="Remover"
                        onClick={() => removeItemAt(idx)}
                        className="relative"
                      >
                        <Image
                          src={itemIconUrl(ddragonVersion, id)}
                          alt=""
                          width={40}
                          height={40}
                          className="rounded-md ring-1 ring-[var(--border)]"
                        />
                        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--danger)] text-[9px] font-bold text-white">
                          ×
                        </span>
                      </button>
                    ))
                  )}
                </div>
                <input
                  value={itemQuery}
                  onChange={(e) => setItemQuery(e.target.value)}
                  placeholder="Buscar item…"
                  className="mt-3 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--alttab)]"
                />
                <ul className="mt-2 grid max-h-52 grid-cols-2 gap-1 overflow-auto sm:grid-cols-3">
                  {filteredItems.map((it) => (
                    <li key={it.id}>
                      <button
                        type="button"
                        onClick={() => addItem(it.id)}
                        disabled={formItems.length >= 6}
                        className="flex w-full items-center gap-2 rounded-[var(--radius)] px-1.5 py-1 text-left text-xs hover:bg-[var(--surface-2)] disabled:opacity-40"
                      >
                        <Image
                          src={itemIconUrl(ddragonVersion, it.id)}
                          alt=""
                          width={28}
                          height={28}
                          className="rounded-md"
                        />
                        <span className="truncate">{it.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="data-label">Contra (opcional)</p>
                  <input
                    value={formEnemyQuery}
                    onChange={(e) => {
                      setFormEnemyQuery(e.target.value);
                      setFormEnemyId(null);
                    }}
                    placeholder="Ex.: Zed"
                    className="mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--alttab)]"
                  />
                  {formEnemyId ? (
                    <p className="mt-1 text-xs text-[var(--success)]">
                      Vs{" "}
                      {champions.find((c) => c.id === formEnemyId)?.name ??
                        formEnemyId}
                      <button
                        type="button"
                        className="ml-2 text-[var(--muted)] underline"
                        onClick={() => {
                          setFormEnemyId(null);
                          setFormEnemyQuery("");
                        }}
                      >
                        limpar
                      </button>
                    </p>
                  ) : enemyOptions.length > 0 ? (
                    <ul className="mt-1 max-h-28 space-y-0.5 overflow-auto">
                      {enemyOptions.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setFormEnemyId(c.id);
                              setFormEnemyQuery(c.name);
                            }}
                            className="text-xs text-[var(--alttab-soft)] hover:underline"
                          >
                            {c.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <label className="flex items-center gap-2 pt-5 text-sm">
                  <input
                    type="checkbox"
                    checked={formDefault}
                    onChange={(e) => setFormDefault(e.target.checked)}
                  />
                  Build padrão deste campeão
                </label>
              </div>

              <label className="block text-sm">
                <span className="data-label">Notas</span>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  placeholder="Quando usar esta build…"
                  className="mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--alttab)]"
                />
              </label>

              {error ? (
                <p className="text-sm text-[var(--danger)]">{error}</p>
              ) : null}
              {message ? (
                <p className="text-sm text-[var(--success)]">{message}</p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={saveBuild} disabled={pending}>
                  {editingId ? "Salvar alterações" : "Criar build"}
                </Button>
                {editingId ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={resetForm}
                    disabled={pending}
                  >
                    Cancelar
                  </Button>
                ) : null}
                <Button href="/coach" size="sm" variant="secondary">
                  Abrir Coach
                </Button>
              </div>
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}
