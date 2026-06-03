import { normalizeImmat } from "@/lib/immat";

/**
 * Pastille d'immatriculation standard ChargiZ (teal #0f4b49).
 * Réutilisée dans toutes les listes affichant une immatriculation.
 */
export default function ImmatBadge({ value }: { value?: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center rounded-md bg-[#0f4b49]/10 px-2 py-0.5 font-mono text-xs font-semibold tracking-wide text-[#0f4b49]">
      {normalizeImmat(value)}
    </span>
  );
}
