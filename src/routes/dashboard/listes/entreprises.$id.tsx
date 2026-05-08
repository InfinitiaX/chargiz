import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft, Building2, Users, Car, Zap, Euro, Battery,
  MapPin, Mail, Phone, Hash, Calendar, ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/listes/entreprises/$id")({
  component: EntrepriseDetail,
  head: () => ({ meta: [{ title: "ChargiZ — Détails entreprise" }] }),
});

function EntrepriseDetail() {
  const { id } = Route.useParams();
  const { role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [entreprise, setEntreprise] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [collabs, setCollabs] = useState<any[]>([]);
  const [vehicules, setVehicules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const canAccess = role === "superadmin" || role === "gestionnaire_entreprise";

  useEffect(() => {
    if (authLoading || !canAccess) return;
    (async () => {
      try {
        const [ent, st, us, cs, vs] = await Promise.all([
          api.entreprises.get(id),
          api.stats.get(id).catch(() => null),
          api.users.list({ entreprise_id: id }).catch(() => []),
          api.collaborateurs.list({ entreprise_id: id }).catch(() => []),
          api.vehicules.list({ entreprise_id: id }).catch(() => []),
        ]);
        setEntreprise(ent);
        setStats(st);
        setUsers(us);
        setCollabs(cs);
        setVehicules(vs);
      } catch (e: any) {
        setErr(e.message ?? "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, canAccess, id]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!canAccess) {
    return <div className="p-8"><p className="text-muted-foreground">Accès non autorisé.</p></div>;
  }

  if (err || !entreprise) {
    return (
      <div className="p-8 max-w-2xl">
        <button onClick={() => navigate({ to: "/dashboard/listes/entreprises" })}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Retour à la liste
        </button>
        <p className="text-destructive">{err ?? "Entreprise introuvable"}</p>
      </div>
    );
  }

  // Helper : map collab.id → collab pour retrouver le collab d'un véhicule
  const collabById = new Map(collabs.map(c => [c.id, c]));

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl">
      {/* Header */}
      <button onClick={() => navigate({ to: "/dashboard/listes/entreprises" })}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Retour à la liste
      </button>

      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{entreprise.nom}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              SIREN {entreprise.siren ?? "—"} {entreprise.ville && `· ${entreprise.ville}`}
            </p>
          </div>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${
          entreprise.is_active ? "bg-chargiz-teal/10 text-chargiz-teal" : "bg-muted text-muted-foreground"
        }`}>
          {entreprise.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      {/* KPI cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiSmall icon={Users} label="Utilisateurs" value={users.length} />
        <KpiSmall icon={Users} label="Collaborateurs" value={collabs.length} />
        <KpiSmall icon={Car} label="Véhicules" value={vehicules.length} />
        <KpiSmall icon={Zap} label="Sessions" value={stats?.nb_sessions ?? 0} />
        <KpiSmall icon={Battery} label="Énergie" value={`${(stats?.energie_totale_kwh ?? 0).toFixed(1)} kWh`} />
        <KpiSmall icon={Euro} label="Coût total" value={`${(stats?.cout_total_euro ?? 0).toFixed(2)} €`} />
      </div>

      {/* Infos entreprise */}
      <Section title="Informations" icon={Building2}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <Info icon={Hash} label="SIREN" value={entreprise.siren} />
          <Info icon={Hash} label="SIRET" value={entreprise.siret} />
          <Info icon={Hash} label="N° TVA" value={entreprise.numero_tva} />
          <Info icon={MapPin} label="Adresse" value={[entreprise.adresse, entreprise.code_postal, entreprise.ville].filter(Boolean).join(", ") || null} />
          <Info icon={Mail} label="Email" value={entreprise.email} />
          <Info icon={Phone} label="Téléphone" value={entreprise.telephone} />
          <Info icon={Calendar} label="Créée le" value={entreprise.created_at ? new Date(entreprise.created_at).toLocaleDateString("fr-FR") : null} />
        </div>
      </Section>

      {/* Utilisateurs */}
      <Section title={`Utilisateurs (${users.length})`} icon={ShieldCheck}>
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Aucun utilisateur.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left">
                  <th className="px-4 py-2 font-medium text-muted-foreground">Nom</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Rôle</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Actif</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: any) => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2 font-medium">{u.full_name ?? "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                        {String(u.role ?? "").replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-2">{u.is_active ? "✓" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Collaborateurs */}
      <Section title={`Collaborateurs (${collabs.length})`} icon={Users}>
        {collabs.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Aucun collaborateur.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left">
                  <th className="px-4 py-2 font-medium text-muted-foreground">Nom</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Téléphone</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Actif</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {collabs.map((c: any) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2 font-medium">{c.prenom} {c.nom}</td>
                    <td className="px-4 py-2 text-muted-foreground">{c.email}</td>
                    <td className="px-4 py-2 text-muted-foreground">{c.telephone ?? "—"}</td>
                    <td className="px-4 py-2">{c.is_active ? "✓" : "—"}</td>
                    <td className="px-4 py-2 text-right">
                      <Link to="/dashboard/collaborateur/$id" params={{ id: c.id }} className="text-xs text-primary hover:underline">
                        Voir →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Véhicules */}
      <Section title={`Véhicules (${vehicules.length})`} icon={Car}>
        {vehicules.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Aucun véhicule.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left">
                  <th className="px-4 py-2 font-medium text-muted-foreground">Marque / Modèle</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Immatriculation</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Collaborateur affilié</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Smartcar</th>
                </tr>
              </thead>
              <tbody>
                {vehicules.map((v: any) => {
                  const collab = v.collaborateur_id ? collabById.get(v.collaborateur_id) : null;
                  return (
                    <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-2 font-medium">{v.marque} {v.modele}</td>
                      <td className="px-4 py-2 font-mono text-xs">{v.immatriculation ?? "—"}</td>
                      <td className="px-4 py-2">
                        {collab ? (
                          <span className="text-card-foreground">{collab.prenom} {collab.nom}</span>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">Non affilié</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center gap-1.5 text-xs ${
                          v.statut_smartcar === "connecte" ? "text-chargiz-teal" : "text-muted-foreground"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            v.statut_smartcar === "connecte" ? "bg-chargiz-teal" : "bg-muted-foreground"
                          }`} />
                          {v.statut_smartcar === "connecte" ? "Connecté" : "Déconnecté"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="mb-6 rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-6 py-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-base font-semibold text-card-foreground">{title}</h3>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium text-card-foreground">{value ?? "—"}</p>
      </div>
    </div>
  );
}

function KpiSmall({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="text-lg font-bold text-card-foreground">{value}</p>
    </div>
  );
}
