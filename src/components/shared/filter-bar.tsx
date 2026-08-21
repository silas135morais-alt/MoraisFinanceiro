"use client";

import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type QuickFilter = {
  label: string;
  params?: Record<string, string>;
  clear?: string[];
  href?: string;
};

type FilterBarProps = {
  placeholder?: string;
  quickFilters?: QuickFilter[];
};

export function FilterBar({ placeholder = "Pesquisar", quickFilters = [] }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");

  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
    setStatus(searchParams.get("status") ?? "");
  }, [searchParams]);

  function navigate(params: URLSearchParams) {
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());

    if (q.trim()) params.set("q", q.trim());
    else params.delete("q");

    if (status) params.set("status", status);
    else params.delete("status");

    navigate(params);
  }

  function applyQuickFilter(filter: QuickFilter) {
    const params = new URLSearchParams(searchParams.toString());
    (filter.clear ?? []).forEach((key) => params.delete(key));
    Object.entries(filter.params ?? {}).forEach(([key, value]) => params.set(key, value));
    navigate(params);
  }

  function isActive(filter: QuickFilter) {
    const entries = Object.entries(filter.params ?? {});
    return entries.length > 0 && entries.every(([key, value]) => searchParams.get(key) === value);
  }

  return (
    <div className="space-y-2">
      {quickFilters.length ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {quickFilters.map((filter) => filter.href ? <Link key={filter.label} href={filter.href} className="whitespace-nowrap rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">{filter.label}</Link> : <button key={filter.label} type="button" onClick={() => applyQuickFilter(filter)} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${isActive(filter) ? "border-primary/40 bg-primary/10 text-primary" : "bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>{filter.label}</button>)}
        </div>
      ) : null}
      <form className="flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm sm:flex-row sm:items-center" onSubmit={handleSubmit}>
        <label className="flex h-10 flex-1 items-center gap-2 rounded-md border bg-background px-3 text-sm">
          <Search className="size-4 text-muted-foreground" />
          <input className="w-full bg-transparent outline-none placeholder:text-muted-foreground" onChange={(event) => setQ(event.target.value)} placeholder={placeholder} value={q} />
        </label>
        <div className="flex gap-2">
          <Button type="submit" variant="outline"><SlidersHorizontal className="size-4" />Filtrar</Button>
          <select className="h-10 rounded-md border bg-background px-3 text-sm outline-none" onChange={(event) => setStatus(event.target.value)} value={status}>
            <option value="">Todos os status</option>
            <option value="PENDING">Pendente</option>
            <option value="PAID">Recebido/Pago</option>
            <option value="OVERDUE">Atrasado</option>
            <option value="CANCELED">Cancelado</option>
          </select>
        </div>
      </form>
    </div>
  );
}
