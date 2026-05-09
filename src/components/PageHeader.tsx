export function PageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="mb-6 flex flex-col gap-2 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h2 className="text-2xl font-bold tracking-normal text-slate-950 lg:text-3xl">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </header>
  );
}
