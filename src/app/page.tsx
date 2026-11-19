import { SearchForm } from "@/components/SearchForm";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center gap-10 py-8 sm:py-16">
      <div className="max-w-2xl text-center">
        <p className="mb-3 text-xs uppercase tracking-[0.25em] text-[#7dd3de]">
          Coach estatístico
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold leading-tight text-white sm:text-5xl">
          League{" "}
          <span className="bg-gradient-to-r from-[#0596aa] to-[#7dd3de] bg-clip-text text-transparent">
            Persua
          </span>
        </h1>
        <p className="mt-4 text-base text-zinc-300 sm:text-lg">
          Qual campeão escolher? Qual build você vence mais? Respostas com
          Wilson score, amostra mínima e lift vs o seu próprio baseline — não
          achismo de WR 100% em 1 jogo.
        </p>
      </div>

      <SearchForm />

      <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
        {[
          {
            title: "Wilson score",
            body: "Ranking justo com amostras pequenas.",
          },
          {
            title: "Builds pessoais",
            body: "Itens com os quais você realmente fecha vitórias.",
          },
          {
            title: "Matchups",
            body: "Confrontos de lane com confiança estatística.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-white/10 bg-black/25 p-4 text-left"
          >
            <p className="font-[family-name:var(--font-display)] text-sm text-[#7dd3de]">
              {item.title}
            </p>
            <p className="mt-2 text-sm text-zinc-400">{item.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
