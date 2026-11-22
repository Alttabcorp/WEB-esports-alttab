import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ champ?: string }>;
};

export default async function EstatisticasRedirectPage({
  searchParams,
}: PageProps) {
  const sp = await searchParams;
  const q = new URLSearchParams({ tab: "stats" });
  if (sp.champ) q.set("champ", sp.champ);
  redirect(`/analise?${q.toString()}`);
}
