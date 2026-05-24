import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { AlertCircle, ArrowLeft, User, Car, Database, Filter, Save, Trash2, Edit3, X, CheckCircle2, Download, Zap, Battery, Leaf, Home } from "lucide-react";
import { apiFetch, api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import AssignVehicleDialog from "@/components/AssignVehicleDialog";
import AddressAutocomplete, { type AddressValue } from "@/components/AddressAutocomplete";
import PhoneInput from "@/components/PhoneInput";
import { Link2, MapPin } from "lucide-react";

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
  const [vehicule, setVehicule] = useState<Vehicule | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
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
  const [policyDraftJours, setPolicyDraftJours] = useState<string[]>([]);
  const [savingPolicy, setSavingPolicy] = useState(false);

  // Edit state
  const [editingInfos, setEditingInfos] = useState(false);
  const [editingVehicule, setEditingVehicule] = useState(false);
  const [collabDraft, setCollabDraft] = useState<Partial<Collaborateur>>({});
  const [vehiculeDraft, setVehiculeDraft] = useState<Partial<Vehicule>>({});
  const [savingMsg, setSavingMsg] = useState<string | null>(null);

  // Date filter (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Recharge les KPIs serveur quand le filtre mois change (CDC §5.6 + §5.7)
  useEffect(() => {
    if (!id) return;
    let url = `/api/collaborateurs/${id}/kpis`;
    if (selectedMonth !== "all") {
      const [y, m] = selectedMonth.split("-");
      const dFrom = `${y}-${m}-01`;
      const lastDay = new Date(Number(y), Number(m), 0).getDate();
      const dTo = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
      url += `?date_from=${dFrom}&date_to=${dTo}T23:59:59`;
    }
    apiFetch<any>(url).then(setServerKpis).catch(() => setServerKpis(null));
  }, [id, selectedMonth]);

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

      // Politique entreprise (read-only on the fiche)
      try {
        const pols = await api.politiques.list({ entreprise_id: c.entreprise_id });
        if (pols.length > 0) setPolitique(pols[0]);
      } catch {/* politique optional */}
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
    // BugID_025 — strict positif
    const f = parseFloat(policyDraftPrix);
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
    setSavingPolicy(true);
    try {
      await api.collaborateurs.update(collab.id, {
        prix_kwh: Math.round((f + 1e-9) * 100) / 100,
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

  // BugID_019 + BugID_020 — génération PDF côté client avec téléchargement direct,
  // filtré sur le couple collab × véhicule actuel (cf. CDC §2.4.3.2).
  const downloadRecapPdf = async () => {
    if (!collab) return;
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      // Filtrage strict : si un véhicule est affecté, on ne garde QUE les sessions
      // de ce véhicule (sinon on prendrait l'historique d'anciens véhicules).
      let sessionsForPdf = filteredSessions;
      if (vehicule?.id) {
        sessionsForPdf = filteredSessions.filter(s => s.vehicule_id === vehicule.id);
      }
      // Recalcule les agrégats sur ce sous-ensemble
      const energieDom = sessionsForPdf.filter(s => s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0);
      const energieHors = sessionsForPdf.filter(s => !s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0);
      const coutDom = sessionsForPdf.filter(s => s.is_domicile).reduce((a, s) => a + (s.cout_euro || 0), 0);
      const coutTotal = sessionsForPdf.reduce((a, s) => a + (s.cout_euro || 0), 0);

      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const periodeLabel = selectedMonth === "all" ? "toutes périodes" : selectedMonth;
      const today = new Date().toLocaleDateString("fr-FR");

      // En-tête
      doc.setFontSize(18);
      doc.setTextColor(20, 122, 122);
      doc.text("ChargiZ — Récapitulatif de recharges", 14, 18);
      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text(`Édité le ${today}`, 14, 24);

      // Bloc identité
      doc.setFontSize(11);
      doc.setTextColor(20);
      doc.text(`Collaborateur : ${collab.prenom} ${collab.nom}`, 14, 34);
      doc.text(`Email : ${collab.email}`, 14, 40);
      if (vehicule) {
        const immat = vehicule.immatriculation || "—";
        doc.text(`Véhicule : ${vehicule.marque || ""} ${vehicule.modele || ""} (${immat})`, 14, 46);
      } else {
        doc.text("Véhicule : aucun véhicule affecté", 14, 46);
      }
      doc.text(`Période : ${periodeLabel}`, 14, 52);

      // KPIs (4 indicateurs — BugID_018)
      autoTable(doc, {
        startY: 58,
        head: [["kWh domicile", "kWh hors domicile", "Conso. (kWh/100km)", "CO₂ évité (kg)"]],
        body: [[
          energieDom.toFixed(1),
          energieHors.toFixed(1),
          kpis.consoMoyenne != null ? kpis.consoMoyenne.toFixed(1) : "—",
          kpis.co2Evite != null ? kpis.co2Evite.toFixed(0) : "—",
        ]],
        theme: "grid",
        headStyles: { fillColor: [20, 122, 122] },
        styles: { halign: "center" },
      });

      // Sessions
      const finalY = (doc as any).lastAutoTable?.finalY ?? 70;
      autoTable(doc, {
        startY: finalY + 6,
        head: [["Date", "Lieu", "Énergie (kWh)", "Coût (€)"]],
        body: sessionsForPdf.length === 0
          ? [["—", "Aucune session pour ce couple collaborateur/véhicule", "—", "—"]]
          : sessionsForPdf.map(s => [
              new Date(s.date_session).toLocaleDateString("fr-FR"),
              s.is_domicile ? "Domicile" : "Hors domicile",
              s.energie_kwh.toFixed(2),
              s.cout_euro.toFixed(2),
            ]),
        foot: sessionsForPdf.length > 0
          ? [["Total", "", (energieDom + energieHors).toFixed(2), coutTotal.toFixed(2)]]
          : undefined,
        theme: "striped",
        headStyles: { fillColor: [50, 50, 80] },
        footStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: "bold" },
      });

      // Pied de page
      const pageCount = (doc as any).internal.getNumberOfPages?.() ?? 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(`ChargiZ — Page ${i}/${pageCount}`, 14, 287);
      }

      // Total remboursable (info en bas)
      doc.setFontSize(10);
      doc.setTextColor(20);
      doc.text(`Coût remboursable (domicile) : ${coutDom.toFixed(2)} €`, 14, 280);

      // Nom de fichier explicite
      const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-");
      const fileName = `Recap_${slug(collab.nom)}_${slug(collab.prenom)}_${slug(periodeLabel)}.pdf`;
      doc.save(fileName);
      toast.success("Récapitulatif téléchargé", { description: fileName, duration: 3500 });
    } catch (err: any) {
      console.error(err);
      toast.error("Téléchargement impossible", { description: err.message || "Erreur lors de la génération PDF." });
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

  const handleDelete = () => {
    if (!collab) return;
    setShowDeleteDialog(true);
  };

  const doDelete = async () => {
    if (!collab) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/collaborateurs/${collab.id}`, { method: "DELETE" });
      navigate({ to: "/dashboard/listes/collaborateurs" });
    } catch (err: any) {
      toast.error("Suppression impossible", {
        description: err.message || "Erreur lors de la suppression.",
        icon: <AlertCircle className="h-4 w-4" />,
        duration: 4000,
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
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

  const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div className="p-4 sm:p-6 md:p-8 print:p-0 print:m-0">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link to="/dashboard/listes/collaborateurs" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour à la liste
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={downloadRecapPdf} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
            <Download className="h-4 w-4" /> Télécharger le récapitulatif
          </button>
          {canEdit && (
            <button onClick={handleDelete} className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" /> Supprimer
            </button>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <User className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{collab.prenom} {collab.nom}</h1>
          <p className="text-sm text-muted-foreground">{collab.is_active ? "Compte actif" : "Compte archivé"}</p>
        </div>
      </div>

      {savingMsg && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-chargiz-teal/10 p-3 text-sm text-chargiz-teal">
          <CheckCircle2 className="h-4 w-4 mt-0.5" /> {savingMsg}
        </div>
      )}

      {/* Bloc 1 — Informations collaborateur */}
      <div className="mb-6 rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-base font-semibold text-card-foreground">Informations collaborateur</h3>
          {canEdit && !editingInfos && (
            <button onClick={startEditInfos} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <Edit3 className="h-4 w-4" /> Modifier
            </button>
          )}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-muted-foreground">Nom</p><p className="mt-0.5 font-medium text-card-foreground">{collab.nom}</p></div>
                <div><p className="text-xs text-muted-foreground">Prénom</p><p className="mt-0.5 font-medium text-card-foreground">{collab.prenom}</p></div>
                <div><p className="text-xs text-muted-foreground">Email</p><p className="mt-0.5 text-card-foreground">{collab.email}</p></div>
                <div><p className="text-xs text-muted-foreground">Téléphone</p><p className="mt-0.5 text-card-foreground">{collab.telephone || "—"}</p></div>
              </div>

              {/* BugID_016 — Adresse domicile avec autocomplétion */}
              <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Adresse domicile</p>
                  </div>
                  {canEdit && !editingAddress && (
                    <button
                      onClick={startEditAddress}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Edit3 className="h-3.5 w-3.5" /> {collab.home_address ? "Modifier" : "Renseigner"}
                    </button>
                  )}
                </div>
                {editingAddress ? (
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
                ) : (
                  <>
                    <p className="text-sm text-card-foreground">{collab.home_address || <span className="text-muted-foreground italic">Non renseignée</span>}</p>
                    {collab.home_latitude != null && collab.home_longitude != null && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Coordonnées GPS : {collab.home_latitude.toFixed(5)}, {collab.home_longitude.toFixed(5)}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* BugID_023 — Bloc politique : éditable quand mode "Individuel collaborateur" */}
              {politique && (
                <div className="mt-6 rounded-lg bg-muted/40 p-4 text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Politique de recharge {policyIsIndividual ? "(individuelle)" : "(globale)"}
                    </p>
                    {canEdit && policyIsIndividual && !editingPolicy && (
                      <button
                        onClick={startEditPolicy}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Edit3 className="h-3.5 w-3.5" /> {collab.prix_kwh != null ? "Modifier" : "Personnaliser"}
                      </button>
                    )}
                  </div>

                  {editingPolicy && policyIsIndividual ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-muted-foreground">Coût du kWh (€ TTC)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="5"
                          inputMode="decimal"
                          className={`mt-1 ${inputCls} max-w-[140px]`}
                          value={policyDraftPrix}
                          onChange={e => {
                            const raw = e.target.value.replace(",", ".");
                            if (raw === "") { setPolicyDraftPrix(""); return; }
                            if (!/^\d*(\.\d{0,2})?$/.test(raw)) return;
                            setPolicyDraftPrix(raw);
                          }}
                          onBlur={() => {
                            const f = parseFloat(policyDraftPrix);
                            if (!isFinite(f) || f <= 0) setPolicyDraftPrix("0.21");
                            else setPolicyDraftPrix(f.toFixed(2));
                          }}
                        />
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
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Coût du kWh appliqué</p>
                        <p className="mt-0.5 font-medium">
                          {(() => {
                            const effective = policyIsIndividual && collab.prix_kwh != null
                              ? collab.prix_kwh
                              : politique.prix_kwh;
                            return effective != null ? `${effective.toFixed(2)} €` : "—";
                          })()}
                        </p>
                        {policyIsIndividual && collab.prix_kwh == null && (
                          <p className="mt-0.5 text-[10px] text-muted-foreground italic">Hérité — non personnalisé</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Mode</p>
                        <p className="mt-0.5 capitalize">
                          {policyIsIndividual ? "Individuel collaborateur" : "Global entreprise"}
                        </p>
                      </div>
                    </div>
                  )}

                  {!policyIsIndividual && (
                    <p className="mt-3 text-[11px] text-muted-foreground italic">
                      Mode global : pour personnaliser, basculer la politique en "Individuel collaborateur" depuis les réglages.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bloc 2 — Véhicule */}
      <div className="mb-6 rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-base font-semibold text-card-foreground flex items-center gap-2"><Car className="h-4 w-4" /> Véhicule affecté</h3>
          {canEdit && vehicule && !editingVehicule && (
            <button onClick={startEditVehicule} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <Edit3 className="h-4 w-4" /> Modifier
            </button>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Marque</label>
                  <input className={`mt-1 ${inputCls}`} value={vehiculeDraft.marque || ""} onChange={e => setVehiculeDraft(d => ({ ...d, marque: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Modèle</label>
                  <input className={`mt-1 ${inputCls}`} value={vehiculeDraft.modele || ""} onChange={e => setVehiculeDraft(d => ({ ...d, modele: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Immatriculation</label>
                  <input
                    className={`mt-1 ${inputCls} font-mono uppercase tracking-wide`}
                    value={vehiculeDraft.immatriculation || ""}
                    maxLength={10}
                    onChange={e => setVehiculeDraft(d => ({
                      ...d,
                      // BugID_014 — majuscules + alphanumérique uniquement
                      immatriculation: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                    }))}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">Lettres et chiffres uniquement — saisie auto-formatée.</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Capacité batterie (kWh)</label>
                  <input type="number" step="0.1" className={`mt-1 ${inputCls}`} value={vehiculeDraft.capacite_batterie ?? ""} onChange={e => setVehiculeDraft(d => ({ ...d, capacite_batterie: e.target.value === "" ? null : parseFloat(e.target.value) }))} />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-muted-foreground">Marque / Modèle</p><p className="mt-0.5 font-medium text-card-foreground">{vehicule.marque || "—"} {vehicule.modele || ""}</p></div>
              <div><p className="text-xs text-muted-foreground">Immatriculation</p><p className="mt-0.5 font-mono text-card-foreground">{vehicule.immatriculation || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Capacité batterie</p><p className="mt-0.5 text-card-foreground">{vehicule.capacite_batterie ? `${vehicule.capacite_batterie} kWh` : "—"}</p></div>
              <div>
                <p className="text-xs text-muted-foreground">Statut Smartcar</p>
                <p className={`mt-0.5 font-medium ${vehicule.statut_smartcar === "connecte" ? "text-chargiz-teal" : "text-muted-foreground"}`}>
                  {vehicule.statut_smartcar === "connecte" ? "Connecté" : "Déconnecté"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bloc 3 — Statistiques collaborateur */}
      <div className="mb-6 rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h3 className="text-base font-semibold text-card-foreground flex items-center gap-2"><Zap className="h-4 w-4" /> Statistiques de recharge</h3>
        </div>
        {/* BugID_018 — 4 indicateurs uniquement (CDC §2.4.3.2) */}
        <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiBox label="kWh domicile" value={`${kpis.energieDom.toFixed(2)} kWh`} icon={Home} />
          <KpiBox label="kWh hors domicile" value={`${kpis.energieHors.toFixed(2)} kWh`} icon={Battery} />
          <KpiBox label="Conso. moy. (kWh/100km)" value={kpis.consoMoyenne != null ? kpis.consoMoyenne.toFixed(1) : "—"} icon={Battery} hint={kpis.consoMoyenne == null ? "Min. 2 sessions requises" : undefined} />
          <KpiBox label="CO₂ évité" value={kpis.co2Evite != null ? `${kpis.co2Evite.toFixed(0)} kg` : "—"} icon={Leaf} hint={kpis.co2Evite == null ? "Min. 2 sessions requises" : undefined} />
        </div>
      </div>

      {/* Bloc 4 — Sessions de recharge */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-base font-semibold text-card-foreground flex items-center gap-2">
            <Database className="h-4 w-4" /> Sessions de recharge
          </h3>
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
            <thead>
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

      <ConfirmDeleteDialog
        open={showDeleteDialog}
        onOpenChange={(open) => { if (!open) setShowDeleteDialog(false); }}
        title={collab ? `Supprimer ${collab.prenom} ${collab.nom} ?` : ""}
        description="Cette action est irréversible. Toutes les données associées (véhicule, sessions de recharge, compte) seront définitivement perdues."
        onConfirm={doDelete}
        loading={deleting}
      />

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

function KpiBox({ label, value, icon: Icon, hint }: { label: string; value: string; icon: React.ElementType; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="mt-2 text-xl font-bold text-card-foreground">{value}</p>
      {hint && <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">{hint}</p>}
    </div>
  );
}
