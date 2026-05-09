const toneClass = {
  slate: "bg-slate-100 text-slate-700",
  teal: "bg-teal-50 text-teal-800",
  amber: "bg-amber-50 text-amber-800",
  red: "bg-red-50 text-red-700",
};

export function StatusBadge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: keyof typeof toneClass;
}) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded px-2 py-1 text-xs font-semibold ${toneClass[tone]}`}>
      {children}
    </span>
  );
}
