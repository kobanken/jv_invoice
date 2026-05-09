export function PageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="mb-6 border-b border-slate-200 pb-5">
      <h2 className="text-2xl font-bold tracking-normal text-slate-950">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </header>
  );
}
