import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ championId: string }>;
};

/**
 * Dossiê separado foi removido — estatísticas do champ ficam no Ranking
 * (detalhe ao clicar) e em Estatísticas (filtro por lane).
 */
export default async function CampeaoRedirectPage({ params }: PageProps) {
  const { championId } = await params;
  const id = Number(championId);
  if (Number.isFinite(id)) {
    redirect(`/estatisticas?champ=${id}`);
  }
  redirect("/ranking");
}
