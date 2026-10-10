export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div role="tablist" className="flex gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={`min-h-10 flex-1 rounded-full px-4 text-sm font-bold transition ${
            value === t.id ? 'bg-white text-black' : 'text-white/60 hover:text-white'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
