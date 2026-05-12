import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { User, Car, Shield, Save, MapPin, Navigation, Search, Loader2, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/dashboard/mes-infos")({
  component: MesInfosPage,
  head: () => ({ meta: [{ title: "ChargiZ — Mes informations" }] }),
});

const JOURS_BITMASK = [
  { key: "lun", label: "Lun", bit: 1 },
  { key: "mar", label: "Mar", bit: 2 },
  { key: "mer", label: "Mer", bit: 4 },
  { key: "jeu", label: "Jeu", bit: 8 },
  { key: "ven", label: "Ven", bit: 16 },
  { key: "sam", label: "Sam", bit: 32 },
  { key: "dim", label: "Dim", bit: 64 },
];

function MesInfosPage() {
  const { user } = useAuth();
  const [collaborateur, setCollaborateur] = useState<any>(null);
  const [vehicule, setVehicule] = useState<any>(null);
  const [entrepriseNom, setEntrepriseNom] = useState("");
  const [politique, setPolitique] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ nom: "", prenom: "", telephone: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Domicile
  const [addressInput, setAddressInput] = useState("");
  const [searchResult, setSearchResult] = useState<{ display_name: string; lat: number; lon: number } | null>(null);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [savingHome, setSavingHome] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.collaborateurs.list(),
      api.vehicules.list(),
      api.entreprises.list(),
      api.politiques.list(),
    ]).then(([collabs, vehicles, entreprises, politiques]) => {
      const collab = (collabs as any[])[0] ?? null;
      setCollaborateur(collab);
      if (collab) setForm({ nom: collab.nom ?? "", prenom: collab.prenom ?? "", telephone: collab.telephone ?? "" });
      if ((vehicles as any[]).length > 0) setVehicule((vehicles as any[])[0]);
      if ((entreprises as any[]).length > 0) setEntrepriseNom((entreprises as any[])[0].nom);
      if ((politiques as any[]).length > 0) setPolitique((politiques as any[])[0]);
    });
  }, [user]);

  const handleSave = async () => {
    if (!collaborateur) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.collaborateurs.update(collaborateur.id, {
        nom: form.nom,
        prenom: form.prenom,
        telephone: form.telephone || null,
      });
      setCollaborateur(updated);
      setEditMode(false);
    } catch (e: any) {
      setError(e.message ?? "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const nominatimSearch = async (query: string) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`, { headers: { "Accept-Language": "fr" } });
      const data = await res.json();
      return data[0] ?? null;
    } catch { return null; }
  };

  const saveHome = async (lat: number, lon: number, address: string) => {
    if (!collaborateur) return;
    setSavingHome(true);
    try {
      const updated = await api.collaborateurs.setHome(collaborateur.id, lat, lon, address);
      setCollaborateur({ ...collaborateur, home_latitude: updated.latitude, home_longitude: updated.longitude, home_address: updated.address });
      setSearchResult(null);
      setAddressInput("");
    } catch (e: any) {
      alert("Erreur : " + (e.message ?? "inconnue"));
    } finally {
      setSavingHome(false);
    }
  };

  const handleGPS = () => {
    if (!navigator.geolocation) { alert("Géolocalisation non supportée."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        setLocating(false);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`, { headers: { "Accept-Language": "fr" } });
          const data = await res.json();
          const address = data.display_name ?? `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
          await saveHome(pos.coords.latitude, pos.coords.longitude, address);
        } catch {
          await saveHome(pos.coords.latitude, pos.coords.longitude, `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
        }
      },
      err => { setLocating(false); alert("Position indisponible : " + err.message); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAddressSearch = async () => {
    if (!addressInput.trim()) return;
    setSearching(true);
    setSearchResult(null);
    const result = await nominatimSearch(addressInput.trim());
    setSearching(false);
    if (!result) { alert("Adresse non trouvée. Essayez d'être plus précis."); return; }
    setSearchResult({ display_name: result.display_name, lat: parseFloat(result.lat), lon: parseFloat(result.lon) });
  };

  const jourActif = (bit: number) => {
    if (politique?.jours_fermeture == null) return true;
    return !(politique.jours_fermeture & bit);
  };

  const inputCls =
    "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
  const greyedCls =
    "w-full rounded-lg border border-input bg-muted/50 px-4 py-2.5 text-sm text-muted-foreground cursor-not-allowed";

  if (!user)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Mes informations</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gérez vos informations personnelles et véhicule</p>
        </div>
        {!editMode && (
          <button
            onClick={() => setEditMode(true)}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Modifier
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Informations personnelles */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-card-foreground mb-4">
            <User className="h-5 w-5 text-primary" /> Informations personnelles
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {editMode ? (
              <>
                <div>
                  <label className="text-muted-foreground text-xs">Nom</label>
                  <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="text-muted-foreground text-xs">Prénom</label>
                  <input value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="text-muted-foreground text-xs">Téléphone</label>
                  <input value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} className={inputCls} />
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-muted-foreground">Nom</p>
                  <p className="font-medium text-card-foreground">{collaborateur?.nom || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Prénom</p>
                  <p className="font-medium text-card-foreground">{collaborateur?.prenom || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium text-card-foreground">{user.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Téléphone</p>
                  <p className="font-medium text-card-foreground">{collaborateur?.telephone || "—"}</p>
                </div>
              </>
            )}
            <div>
              <label className="text-muted-foreground text-xs">
                Entreprise <span className="text-[10px] uppercase">(non modifiable)</span>
              </label>
              <input value={entrepriseNom || "—"} disabled className={greyedCls} />
            </div>
          </div>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          {editMode && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> {saving ? "Sauvegarde..." : "Enregistrer"}
              </button>
              <button
                onClick={() => { setEditMode(false); setError(null); }}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
              >
                Annuler
              </button>
            </div>
          )}
        </div>

        {/* Domicile (geofencing) */}
        {user?.role === "collaborateur" && collaborateur && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
                <MapPin className="h-5 w-5 text-primary" /> Mon domicile
              </h3>
              {collaborateur.home_latitude && collaborateur.home_longitude && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-chargiz-teal/10 text-chargiz-teal">
                  Défini
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Pour différencier les recharges domicile/extérieures, ChargiZ a besoin de connaître la position GPS de votre domicile.
              Cliquez sur le bouton ci-dessous depuis votre domicile.
            </p>
            {/* Adresse actuelle */}
            {collaborateur.home_latitude && collaborateur.home_longitude && (
              <div className="mb-4 rounded-lg bg-primary/5 border border-primary/10 p-3 space-y-0.5">
                <p className="text-xs font-medium text-primary flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Domicile enregistré
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {collaborateur.home_address || `${collaborateur.home_latitude.toFixed(5)}, ${collaborateur.home_longitude.toFixed(5)}`}
                </p>
              </div>
            )}

            {/* Option A — GPS */}
            <div className="space-y-3">
              <div className="rounded-xl border border-border p-4 space-y-2">
                <p className="text-sm font-medium text-card-foreground">Option A — Je suis chez moi maintenant</p>
                <button
                  onClick={handleGPS}
                  disabled={locating || savingHome}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light disabled:opacity-50"
                >
                  {locating || savingHome ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                  {locating ? "Localisation…" : savingHome ? "Enregistrement…" : collaborateur.home_latitude ? "Mettre à jour via GPS" : "Utiliser ma position GPS"}
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">ou</span>
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
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                  >
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </button>
                </div>
                {searchResult && (
                  <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                    <p className="text-xs text-muted-foreground leading-relaxed">📍 {searchResult.display_name}</p>
                    <button
                      onClick={() => saveHome(searchResult.lat, searchResult.lon, searchResult.display_name)}
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
          </div>
        )}

        {/* Politique de recharge */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
              <Shield className="h-5 w-5 text-primary" /> Politique de recharge
            </h3>
            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-muted text-muted-foreground">
              Géré par l'entreprise
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="text-muted-foreground text-xs">Prix kWh entreprise (€)</label>
              <input
                value={politique?.prix_kwh != null ? `${politique.prix_kwh} €/kWh` : "—"}
                disabled
                className={greyedCls}
              />
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-2">Jours de recharge éligibles</p>
              <div className="flex gap-1.5 flex-wrap">
                {JOURS_BITMASK.map(j => (
                  <span
                    key={j.key}
                    className={`rounded-md px-3 py-1 text-xs font-medium ${
                      jourActif(j.bit) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {j.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Véhicule */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-card-foreground mb-4">
            <Car className="h-5 w-5 text-primary" /> Véhicule
          </h3>
          {vehicule ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Marque</p>
                <p className="font-medium text-card-foreground">{vehicule.marque || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Modèle</p>
                <p className="font-medium text-card-foreground">{vehicule.modele || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Immatriculation</p>
                <p className="font-medium font-mono text-card-foreground">{vehicule.immatriculation || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">VIN</p>
                <p className="font-medium font-mono text-xs text-card-foreground">{vehicule.vin || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Capacité batterie</p>
                <p className="font-medium text-card-foreground">
                  {vehicule.capacite_batterie ? `${vehicule.capacite_batterie} kWh` : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Statut connexion</p>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                    vehicule.statut_smartcar === "connecte" ? "text-chargiz-teal" : "text-muted-foreground"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      vehicule.statut_smartcar === "connecte" ? "bg-chargiz-teal" : "bg-muted-foreground"
                    }`}
                  />
                  {vehicule.statut_smartcar === "connecte"
                    ? "Connecté"
                    : vehicule.statut_smartcar === "suspendu"
                    ? "Suspendu"
                    : "Déconnecté"}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun véhicule affecté.</p>
          )}

          {/* Bouton "Connecter via Smartcar" si véhicule absent OU non connecté */}
          {user?.role === "collaborateur" && (!vehicule || vehicule.statut_smartcar !== "connecte") && (
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">
                {!vehicule
                  ? "Vous n'avez pas encore connecté de véhicule."
                  : "Votre véhicule n'est plus connecté à Smartcar."}
                {" Cliquez ci-dessous pour démarrer la connexion."}
              </p>
              <button
                onClick={async () => {
                  try {
                    const res = await api.me.smartcarConnectUrl();
                    window.location.href = res.smartcar_auth_url;
                  } catch (e: any) {
                    alert("Erreur : " + (e.message ?? "inconnue"));
                  }
                }}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light"
              >
                <Car className="h-4 w-4" />
                Connecter mon véhicule via Smartcar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
