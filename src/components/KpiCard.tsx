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
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight text-card-foreground">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colorClass}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
