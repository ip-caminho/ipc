interface Row {
  label: string;
  value: React.ReactNode;
}

interface Props {
  title: string;
  rows: Row[];
}

export function ProfileSection({ title, rows }: Props) {
  const visible = rows.filter((r) => r.value !== null && r.value !== "");
  if (visible.length === 0) return null;
  return (
    <section className="flex flex-col gap-1">
      <h2 className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground mb-1">
        {title}
      </h2>
      <div className="flex flex-col divide-y divide-border/50">
        {visible.map((r) => (
          <div
            key={r.label}
            className="flex items-baseline justify-between gap-3 py-2.5"
          >
            <span className="text-xs text-muted-foreground shrink-0">
              {r.label}
            </span>
            <span className="text-sm text-foreground text-right min-w-0 truncate">
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
