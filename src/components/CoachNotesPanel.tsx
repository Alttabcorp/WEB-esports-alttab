"use client";

import { useState, useTransition } from "react";
import { Button, Panel } from "@/components/ui";

type NotesPayload = {
  dailyNote: string;
  generalNote: string;
  dailyStale?: boolean;
  todayKey?: string;
};

type Props = {
  initial: NotesPayload;
};

export function CoachNotesPanel({ initial }: Props) {
  const [dailyNote, setDailyNote] = useState(initial.dailyNote);
  const [generalNote, setGeneralNote] = useState(initial.generalNote);
  const [pendingDaily, startDaily] = useTransition();
  const [pendingGeneral, startGeneral] = useTransition();
  const [msgDaily, setMsgDaily] = useState<string | null>(
    initial.dailyStale
      ? "Novo dia — escreva o comentário de hoje."
      : null,
  );
  const [msgGeneral, setMsgGeneral] = useState<string | null>(null);
  const [errDaily, setErrDaily] = useState<string | null>(null);
  const [errGeneral, setErrGeneral] = useState<string | null>(null);

  function saveDaily() {
    setErrDaily(null);
    setMsgDaily(null);
    startDaily(async () => {
      try {
        const res = await fetch("/api/notes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dailyNote }),
        });
        const data = (await res.json()) as {
          error?: string;
          notes?: NotesPayload;
        };
        if (!res.ok) {
          setErrDaily(data.error ?? "Falha ao salvar");
          return;
        }
        if (data.notes) setDailyNote(data.notes.dailyNote);
        setMsgDaily("Comentário do dia salvo.");
      } catch {
        setErrDaily("Erro de rede");
      }
    });
  }

  function saveGeneral() {
    setErrGeneral(null);
    setMsgGeneral(null);
    startGeneral(async () => {
      try {
        const res = await fetch("/api/notes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ generalNote }),
        });
        const data = (await res.json()) as {
          error?: string;
          notes?: NotesPayload;
        };
        if (!res.ok) {
          setErrGeneral(data.error ?? "Falha ao salvar");
          return;
        }
        if (data.notes) setGeneralNote(data.notes.generalNote);
        setMsgGeneral("Comentário geral salvo.");
      } catch {
        setErrGeneral("Erro de rede");
      }
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Panel className="space-y-2 p-4">
        <div>
          <p className="data-label">Comentário do dia</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Foco, tilt, meta de hoje — zera na virada do dia.
          </p>
        </div>
        <textarea
          value={dailyNote}
          onChange={(e) => setDailyNote(e.target.value)}
          rows={5}
          placeholder="Ex.: só Flex com Ornn; parar em −20."
          className="w-full resize-y rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--alttab)]"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={saveDaily}
            disabled={pendingDaily}
          >
            {pendingDaily ? "Salvando…" : "Salvar dia"}
          </Button>
          {msgDaily ? (
            <span className="text-xs text-[var(--success)]">{msgDaily}</span>
          ) : null}
          {errDaily ? (
            <span className="text-xs text-[var(--danger)]">{errDaily}</span>
          ) : null}
        </div>
      </Panel>

      <Panel className="space-y-2 p-4">
        <div>
          <p className="data-label">Comentário geral</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Hábitos, foco de patch, regras que valem sempre.
          </p>
        </div>
        <textarea
          value={generalNote}
          onChange={(e) => setGeneralNote(e.target.value)}
          rows={5}
          placeholder="Ex.: não draftar assassinos se estiver tiltado."
          className="w-full resize-y rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--alttab)]"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={saveGeneral}
            disabled={pendingGeneral}
          >
            {pendingGeneral ? "Salvando…" : "Salvar geral"}
          </Button>
          {msgGeneral ? (
            <span className="text-xs text-[var(--success)]">{msgGeneral}</span>
          ) : null}
          {errGeneral ? (
            <span className="text-xs text-[var(--danger)]">{errGeneral}</span>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
