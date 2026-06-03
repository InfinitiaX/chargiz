import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2, Archive } from "lucide-react";

/**
 * Dialog de confirmation à 2 tons :
 *  - "destructive" (rouge, icône poubelle) — défaut, pour les suppressions définitives
 *  - "archive"     (ambre, icône archive) — pour les actions réversibles (archivage)
 *
 * La tonalité change le titre, l'icône et le bouton de confirmation, mais le
 * comportement (callback `onConfirm`) reste identique.
 */
interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  /** Libellé du bouton de confirmation. Défaut adapté à la tonalité. */
  confirmLabel?: string;
  /** Style visuel du dialog. Défaut "destructive" (rouge poubelle). */
  tone?: "destructive" | "archive";
}

export default function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  loading = false,
  confirmLabel,
  tone = "destructive",
}: ConfirmDeleteDialogProps) {
  const isArchive = tone === "archive";
  const Icon = isArchive ? Archive : Trash2;
  const titleClass = isArchive ? "text-amber-600" : "text-destructive";
  const actionClass = isArchive
    ? "bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500"
    : "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive";
  const defaultLabel = isArchive ? "Archiver" : "Supprimer définitivement";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className={`flex items-center gap-2 ${titleClass}`}>
            <Icon className="h-5 w-5 shrink-0" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={async (e) => {
              e.preventDefault();
              await onConfirm();
            }}
            disabled={loading}
            className={actionClass}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel ?? defaultLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
