import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { AlertCircle, ArrowLeft, User, Car, Database, Filter, Save, Trash2, Edit3, X, CheckCircle2, Download, Zap, Battery, Leaf, Home, RefreshCw, Archive, ArchiveRestore } from "lucide-react";
import { apiFetch, api, API_URL, getAccessToken } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import AssignVehicleDialog from "@/components/AssignVehicleDialog";
import VehiculeSelector, { type VehiculeSelectorValue } from "@/components/VehiculeSelector";
import { normalizeImmat, getImmatError } from "@/lib/immat";
import VehicleDetachDialog from "@/components/VehicleDetachDialog";
import EntityAuditHistory from "@/components/EntityAuditHistory";
import AddressAutocomplete, { type AddressValue } from "@/components/AddressAutocomplete";
import PhoneInput from "@/components/PhoneInput";
import CongesCalendar from "@/components/CongesCalendar";
import { Link2, MapPin, Building2, Network, MapPinned, Unlink, Mail } from "lucide-react";

export const Route = createFileRoute("/dashboard/collaborateur/$id")({
  component: CollaborateurDetails,
  head: () => ({ meta: [{ title: "ChargiZ — Fiche Collaborateur" }] }),
});

interface Collaborateur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  adresse?: string | null;
  ville?: string | null;
  // Adresse domicile (BugID_016) — utilisée pour qualifier les recharges
  home_address?: string | null;
  home_latitude?: number | null;
  home_longitude?: number | null;
  pays_code?: string | null;
  is_active: boolean;
  created_at: string;
  archived_at?: string | null;
  archived_by?: number | null;
  entreprise_id: string;
  filiale_id?: string | null;
  site_id?: string | null;
  // BugID_023 — override individuel de la politique recharge
  prix_kwh?: number | null;
  jours_fermeture?: number | null;
}

interface Vehicule {
  id: string;
  marque: string | null;
  modele: string | null;
  immatriculation: string | null;
  vin: string | null;
  capacite_batterie: number | null;
  statut_smartcar: string;
}

interface Session {
  id: string;
  date_session: string;
  energie_kwh: number;
  cout_euro: number;
  is_domicile: boolean;
  // BugID_020 — nécessaire pour filtrer les sessions du couple collab/véhicule courant
  vehicule_id?: string;
}

