export function ContentPlaceholder({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-lg bg-brand/10 text-brand">
        {icon}
      </span>
      <h2 className="mt-5 text-lg font-semibold text-text">{title}</h2>
      <p className="mt-2 max-w-md text-base text-text-muted">{description}</p>
    </div>
  );
}
