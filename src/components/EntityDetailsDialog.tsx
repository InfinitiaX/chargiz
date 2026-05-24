import { X } from "lucide-react";
import { type LucideIcon } from "lucide-react";

export interface DetailField {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

export interface DetailSection {
  title: string;
  fields: DetailField[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  sections: DetailSection[];
  footer?: React.ReactNode;
}

/**
 * Dialog générique de visualisation d'une entité.
 * Affichage en sections, lecture seule. Pour modifier, fermer puis ouvrir le dialog d'édition.
 */
export default function EntityDetailsDialog({ open, onClose, title, subtitle, icon: Icon, sections, footer }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl bg-card shadow-2xl border border-border max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-card-foreground truncate">{title}</h2>
              {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4 space-y-6">
          {sections.map((section, i) => (
            <div key={i}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{section.title}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <dl className="space-y-2.5">
                {section.fields.map((f, j) => (
                  <div key={j} className="grid grid-cols-3 gap-3 items-start">
                    <dt className="text-xs text-muted-foreground pt-0.5">{f.label}</dt>
                    <dd className={`col-span-2 text-sm text-card-foreground ${f.mono ? "font-mono text-xs" : ""}`}>
                      {f.value || <span className="text-muted-foreground italic">—</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        {footer && (
          <div className="border-t border-border px-6 py-4 flex justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
