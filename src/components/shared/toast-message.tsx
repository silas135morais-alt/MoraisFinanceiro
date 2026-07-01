type ToastMessageProps = {
  title: string;
  description: string;
};

export function ToastMessage({ title, description }: ToastMessageProps) {
  return (
    <div className="rounded-lg border bg-card p-4 text-sm shadow-sm">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-muted-foreground">{description}</p>
    </div>
  );
}
