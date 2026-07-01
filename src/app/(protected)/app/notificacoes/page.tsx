import { Bell } from "lucide-react";

import { markNotificationReadAction } from "@/actions/operational-actions";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireUserId } from "@/lib/auth-guard";
import { notificationService } from "@/services/notification-service";

export default async function NotificacoesPage() {
  const items = await notificationService.list(await requireUserId());

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Notificações" title="Centro de alertas internos" description="Alertas do sistema sem e-mail ou push notification." />
      <section className="grid gap-3">
        {items.map((item) => (
          <form key={item.id} action={markNotificationReadAction.bind(null, item.id)} className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <Bell className="mt-1 size-4 text-primary" />
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" type="submit">{item.readAt ? "Lida" : "Marcar lida"}</Button>
          </form>
        ))}
      </section>
    </div>
  );
}
