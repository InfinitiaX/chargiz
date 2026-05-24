import { type LucideIcon, Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Variante compacte pour usage dans une cellule de tableau */
  compact?: boolean;
}

/**
 * État vide unifié pour les tableaux et listes.
 * Affiche une icône grande adoucie + titre + description + CTA optionnel.
 */
export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? "py-8" : "py-14"
      }`}
    >
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted/60 ring-1 ring-inset ring-border">
        <Icon className="h-6 w-6 text-muted-foreground/70" strokeWidth={1.5} />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
