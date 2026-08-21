"use client";

import type { Session } from "next-auth";
import {
  Activity,
  CreditCard,
  Landmark,
  LayoutDashboard,
  LineChart,
  ListChecks,
  Receipt,
  ShieldCheck,
  Wallet,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Resumo", href: "/app", icon: LayoutDashboard },
  { label: "Diagnóstico", href: "/app/diagnostico", icon: Activity },
  { label: "Receitas", href: "/app/receitas", icon: TrendingDown },
  { label: "Despesas", href: "/app/despesas", icon: Receipt },
  { label: "Cartões", href: "/app/cartoes", icon: CreditCard },
  { label: "Investimentos", href: "/app/investimentos", icon: LineChart },
  { label: "A pagar", href: "/app/contas-a-pagar", icon: ListChecks },
  { label: "A receber", href: "/app/contas-a-receber", icon: Wallet },
  { label: "Fechamento", href: "/app/fechamento", icon: ShieldCheck },
];

type AppSidebarProps = {
  user: NonNullable<Session["user"]>;
};

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17rem] border-r bg-card/95 shadow-[8px_0_30px_hsl(var(--foreground)/0.03)] backdrop-blur-xl lg:flex lg:flex-col">
      <div className="flex h-[4.5rem] items-center gap-3 border-b px-5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Landmark className="size-5" />
        </div>
        <div>
          <p className="text-base font-semibold leading-none">MoraisFinanceiro</p>
          <p className="mt-1 text-xs text-muted-foreground">Finanças pessoais</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Navegação principal</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={cn(
                "group flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-all duration-150 hover:translate-x-0.5 hover:bg-secondary hover:text-foreground",
                active && "bg-primary/10 text-primary shadow-sm",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <div className="mb-3 flex items-center justify-between rounded-lg bg-secondary/70 p-2">
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar name={user.name} image={user.image} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name ?? "Usuário Morais"}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
className={cn(
                "flex h-10 shrink-0 items-center gap-2 rounded-xl border bg-card px-3 text-sm font-medium text-muted-foreground shadow-sm transition-all active:scale-[0.98]",
                active && "border-primary/40 bg-primary/10 text-primary",
              )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function UserAvatar({
  name,
  image,
}: {
  name?: string | null;
  image?: string | null;
}) {
  const initials =
    name
      ?.split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "MF";

  if (image) {
    return (
      <Image
        alt={name ?? "Usuário"}
        className="size-9 rounded-lg object-cover"
        height={36}
        src={image}
        unoptimized
        width={36}
      />
    );
  }

  return (
    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
      {initials}
    </div>
  );
}
