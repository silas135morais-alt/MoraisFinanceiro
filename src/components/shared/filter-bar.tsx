"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

type FilterBarProps = {
  placeholder?: string;
};

export function FilterBar({ placeholder = "Pesquisar" }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());

    if (q.trim()) params.set("q", q.trim());
    else params.delete("q");

    if (status) params.set("status", status);
    else params.delete("status");

    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <form className="flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm sm:flex-row sm:items-center" onSubmit={handleSubmit}>
      <label className="flex h-10 flex-1 items-center gap-2 rounded-md border bg-background px-3 text-sm">
        <Search className="size-4 text-muted-foreground" />
        <input
          className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
          onChange={(event) => setQ(event.target.value)}
          placeholder={placeholder}
          value={q}
        />
      </label>
      <div className="flex gap-2">
        <Button type="submit" variant="outline">
          <SlidersHorizontal className="size-4" />
          Filtrar
        </Button>
        <select
          className="h-10 rounded-md border bg-background px-3 text-sm outline-none"
          onChange={(event) => setStatus(event.target.value)}
          value={status}
        >
          <option value="">Todos os status</option>
          <option value="PENDING">Pendente</option>
          <option value="PAID">Recebido/Pago</option>
          <option value="OVERDUE">Atrasado</option>
          <option value="CANCELED">Cancelado</option>
        </select>
      </div>
    </form>
  );
}
