import { createFileRoute, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, Mail } from "lucide-react";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/me/email/confirm")({
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  component: ConfirmEmailPage,
  head: () => ({ meta: [{ title: "ChargiZ — Confirmer l'email" }] }),
});

function ConfirmEmailPage() {
  const { token } = useSearch({ from: "/me/email/confirm" });
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");
  const [newEmail, setNewEmail] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Token manquant — lien invalide.");
      return;
    }
    apiFetch<{ ok: boolean; email: string }>("/api/me/email/confirm", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then(res => {
        setStatus("success");
        setNewEmail(res.email);
      })
      .catch((err: any) => {
        setStatus("error");
        setMessage(err?.message || "Le lien est invalide ou a expiré.");
      });
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl text-center">

        {status === "loading" && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Loader2 className="h-7 w-7 text-primary animate-spin" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">Confirmation en cours…</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Validation de votre lien de confirmation.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">Email modifié</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Votre nouvelle adresse email est maintenant active :
            </p>
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
              <Mail className="h-4 w-4" /> {newEmail}
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Veuillez vous reconnecter avec cette nouvelle adresse.
            </p>
            <Link to="/" className="mt-6 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-95">
              Se connecter
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100">
              <AlertCircle className="h-7 w-7 text-red-600" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">Lien invalide</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Si le lien est expiré (24h), vous pouvez demander un nouveau lien depuis votre espace.
            </p>
            <Link to="/" className="mt-6 inline-block rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
              Retour à l'accueil
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
