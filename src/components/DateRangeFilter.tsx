import { Calendar, AlertCircle } from "lucide-react";

interface Props {
  dateFrom: string;
  dateTo: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  /** Empêche les dates futures (utile pour les rapports rétrospectifs) */
  disableFuture?: boolean;
}

/**
 * Filtre de plage de dates réutilisable avec validation visuelle.
 *
 * Affiche un message d'erreur clair si la date de début est strictement
 * supérieure à la date de fin (un cas qu'on rencontre facilement et qui
 * cassait les requêtes silencieusement).
 */
export default function DateRangeFilter({
  dateFrom,
  dateTo,
  onFromChange,
  onToChange,
  disableFuture = true,
}: Props) {
  const isInvalid = !!dateFrom && !!dateTo && dateFrom > dateTo;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={`flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm transition-colors ${
          isInvalid ? "border-destructive bg-destructive/5" : "border-border"
        }`}
      >
        <Calendar className={`h-4 w-4 ${isInvalid ? "text-destructive" : "text-muted-foreground"}`} />
        <input
          type="date"
          value={dateFrom}
          max={disableFuture ? today : undefined}
          onChange={(e) => onFromChange(e.target.value)}
          className="bg-transparent text-xs outline-none"
          aria-label="Date de début"
        />
        <span className="text-xs text-muted-foreground">→</span>
        <input
          type="date"
          value={dateTo}
          max={disableFuture ? today : undefined}
          onChange={(e) => onToChange(e.target.value)}
          className="bg-transparent text-xs outline-none"
          aria-label="Date de fin"
        />
      </div>
      {isInvalid && (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          La date de début doit être antérieure ou égale à la date de fin.
        </p>
      )}
    </div>
  );
}

/** Helper : retourne true si la plage est valide (utilisable pour gate les requêtes). */
export function isDateRangeValid(dateFrom: string, dateTo: string): boolean {
  if (!dateFrom || !dateTo) return true;
  return dateFrom <= dateTo;
}
