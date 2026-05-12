import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Car, MapPin, User, ChevronRight, Loader2, AlertCircle, CheckCircle2, Search, Navigation } from "lucide-react";

export const Route = createFileRoute("/onboarding/$token")({
  component: OnboardingPage,
  head: () => ({
    meta: [
      { title: "ChargiZ — Finalisation inscription" },
      { name: "description", content: "Finalisez votre inscription ChargiZ." },
    ],
  }),
});

type Step = "profile" | "home" | "smartcar";

async function nominatimSearch(query: string): Promise<{ display_name: string; lat: string; lon: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
      { headers: { "Accept-Language": "fr" } }
    );
    const data = await res.json();
    return data[0] ?? null;
  } catch {
    return null;
  }
}

function OnboardingPage() {
  const { token } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState<Step>("profile");

  // Step 1 — profile
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Step 2 — home
  const [addressInput, setAddressInput] = useState("");
  const [searchResult, setSearchResult] = useState<{ display_name: string; lat: number; lon: number } | null>(null);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [homeSet, setHomeSet] = useState(false);
  const [homeAddress, setHomeAddress] = useState("");
  const [savingHome, setSavingHome] = useState(false);
  const [homeSkipped, setHomeSkipped] = useState(false);

  useEffect(() => {
    apiFetch<any>(`/api/onboarding/${token}`)
      .then(data => {
        setUser(data);
        const parts = (data.full_name || "").split(" ");
        setPrenom(parts[0] || "");
        setNom(parts.slice(1).join(" ") || "");
        setLoading(false);
      })
      .catch(() => {
        setError("Ce lien de finalisation est invalide ou a expiré.");
        setLoading(false);
      });
  }, [token]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSaveProfile = async () => {
    if (!nom.trim() || !prenom.trim()) return;
    setSavingProfile(true);
    try {
      await apiFetch(`/api/onboarding/${token}/profile`, {
        method: "PATCH",
        body: JSON.stringify({ nom: nom.trim(), prenom: prenom.trim(), telephone: telephone.trim() || null }),
      });
      setStep("home");
    } catch (e: any) {
      alert("Erreur : " + (e.message ?? "inconnue"));
    } finally {
      setSavingProfile(false);
    }
  };

  const saveHome = async (lat: number, lon: number, address: string) => {
    setSavingHome(true);
    try {
      await apiFetch(`/api/onboarding/${token}/home`, {
        method: "PATCH",
        body: JSON.stringify({ latitude: lat, longitude: lon, address }),
      });
      setHomeSet(true);
      setHomeAddress(address);
    } catch (e: any) {
      alert("Erreur lors de l'enregistrement du domicile : " + (e.message ?? "inconnue"));
    } finally {
      setSavingHome(false);
    }
  };

  const handleGPS = () => {
    if (!navigator.geolocation) {
      alert("Géolocalisation non supportée par votre navigateur.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        setLocating(false);
        // Reverse geocode via Nominatim
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`,
            { headers: { "Accept-Language": "fr" } }
          );
          const data = await res.json();
          const address = data.display_name ?? `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
          await saveHome(pos.coords.latitude, pos.coords.longitude, address);
        } catch {
          await saveHome(pos.coords.latitude, pos.coords.longitude, `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
        }
      },
      err => {
        setLocating(false);
        alert("Impossible de récupérer votre position : " + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAddressSearch = async () => {
    if (!addressInput.trim()) return;
    setSearching(true);
    setSearchResult(null);
    const result = await nominatimSearch(addressInput.trim());
    setSearching(false);
    if (!result) {
      alert("Adresse non trouvée. Essayez d'être plus précis (ex: 12 rue des Lilas, Paris).");
      return;
    }
    setSearchResult({ display_name: result.display_name, lat: parseFloat(result.lat), lon: parseFloat(result.lon) });
  };

  const handleConfirmAddress = async () => {
    if (!searchResult) return;
    await saveHome(searchResult.lat, searchResult.lon, searchResult.display_name);
  };

  // ── Loading / Error ────────────────────────────────────────────────────────

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
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Lien invalide</h1>
          <p className="mt-2 text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const steps: { id: Step; label: string; icon: typeof User }[] = [
    { id: "profile", label: "Mes infos", icon: User },
    { id: "home", label: "Mon domicile", icon: MapPin },
    { id: "smartcar", label: "Mon véhicule", icon: Car },
  ];

  const stepIndex = steps.findIndex(s => s.id === step);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-lg space-y-6">

        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4 border border-primary/10">
            <Car className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Bienvenue, <span className="text-primary">{prenom || user.full_name}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Finalisez votre inscription en 3 étapes</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2">
          {steps.map((s, i) => {
            const done = i < stepIndex;
            const active = i === stepIndex;
            return (
              <div key={s.id} className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  done ? "bg-primary text-primary-foreground" :
                  active ? "bg-primary/20 text-primary ring-2 ring-primary/40" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${active ? "text-foreground" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
                {i < steps.length - 1 && <div className={`h-px w-6 ${i < stepIndex ? "bg-primary" : "bg-border"}`} />}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">

          {/* ── Step 1 : Profile ── */}
          {step === "profile" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" /> Vos informations
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Vérifiez et complétez vos informations personnelles.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Prénom *</label>
                  <input
                    value={prenom}
                    onChange={e => setPrenom(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Prénom"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Nom *</label>
                  <input
                    value={nom}
                    onChange={e => setNom(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Nom"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Email (non modifiable)</label>
                <input
                  value={user.email}
                  disabled
                  className="mt-1 w-full rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Téléphone</label>
                <input
                  value={telephone}
                  onChange={e => setTelephone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="+33 6 XX XX XX XX"
                  type="tel"
                />
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={!nom.trim() || !prenom.trim() || savingProfile}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-chargiz-teal-light disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continuer <ChevronRight className="h-4 w-4" /></>}
              </button>
            </div>
          )}

          {/* ── Step 2 : Home ── */}
          {step === "home" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" /> Votre domicile
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  ChargiZ utilise votre position domicile pour différencier les recharges remboursables (domicile) des autres.
                </p>
              </div>

              {homeSet ? (
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-primary font-medium text-sm">
                    <CheckCircle2 className="h-4 w-4" /> Domicile enregistré
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{homeAddress}</p>
                  <button
                    onClick={() => { setHomeSet(false); setSearchResult(null); }}
                    className="text-xs text-primary hover:underline"
                  >
                    Modifier
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Option A — GPS */}
                  <div className="rounded-xl border border-border p-4 space-y-2">
                    <p className="text-sm font-medium text-card-foreground">Option A — Je suis chez moi maintenant</p>
                    <p className="text-xs text-muted-foreground">Cliquez depuis votre domicile pour une précision maximale.</p>
                    <button
                      onClick={handleGPS}
                      disabled={locating || savingHome}
                      className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light disabled:opacity-50"
                    >
                      {locating || savingHome ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                      {locating ? "Localisation…" : savingHome ? "Enregistrement…" : "Utiliser ma position GPS"}
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground font-medium">ou</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Option B — Adresse */}
                  <div className="rounded-xl border border-border p-4 space-y-3">
                    <p className="text-sm font-medium text-card-foreground">Option B — Saisir mon adresse</p>
                    <div className="flex gap-2">
                      <input
                        value={addressInput}
                        onChange={e => setAddressInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleAddressSearch()}
                        className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        placeholder="12 rue des Lilas, Paris"
                      />
                      <button
                        onClick={handleAddressSearch}
                        disabled={searching || !addressInput.trim()}
                        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                      >
                        {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </button>
                    </div>

                    {searchResult && (
                      <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          📍 {searchResult.display_name}
                        </p>
                        <button
                          onClick={handleConfirmAddress}
                          disabled={savingHome}
                          className="flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-chargiz-teal-light disabled:opacity-50"
                        >
                          {savingHome ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                          Confirmer cette adresse
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setHomeSkipped(true); setStep("smartcar"); }}
                  className="flex-1 rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground hover:bg-muted"
                >
                  Passer (définir plus tard)
                </button>
                <button
                  onClick={() => setStep("smartcar")}
                  disabled={!homeSet && !homeSkipped}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-chargiz-teal-light disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuer <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              {homeSkipped && !homeSet && (
                <p className="text-xs text-amber-600 text-center">
                  ⚠️ Sans domicile défini, vos recharges ne pourront pas être remboursées. Vous pouvez le définir dans "Mes informations" après connexion.
                </p>
              )}
            </div>
          )}

          {/* ── Step 3 : Smartcar ── */}
          {step === "smartcar" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
                  <Car className="h-5 w-5 text-primary" /> Connexion véhicule
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Connectez votre véhicule électrique via Smartcar pour activer le suivi automatique.
                </p>
              </div>

              <div className="space-y-2">
                {["Redirection vers Smartcar", "Choisissez votre constructeur (Tesla, Renault…)", "Connectez-vous avec votre compte constructeur", "ChargiZ récupère vos données automatiquement"].map((s, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">{i + 1}</span>
                    <p className="text-sm text-muted-foreground">{s}</p>
                  </div>
                ))}
              </div>

              <a
                href={user.smartcar_auth_url}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 text-sm font-bold text-primary-foreground shadow-lg hover:bg-chargiz-teal-light"
              >
                Connecter mon véhicule via Smartcar
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>

              <p className="text-center text-xs text-muted-foreground">
                ChargiZ ne voit jamais vos identifiants constructeur. Connexion sécurisée OAuth.
              </p>
            </div>
          )}
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
