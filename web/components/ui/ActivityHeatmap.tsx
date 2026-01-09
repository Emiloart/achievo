import clsx from "clsx";

export function ActivityHeatmap({ values, className }: { values: number[]; className?: string }) {
  const safe = values.length ? values : new Array(56).fill(0);
  return (
    <div className={clsx("grid grid-cols-14 gap-1", className)}>
      {safe.map((value, idx) => {
        const intensity = Math.max(0, Math.min(4, Math.round(value)));
        const tone = ["bg-surface2", "bg-accent/20", "bg-accent/40", "bg-accent/70", "bg-accent"][intensity];
        return <div key={idx} className={clsx("h-3 w-3 rounded-sm", tone)} />;
      })}
    </div>
  );
}
