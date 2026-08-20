import { redirect } from "next/navigation";

export default function BudgetsPage() {
  redirect("/app/despesas?view=planning");
}
