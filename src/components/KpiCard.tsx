import { type LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  colorClass: string;
}

export default function KpiCard({ title, value, subtitle, icon: Icon, colorClass }: KpiCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm transition-all hover:shadow-md">
      {/* Halo subtil de l'icône en arrière-plan */}
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40 ${colorClass}`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-card-foreground tabular-nums">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-black/5 ${colorClass}`}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </div>
    </div>
  );
}
