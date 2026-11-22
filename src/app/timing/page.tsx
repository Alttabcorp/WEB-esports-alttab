import { redirect } from "next/navigation";

export default function TimingRedirectPage() {
  redirect("/analise?tab=quando");
}