function CollaborateurDetails() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const canEdit = role === "superadmin" || role === "gestionnaire_entreprise";

  const [collab, setCollab] = useState<Collaborateur | null>(null);
  // Hiérarchie organisationnelle (CDC §3.3.1) — visible sur la fiche.
  // Entreprise est affichée pour superadmin/admin uniquement (les gestionnaires
  // sont déjà scopés à une entreprise — l'info serait redondante).
  const [entrepriseInfo, setEntrepriseInfo] = useState<{ id: string; nom: string } | null>(null);
  const [filialeInfo, setFilialeInfo] = useState<{ id: string; nom: string } | null>(null);
  const [siteInfo, setSiteInfo] = useState<{ id: string; nom: string } | null>(null);
  const [vehicule, setVehicule] = useState<Vehicule | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  // Carte vehicule_id → immatriculation (pour la colonne Immat du récap, y compris
  // les anciens véhicules dont le collaborateur s'est détaché — cas changement de véhicule).
  const [vehiculesById, setVehiculesById] = useState<Map<string, string>>(new Map());
  // Sélecteur véhicule pour le récap PDF : "all" = tous, sinon un vehicule_id précis.
  const [recapVehiculeId, setRecapVehiculeId] = useState<string>("all");
  const [politique, setPolitique] = useState<{ prix_kwh: number | null; jours_fermeture: number | null; delegation_prix: string } | null>(null);
  const [serverKpis, setServerKpis] = useState<{ conso_moyenne_kwh_100km: number | null; co2_evite_kg: number | null; distance_km: number | null; dernier_km: number | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAssignVehicule, setShowAssignVehicule] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressDraft, setAddressDraft] = useState<AddressValue>({
    pays_code: "FR", adresse: "", code_postal: "", ville: "", latitude: null, longitude: null,
  });
  const [savingAddress, setSavingAddress] = useState(false);
  // BugID_023 — édition politique individuelle
  const [editingPolicy, setEditingPolicy] = useState(false);
  const [policyDraftPrix, setPolicyDraftPrix] = useState<string>("");
  // BugID_017 — feedback visuel quand une saisie est rejetée par le filtre
  const [policyPriceHint, setPolicyPriceHint] = useState<string | null>(null);
  const [policyDraftJours, setPolicyDraftJours] = useState<string[]>([]);
  const [savingPolicy, setSavingPolicy] = useState(false);

  // Edit state
  const [editingInfos, setEditingInfos] = useState(false);
  const [editingVehicule, setEditingVehicule] = useState(false);
  const [collabDraft, setCollabDraft] = useState<Partial<Collaborateur>>({});
  const [vehiculeDraft, setVehiculeDraft] = useState<Partial<Vehicule>>({});
  const [savingMsg, setSavingMsg] = useState<string | null>(null);

  // Date filter (YYYY-MM) — pour la table sessions historique
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  // Plage personnalisée pour les KPIs (Date de / Date à)
  const [statDateFrom, setStatDateFrom] = useState<string>("");
  const [statDateTo, setStatDateTo] = useState<string>("");

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Recharge les KPIs serveur (CDC §5.6 + §5.7) — utilise statDateFrom/statDateTo si remplis,
  // sinon le filtre selectedMonth, sinon toutes périodes.
  useEffect(() => {
    if (!id) return;
    let url = `/api/collaborateurs/${id}/kpis`;
    const params: string[] = [];
    if (statDateFrom && statDateTo && statDateFrom <= statDateTo) {
      // Plage personnalisée valide
      params.push(`date_from=${statDateFrom}`);
      params.push(`date_to=${statDateTo}T23:59:59`);
    } else if (selectedMonth !== "all") {
      const [y, m] = selectedMonth.split("-");
      const dFrom = `${y}-${m}-01`;
      const lastDay = new Date(Number(y), Number(m), 0).getDate();
      const dTo = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
      params.push(`date_from=${dFrom}`);
      params.push(`date_to=${dTo}T23:59:59`);
    }
    if (params.length) url += "?" + params.join("&");
    apiFetch<any>(url).then(setServerKpis).catch(() => setServerKpis(null));
  }, [id, selectedMonth, statDateFrom, statDateTo]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const c = await apiFetch<Collaborateur>(`/api/collaborateurs/${id}`);
      setCollab(c);

      const vs = await apiFetch<Vehicule[]>(`/api/vehicules?collaborateur_id=${id}`);
      setVehicule(vs.length > 0 ? vs[0] : null);

      const ss = await apiFetch<Session[]>(`/api/sessions?collaborateur_id=${id}`);
      setSessions(ss);

      // Carte immatriculations de TOUS les véhicules de l'entreprise — permet de
      // résoudre l'immat des sessions même sur d'anciens véhicules détachés
      // (cas "le collaborateur a changé de véhicule").
      try {
        const allVeh = await apiFetch<Vehicule[]>(`/api/vehicules?entreprise_id=${c.entreprise_id}`);
        const m = new Map<string, string>();
        for (const v of allVeh) if (v.id) m.set(v.id, v.immatriculation || "—");
        // S'assure que le véhicule courant est dans la carte aussi
        for (const v of vs) if (v.id) m.set(v.id, v.immatriculation || "—");
        setVehiculesById(m);
      } catch {/* best-effort */}

      // Politique entreprise (read-only on the fiche)
      try {
        const pols = await api.politiques.list({ entreprise_id: c.entreprise_id });
        if (pols.length > 0) setPolitique(pols[0]);
      } catch {/* politique optional */}

      // Hiérarchie organisationnelle (Entreprise · Filiale · Site)
      // — affichée sur la fiche pour donner le contexte de rattachement.
      // Entreprise : utile seulement pour superadmin/admin.
      const showEntreprise = role === "superadmin" || role === "admin";
      const tasks: Promise<unknown>[] = [];
      if (showEntreprise) {
        tasks.push(
          api.entreprises.get(c.entreprise_id)
            .then((e: any) => setEntrepriseInfo({ id: e.id, nom: e.nom }))
            .catch(() => setEntrepriseInfo(null))
        );
      } else {
        setEntrepriseInfo(null);
      }
      if (c.filiale_id) {
        tasks.push(
          api.filiales.get(c.filiale_id)
            .then((f: any) => setFilialeInfo({ id: f.id, nom: f.nom }))
            .catch(() => setFilialeInfo(null))
        );
      } else {
        setFilialeInfo(null);
      }
      if (c.site_id) {
        tasks.push(
          api.sites.get(c.site_id)
            .then((s: any) => setSiteInfo({ id: s.id, nom: s.nom }))
            .catch(() => setSiteInfo(null))
        );
      } else {
        setSiteInfo(null);
      }
      await Promise.all(tasks);
    } catch (err: any) {
      setError(err.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  // ─── Sessions filter ───
  const filteredSessions = useMemo(() => {
    if (selectedMonth === "all") return sessions;
    return sessions.filter(s => {
      const date = new Date(s.date_session);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return monthStr === selectedMonth;
    });
  }, [sessions, selectedMonth]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    sessions.forEach(s => {
      const date = new Date(s.date_session);
      months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    });
    return Array.from(months).sort().reverse();
  }, [sessions]);

  // Véhicules à proposer dans le sélecteur du récap : tous ceux apparaissant dans
  // les sessions du collaborateur (y compris d'anciens véhicules détachés) + le
  // véhicule courant. Permet de produire le récap par couple strict (CDC §2.4.3.2).
  const recapVehiculeOptions = useMemo(() => {
    const ids = new Set<string>();
    sessions.forEach(s => { if (s.vehicule_id) ids.add(s.vehicule_id); });
    if (vehicule?.id) ids.add(vehicule.id);
    return Array.from(ids).map(vid => ({
      id: vid,
      immat: vehiculesById.get(vid) || (vehicule?.id === vid ? (vehicule?.immatriculation || vid.slice(0, 8)) : vid.slice(0, 8)),
    }));
  }, [sessions, vehicule, vehiculesById]);

  // ─── Bloc 3 KPIs (always computed on filteredSessions) ───
  const kpis = useMemo(() => {
    const energieDom = filteredSessions.filter(s => s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0);
    const energieHors = filteredSessions.filter(s => !s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0);
    const coutDom = filteredSessions.filter(s => s.is_domicile).reduce((a, s) => a + (s.cout_euro || 0), 0);
    const coutTotal = filteredSessions.reduce((a, s) => a + (s.cout_euro || 0), 0);
    return {
      energieDom,
      energieHors,
      energieTotale: energieDom + energieHors,
      coutDom,
      coutTotal,
      // km / conso / CO2 viennent du backend (CDC §5.6, §5.7)
      km: serverKpis?.dernier_km ?? null,
      consoMoyenne: serverKpis?.conso_moyenne_kwh_100km ?? null,
      co2Evite: serverKpis?.co2_evite_kg ?? null,
    };
  }, [filteredSessions, serverKpis]);

  // ─── Edit handlers ───
  const startEditInfos = () => {
    if (!collab) return;
    setCollabDraft({
      nom: collab.nom,
      prenom: collab.prenom,
      email: collab.email,
      telephone: collab.telephone,
    });
    setEditingInfos(true);
  };
  // BugID_016 — édition adresse avec autocomplétion
  const startEditAddress = () => {
    if (!collab) return;
    setAddressDraft({
      pays_code: collab.pays_code || "FR",
      adresse: collab.home_address || "",
      code_postal: "",
      ville: "",
      latitude: collab.home_latitude ?? null,
      longitude: collab.home_longitude ?? null,
    });
    setEditingAddress(true);
  };
  const saveAddress = async () => {
    if (!collab) return;
    if (!addressDraft.adresse.trim()) {
      toast.error("Adresse requise", { description: "Veuillez saisir une adresse." });
      return;
    }
    setSavingAddress(true);
    try {
      // L'endpoint accepte latitude+longitude+address. Si pas de lat/lng (saisie manuelle
      // sans clé Google Maps), on envoie 0,0 par défaut ou on demande à l'utilisateur de
      // préciser. Pour rester pragmatique : on envoie ce qu'on a, le backend l'enregistre.
      await api.collaborateurs.setHome(
        collab.id,
        addressDraft.latitude ?? 0,
        addressDraft.longitude ?? 0,
        addressDraft.adresse,
      );
      await loadData();
      setEditingAddress(false);
      toast.success("Adresse enregistrée", { duration: 3000 });
    } catch (err: any) {
      toast.error("Enregistrement impossible", {
        description: err.message || "Erreur lors de la sauvegarde.",
      });
    } finally {
      setSavingAddress(false);
    }
  };

  // BugID_023 — Politique individuelle : helpers bitmask jours + handlers édition
  const JOUR_BITS_COLLAB: Record<string, number> = { lun: 1, mar: 2, mer: 4, jeu: 8, ven: 16, sam: 32, dim: 64 };
  const JOUR_LABELS_COLLAB: Record<string, string> = { lun: "Lun", mar: "Mar", mer: "Mer", jeu: "Jeu", ven: "Ven", sam: "Sam", dim: "Dim" };
  const maskToJoursCollab = (mask: number | null | undefined): string[] => {
    if (mask == null) return ["lun", "mar", "mer", "jeu", "ven"];
    return Object.keys(JOUR_BITS_COLLAB).filter(j => mask & JOUR_BITS_COLLAB[j]);
  };
  const joursToMaskCollab = (jours: string[]): number =>
    jours.reduce((acc, j) => acc | (JOUR_BITS_COLLAB[j] || 0), 0);

  const policyIsIndividual = politique?.delegation_prix === "collaborateur";

  const startEditPolicy = () => {
    if (!collab || !politique) return;
    // Si pas d'override : on initialise avec les valeurs entreprise comme point de départ
    const initialPrix = collab.prix_kwh ?? politique.prix_kwh ?? 0.21;
    const initialJours = collab.jours_fermeture != null
      ? maskToJoursCollab(collab.jours_fermeture)
      : maskToJoursCollab(politique.jours_fermeture);
    setPolicyDraftPrix(Number(initialPrix).toFixed(2));
    setPolicyDraftJours(initialJours);
    setEditingPolicy(true);
  };
  const togglePolicyJour = (j: string) =>
    setPolicyDraftJours(prev => prev.includes(j) ? prev.filter(x => x !== j) : [...prev, j]);

  const savePolicy = async () => {
    if (!collab) return;
    // BugID_017 — format décimal 2 chiffres (rejet explicite des saisies invalides)
    const rawTrimmed = (policyDraftPrix || "").trim();
    if (!rawTrimmed) {
      toast.error("Coût kWh requis", { description: "Saisissez un nombre décimal (ex : 0,18)." });
      return;
    }
    if (!/^\d+(\.\d{1,3})?$/.test(rawTrimmed)) {
      toast.error("Format invalide", {
        description: "Le coût du kWh doit être un nombre décimal (ex : 0,18). Caractères non numériques refusés.",
      });
      return;
    }
    // BugID_025 — strict positif
    const f = parseFloat(rawTrimmed);
    if (!isFinite(f) || f <= 0) {
      toast.error("Coût kWh invalide", { description: "Le coût du kWh doit être strictement positif." });
      return;
    }
    // BugID_026 — borne supérieure
    if (f > 5) {
      toast.error("Coût kWh trop élevé", { description: "Valeur ≤ 5 €/kWh attendue." });
      return;
    }
    // BugID_027 — au moins un jour
    if (policyDraftJours.length === 0) {
      toast.error("Jours éligibles", { description: "Au moins un jour doit être sélectionné." });
      return;
    }
    // BugID_017 — arrondi à 2 décimales (0.185 → 0.19 ; 0.184 → 0.18)
    const rounded = Math.round((f + 1e-9) * 100) / 100;
    setSavingPolicy(true);
    try {
      await api.collaborateurs.update(collab.id, {
        prix_kwh: rounded,
        jours_fermeture: joursToMaskCollab(policyDraftJours),
      });
      await loadData();
      setEditingPolicy(false);
      toast.success("Politique individuelle enregistrée");
    } catch (err: any) {
      toast.error("Enregistrement impossible", { description: err.message || "Erreur." });
    } finally {
      setSavingPolicy(false);
    }
  };

  const clearPolicyOverride = async () => {
    if (!collab) return;
    if (!window.confirm("Supprimer l'override individuel ?\n\nLe collaborateur retombera sur la politique globale entreprise.")) return;
    setSavingPolicy(true);
    try {
      await api.collaborateurs.update(collab.id, { prix_kwh: null, jours_fermeture: null });
      await loadData();
      setEditingPolicy(false);
      toast.success("Override supprimé — politique entreprise réappliquée");
    } catch (err: any) {
      toast.error("Suppression impossible", { description: err.message || "Erreur." });
    } finally {
      setSavingPolicy(false);
    }
  };

  // Récapitulatif PDF (CDC §2.4.3.2) — généré côté SERVEUR (reportlab).
  // Le rendu jsPDF côté client était limité (Latin-1, formatage cassé) ; on
  // télécharge désormais le PDF produit par le backend, propre et homogène.
  const [sendingRecap, setSendingRecap] = useState(false);

  // Construit les query params (période + véhicule) partagés par download/email.
  const buildRecapQuery = (): string => {
    const qs = new URLSearchParams();
    if (recapVehiculeId !== "all") qs.set("vehicule_id", recapVehiculeId);
    if (statDateFrom && statDateTo && statDateFrom <= statDateTo) {
      qs.set("date_from", statDateFrom);
      qs.set("date_to", `${statDateTo}T23:59:59`);
    } else if (selectedMonth !== "all") {
      const [y, m] = selectedMonth.split("-");
      const lastDay = new Date(Number(y), Number(m), 0).getDate();
      qs.set("date_from", `${y}-${m}-01`);
      qs.set("date_to", `${y}-${m}-${String(lastDay).padStart(2, "0")}T23:59:59`);
    }
    return qs.toString();
  };

  const downloadRecapPdf = async () => {
    if (!collab) return;
    try {
      const q = buildRecapQuery();
      const url = `${API_URL}/api/collaborateurs/${collab.id}/recap-pdf${q ? `?${q}` : ""}`;
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` },
      });
      if (!resp.ok) throw new Error(`Erreur serveur (${resp.status})`);
      const blob = await resp.blob();
      const a = document.createElement("a");
      const objUrl = URL.createObjectURL(blob);
      a.href = objUrl;
      a.download = `Recap_${collab.nom}_${collab.prenom}.pdf`.replace(/\s+/g, "_");
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
      toast.success("Récapitulatif téléchargé");
    } catch (err: any) {
      console.error(err);
      toast.error("Téléchargement impossible", { description: err.message || "Erreur lors de la génération du PDF." });
    }
  };

  // CDC §2.4.3.1 — Envoyer le récapitulatif par email au collaborateur.
  const sendRecapByEmail = async () => {
    if (!collab) return;
    setSendingRecap(true);
    try {
      const body: any = {};
      if (recapVehiculeId !== "all") body.vehicule_id = recapVehiculeId;
      if (statDateFrom && statDateTo && statDateFrom <= statDateTo) {
        body.date_from = statDateFrom;
        body.date_to = `${statDateTo}T23:59:59`;
      } else if (selectedMonth !== "all") {
        const [y, m] = selectedMonth.split("-");
        const lastDay = new Date(Number(y), Number(m), 0).getDate();
        body.date_from = `${y}-${m}-01`;
        body.date_to = `${y}-${m}-${String(lastDay).padStart(2, "0")}T23:59:59`;
      }
      const res = await apiFetch<{ ok: boolean; email: string }>(
        `/api/collaborateurs/${collab.id}/envoyer-recap`,
        { method: "POST", body: JSON.stringify(body) }
      );
      toast.success("Récapitulatif envoyé", { description: `Email envoyé à ${res.email}` });
    } catch (err: any) {
      console.error(err);
      toast.error("Envoi impossible", { description: err.message || "L'envoi de l'email a échoué." });
    } finally {
      setSendingRecap(false);
    }
  };

  const saveInfos = async () => {
    if (!collab) return;
    try {
      // BugID_015 — on envoie un payload propre (trim) et on recharge la fiche
      // intégrale pour garantir que les nouveaux nom/prénom s'affichent partout
      // (header, blocs, exports…).
      const payload: any = {
        nom: collabDraft.nom?.trim(),
        prenom: collabDraft.prenom?.trim(),
        email: collabDraft.email?.trim(),
        telephone: collabDraft.telephone?.trim() || null,
      };
      await api.collaborateurs.update(collab.id, payload);
      await loadData();  // rechargement complet → affichage à jour partout
      setEditingInfos(false);
      setSavingMsg("Informations mises à jour.");
      setTimeout(() => setSavingMsg(null), 2500);
    } catch (err: any) {
      toast.error("Mise à jour impossible", {
        description: err.message || "Erreur lors de la mise à jour.",
        icon: <AlertCircle className="h-4 w-4" />,
        duration: 4000,
      });
    }
  };

  const startEditVehicule = () => {
    if (!vehicule) return;
    setVehiculeDraft({
      marque: vehicule.marque,
      modele: vehicule.modele,
      immatriculation: vehicule.immatriculation,
      vin: vehicule.vin,
      capacite_batterie: vehicule.capacite_batterie,
    });
    setEditingVehicule(true);
  };
  const saveVehicule = async () => {
    if (!vehicule) return;
    // Validation immatriculation (CDC §5.1.1.2 — lettre + chiffre obligatoires)
    if (vehiculeDraft.immatriculation) {
      const err = getImmatError(vehiculeDraft.immatriculation);
      if (err) {
        toast.error("Immatriculation invalide", {
          description: err,
          icon: <AlertCircle className="h-4 w-4" />,
          duration: 4000,
        });
        return;
      }
    }
    try {
      const updated = await api.vehicules.update(vehicule.id, vehiculeDraft);
      setVehicule({ ...vehicule, ...updated });
      setEditingVehicule(false);
      setSavingMsg("Véhicule mis à jour.");
      setTimeout(() => setSavingMsg(null), 2500);
    } catch (err: any) {
      toast.error("Mise à jour impossible", {
        description: err.message || "Erreur lors de la mise à jour.",
        icon: <AlertCircle className="h-4 w-4" />,
        duration: 4000,
      });
    }
  };

  // ─── Workflow d'archivage collaborateur (inline, CDC §3.3.7 + §3.3.7.2) ────
  // S'il y a un véhicule associé : on demande à l'utilisateur s'il veut aussi
  // archiver le véhicule ou le garder, et s'il garde, s'il maintient ou suspend
  // l'abonnement Smartcar (frais de réactivation).
  const [showArchiveFlow, setShowArchiveFlow] = useState(false);
  // Pas de présélection : null tant que l'utilisateur n'a pas choisi
  const [archiveVehiculeChoice, setArchiveVehiculeChoice] = useState<"sortir_flotte" | "garder" | null>(null);
  const [archiveAbonnementChoice, setArchiveAbonnementChoice] = useState<"continuer" | "suspendre" | null>(null);

  const handleDelete = () => {
    if (!collab) return;
    // Reset à null à chaque ouverture (aucune présélection)
    setArchiveVehiculeChoice(null);
    setArchiveAbonnementChoice(null);
    setShowArchiveFlow(true);
    // Scroll vers le bloc d'archivage dès qu'il s'affiche
    setTimeout(() => {
      document.getElementById("archive-flow-block")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  // Le bouton "Confirmer l'archivage" n'est cliquable que si l'utilisateur a
  // fait tous les choix nécessaires (selon qu'il y a un véhicule ou non).
  const canConfirmArchive = (() => {
    if (!vehicule) return true; // pas de véhicule : pas de choix à faire
    if (archiveVehiculeChoice === "sortir_flotte") return true;
    if (archiveVehiculeChoice === "garder") return archiveAbonnementChoice !== null;
    return false; // pas encore choisi
  })();

  const doArchiveCollab = async () => {
    if (!collab) return;
    if (!canConfirmArchive) return;
    setDeleting(true);
    try {
      if (vehicule && archiveVehiculeChoice) {
        // Workflow combiné : on délègue à revoquerCollab côté backend
        // (gère véhicule + abonnement Smartcar + désaffectation + archivage collab)
        await api.vehicules_actions.revoquerCollab(collab.id, {
          vehicule_action: archiveVehiculeChoice,
          abonnement_action: archiveVehiculeChoice === "garder" ? archiveAbonnementChoice : null,
        });
      } else {
        // Pas de véhicule : archivage simple du collaborateur
        await apiFetch(`/api/collaborateurs/${collab.id}`, { method: "DELETE" });
      }
      toast.success("Collaborateur archivé", { duration: 3000 });
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error("Archivage impossible", {
        description: err.message || "Erreur lors de l'archivage.",
        icon: <AlertCircle className="h-4 w-4" />,
        duration: 4000,
      });
    } finally {
      setDeleting(false);
    }
  };

  // Réactiver (désarchiver) un collaborateur archivé — restaure son accès.
  const [unarchiving, setUnarchiving] = useState(false);
  const doUnarchiveCollab = async () => {
    if (!collab) return;
    setUnarchiving(true);
    try {
      await apiFetch(`/api/collaborateurs/${collab.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: true }),
      });
      toast.success("Collaborateur réactivé", {
        description: `${collab.prenom} ${collab.nom} a de nouveau accès à la plateforme.`,
        duration: 3500,
      });
      await loadData();
    } catch (err: any) {
      toast.error("Réactivation impossible", {
        description: err.message || "Erreur lors de la réactivation.",
        icon: <AlertCircle className="h-4 w-4" />,
        duration: 4000,
      });
    } finally {
      setUnarchiving(false);
    }
  };

  // Détacher le véhicule du collaborateur (libère le véhicule pour la flotte)
  // Workflow CDC §3.3.7.2 : on demande à l'utilisateur s'il veut garder ou
  // suspendre l'abonnement Smartcar via VehicleDetachDialog.
  const [detaching, setDetaching] = useState(false);
  const [showDetachDialog, setShowDetachDialog] = useState(false);
  const handleDetachConfirm = async (continuerAbonnement: boolean) => {
    if (!vehicule) return;
    setDetaching(true);
    try {
      await api.vehicules_actions.detacher(vehicule.id, continuerAbonnement);
      toast.success("Véhicule détaché", {
        description: continuerAbonnement ? "Abonnement Smartcar maintenu." : "Abonnement Smartcar suspendu.",
      });
      setShowDetachDialog(false);
      await loadData();
    } catch (err: any) {
      toast.error("Détachement impossible", { description: err.message || "Erreur." });
    } finally {
      setDetaching(false);
    }
  };

  // Archiver le véhicule (le retire définitivement de la flotte)
  const [archivingVeh, setArchivingVeh] = useState(false);
  const [showArchiveVehDialog, setShowArchiveVehDialog] = useState(false);
  // Dialog de suppression définitive du collaborateur (action irréversible) —
  // distinct du "Archiver" qui ouvre l'inline-flow avec choix véhicule/abonnement.
  const [showHardDeleteDialog, setShowHardDeleteDialog] = useState(false);
  const [hardDeleting, setHardDeleting] = useState(false);

  const doHardDeleteCollab = async () => {
    if (!collab) return;
    setHardDeleting(true);
    try {
      await apiFetch(`/api/collaborateurs/${collab.id}`, { method: "DELETE" });
      toast.success("Collaborateur supprimé", {
        description: `${collab.prenom} ${collab.nom} a été supprimé définitivement.`,
        duration: 4000,
      });
      setShowHardDeleteDialog(false);
      navigate({ to: "/dashboard/listes/collaborateurs" });
    } catch (err: any) {
      toast.error("Suppression impossible", {
        description: err?.message || "Une erreur est survenue. Veuillez réessayer.",
      });
    } finally {
      setHardDeleting(false);
    }
  };
  const doArchiveVehicule = async () => {
    if (!vehicule) return;
    setArchivingVeh(true);
    try {
      await api.vehicules_actions.archiver(vehicule.id);
      toast.success("Véhicule archivé", { duration: 3000 });
      await loadData();
    } catch (err: any) {
      toast.error("Archivage impossible", { description: err.message || "Erreur." });
    } finally {
      setArchivingVeh(false);
      setShowArchiveVehDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  if (error) return <div className="p-8 text-center text-destructive">{error}</div>;
  if (!collab) return <div className="p-8 text-center text-muted-foreground">Collaborateur introuvable.</div>;

  const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-all hover:border-[#0f4b49]/40 focus:border-[#0f4b49] focus:ring-2 focus:ring-[#0f4b49]/20 focus:ring-2 focus:ring-primary/20";

  // Compute index of collaborateur for display "Collaborateur #N" — we use the
  // 8 first chars of UUID as a stable visual identifier.
  const collabShortId = collab.id.slice(0, 8);

  return (
    <div className="p-4 sm:p-6 md:p-8 print:p-0 print:m-0">
      {/* ─── Top bar ─── */}
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link to="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Retour au tableau de bord
        </Link>
        <div className="flex items-center gap-2">
          {/* Sélecteur véhicule du récap — n'apparaît que si le collaborateur a
              utilisé plusieurs véhicules (cas changement de véhicule). */}
          {recapVehiculeOptions.length > 1 && (
            <select
              value={recapVehiculeId}
              onChange={(e) => setRecapVehiculeId(e.target.value)}
              title="Véhicule inclus dans le récapitulatif"
              className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">Tous les véhicules</option>
              {recapVehiculeOptions.map(v => (
                <option key={v.id} value={v.id}>{normalizeImmat(v.immat)}</option>
              ))}
            </select>
          )}
          <button onClick={downloadRecapPdf} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors">
            <Download className="h-3.5 w-3.5" /> Télécharger le récap
          </button>
          {/* CDC §2.4.3.1 — envoyer le récap par email au collaborateur */}
          <button
            onClick={sendRecapByEmail}
            disabled={sendingRecap}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            title="Envoyer le récapitulatif par email au collaborateur"
          >
            <Mail className="h-3.5 w-3.5" /> {sendingRecap ? "Envoi…" : "Envoyer par email"}
          </button>
          {canEdit && (
            <button
              onClick={() => setShowHardDeleteDialog(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
              title="Supprimer définitivement ce collaborateur"
            >
              <Trash2 className="h-3.5 w-3.5" /> Supprimer
            </button>
          )}
        </div>
      </div>

      {/* ─── Header : nom + badge Actif + Collaborateur #N ─── */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{collab.prenom} {collab.nom}</h1>
        <div className="mt-2 flex items-center gap-3 text-sm">
          {collab.is_active ? (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Actif</span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">Archivé</span>
          )}
          <span className="text-muted-foreground">Collaborateur #{collabShortId}</span>
        </div>
      </div>

      {savingMsg && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-chargiz-teal/10 p-3 text-sm text-chargiz-teal">
          <CheckCircle2 className="h-4 w-4 mt-0.5" /> {savingMsg}
        </div>
      )}

      {/* Bloc 1 — Identité collaborateur */}
      <div className="mb-6 rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-base font-medium text-card-foreground">Identité collaborateur</h3>
          <div className="flex items-center gap-2">
            {canEdit && !editingInfos && (
              <>
                <button
                  onClick={startEditInfos}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Modifier
                </button>
                {collab.is_active ? (
                  // Collaborateur actif → bouton Archiver (ouvre le workflow inline)
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
                  >
                    <Archive className="h-3.5 w-3.5" /> Archiver
                  </button>
                ) : (
                  // Collaborateur archivé → bouton Réactiver (désarchivage)
                  <button
                    onClick={doUnarchiveCollab}
                    disabled={unarchiving}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-chargiz-teal/30 bg-chargiz-teal/5 px-3 py-1.5 text-sm font-medium text-chargiz-teal hover:bg-chargiz-teal/10 transition-colors disabled:opacity-50"
                  >
                    <ArchiveRestore className="h-3.5 w-3.5" /> {unarchiving ? "Réactivation…" : "Réactiver"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        <div className="p-6">
          {editingInfos ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Prénom</label>
                  <input className={`mt-1 ${inputCls}`} value={collabDraft.prenom || ""} onChange={e => setCollabDraft(d => ({ ...d, prenom: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Nom</label>
                  <input className={`mt-1 ${inputCls}`} value={collabDraft.nom || ""} onChange={e => setCollabDraft(d => ({ ...d, nom: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Email</label>
                  <input type="email" className={`mt-1 ${inputCls}`} value={collabDraft.email || ""} onChange={e => setCollabDraft(d => ({ ...d, email: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Téléphone</label>
                  <div className="mt-1">
                    <PhoneInput
                      value={collabDraft.telephone || ""}
                      onChange={(e164) => setCollabDraft(d => ({ ...d, telephone: e164 }))}
                      defaultCountry="FR"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={saveInfos} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-95">
                  <Save className="h-4 w-4" /> Enregistrer
                </button>
                <button onClick={() => setEditingInfos(false)} className="rounded-lg border border-border px-4 py-2 text-sm">Annuler</button>
              </div>
            </div>
          ) : (
            <>
              {/* Une seule grille 3 colonnes : Prénom · Nom · Email,
                  Adresse · _ · Téléphone, (Entreprise si superadmin),
                  Filiale · Site · Coût kWh domicile, puis les jours.
                  Layout calé sur la maquette CDC §8.4 (cards simples, sans sous-blocs). */}
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 text-sm sm:grid-cols-3">
                <Field label="Prénom" value={collab.prenom} bold />
                <Field label="Nom" value={collab.nom} bold />
                <Field label="Email" value={collab.email} />

                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs text-muted-foreground">Adresse</p>
                    {canEdit && !editingAddress && (
                      <button
                        onClick={startEditAddress}
                        className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title={collab.home_address ? "Modifier l'adresse" : "Renseigner l'adresse"}
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <p className="mt-0.5 text-card-foreground">{collab.home_address || "—"}</p>
                </div>
                <div />
                <Field label="Téléphone" value={collab.telephone || "—"} />

                {entrepriseInfo && (
                  <>
                    <Field
                      label="Entreprise"
                      value={
                        <Link
                          to="/dashboard/listes/entreprises/$id"
                          params={{ id: entrepriseInfo.id }}
                          className="text-card-foreground hover:underline"
                        >
                          {entrepriseInfo.nom}
                        </Link>
                      }
                    />
                    <div />
                    <div />
                  </>
                )}

                <Field
                  label="Filiale"
                  value={filialeInfo ? (
                    <Link
                      to="/dashboard/listes/filiales/$id"
                      params={{ id: filialeInfo.id }}
                      className="text-card-foreground hover:underline"
                    >
                      {filialeInfo.nom}
                    </Link>
                  ) : "—"}
                />
                <Field
                  label="Site"
                  value={siteInfo ? (
                    <Link
                      to="/dashboard/listes/sites/$id"
                      params={{ id: siteInfo.id }}
                      className="text-card-foreground hover:underline"
                    >
                      {siteInfo.nom}
                    </Link>
                  ) : "—"}
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs text-muted-foreground">Coût kWh domicile</p>
                    {canEdit && policyIsIndividual && !editingPolicy && (
                      <button
                        onClick={startEditPolicy}
                        className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title={collab.prix_kwh != null ? "Modifier le coût" : "Personnaliser le coût"}
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <p className="mt-0.5 text-card-foreground">
                    {(() => {
                      const effective = policyIsIndividual && collab.prix_kwh != null
                        ? collab.prix_kwh
                        : politique?.prix_kwh;
                      return effective != null
                        ? `${effective.toFixed(2).replace(".", ",")} €`
                        : "—";
                    })()}
                  </p>
                </div>
              </div>

              {/* Jours de suivi de recharge — chips read-only, mêmes 7 cases que la maquette */}
              <div className="mt-6">
                <p className="mb-2 text-xs text-muted-foreground">Jours de suivi de recharge</p>
                <div className="flex flex-wrap gap-1.5">
                  {(["lun","mar","mer","jeu","ven","sam","dim"] as const).map((j) => {
                    const mask = (policyIsIndividual && collab.jours_fermeture != null)
                      ? collab.jours_fermeture
                      : politique?.jours_fermeture;
                    const eligible = maskToJoursCollab(mask).includes(j);
                    return (
                      <span
                        key={j}
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-md text-xs font-semibold ${
                          eligible
                            ? "bg-chargiz-teal text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {JOUR_LABELS_COLLAB[j]}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Édition inline de l'adresse — apparaît seulement si on a cliqué le crayon
                  près du champ "Adresse" ci-dessus. Évite un sous-bloc dédié quand pas utilisé. */}
              {editingAddress && (
                <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Modifier l'adresse domicile
                    </p>
                  </div>
                  <div className="space-y-3">
                    <AddressAutocomplete
                      value={addressDraft}
                      onChange={setAddressDraft}
                      hideCountry={false}
                    />
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={saveAddress}
                        disabled={savingAddress}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:brightness-95 disabled:opacity-50"
                      >
                        <Save className="h-3.5 w-3.5" /> {savingAddress ? "Enregistrement…" : "Enregistrer"}
                      </button>
                      <button
                        onClick={() => setEditingAddress(false)}
                        disabled={savingAddress}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs"
                      >
                        Annuler
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Cette adresse sert à qualifier automatiquement les sessions de recharge à domicile (rayon de 100 m).
                    </p>
                  </div>
                </div>
              )}

              {/* Édition inline politique individuelle — apparaît seulement après clic
                  sur le crayon près de "Coût kWh domicile". */}
              {editingPolicy && policyIsIndividual && politique && (
                <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4 text-sm">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Personnaliser la politique de recharge
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-muted-foreground">Coût du kWh (€ TTC)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        className={`mt-1 ${inputCls} max-w-[140px] ${policyPriceHint ? "border-amber-400 ring-2 ring-amber-200" : ""}`}
                        value={policyDraftPrix}
                        onChange={e => {
                          const raw = e.target.value.replace(",", ".");
                          if (raw === "") { setPolicyDraftPrix(""); setPolicyPriceHint(null); return; }
                          if (!/^\d*(\.\d{0,2})?$/.test(raw)) {
                            if (/[^\d.,]/.test(raw)) setPolicyPriceHint("Caractères non numériques refusés.");
                            else if (/\.\d{3,}/.test(raw)) setPolicyPriceHint("Maximum 2 décimales (ex : 0,18).");
                            else setPolicyPriceHint("Format invalide.");
                            setTimeout(() => setPolicyPriceHint(null), 2500);
                            return;
                          }
                          setPolicyPriceHint(null);
                          setPolicyDraftPrix(raw);
                        }}
                        onBlur={() => {
                          const f = parseFloat(policyDraftPrix);
                          if (!isFinite(f) || f <= 0) { setPolicyDraftPrix("0.21"); return; }
                          const rounded = Math.round((f + 1e-9) * 100) / 100;
                          setPolicyDraftPrix(rounded.toFixed(2));
                        }}
                        placeholder="0,18"
                      />
                      {policyPriceHint ? (
                        <p className="mt-1 text-[11px] text-amber-700">{policyPriceHint}</p>
                      ) : (
                        <p className="mt-1 text-[11px] text-muted-foreground">Strictement positif, ≤ 5 €/kWh — 2 décimales max.</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Jours éligibles au remboursement</label>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {Object.entries(JOUR_LABELS_COLLAB).map(([key, label]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => togglePolicyJour(key)}
                            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${policyDraftJours.includes(key) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={savePolicy}
                        disabled={savingPolicy}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:brightness-95 disabled:opacity-50"
                      >
                        <Save className="h-3.5 w-3.5" /> {savingPolicy ? "Enregistrement…" : "Enregistrer"}
                      </button>
                      <button onClick={() => setEditingPolicy(false)} disabled={savingPolicy} className="rounded-lg border border-border px-3 py-1.5 text-xs">
                        Annuler
                      </button>
                      {collab.prix_kwh != null && (
                        <button onClick={clearPolicyOverride} disabled={savingPolicy} className="ml-auto rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10">
                          Revenir à la politique entreprise
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bloc Congés — concerne uniquement la gestion des périodes non remboursables,
          ne duplique aucune info du bloc Identité ci-dessus. */}
      {collab && (
        <div className="mb-6">
          <CongesCalendar collaborateurId={collab.id} disabled={!canEdit} />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          Workflow d'archivage collaborateur — inline
          ─────────────────────────────────────────────────────────── */}
      {showArchiveFlow && collab && (
        <div
          id="archive-flow-block"
          className="mb-6 rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          {vehicule ? (
            <>
              {/* En-tête : question + sous-titre */}
              <div className="mb-5 flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" strokeWidth={2} />
                <div>
                  <h3 className="text-base font-semibold text-card-foreground">
                    Que souhaitez-vous faire avec le véhicule ?
                  </h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Choisissez l'action à appliquer au véhicule associé
                  </p>
                </div>
              </div>

              {/* Choix 1 : Archiver véhicule */}
              <button
                type="button"
                onClick={() => { setArchiveVehiculeChoice("sortir_flotte"); setArchiveAbonnementChoice(null); }}
                className={`w-full rounded-lg border bg-card p-4 text-left transition-all mb-2 ${
                  archiveVehiculeChoice === "sortir_flotte"
                    ? "border-chargiz-teal bg-chargiz-teal/5 ring-1 ring-chargiz-teal"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <p className="font-medium text-card-foreground">Archiver véhicule</p>
                <p className="mt-1 text-sm text-muted-foreground">Le véhicule sera également archivé</p>
              </button>

              {/* Choix 2 : Garder véhicule */}
              <button
                type="button"
                onClick={() => setArchiveVehiculeChoice("garder")}
                className={`w-full rounded-lg border bg-card p-4 text-left transition-all ${
                  archiveVehiculeChoice === "garder"
                    ? "border-chargiz-teal bg-chargiz-teal/5 ring-1 ring-chargiz-teal"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <p className="font-medium text-card-foreground">Garder véhicule</p>
                <p className="mt-1 text-sm text-muted-foreground">Le véhicule restera actif dans le système</p>
              </button>

              {/* Sous-options : seulement après clic sur Garder */}
              {archiveVehiculeChoice === "garder" && (
                <div className="mt-3 ml-6 space-y-2">
                  <button
                    type="button"
                    onClick={() => setArchiveAbonnementChoice("continuer")}
                    className={`w-full rounded-lg border bg-card px-4 py-3 text-left transition-all ${
                      archiveAbonnementChoice === "continuer"
                        ? "border-chargiz-teal bg-chargiz-teal/5 ring-1 ring-chargiz-teal"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <p className="font-medium text-card-foreground">Continuer abonnement</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setArchiveAbonnementChoice("suspendre")}
                    className={`w-full rounded-lg border bg-card px-4 py-3 text-left transition-all ${
                      archiveAbonnementChoice === "suspendre"
                        ? "border-chargiz-teal bg-chargiz-teal/5 ring-1 ring-chargiz-teal"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <p className="font-medium text-card-foreground">Suspendre abonnement</p>
                  </button>

                  {/* Avertissement : seulement après clic sur Suspendre */}
                  {archiveAbonnementChoice === "suspendre" && (
                    <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3.5 mt-3">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" strokeWidth={2} />
                      <div>
                        <p className="text-sm font-medium text-amber-800">Attention</p>
                        <p className="mt-0.5 text-sm text-amber-700">La suspension entraînera des frais de réactivation.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Pas de véhicule : on demande juste confirmation simple */
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" strokeWidth={2} />
              <div>
                <h3 className="text-base font-semibold text-card-foreground">
                  Archiver {collab.prenom} {collab.nom} ?
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Le compte sera désactivé. L'historique des sessions reste disponible.
                </p>
              </div>
            </div>
          )}

          {/* Boutons d'action */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowArchiveFlow(false)}
              disabled={deleting}
              className="rounded-lg border border-border bg-card px-5 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={doArchiveCollab}
              disabled={deleting || !canConfirmArchive}
              className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? "Archivage…" : "Confirmer l'archivage"}
            </button>
          </div>
        </div>
      )}

      {/* Bloc 2 — Véhicule associé */}
      <div className="mb-6 rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-base font-medium text-card-foreground">Véhicule associé</h3>
          {canEdit && vehicule && !editingVehicule && (
            <div className="flex items-center gap-2">
              <button
                onClick={startEditVehicule}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <Edit3 className="h-3.5 w-3.5" /> Modifier
              </button>
              <button
                onClick={() => setShowDetachDialog(true)}
                disabled={detaching}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                {detaching ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Unlink className="h-3.5 w-3.5" />
                )}
                {detaching ? "Détachement…" : "Détacher"}
              </button>
              <button
                onClick={() => setShowArchiveVehDialog(true)}
                disabled={archivingVeh}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <Archive className="h-3.5 w-3.5" /> Archiver véhicule
              </button>
            </div>
          )}
        </div>
        <div className="p-6">
          {!vehicule ? (
            <div className="flex flex-col items-center text-center py-6">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted/60">
                <Car className="h-6 w-6 text-muted-foreground/70" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold text-foreground">Aucun véhicule affecté</p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Vous pouvez lui affecter un véhicule libre de l'entreprise.
              </p>
              {canEdit && (
                <button
                  onClick={() => setShowAssignVehicule(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light"
                >
                  <Link2 className="h-4 w-4" /> Affecter un véhicule
                </button>
              )}
            </div>
          ) : editingVehicule ? (
            <div className="space-y-4">
              {/* Sélecteur véhicule depuis base EV (marque/modèle/capacité auto) */}
              <VehiculeSelector
                value={{
                  marque: vehiculeDraft.marque || "",
                  modele: vehiculeDraft.modele || "",
                  capacite_batterie: vehiculeDraft.capacite_batterie ?? null,
                } as VehiculeSelectorValue}
                onChange={(v) => setVehiculeDraft(d => ({
                  ...d,
                  marque: v.marque,
                  modele: v.modele,
                  capacite_batterie: v.capacite_batterie,
                }))}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Immatriculation</label>
                  <input
                    className={`mt-1 ${inputCls} font-mono uppercase tracking-wide`}
                    value={vehiculeDraft.immatriculation || ""}
                    maxLength={9}
                    placeholder="AB-123-CD"
                    onChange={e => setVehiculeDraft(d => ({
                      ...d,
                      immatriculation: normalizeImmat(e.target.value),
                    }))}
                  />
                  {(() => {
                    const err = vehiculeDraft.immatriculation
                      ? getImmatError(vehiculeDraft.immatriculation)
                      : null;
                    return err ? <p className="mt-1 text-[11px] text-destructive">{err}</p> : null;
                  })()}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">VIN</label>
                  <input className={`mt-1 ${inputCls} font-mono`} value={vehiculeDraft.vin || ""} onChange={e => setVehiculeDraft(d => ({ ...d, vin: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={saveVehicule} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-95">
                  <Save className="h-4 w-4" /> Enregistrer
                </button>
                <button onClick={() => setEditingVehicule(false)} className="rounded-lg border border-border px-4 py-2 text-sm">Annuler</button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 text-sm">
              {/* Ligne 1 : 4 colonnes — Marque · Modèle · Immat · VIN */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <div>
                  <p className="text-xs text-muted-foreground">Marque</p>
                  <p className="mt-1 text-card-foreground">{vehicule.marque || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Modèle</p>
                  <p className="mt-1 text-card-foreground">{vehicule.modele || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Immatriculation</p>
                  <p className="mt-1 font-mono text-card-foreground">{vehicule.immatriculation || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">VIN</p>
                  <p className="mt-1 font-mono text-card-foreground break-all">{vehicule.vin || "—"}</p>
                </div>
              </div>

              {/* Ligne 2 : 4 colonnes alignées sur la ligne 1
                  — Capacité (col 1, sous Marque)
                  — Statut Smartcar (col 2, sous Modèle)
                  — Statut affectation (col 3, sous Immatriculation)
                  — (col 4 vide, sous VIN) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <div>
                  <p className="text-xs text-muted-foreground">Capacité batterie</p>
                  <p className="mt-1 text-card-foreground">{vehicule.capacite_batterie ? `${vehicule.capacite_batterie} kWh` : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Statut Smartcar</p>
                  <div className="mt-1">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      vehicule.statut_smartcar === "connecte"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {vehicule.statut_smartcar === "connecte" ? "Connecté" : "Déconnecté"}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Statut affectation</p>
                  <div className="mt-1">
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      Affecté
                    </span>
                  </div>
                </div>
                <div aria-hidden="true" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bloc 3 — Statistiques collaborateur */}
      <div className="mb-6 rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-medium text-card-foreground">Statistiques collaborateur</h3>
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <div className="flex items-center gap-2">
              <label className="text-sm text-foreground/80">Date de</label>
              <input
                type="date"
                value={statDateFrom}
                max={statDateTo || undefined}
                onChange={e => {
                  const v = e.target.value;
                  setStatDateFrom(v);
                  if (v && statDateTo && v > statDateTo) setStatDateTo(v);
                }}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-foreground/80">Date à</label>
              <input
                type="date"
                value={statDateTo}
                min={statDateFrom || undefined}
                onChange={e => {
                  const v = e.target.value;
                  setStatDateTo(v);
                  if (v && statDateFrom && v < statDateFrom) setStatDateFrom(v);
                }}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm outline-none focus:border-primary"
              />
            </div>
            {(statDateFrom || statDateTo) && (
              <button
                type="button"
                onClick={() => { setStatDateFrom(""); setStatDateTo(""); }}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>
        {/* 4 KPI cards : icône en haut-droit */}
        <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiBox label="kWh domicile"      value={kpis.energieDom.toFixed(1)}                                       icon={Home}   iconColor="text-emerald-500" />
          <KpiBox label="kWh hors domicile" value={kpis.energieHors.toFixed(1)}                                      icon={MapPin} iconColor="text-amber-500"   />
          <KpiBox label="Consommation moy." value={kpis.consoMoyenne != null ? `${kpis.consoMoyenne.toFixed(1)} kWh` : "—"} icon={Zap}    iconColor="text-violet-500"  hint={kpis.consoMoyenne != null ? "/100km" : undefined} />
          <KpiBox label="CO₂ évité"          value={kpis.co2Evite != null ? `${kpis.co2Evite.toFixed(1)} kg` : "—"}   icon={Leaf}   iconColor="text-green-500"   />
        </div>
      </div>

      {/* Bloc 4 — Sessions de recharge */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-base font-medium text-card-foreground">Sessions de recharge domicile</h3>
          <div className="flex items-center gap-2 print:hidden">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:border-primary">
              <option value="all">Toutes les périodes</option>
              {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="cz-table-head">
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-6 py-3 font-medium text-muted-foreground">Date</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Lieu</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Énergie (kWh)</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Coût (€)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredSessions.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Aucune session enregistrée</td></tr>
              ) : filteredSessions.map(s => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-6 py-4 text-card-foreground">{new Date(s.date_session).toLocaleDateString("fr-FR")}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.is_domicile ? "bg-chargiz-teal/10 text-chargiz-teal" : "bg-kpi-away/10 text-kpi-away"}`}>
                      {s.is_domicile ? "Domicile" : "Hors domicile"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">{s.energie_kwh.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-medium">{s.cout_euro.toFixed(2)} €</td>
                </tr>
              ))}
              {filteredSessions.length > 0 && (
                <tr className="bg-muted/10 font-bold border-t-2 border-border">
                  <td colSpan={2} className="px-6 py-4 text-right">Total</td>
                  <td className="px-6 py-4 text-right">{kpis.energieTotale.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right text-primary">{kpis.coutTotal.toFixed(2)} €</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bloc 5 — Historique des modifications (CDC §2.6.2 / Étape 0 Lot 2) */}
      <EntityAuditHistory
        entityType="collaborateur"
        entityId={collab.id}
        title="Historique des modifications de la fiche"
      />

      {/* Confirmation archivage véhicule — tone "archive" (ambre, réversible) */}
      <ConfirmDeleteDialog
        open={showArchiveVehDialog}
        onOpenChange={(open) => { if (!open) setShowArchiveVehDialog(false); }}
        title={vehicule ? `Archiver le véhicule ${vehicule.immatriculation || vehicule.marque || ""} ?` : ""}
        description="Le véhicule sera retiré de la flotte active. L'historique des sessions reste conservé. L'opération est réversible (désarchivage)."
        onConfirm={doArchiveVehicule}
        loading={archivingVeh}
        tone="archive"
      />

      {/* Suppression définitive du collaborateur — action irréversible (tone destructive rouge) */}
      <ConfirmDeleteDialog
        open={showHardDeleteDialog}
        onOpenChange={(open) => { if (!open) setShowHardDeleteDialog(false); }}
        title={collab ? `Supprimer définitivement ${collab.prenom} ${collab.nom} ?` : ""}
        description="Cette action est irréversible. Le collaborateur, son véhicule, ses sessions et toutes les données associées seront définitivement supprimés."
        onConfirm={doHardDeleteCollab}
        loading={hardDeleting}
      />

      {/* Dialog de détachement véhicule (workflow CDC §3.3.7.2) */}
      {vehicule && collab && (
        <VehicleDetachDialog
          open={showDetachDialog}
          onClose={() => setShowDetachDialog(false)}
          onConfirm={handleDetachConfirm}
          vehiculeLabel={`${vehicule.marque || ""} ${vehicule.modele || ""} ${vehicule.immatriculation ? `(${vehicule.immatriculation})` : ""}`.trim() || "Véhicule"}
          collabName={`${collab.prenom} ${collab.nom}`}
          loading={detaching}
        />
      )}

      {/* Affectation d'un véhicule libre */}
      {collab && (
        <AssignVehicleDialog
          open={showAssignVehicule}
          onClose={() => setShowAssignVehicule(false)}
          mode="from-collab"
          collaborateur={{
            id: collab.id,
            prenom: collab.prenom,
            nom: collab.nom,
            entreprise_id: collab.entreprise_id,
          }}
          onAssigned={() => { setShowAssignVehicule(false); loadData(); }}
        />
      )}
    </div>
  );
}

function KpiBox({ label, value, icon: Icon, hint, iconColor }: { label: string; value: string; icon: React.ElementType; hint?: string; iconColor?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${iconColor || "text-muted-foreground"}`} strokeWidth={2} />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-card-foreground tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/**
 * Cellule label + valeur réutilisée dans le bloc Identité collaborateur.
 * Layout minimal aligné sur la maquette : label discret, valeur en dessous.
 */
function Field({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-card-foreground ${bold ? "font-medium" : ""}`}>{value}</p>
    </div>
  );
}
