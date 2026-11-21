import { redirect } from "next/navigation";

/** Cadastro de jogadores de referência foi descontinuado. */
export default function ReferenciasPage() {
  redirect("/config");
}
