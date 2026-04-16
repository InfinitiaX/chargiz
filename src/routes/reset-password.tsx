import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import logoDark from "@/assets/logo-dark.jpg";
import { Lock, CheckCircle } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "ChargiZ — Réinitialiser le mot de passe" },
      { name: "description", content: "Réinitialisez votre mot de passe ChargiZ." },
    ],
  }),
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center space-y-4">
          <CheckCircle className="mx-auto h-16 w-16 text-chargiz-teal" />
          <h1 className="text-2xl font-bold text-foreground">Mot de passe modifié</h1>
          <p className="text-sm text-muted-foreground">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
          <a href="/" className="inline-flex rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light">Se connecter</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <img src={logoDark} alt="ChargiZ" className="mx-auto h-10" />
          <Lock className="mx-auto mt-6 h-12 w-12 text-primary" />
          <h1 className="mt-4 text-2xl font-bold text-foreground">Nouveau mot de passe</h1>
          <p className="mt-2 text-sm text-muted-foreground">Choisissez un nouveau mot de passe sécurisé</p>
        </div>
        {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Nouveau mot de passe</label>
            <input type="password" required minLength={8} className="mt-1 w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Confirmer le mot de passe</label>
            <input type="password" required className="mt-1 w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" value={confirm} onChange={e => setConfirm(e.target.value)} />
          </div>
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-chargiz-teal-light disabled:opacity-50">
            {loading ? "Modification..." : "Modifier le mot de passe"}
          </button>
        </form>
      </div>
    </div>
  );
}
