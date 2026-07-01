import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed bg-card p-8 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
        <Icon className="size-5" />
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
