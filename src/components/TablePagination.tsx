import { ChevronLeft, ChevronRight } from "lucide-react";

interface TablePaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default function TablePagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: TablePaginationProps) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  // Build page number window: show up to 5 pages around current
  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  const btnCls =
    "flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const activeCls = "bg-primary text-primary-foreground font-medium";
  const idleCls = "border border-border bg-card text-foreground hover:bg-muted";

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 pt-4 pb-1">
      <p className="text-sm text-muted-foreground order-2 sm:order-1">
        {from}–{to} sur {totalItems} résultat{totalItems > 1 ? "s" : ""}
      </p>

      <div className="flex items-center gap-1 order-1 sm:order-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className={`${btnCls} ${idleCls}`}
          aria-label="Page précédente"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="flex h-8 w-8 items-center justify-center text-sm text-muted-foreground">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`${btnCls} ${p === page ? activeCls : idleCls}`}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className={`${btnCls} ${idleCls}`}
          aria-label="Page suivante"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
