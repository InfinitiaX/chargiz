import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Car, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/onboarding/$token")({
  component: OnboardingPage,
  head: () => ({
    meta: [
      { title: "ChargiZ — Finalisation inscription" },
      { name: "description", content: "Configurez votre véhicule pour activer votre compte ChargiZ." },
    ],
  }),
});

function OnboardingPage() {
  const { token } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    marque: "",
    modele: "",
    immatriculation: "",
    vin: "",
    capacite_batterie: "",
  });

  useEffect(() => {
    apiFetch<any>(`/api/onboarding/${token}`)
      .then(data => {
        setUser(data);
        setLoading(false);
      })
      .catch(err => {
        setError("Ce lien de finalisation est invalide ou a expiré.");
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiFetch<any>(`/api/onboarding/${token}/vehicle`, {
        method: "POST",
        body: JSON.stringify({
          ...form,
          capacite_batterie: parseFloat(form.capacite_batterie) || 0,
        }),
      });
      
      // Redirect to Smartcar
      if (res.smartcar_auth_url) {
        window.location.href = res.smartcar_auth_url;
      } else {
        alert("Véhicule enregistré avec succès !");
      }
    } catch (err) {
      console.error("Onboarding error:", err);
      alert("Erreur lors de l'enregistrement du véhicule.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Lien invalide</h1>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <a href="/" className="mt-6 inline-block text-primary hover:underline">Retour à l'accueil</a>
        </div>
      </div>
    );
  }

  const inputCls = "w-full rounded-lg border border-input bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6 shadow-sm border border-primary/10">
            <Car className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Bienvenue, <span className="text-primary">{user.full_name.split(' ')[0]}</span>
          </h1>
          <p className="mt-3 text-muted-foreground">
            Dernière étape ! Configurez votre véhicule électrique pour activer votre compte.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Marque *</label>
                <input required className={inputCls} placeholder="Ex: Tesla" value={form.marque} onChange={e => setForm(f => ({ ...f, marque: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Modèle *</label>
                <input required className={inputCls} placeholder="Ex: Model 3" value={form.modele} onChange={e => setForm(f => ({ ...f, modele: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Immatriculation</label>
              <input className={inputCls} placeholder="Ex: AA-123-BB" value={form.immatriculation} onChange={e => setForm(f => ({ ...f, immatriculation: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Capacité batterie (kWh)</label>
                <input type="number" step="0.1" className={inputCls} placeholder="Ex: 60" value={form.capacite_batterie} onChange={e => setForm(f => ({ ...f, capacite_batterie: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">VIN (Optionnel)</label>
                <input className={inputCls} placeholder="17 caractères" value={form.vin} onChange={e => setForm(f => ({ ...f, vin: e.target.value }))} />
              </div>
            </div>

            <div className="pt-4">
              <button type="submit" disabled={submitting} className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 text-sm font-bold text-primary-foreground shadow-lg transition-all hover:bg-chargiz-teal-light hover:shadow-primary/20 active:scale-[0.98] disabled:opacity-50">
                {submitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Connecter mon véhicule via Smartcar
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Vous allez être redirigé vers l'interface sécurisée Smartcar pour autoriser ChargiZ à lire les données de votre véhicule.
              </p>
            </div>
          </form>
        </div>

        <div className="flex items-center justify-center gap-6 opacity-40">
          {/* Partners / Logos can go here */}
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sécurisé par Smartcar & ChargiZ</span>
        </div>
      </div>
    </div>
  );
}
