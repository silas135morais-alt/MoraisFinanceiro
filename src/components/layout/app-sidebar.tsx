"use client";

import type { Session } from "next-auth";
import {
  BarChart3,
  CalendarDays,
  CreditCard,
  Download,
  History,
  Landmark,
  LayoutDashboard,
  LineChart,
  ListChecks,
  PiggyBank,
  Receipt,
  Settings,
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
  { label: "Receitas", href: "/app/receitas", icon: TrendingDown },
  { label: "Despesas", href: "/app/despesas", icon: Receipt },
  { label: "Cartões", href: "/app/cartoes", icon: CreditCard },
  { label: "Investimentos", href: "/app/investimentos", icon: LineChart },
  { label: "Patrimônio", href: "/app/patrimonio", icon: PiggyBank },
  { label: "Relatórios", href: "/app/relatorios", icon: BarChart3 },
  { label: "Calendário", href: "/app/calendario", icon: CalendarDays },
  { label: "A pagar", href: "/app/contas-a-pagar", icon: ListChecks },
  { label: "A receber", href: "/app/contas-a-receber", icon: Wallet },
  { label: "Fechamento", href: "/app/fechamento", icon: ShieldCheck },
  { label: "Exportação", href: "/app/exportacao", icon: Download },
  { label: "Histórico", href: "/app/historico", icon: History },
  { label: "Configurações", href: "/app/configuracoes", icon: Settings },
];

type AppSidebarProps = {
  user: NonNullable<Session["user"]>;
};

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r bg-card/90 backdrop-blur-xl lg:flex lg:flex-col">
      <div className="flex h-20 items-center gap-3 border-b px-6">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Landmark className="size-5" />
        </div>
        <div>
          <p className="text-base font-semibold leading-none">MoraisFinanceiro</p>
          <p className="mt-1 text-xs text-muted-foreground">Gestão clara e premium</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
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
                "group flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground",
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
        <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" />
          Ambiente protegido
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
              "flex h-10 shrink-0 items-center gap-2 rounded-lg border bg-card px-3 text-sm text-muted-foreground",
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
