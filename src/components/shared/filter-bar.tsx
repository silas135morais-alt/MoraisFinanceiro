"use client";

import Link from "next/link";
import { Search, SlidersHorizontal, X } from "lucide-react";
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

  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString());
    ["q", "status", "type", "accountId", "categoryId", "month"].forEach((key) => params.delete(key));
    navigate(params);
  }

  function isActive(filter: QuickFilter) {
    const entries = Object.entries(filter.params ?? {});
    return entries.length > 0 && entries.every(([key, value]) => searchParams.get(key) === value);
  }

  const activeLabels = (() => {
    const labels = quickFilters.filter((filter) => {
      const entries = Object.entries(filter.params ?? {});
      return !filter.href && entries.length > 0 && entries.every(([key, value]) => searchParams.get(key) === value);
    }).map((filter) => filter.label).filter((label) => label !== "Limpar filtros");
    if (q.trim()) labels.unshift(`Busca: ${q.trim()}`);
    if (status) labels.push(status === "PAID" ? "Recebidas/Pagas" : status === "PENDING" ? "Pendentes" : status === "OVERDUE" ? "Atrasadas" : "Canceladas");
    return [...new Set(labels)];
  })();

  return (
    <div className="space-y-2">
      {quickFilters.length ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {quickFilters.map((filter) => filter.href ? <Link key={filter.label} href={filter.href} className="whitespace-nowrap rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">{filter.label}</Link> : <button key={filter.label} type="button" onClick={() => applyQuickFilter(filter)} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${isActive(filter) ? "border-primary/40 bg-primary/10 text-primary" : "bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>{filter.label}</button>)}
        </div>
      ) : null}
      <form className="flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm sm:flex-row sm:items-center" onSubmit={handleSubmit}>
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md border bg-background px-3 text-sm">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input aria-label={placeholder} className="w-full min-w-0 bg-transparent outline-none placeholder:text-muted-foreground" onChange={(event) => setQ(event.target.value)} placeholder={placeholder} value={q} />
          {q ? <button type="button" aria-label="Limpar busca" className="rounded p-1 text-muted-foreground hover:bg-secondary" onClick={() => { setQ(""); const params = new URLSearchParams(searchParams.toString()); params.delete("q"); navigate(params); }}><X className="size-4" /></button> : null}
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="outline"><SlidersHorizontal className="size-4" />Filtrar</Button>
          <select aria-label="Filtrar por status" className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm outline-none sm:flex-none" onChange={(event) => setStatus(event.target.value)} value={status}>
            <option value="">Todos os status</option>
            <option value="PENDING">Pendente</option>
            <option value="PAID">Recebido/Pago</option>
            <option value="OVERDUE">Atrasado</option>
            <option value="CANCELED">Cancelado</option>
          </select>
        </div>
      </form>
      {activeLabels.length ? <div className="flex flex-wrap items-center gap-2 text-xs" role="status" aria-live="polite"><span className="font-medium text-muted-foreground">Filtros ativos:</span>{activeLabels.map((label) => <span key={label} className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">{label}</span>)}<button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">Limpar <X className="size-3" /></button></div> : null}
    </div>
  );
}
