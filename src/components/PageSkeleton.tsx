import { Skeleton } from "@/components/ui/skeleton";

interface PageSkeletonProps {
  /** Nombre de KPI cards à dessiner (par défaut 4) */
  kpiCount?: number;
  /** Nombre de lignes de tableau à dessiner (par défaut 6) */
  rowCount?: number;
  /** Affiche un bloc filtres au-dessus du tableau */
  showFilters?: boolean;
}

/**
 * Skeleton d'une page type "dashboard" : header + KPIs + filtres + tableau.
 * Donne immédiatement la silhouette de la page pendant que les données chargent.
 */
export default function PageSkeleton({
  kpiCount = 4,
  rowCount = 6,
  showFilters = true,
}: PageSkeletonProps) {
  return (
    <div className="p-4 sm:p-6 md:p-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="mb-6 md:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-3 w-60" />
        </div>
        <Skeleton className="h-9 w-48 self-start sm:self-auto" />
      </div>

      {/* KPI cards */}
      {kpiCount > 0 && (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: kpiCount }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-24" />
                </div>
                <Skeleton className="h-10 w-10 rounded-xl sm:h-12 sm:w-12" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filtres */}
      {showFilters && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-10 w-44" />
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-muted/40 px-6 py-3">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: rowCount }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-3 hidden sm:block w-20" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
