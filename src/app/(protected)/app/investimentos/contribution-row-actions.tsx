"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type ContributionRowActionsProps = {
  id: string;
};

export function ContributionRowActions({ id }: ContributionRowActionsProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function remove() {
    const confirmed = window.confirm("Apagar este aporte? O valor tambem sera removido do investimento.");

    if (!confirmed) return;

    setIsSubmitting(true);
    await fetch(`/api/investment-contributions/${id}`, { method: "DELETE" });
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <Button disabled={isSubmitting} onClick={remove} size="sm" type="button" variant="outline">
      <Trash2 className="size-4" />
      Apagar
    </Button>
  );
}
