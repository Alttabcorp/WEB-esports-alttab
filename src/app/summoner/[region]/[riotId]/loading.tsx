export default function LoadingSummoner() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 w-24 rounded bg-white/10" />
      <div className="flex gap-6 rounded-2xl border border-white/10 bg-black/30 p-6">
        <div className="h-24 w-24 rounded-2xl bg-white/10" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-40 rounded bg-white/10" />
          <div className="h-8 w-64 rounded bg-white/10" />
          <div className="h-4 w-48 rounded bg-white/10" />
        </div>
      </div>
      <div className="rounded-xl border border-[#0596aa]/20 bg-[#0596aa]/10 px-4 py-3 text-sm text-[#7dd3de]">
        Buscando partidas na Riot API… isso pode levar alguns segundos na
        primeira análise (rate limit + cache).
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-64 rounded-2xl bg-white/5" />
        <div className="h-64 rounded-2xl bg-white/5" />
      </div>
    </div>
  );
}
