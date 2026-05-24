import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

export type SortDir = "asc" | "desc";

export interface SortState<TKey extends string = string> {
  key: TKey | null;
  dir: SortDir;
}

interface Props<TKey extends string> {
  /** Identifiant unique de la colonne triable */
  sortKey: TKey;
  /** État courant du tri (clé active + direction) */
  sort: SortState<TKey>;
  /** Handler de clic — bascule asc/desc si même clé, sinon active la nouvelle clé en asc */
  onChange: (next: SortState<TKey>) => void;
  /** Alignement du label dans la cellule */
  align?: "left" | "right" | "center";
  /** Contenu de l'en-tête (libellé + sous-titre éventuel) */
  children: React.ReactNode;
}

/**
 * En-tête `<th>` triable avec indicateur visuel (flèche).
 *
 * - Première activation : asc (A→Z ou 0→9)
 * - Clic suivant sur même clé : desc
 * - Clic sur une autre clé : reset à asc
 * - Icône ↕ neutre quand inactif, ↑ ou ↓ quand actif
 */
export default function SortableHeader<TKey extends string>({
  sortKey,
  sort,
  onChange,
  align = "left",
  children,
}: Props<TKey>) {
  const active = sort.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;

  const handleClick = () => {
    if (active) {
      onChange({ key: sortKey, dir: sort.dir === "asc" ? "desc" : "asc" });
    } else {
      onChange({ key: sortKey, dir: "asc" });
    }
  };

  const alignClass = align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";

  return (
    <th className={`px-4 py-3 text-${align} font-medium text-muted-foreground select-none`}>
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 ${alignClass} w-full hover:text-foreground transition-colors group ${active ? "text-foreground" : ""}`}
      >
        <span className="leading-tight">{children}</span>
        <Icon
          className={`h-3.5 w-3.5 shrink-0 transition-opacity ${active ? "text-primary opacity-100" : "opacity-40 group-hover:opacity-70"}`}
        />
      </button>
    </th>
  );
}

/**
 * Comparator helper — gère strings, nombres, null/undefined.
 * Les `null` sont toujours placés en dernier (peu importe la direction).
 */
export function compareValues(a: unknown, b: unknown, dir: SortDir): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;       // null toujours en dernier
  if (b == null) return -1;

  let cmp: number;
  if (typeof a === "number" && typeof b === "number") {
    cmp = a - b;
  } else {
    cmp = String(a).localeCompare(String(b), "fr", { sensitivity: "base", numeric: true });
  }
  return dir === "asc" ? cmp : -cmp;
}
