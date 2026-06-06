interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="pt-4 pb-3 md:pr-14">
      <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
}
