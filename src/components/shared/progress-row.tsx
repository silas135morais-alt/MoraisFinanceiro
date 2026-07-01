type ProgressRowProps = {
  title: string;
  current: string;
  target: string;
  progress: number;
};

export function ProgressRow({ title, current, target, progress }: ProgressRowProps) {
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {current} de {target}
          </p>
        </div>
        <span className="text-sm font-semibold">{progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
