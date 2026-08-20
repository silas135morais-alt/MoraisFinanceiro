import { redirect } from "next/navigation";

export default function DividasPage() {
  redirect("/app/despesas?view=debts");
}
