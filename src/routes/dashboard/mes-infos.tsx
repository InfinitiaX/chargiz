import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { AlertCircle, User, Car, Shield, Save, MapPin, Plus, X, Home, Mail, Edit3 } from "lucide-react";
import { toast } from "sonner";
import AddressAutocomplete, { type AddressValue } from "@/components/AddressAutocomplete";
import MapPinPicker from "@/components/MapPinPicker";
import VehiculeSelector, { type VehiculeSelectorValue } from "@/components/VehiculeSelector";
import { normalizeImmat, getImmatError } from "@/lib/immat";

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
  // CDC §2.4.3.1 — saisie des infos véhicule AVANT la connexion Smartcar
  const [showVehiculeForm, setShowVehiculeForm] = useState(false);
  const [vehiculeDraft, setVehiculeDraft] = useState<VehiculeSelectorValue>({ marque: "", modele: "", capacite_batterie: null });
  const [vehiculeImmat, setVehiculeImmat] = useState("");
  const [connecting, setConnecting] = useState(false);
  // Liaison manuelle Smartcar (mode test uniquement — masqué en live)
  const [scLinkEnabled, setScLinkEnabled] = useState(false);
  const [scConnections, setScConnections] = useState<Array<{ vehicleId: string; userId: string; mode: string; connectedAt: string; linked: boolean; linkedToMe: boolean }>>([]);
  const [scSelected, setScSelected] = useState("");
  const [scLoading, setScLoading] = useState(false);
  const [scLinking, setScLinking] = useState(false);

  // CDC §5.3 — Qualification du lieu de recharge : adresse principale (obligatoire),
  // point de recharge domicile (si >100m), résidence secondaire (facultative).
  const [addrPrincipal, setAddrPrincipal] = useState<AddressValue>({ pays_code: "FR", adresse: "", code_postal: "", ville: "", latitude: null, longitude: null });
  const [pointRechargeDistant, setPointRechargeDistant] = useState<"non" | "oui">("non");
  const [rechargeMode, setRechargeMode] = useState<"adresse" | "pin">("adresse");
  const [addrRecharge, setAddrRecharge] = useState<AddressValue>({ pays_code: "FR", adresse: "", code_postal: "", ville: "", latitude: null, longitude: null });
  const [pinRecharge, setPinRecharge] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [showSecondaire, setShowSecondaire] = useState(false);
  const [addrSecondaire, setAddrSecondaire] = useState<AddressValue>({ pays_code: "FR", adresse: "", code_postal: "", ville: "", latitude: null, longitude: null });
  const [savingAddr, setSavingAddr] = useState(false);

  // Étape 6 Lot 2 — Workflow modification email (CDC §2.5.3)
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [requestingEmail, setRequestingEmail] = useState(false);

  // BugID_023 — Politique individuelle (édition par le collab si mode "collaborateur")
  const [editingPolicy, setEditingPolicy] = useState(false);
  const [polDraftPrix, setPolDraftPrix] = useState<string>("");
  // BugID_017 — feedback visuel quand une saisie est rejetée par le filtre
  const [polPrixHint, setPolPrixHint] = useState<string | null>(null);
  const [polDraftJours, setPolDraftJours] = useState<string[]>([]);
  const [savingPolicy, setSavingPolicy] = useState(false);

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
      if (collab) {
        setForm({ nom: collab.nom ?? "", prenom: collab.prenom ?? "", telephone: collab.telephone ?? "" });
        const pays = collab.pays_code || "FR";
        // Adresse principale (domicile) — CDC §5.3
        setAddrPrincipal({
          pays_code: pays,
          adresse: collab.home_address || "",
          code_postal: "",
          ville: "",
          latitude: collab.home_latitude ?? null,
          longitude: collab.home_longitude ?? null,
        });
        // Point de recharge domicile (si distant > 100m de l'adresse principale)
        if (collab.adresse_recharge_1 || (collab.lat_recharge_1 != null && collab.lng_recharge_1 != null)) {
          setPointRechargeDistant("oui");
          setPinRecharge({ lat: collab.lat_recharge_1 ?? null, lng: collab.lng_recharge_1 ?? null });
          if (collab.adresse_recharge_1 && collab.adresse_recharge_1 !== "Point GPS (carte)") {
            setRechargeMode("adresse");
            setAddrRecharge({
              pays_code: pays,
              adresse: collab.adresse_recharge_1 || "",
              code_postal: "",
              ville: "",
              latitude: collab.lat_recharge_1 ?? null,
              longitude: collab.lng_recharge_1 ?? null,
            });
          } else {
            setRechargeMode("pin");
          }
        }
        // Résidence secondaire (facultative)
        if (collab.adresse_secondaire) {
          setShowSecondaire(true);
          setAddrSecondaire({
            pays_code: pays,
            adresse: collab.adresse_secondaire || "",
            code_postal: "",
            ville: "",
            latitude: collab.lat_secondaire ?? null,
            longitude: collab.lng_secondaire ?? null,
          });
        }
      }
      if ((vehicles as any[]).length > 0) setVehicule((vehicles as any[])[0]);
      if ((entreprises as any[]).length > 0) setEntrepriseNom((entreprises as any[])[0].nom);
      if ((politiques as any[]).length > 0) setPolitique((politiques as any[])[0]);
    });
  }, [user]);

  // Liaison manuelle Smartcar (mode test) — charge les connexions disponibles
  const loadScConnections = async () => {
    setScLoading(true);
    try {
      const res = await api.me.smartcarAvailableConnections();
      setScLinkEnabled(res.enabled);
      setScConnections(res.connections || []);
    } catch {
      setScLinkEnabled(false);
    } finally {
      setScLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "collaborateur") loadScConnections();
  }, [user]);

  // BugID_023 — Édition politique individuelle par le collaborateur
  const policyDelegPrix = politique?.delegation_prix === "collaborateur";
  const policyDelegJours = politique?.delegation_jours === "collaborateur";
  const isPolicyEditable = policyDelegPrix || policyDelegJours;

  const startEditPolicy = () => {
    const initialPrix = collaborateur?.prix_kwh ?? politique?.prix_kwh ?? 0.21;
    const initialMask = collaborateur?.jours_fermeture != null
      ? Number(collaborateur.jours_fermeture)
      : Number(politique?.jours_fermeture ?? 31); // 31 = lun-ven
    setPolDraftPrix(Number(initialPrix).toFixed(2));
    setPolDraftJours(JOURS_BITMASK.filter(j => initialMask & j.bit).map(j => j.key));
    setEditingPolicy(true);
  };

  const togglePolJour = (key: string) =>
    setPolDraftJours(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]);

  const savePersonalPolicy = async () => {
    // BugID_017 — format décimal strict, max 2 chiffres
    if (policyDelegPrix) {
      const raw = (polDraftPrix || "").trim();
      if (!raw) {
        toast.error("Prix kWh requis", { description: "Saisissez un nombre décimal (ex : 0,18)." });
        return;
      }
      if (!/^\d+(\.\d{1,3})?$/.test(raw)) {
        toast.error("Format invalide", { description: "Le prix kWh doit être un nombre décimal (ex : 0,18)." });
        return;
      }
    }
    const f = parseFloat(polDraftPrix);
    if (policyDelegPrix && (!isFinite(f) || f <= 0)) {
      toast.error("Prix kWh invalide", { description: "Doit être strictement positif." });
      return;
    }
    if (policyDelegPrix && f > 5) {
      toast.error("Prix kWh trop élevé", { description: "Valeur ≤ 5 €/kWh attendue." });
      return;
    }
    if (policyDelegJours && polDraftJours.length === 0) {
      toast.error("Jours éligibles", { description: "Au moins un jour doit être sélectionné." });
      return;
    }
    setSavingPolicy(true);
    try {
      const payload: any = {};
      if (policyDelegPrix) payload.prix_kwh = Math.round((f + 1e-9) * 100) / 100;
      if (policyDelegJours) {
        const mask = polDraftJours.reduce(
          (acc, k) => acc | (JOURS_BITMASK.find(j => j.key === k)?.bit || 0),
          0
        );
        payload.jours_fermeture = mask;
      }
      const res = await api.me.updatePolicy(payload);
      setCollaborateur((c: any) => ({
        ...c,
        prix_kwh: res.prix_kwh,
        jours_fermeture: res.jours_fermeture,
      }));
      setEditingPolicy(false);
      toast.success("Politique individuelle enregistrée", { duration: 3000 });
    } catch (e: any) {
      toast.error("Enregistrement impossible", { description: e.message ?? "Erreur." });
    } finally {
      setSavingPolicy(false);
    }
  };

  const clearPersonalOverride = async () => {
    if (!window.confirm("Supprimer votre personnalisation et revenir aux valeurs par défaut entreprise ?")) return;
    setSavingPolicy(true);
    try {
      const payload: any = {};
      if (policyDelegPrix) payload.prix_kwh = null;
      if (policyDelegJours) payload.jours_fermeture = null;
      await api.me.updatePolicy(payload);
      setCollaborateur((c: any) => ({ ...c, prix_kwh: null, jours_fermeture: null }));
      setEditingPolicy(false);
      toast.success("Personnalisation supprimée — valeurs par défaut entreprise réappliquées");
    } catch (e: any) {
      toast.error("Suppression impossible", { description: e.message ?? "Erreur." });
    } finally {
      setSavingPolicy(false);
    }
  };

  async function requestEmailChange() {
    if (!newEmail || !newEmail.includes("@")) {
      toast.error("Email invalide");
      return;
    }
    setRequestingEmail(true);
    try {
      await api.me.requestEmailChange(newEmail.trim().toLowerCase());
      toast.success("Email de confirmation envoyé", {
        description: `Vérifiez votre boîte de réception actuelle (${user?.email}) pour confirmer le changement.`,
        duration: 6000,
      });
      setShowEmailChange(false);
      setNewEmail("");
    } catch (e: any) {
      toast.error("Demande impossible", { description: e.message ?? "Erreur." });
    } finally {
      setRequestingEmail(false);
    }
  }

  function buildAddrText(a: AddressValue): string {
    return a.code_postal && a.ville ? `${a.adresse}, ${a.code_postal} ${a.ville}` : a.adresse;
  }

  async function saveAdresses() {
    // CDC §5.3 — adresse principale obligatoire et géocodée
    if (addrPrincipal.latitude == null || addrPrincipal.longitude == null) {
      toast.error("Adresse principale requise", {
        description: "Sélectionnez votre adresse dans la liste pour la géolocaliser.",
        icon: <AlertCircle className="h-4 w-4" />,
      });
      return;
    }
    setSavingAddr(true);
    try {
      const payload: any = {
        home_address: buildAddrText(addrPrincipal),
        home_latitude: addrPrincipal.latitude,
        home_longitude: addrPrincipal.longitude,
      };
      // Point de recharge domicile (si > 100m du domicile) — adresse OU pin carte
      if (pointRechargeDistant === "oui") {
        if (rechargeMode === "adresse") {
          if (addrRecharge.latitude == null || addrRecharge.longitude == null) {
            toast.error("Point de recharge incomplet", { description: "Sélectionnez l'adresse du point de recharge dans la liste." });
            setSavingAddr(false); return;
          }
          payload.adresse_recharge_1 = buildAddrText(addrRecharge);
          payload.lat_recharge_1 = addrRecharge.latitude;
          payload.lng_recharge_1 = addrRecharge.longitude;
        } else {
          if (pinRecharge.lat == null || pinRecharge.lng == null) {
            toast.error("Point de recharge manquant", { description: "Positionnez le pin sur la carte." });
            setSavingAddr(false); return;
          }
          payload.adresse_recharge_1 = "Point GPS (carte)";
          payload.lat_recharge_1 = pinRecharge.lat;
          payload.lng_recharge_1 = pinRecharge.lng;
        }
      } else {
        payload.adresse_recharge_1 = null;
        payload.lat_recharge_1 = null;
        payload.lng_recharge_1 = null;
      }
      // Résidence secondaire (facultative)
      if (showSecondaire && addrSecondaire.adresse && addrSecondaire.latitude != null) {
        payload.adresse_secondaire = buildAddrText(addrSecondaire);
        payload.lat_secondaire = addrSecondaire.latitude;
        payload.lng_secondaire = addrSecondaire.longitude;
      } else if (!showSecondaire) {
        payload.adresse_secondaire = null;
        payload.lat_secondaire = null;
        payload.lng_secondaire = null;
      }
      await api.me.updateAdresses(payload);
      const refreshed = await api.me.profile();
      setCollaborateur((c: any) => ({ ...c, ...refreshed }));
      toast.success("Adresses enregistrées", { duration: 3000 });
    } catch (e: any) {
      toast.error("Enregistrement impossible", { description: e.message ?? "Erreur." });
    } finally {
      setSavingAddr(false);
    }
  }

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
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground">Email</p>
                    {user?.role === "collaborateur" && !showEmailChange && (
                      <button
                        type="button"
                        onClick={() => { setShowEmailChange(true); setNewEmail(""); }}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Edit3 className="h-3 w-3" /> Modifier
                      </button>
                    )}
                  </div>
                  {showEmailChange ? (
                    <div className="mt-1.5 space-y-2">
                      <input
                        type="email"
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        placeholder="nouveau.email@example.fr"
                        className={inputCls}
                      />
                      <p className="text-[11px] text-muted-foreground italic">
                        Un email de confirmation sera envoyé à votre adresse actuelle ({user.email}). Le changement n'est effectif qu'après confirmation par ce lien.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={requestEmailChange}
                          disabled={requestingEmail || !newEmail}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:brightness-95 disabled:opacity-50"
                        >
                          <Mail className="h-3.5 w-3.5" /> {requestingEmail ? "Envoi..." : "Envoyer la confirmation"}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowEmailChange(false); setNewEmail(""); }}
                          disabled={requestingEmail}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="font-medium text-card-foreground">{user.email}</p>
                  )}
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

        {/* ─── Mon domicile & lieu de recharge (CDC §5.3 — qualification du lieu de recharge) ─── */}
        {user?.role === "collaborateur" && collaborateur && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
                <MapPin className="h-5 w-5 text-primary" /> Mon domicile et mon lieu de recharge
              </h3>
              {addrPrincipal.latitude != null && addrPrincipal.longitude != null && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-chargiz-teal/10 text-chargiz-teal">Défini</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Sert à qualifier vos recharges : à domicile ou en déplacement. Une session à moins de 100&nbsp;m
              de votre point de recharge de référence est comptée comme « recharge à domicile ».
            </p>

            {/* Adresse principale (obligatoire) */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                Adresse principale <span className="text-destructive">*</span>
              </label>
              <AddressAutocomplete value={addrPrincipal} onChange={setAddrPrincipal} required />
              {addrPrincipal.latitude != null && addrPrincipal.longitude != null && (
                <p className="mt-1.5 text-xs text-muted-foreground font-mono">
                  GPS : {addrPrincipal.latitude.toFixed(5)}, {addrPrincipal.longitude.toFixed(5)}
                </p>
              )}
            </div>

            {/* Point de recharge à >100m ? */}
            <div className="border-t border-border pt-4 mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                Votre point de recharge est-il à plus de 100&nbsp;m de votre domicile ?
              </label>
              <p className="text-[11px] text-muted-foreground mb-3">
                Cas des copropriétés, parkings déportés, bornes de quartier… Si oui, précisez le point exact.
              </p>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setPointRechargeDistant("non")}
                  className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                    pointRechargeDistant === "non" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >Non — proche de mon domicile</button>
                <button
                  type="button"
                  onClick={() => setPointRechargeDistant("oui")}
                  className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                    pointRechargeDistant === "oui" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >Oui — préciser le point</button>
              </div>

              {pointRechargeDistant === "oui" && (
                <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                  {/* Choix : adresse OU pin carte */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRechargeMode("adresse")}
                      className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        rechargeMode === "adresse" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >Saisir une adresse</button>
                    <button
                      type="button"
                      onClick={() => setRechargeMode("pin")}
                      className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        rechargeMode === "pin" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >Positionner sur la carte</button>
                  </div>
                  {rechargeMode === "adresse" ? (
                    <AddressAutocomplete value={addrRecharge} onChange={setAddrRecharge} />
                  ) : (
                    <MapPinPicker
                      initialLat={pinRecharge.lat ?? addrPrincipal.latitude}
                      initialLng={pinRecharge.lng ?? addrPrincipal.longitude}
                      onChange={(lat, lng) => setPinRecharge({ lat, lng })}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Résidence secondaire (facultative) */}
            <div className="border-t border-border pt-4">
              {showSecondaire ? (
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-card-foreground">Résidence secondaire (facultatif)</p>
                    <button
                      type="button"
                      onClick={() => { setShowSecondaire(false); setAddrSecondaire({ pays_code: addrPrincipal.pays_code, adresse: "", code_postal: "", ville: "", latitude: null, longitude: null }); }}
                      className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
                    >
                      <X className="h-3 w-3" /> Retirer
                    </button>
                  </div>
                  <p className="mb-2 text-[11px] text-muted-foreground">
                    Si vous rechargez aussi dans une 2e résidence, elle sera également reconnue comme point de recharge à domicile.
                  </p>
                  <AddressAutocomplete value={addrSecondaire} onChange={setAddrSecondaire} />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSecondaire(true)}
                  className="w-full rounded-lg border border-dashed border-border bg-card p-3 text-sm font-medium text-muted-foreground hover:bg-muted/30 inline-flex items-center justify-center gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Ajouter une résidence secondaire (facultatif)
                </button>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={saveAdresses}
                disabled={savingAddr}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-95 disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> {savingAddr ? "Enregistrement…" : "Enregistrer mon domicile"}
              </button>
            </div>
          </div>
        )}

        {/* Politique de recharge — BugID_023 : édition par le collaborateur si mode individuel */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
              <Shield className="h-5 w-5 text-primary" /> Politique de recharge
            </h3>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                isPolicyEditable
                  ? "bg-chargiz-teal/10 text-chargiz-teal"
                  : "bg-muted text-muted-foreground"
              }`}>
                {isPolicyEditable ? "Personnalisable" : "Géré par l'entreprise"}
              </span>
              {isPolicyEditable && !editingPolicy && user?.role === "collaborateur" && (
                <button
                  type="button"
                  onClick={startEditPolicy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                >
                  <Save className="h-3.5 w-3.5" />
                  {(collaborateur?.prix_kwh != null || collaborateur?.jours_fermeture != null)
                    ? "Modifier"
                    : "Personnaliser"}
                </button>
              )}
            </div>
          </div>

          {editingPolicy && isPolicyEditable ? (
            /* ── Mode édition ── */
            <div className="space-y-5">
              {policyDelegPrix && (
                <div>
                  <label className="text-xs text-muted-foreground">Coût du kWh (€ TTC)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,18"
                    className={`mt-1 ${inputCls} max-w-[160px] ${polPrixHint ? "border-amber-400 ring-2 ring-amber-200" : ""}`}
                    value={polDraftPrix}
                    onChange={e => {
                      const raw = e.target.value.replace(",", ".");
                      if (raw === "") { setPolDraftPrix(""); setPolPrixHint(null); return; }
                      // BugID_017 — feedback visuel sur rejet
                      if (!/^\d*(\.\d{0,2})?$/.test(raw)) {
                        if (/[^\d.,]/.test(raw))      setPolPrixHint("Caractères non numériques refusés.");
                        else if (/\.\d{3,}/.test(raw)) setPolPrixHint("Maximum 2 décimales (ex : 0,18).");
                        else                          setPolPrixHint("Format invalide.");
                        setTimeout(() => setPolPrixHint(null), 2500);
                        return;
                      }
                      setPolPrixHint(null);
                      setPolDraftPrix(raw);
                    }}
                    onBlur={() => {
                      const f = parseFloat(polDraftPrix);
                      if (!isFinite(f) || f <= 0) { setPolDraftPrix("0.21"); return; }
                      const rounded = Math.round((f + 1e-9) * 100) / 100;
                      setPolDraftPrix(rounded.toFixed(2));
                    }}
                  />
                  {polPrixHint ? (
                    <p className="mt-1 text-[11px] text-amber-700 font-medium">{polPrixHint}</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-muted-foreground">Strictement positif, ≤ 5 €/kWh — 2 décimales max.</p>
                  )}
                </div>
              )}

              {policyDelegJours && (
                <div>
                  <label className="text-xs text-muted-foreground">Jours éligibles au remboursement</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {JOURS_BITMASK.map(j => (
                      <button
                        key={j.key}
                        type="button"
                        onClick={() => togglePolJour(j.key)}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                          polDraftJours.includes(j.key)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {j.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 flex-wrap pt-2">
                <button
                  type="button"
                  onClick={savePersonalPolicy}
                  disabled={savingPolicy}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-95 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" /> {savingPolicy ? "Enregistrement…" : "Enregistrer"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingPolicy(false)}
                  disabled={savingPolicy}
                  className="rounded-lg border border-border px-4 py-2 text-sm"
                >
                  Annuler
                </button>
                {(collaborateur?.prix_kwh != null || collaborateur?.jours_fermeture != null) && (
                  <button
                    type="button"
                    onClick={clearPersonalOverride}
                    disabled={savingPolicy}
                    className="ml-auto rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 hover:bg-red-100"
                  >
                    Revenir aux valeurs entreprise
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* ── Mode lecture ── */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="text-muted-foreground text-xs">
                  Prix kWh {policyDelegPrix ? "personnel" : "(entreprise)"}
                </label>
                <p className="mt-1 font-medium text-card-foreground">
                  {(() => {
                    const effective = policyDelegPrix && collaborateur?.prix_kwh != null
                      ? collaborateur.prix_kwh
                      : politique?.prix_kwh;
                    return effective != null ? `${Number(effective).toFixed(2)} €/kWh` : "—";
                  })()}
                </p>
                {policyDelegPrix && collaborateur?.prix_kwh == null && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground italic">
                    Valeur par défaut entreprise — non personnalisée
                  </p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-2">
                  Jours éligibles {policyDelegJours ? "(personnels)" : "(entreprise)"}
                </p>
                <div className="flex gap-1.5 flex-wrap">
                  {JOURS_BITMASK.map(j => {
                    const effectiveMask = policyDelegJours && collaborateur?.jours_fermeture != null
                      ? Number(collaborateur.jours_fermeture)
                      : Number(politique?.jours_fermeture ?? 0);
                    const actif = effectiveMask === 0 ? true : !!(effectiveMask & j.bit);
                    return (
                      <span
                        key={j.key}
                        className={`rounded-md px-3 py-1 text-xs font-medium ${
                          actif ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {j.label}
                      </span>
                    );
                  })}
                </div>
                {policyDelegJours && collaborateur?.jours_fermeture == null && (
                  <p className="mt-1 text-[10px] text-muted-foreground italic">
                    Valeurs par défaut entreprise — non personnalisées
                  </p>
                )}
              </div>
            </div>
          )}

          {!isPolicyEditable && (
            <p className="mt-4 text-[11px] text-muted-foreground italic">
              Mode global : votre entreprise applique un prix kWh et des jours communs à tous les collaborateurs.
              Pour personnaliser, votre gestionnaire doit basculer la politique en "Individuel collaborateur" dans ses réglages.
            </p>
          )}
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
              {/* CDC §2.4.3.1 — saisie des infos véhicule AVANT Smartcar si aucun véhicule */}
              {!vehicule && showVehiculeForm ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Renseignez d'abord les informations de votre véhicule, puis connectez-le à Smartcar.
                  </p>
                  <VehiculeSelector value={vehiculeDraft} onChange={setVehiculeDraft} required />
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Immatriculation *</label>
                    <input
                      type="text"
                      value={vehiculeImmat}
                      onChange={(e) => setVehiculeImmat(e.target.value.toUpperCase())}
                      placeholder="AA-123-BB"
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      disabled={connecting}
                      onClick={async () => {
                        // Validation
                        if (!vehiculeDraft.marque || !vehiculeDraft.modele) {
                          toast.error("Véhicule incomplet", { description: "Renseignez la marque et le modèle.", icon: <AlertCircle className="h-4 w-4" /> });
                          return;
                        }
                        const immatErr = getImmatError(vehiculeImmat);
                        if (immatErr) {
                          toast.error("Immatriculation invalide", { description: immatErr, icon: <AlertCircle className="h-4 w-4" /> });
                          return;
                        }
                        setConnecting(true);
                        try {
                          await api.me.setVehicule({
                            marque: vehiculeDraft.marque,
                            modele: vehiculeDraft.modele,
                            immatriculation: normalizeImmat(vehiculeImmat),
                            capacite_batterie: vehiculeDraft.capacite_batterie,
                          });
                          const res = await api.me.smartcarConnectUrl();
                          window.location.href = res.smartcar_auth_url;
                        } catch (e: any) {
                          setConnecting(false);
                          toast.error("Connexion Smartcar impossible", {
                            description: e.message ?? "Erreur inconnue.",
                            icon: <AlertCircle className="h-4 w-4" />,
                            duration: 4000,
                          });
                        }
                      }}
                      className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light disabled:opacity-60"
                    >
                      <Car className="h-4 w-4" />
                      {connecting ? "Connexion…" : "Enregistrer et connecter via Smartcar"}
                    </button>
                    <button
                      disabled={connecting}
                      onClick={() => setShowVehiculeForm(false)}
                      className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-3">
                    {!vehicule
                      ? "Vous n'avez pas encore connecté de véhicule."
                      : "Votre véhicule n'est plus connecté à Smartcar."}
                    {" Cliquez ci-dessous pour démarrer la connexion."}
                  </p>
                  <button
                    onClick={async () => {
                      // Si aucun véhicule : afficher d'abord le formulaire d'infos véhicule.
                      if (!vehicule) {
                        setShowVehiculeForm(true);
                        return;
                      }
                      // Véhicule déjà renseigné mais déconnecté : reconnexion directe.
                      try {
                        const res = await api.me.smartcarConnectUrl();
                        window.location.href = res.smartcar_auth_url;
                      } catch (e: any) {
                        toast.error("Connexion Smartcar impossible", {
                          description: e.message ?? "Erreur inconnue.",
                          icon: <AlertCircle className="h-4 w-4" />,
                          duration: 4000,
                        });
                      }
                    }}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light"
                  >
                    <Car className="h-4 w-4" />
                    Connecter mon véhicule via Smartcar
                  </button>
                </>
              )}
            </div>
          )}

          {/* Liaison manuelle Smartcar — MODE TEST uniquement (masqué en live) */}
          {user?.role === "collaborateur" && scLinkEnabled && (
            <div className="mt-6 pt-6 border-t border-border">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  Lier un véhicule simulé Smartcar
                  <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                    Mode test
                  </span>
                </p>
                <button
                  onClick={loadScConnections}
                  disabled={scLoading}
                  className="text-xs text-primary hover:underline disabled:opacity-50"
                >
                  {scLoading ? "…" : "Rafraîchir"}
                </button>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                Sélectionnez la connexion Smartcar (créée dans le Simulator) à relier à votre fiche véhicule.
                Ce bloc disparaît automatiquement en production.
              </p>
              {scConnections.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune connexion Smartcar disponible. Connectez un véhicule simulé dans le Simulator, puis « Rafraîchir ».
                </p>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-foreground">Connexion Smartcar</label>
                    <select
                      value={scSelected}
                      onChange={(e) => setScSelected(e.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">— Choisir —</option>
                      {scConnections.map((c) => (
                        <option key={c.vehicleId} value={c.vehicleId} disabled={c.linked && !c.linkedToMe}>
                          {c.vehicleId.slice(0, 8)}… · {new Date(c.connectedAt).toLocaleString("fr-FR")}
                          {c.linkedToMe ? " (déjà à vous)" : c.linked ? " (occupé)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    disabled={!scSelected || scLinking}
                    onClick={async () => {
                      const conn = scConnections.find((c) => c.vehicleId === scSelected);
                      if (!conn) return;
                      setScLinking(true);
                      try {
                        await api.me.smartcarLink({ vehicleId: conn.vehicleId, userId: conn.userId });
                        toast.success("Véhicule lié à Smartcar", {
                          description: "La connexion simulée est reliée à votre fiche véhicule.",
                          duration: 4000,
                        });
                        const vehicles = await api.vehicules.list();
                        if ((vehicles as any[]).length > 0) setVehicule((vehicles as any[])[0]);
                        setScSelected("");
                        await loadScConnections();
                      } catch (e: any) {
                        toast.error("Liaison impossible", {
                          description: e.message ?? "Erreur inconnue.",
                          icon: <AlertCircle className="h-4 w-4" />,
                          duration: 4000,
                        });
                      } finally {
                        setScLinking(false);
                      }
                    }}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light disabled:opacity-60"
                  >
                    <Car className="h-4 w-4" />
                    {scLinking ? "Liaison…" : "Lier"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
