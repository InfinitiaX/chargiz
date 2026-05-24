import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Car, ChevronRight, ChevronLeft, Loader2, AlertCircle, CheckCircle2, MapPin, User as UserIcon } from "lucide-react";
import VehiculeSelector, { type VehiculeSelectorValue } from "@/components/VehiculeSelector";
import AddressAutocomplete, { type AddressValue } from "@/components/AddressAutocomplete";
import MapPinPicker from "@/components/MapPinPicker";

export const Route = createFileRoute("/onboarding/$token")({
  component: OnboardingPage,
  head: () => ({
    meta: [
      { title: "ChargiZ — Finalisation inscription" },
      { name: "description", content: "Renseignez votre véhicule et connectez-le pour activer votre compte ChargiZ." },
    ],
  }),
});

interface OnboardingData {
  full_name: string;
  email: string;
  collaborateur_id: string;
  smartcar_auth_url: string;
  vehicule: null | {
    marque: string;
    modele: string;
    immatriculation: string;
    capacite_batterie: number | null;
    smartcar_connected: boolean;
  };
}

type Step = "profil" | "adresse" | "vehicule";

function normalizeImmat(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function OnboardingPage() {
  const { token } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OnboardingData | null>(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState<Step>("profil");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // ─── Données de chaque étape ────────────────────────────────────────────
  const [profil, setProfil] = useState({ telephone: "", pays_code: "FR" });
  const [adresse, setAdresse] = useState<AddressValue>({
    pays_code: "FR", adresse: "", code_postal: "", ville: "",
    latitude: null, longitude: null,
  });
  const [pointRechargeDistant, setPointRechargeDistant] = useState<"non" | "oui">("non");
  const [pointRecharge, setPointRecharge] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [vehicule, setVehicule] = useState<VehiculeSelectorValue>({ marque: "", modele: "", capacite_batterie: null });
  const [immat, setImmat] = useState("");

  useEffect(() => {
    apiFetch<OnboardingData>(`/api/onboarding/${token}`)
      .then(d => {
        setData(d);
        if (d.vehicule) {
          setVehicule({
            marque: d.vehicule.marque || "",
            modele: d.vehicule.modele || "",
            capacite_batterie: d.vehicule.capacite_batterie,
          });
          setImmat(d.vehicule.immatriculation || "");
        }
        setLoading(false);
      })
      .catch(() => { setError("Ce lien de finalisation est invalide ou a expiré."); setLoading(false); });
  }, [token]);

  // ─── Soumission de chaque étape ─────────────────────────────────────────
  const saveProfil = async () => {
    if (!profil.telephone.trim()) { setFormError("Le téléphone est requis."); return false; }
    if (!/^(\+\d{1,3})?[\s\d]{6,}$/.test(profil.telephone)) { setFormError("Numéro invalide."); return false; }
    setSaving(true); setFormError("");
    try {
      await apiFetch(`/api/onboarding/${token}/profile`, {
        method: "PATCH",
        body: JSON.stringify({ telephone: profil.telephone, pays_code: profil.pays_code }),
      });
      return true;
    } catch (err: any) {
      setFormError(err.message || "Erreur lors de la sauvegarde du profil.");
      return false;
    } finally { setSaving(false); }
  };

  const saveAdresse = async () => {
    if (!adresse.adresse.trim() || !adresse.code_postal.trim() || !adresse.ville.trim()) {
      setFormError("Adresse complète requise."); return false;
    }
    setSaving(true); setFormError("");
    try {
      // Si point de recharge distant, on utilise ses coordonnées comme home_lat/lng
      const useDistantPoint = pointRechargeDistant === "oui" && pointRecharge.lat != null && pointRecharge.lng != null;
      await apiFetch(`/api/onboarding/${token}/home`, {
        method: "PATCH",
        body: JSON.stringify({
          latitude: useDistantPoint ? pointRecharge.lat : adresse.latitude,
          longitude: useDistantPoint ? pointRecharge.lng : adresse.longitude,
          address: `${adresse.adresse}, ${adresse.code_postal} ${adresse.ville}`,
        }),
      });
      return true;
    } catch (err: any) {
      setFormError(err.message || "Erreur lors de la sauvegarde de l'adresse.");
      return false;
    } finally { setSaving(false); }
  };

  const saveVehicule = async () => {
    if (!vehicule.marque.trim() || !vehicule.modele.trim() || !immat.trim()) {
      setFormError("Marque, modèle et immatriculation sont obligatoires."); return false;
    }
    setSaving(true); setFormError("");
    try {
      const res = await apiFetch<{ smartcar_auth_url: string }>(`/api/onboarding/${token}/vehicule`, {
        method: "PATCH",
        body: JSON.stringify({
          marque: vehicule.marque,
          modele: vehicule.modele,
          immatriculation: immat,
          capacite_batterie: vehicule.capacite_batterie,
        }),
      });
      // Redirection vers Smartcar pour finaliser (CDC §3.6.2)
      window.location.href = res.smartcar_auth_url;
      return true;
    } catch (err: any) {
      setFormError(err.message || "Erreur lors de la sauvegarde du véhicule.");
      setSaving(false);
      return false;
    }
  };

  // ─── Navigation ─────────────────────────────────────────────────────────
  const nextStep = async () => {
    if (step === "profil") {
      if (await saveProfil()) setStep("adresse");
    } else if (step === "adresse") {
      if (await saveAdresse()) setStep("vehicule");
    } else if (step === "vehicule") {
      await saveVehicule();  // ← redirige vers Smartcar
    }
  };
  const prevStep = () => {
    setFormError("");
    if (step === "adresse") setStep("profil");
    else if (step === "vehicule") setStep("adresse");
  };

  // ─── Loading / Error / Already connected ────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Lien invalide</h1>
          <p className="mt-2 text-muted-foreground">{error || "Une erreur est survenue."}</p>
          <a href="/" className="mt-6 inline-block text-primary hover:underline">Retour à l'accueil</a>
        </div>
      </div>
    );
  }

  const prenom = (data.full_name || "").split(" ")[0] || "Bienvenue";

  // Véhicule déjà connecté → message de succès
  if (data.vehicule?.smartcar_connected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-chargiz-teal/10 text-chargiz-teal">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Votre véhicule est connecté</h1>
          <p className="mt-2 text-muted-foreground">Vous pouvez maintenant accéder à votre espace ChargiZ.</p>
          <a href="/" className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-chargiz-teal-light">
            Accéder à mon espace
          </a>
        </div>
      </div>
    );
  }

  // ─── Affichage par étape ─────────────────────────────────────────────────
  const steps: { key: Step; label: string; icon: React.ElementType }[] = [
    { key: "profil", label: "Profil", icon: UserIcon },
    { key: "adresse", label: "Adresse", icon: MapPin },
    { key: "vehicule", label: "Véhicule", icon: Car },
  ];
  const currentIndex = steps.findIndex(s => s.key === step);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4 shadow-sm border border-primary/10">
            <Car className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Bienvenue, <span className="text-primary">{prenom}</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Finalisez votre inscription en 3 étapes pour connecter votre véhicule.
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const active = i === currentIndex;
            const done = i < currentIndex;
            return (
              <div key={s.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full ring-2 transition-all ${
                    done ? "bg-chargiz-teal text-white ring-chargiz-teal"
                    : active ? "bg-primary text-primary-foreground ring-primary"
                    : "bg-muted text-muted-foreground ring-border"
                  }`}>
                    {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={`mt-1.5 text-[11px] font-medium uppercase tracking-wider ${
                    active ? "text-primary" : done ? "text-chargiz-teal" : "text-muted-foreground"
                  }`}>
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-px flex-1 mx-2 mb-5 transition-all ${done ? "bg-chargiz-teal" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Card avec contenu de l'étape */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
          {formError && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2.5">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{formError}</p>
            </div>
          )}

          {/* ═══ ÉTAPE 1 — PROFIL ═══ */}
          {step === "profil" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-card-foreground">Vos informations</h2>
              <p className="text-xs text-muted-foreground -mt-3">
                Le pays détermine le facteur d'émission CO₂ utilisé dans vos statistiques.
              </p>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Téléphone <span className="text-destructive">*</span>
                </label>
                <input
                  type="tel"
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  value={profil.telephone}
                  onChange={e => setProfil(p => ({ ...p, telephone: e.target.value }))}
                  placeholder="+33 6 12 34 56 78"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Pays <span className="text-destructive">*</span>
                </label>
                <select
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  value={profil.pays_code}
                  onChange={e => { setProfil(p => ({ ...p, pays_code: e.target.value })); setAdresse(a => ({ ...a, pays_code: e.target.value })); }}
                >
                  <option value="FR">France</option>
                  <option value="DE">Allemagne</option>
                  <option value="BE">Belgique</option>
                  <option value="CH">Suisse</option>
                  <option value="ES">Espagne</option>
                  <option value="IT">Italie</option>
                  <option value="LU">Luxembourg</option>
                  <option value="NL">Pays-Bas</option>
                  <option value="PT">Portugal</option>
                  <option value="GB">Royaume-Uni</option>
                </select>
              </div>
            </div>
          )}

          {/* ═══ ÉTAPE 2 — ADRESSE + POINT DE RECHARGE ═══ */}
          {step === "adresse" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-card-foreground">Votre adresse domicile</h2>
                <p className="text-xs text-muted-foreground">
                  Sert à qualifier vos recharges : à domicile ou en déplacement.
                </p>
              </div>
              <AddressAutocomplete value={adresse} onChange={setAdresse} required hideCountry />

              {/* Point de recharge distant */}
              <div className="border-t border-border pt-4">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Votre point de recharge est-il à plus de 100m de votre domicile ?
                </label>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Si oui (copropriété, parking déporté…), positionnez le pin précis sur la carte.
                </p>
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setPointRechargeDistant("non")}
                    className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                      pointRechargeDistant === "non"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >Non — proche de mon domicile</button>
                  <button
                    type="button"
                    onClick={() => setPointRechargeDistant("oui")}
                    className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                      pointRechargeDistant === "oui"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >Oui — préciser sur la carte</button>
                </div>
                {pointRechargeDistant === "oui" && (
                  <MapPinPicker
                    initialLat={adresse.latitude}
                    initialLng={adresse.longitude}
                    onChange={(lat, lng) => setPointRecharge({ lat, lng })}
                  />
                )}
              </div>
            </div>
          )}

          {/* ═══ ÉTAPE 3 — VÉHICULE ═══ */}
          {step === "vehicule" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-card-foreground">Votre véhicule</h2>
                <p className="text-xs text-muted-foreground">
                  Sélectionnez votre véhicule dans la base ou saisissez-le manuellement.
                </p>
              </div>
              <VehiculeSelector value={vehicule} onChange={setVehicule} required />
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Immatriculation <span className="text-destructive">*</span>
                </label>
                <input
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-mono uppercase tracking-wide outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  value={immat}
                  onChange={e => setImmat(normalizeImmat(e.target.value))}
                  placeholder="AB123CD"
                  maxLength={10}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Lettres et chiffres uniquement — saisie auto-formatée.
                </p>
              </div>
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground">
                <strong className="text-foreground">Prochaine étape :</strong> vous serez redirigé vers Smartcar
                pour autoriser ChargiZ à récupérer les données de votre véhicule (kilométrage, état de charge…).
                ChargiZ ne voit jamais vos identifiants constructeur.
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={prevStep}
              disabled={step === "profil" || saving}
              className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" /> Précédent
            </button>
            <button
              type="button"
              onClick={nextStep}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-chargiz-teal-light disabled:opacity-60 shadow-md"
            >
              {saving
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...</>
                : step === "vehicule"
                  ? <>Connecter mon véhicule <ChevronRight className="h-4 w-4" /></>
                  : <>Continuer <ChevronRight className="h-4 w-4" /></>}
            </button>
          </div>
        </div>

        <div className="text-center opacity-40">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Sécurisé par Smartcar & ChargiZ
          </span>
        </div>
      </div>
    </div>
  );
}
