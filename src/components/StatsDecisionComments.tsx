import type { DecisionCommentBlock } from "@/lib/stats/decisionComments";
import { Panel } from "@/components/ui";

type Props = {
  daily: DecisionCommentBlock;
  general: DecisionCommentBlock;
};

function CommentList({ block }: { block: DecisionCommentBlock }) {
  return (
    <Panel className="space-y-2 p-4">
      <div>
        <p className="data-label">{block.title}</p>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          Gerado pelas suas estatísticas
        </p>
      </div>
      <ul className="space-y-2">
        {block.items.map((item, i) => (
          <li
            key={`${block.title}-${i}`}
            className="text-sm leading-snug text-[var(--muted-strong)]"
          >
            <span className="mr-1.5 text-[var(--alttab)]">·</span>
            {item}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function StatsDecisionComments({ daily, general }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <CommentList block={daily} />
      <CommentList block={general} />
    </div>
  );
}
