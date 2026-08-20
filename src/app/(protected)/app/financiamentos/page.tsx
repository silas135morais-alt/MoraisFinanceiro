import { redirect } from "next/navigation";

export default function FinanciamentosPage() {
  redirect("/app/despesas?type=FINANCING");
}
