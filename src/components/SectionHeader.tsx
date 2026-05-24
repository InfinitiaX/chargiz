interface SectionHeaderProps {
  children: React.ReactNode;
  /** Élément optionnel à droite (badge, action, etc.) */
  action?: React.ReactNode;
}

/**
 * En-tête de section avec un accent vertical lime qui répond à la sidebar.
 * Plus subtil qu'un capslock + ligne horizontale.
 */
export default function SectionHeader({ children, action }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span
        aria-hidden
        className="h-4 w-[3px] rounded-full"
        style={{ background: "var(--chargiz-lime)" }}
      />
      <h2 className="text-sm font-semibold tracking-tight text-foreground">{children}</h2>
      <div className="flex-1 h-px bg-border/50" />
      {action}
    </div>
  );
}
