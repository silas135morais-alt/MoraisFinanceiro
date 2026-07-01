import { Download, Palette, Shield, Upload, UserRound } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { DangerAccountAction } from "./danger-account-action";

const settings = [
  { title: "Perfil", description: "Nome, foto e preferências de visualização.", icon: UserRound },
  { title: "Conta Google", description: "Conexão usada para autenticação segura.", icon: Shield },
  { title: "Exportação", description: "Formatos e preferências para relatórios.", icon: Download },
  { title: "Backup", description: "Espaço preparado para cópias de segurança.", icon: Upload },
];

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configurações"
        title="Preferências da conta"
        description="Painel preparado para perfil, tema, exportações, backup e ações sensíveis."
      />
      <section className="grid gap-4 md:grid-cols-2">
        {settings.map((setting) => {
          const Icon = setting.icon;
          return (
            <article key={setting.title} className="rounded-lg border bg-card p-5 shadow-sm">
              <Icon className="size-5 text-primary" />
              <h3 className="mt-4 font-semibold">{setting.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{setting.description}</p>
            </article>
          );
        })}
      </section>
      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Palette className="size-5 text-primary" />
              <h3 className="font-semibold">Tema</h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Alternar entre modo claro e escuro.</p>
          </div>
          <ThemeToggle />
        </div>
      </section>
      <section className="rounded-lg border border-destructive/30 bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-destructive">Excluir conta</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Área reservada para confirmação, auditoria e remoção segura dos dados.
            </p>
          </div>
          <DangerAccountAction />
        </div>
      </section>
    </div>
  );
}
