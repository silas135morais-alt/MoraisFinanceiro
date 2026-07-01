import type { ReactNode } from "react";

type ConfirmBoxProps = {
  title: string;
  description: string;
  action: ReactNode;
};

export function ConfirmBox({ title, description, action }: ConfirmBoxProps) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4">
        {action}
      </div>
    </div>
  );
}
