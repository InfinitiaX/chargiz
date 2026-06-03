/**
 * Fiche détail Filiale — /dashboard/listes/filiales/$id.
 *
 * Pendant logique de la fiche entreprise (un cran plus bas dans la hiérarchie).
 * Affiche : fil d'Ariane Entreprise → Filiale, infos B2B, responsable,
 * KPIs sessions/kWh/coût, sites enfants en arborescence avec compteurs
 * collaborateurs, et collaborateurs rattachés directement à la filiale.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft, ArrowRight, Building2, Calendar, Car, Check, Euro, Hash,
  Mail, MapPin, MapPinned, Network, Phone, ShieldCheck, Users, Zap, Battery,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/listes/filiales/$id")({
  component: FilialeDetail,
  head: () => ({ meta: [{ title: "ChargiZ — Détails filiale" }] }),
});

function FilialeDetail() {
  const { id } = Route.useParams();
  const { role, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [filiale, setFiliale] = useState<any>(null);
  const [entreprise, setEntreprise] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [collabs, setCollabs] = useState<any[]>([]);
  const [vehicules, setVehicules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const canAccess = role === "superadmin" || role === "admin"
    || role === "gestionnaire_entreprise" || role === "gestionnaire_filiale";

  useEffect(() => {
    if (authLoading || !canAccess) return;
    (async () => {
      try {
        const fil = await api.filiales.get(id);
        const [ent, st, ss, cs, vs] = await Promise.all([
          api.entreprises.get(fil.entreprise_id).catch(() => null),
          // GET /api/filiales/{id}/stats — KPIs scopés filiale
          api.filiales.stats(id).catch(() => null),
          api.sites.list({ filiale_id: id }).catch(() => []),
          api.collaborateurs.list({ filiale_id: id }).catch(() => []),
          api.vehicules.list({ filiale_id: id }).catch(() => []),
        ]);
        setFiliale(fil);
        setEntreprise(ent);
        setStats(st);
        setSites(ss);
        setCollabs(cs);
        setVehicules(vs);
      } catch (e: any) {
        setErr(e?.message ?? "Erreur de chargement");
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

  if (err || !filiale) {
    return (
      <div className="p-8 max-w-2xl">
        <button onClick={() => navigate({ to: "/dashboard/listes/filiales" })}
          className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour à la liste
        </button>
        <p className="text-destructive">{err ?? "Filiale introuvable"}</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl">
      {/* Fil d'Ariane Entreprise → Filiale */}
      <nav className="mb-4 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <Link to="/dashboard/listes/filiales" className="hover:text-foreground">Filiales</Link>
        {entreprise && (
          <>
            <span>·</span>
            <Link
              to="/dashboard/listes/entreprises/$id"
              params={{ id: entreprise.id }}
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <Building2 className="h-3 w-3" /> {entreprise.nom}
            </Link>
          </>
        )}
        <ArrowRight className="h-3 w-3" />
        <span className="font-medium text-foreground">{filiale.nom}</span>
      </nav>

      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{filiale.nom}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {filiale.siret && <span className="font-mono">SIRET {filiale.siret}</span>}
              {filiale.ville && <> · {filiale.ville}</>}
            </p>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${
          filiale.is_active ? "bg-chargiz-teal/10 text-chargiz-teal" : "bg-muted text-muted-foreground"
        }`}>
          {filiale.is_active ? "Active" : "Archivée"}
        </span>
      </div>

      {/* KPIs */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiSmall icon={MapPinned} label="Sites" value={sites.length} />
        <KpiSmall icon={Users} label="Collaborateurs" value={collabs.length} />
        <KpiSmall icon={Car} label="Véhicules" value={vehicules.length} />
        <KpiSmall icon={Zap} label="Sessions" value={stats?.nb_sessions ?? 0} />
        <KpiSmall icon={Battery} label="Énergie" value={`${(stats?.energie_totale_kwh ?? 0).toFixed(1)} kWh`} />
        <KpiSmall icon={Euro} label="Coût total" value={`${(stats?.cout_total_euro ?? 0).toFixed(2)} €`} />
      </div>

      {/* Infos B2B */}
      <Section title="Informations" icon={Building2}>
        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <Info icon={Hash} label="SIRET" value={filiale.siret} />
          <Info icon={Hash} label="N° TVA" value={filiale.numero_tva} />
          <Info icon={MapPin} label="Adresse" value={[filiale.adresse, filiale.code_postal, filiale.ville].filter(Boolean).join(", ") || null} />
          <Info icon={Phone} label="Téléphone" value={filiale.telephone} />
          <Info icon={Calendar} label="Créée le" value={filiale.created_at ? new Date(filiale.created_at).toLocaleDateString("fr-FR") : null} />
        </div>
      </Section>

      {/* Responsable */}
      {(filiale.responsable_prenom || filiale.responsable_nom || filiale.responsable_email) && (
        <Section title="Responsable de la filiale" icon={ShieldCheck}>
          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <Info icon={ShieldCheck} label="Prénom" value={filiale.responsable_prenom} />
            <Info icon={ShieldCheck} label="Nom" value={filiale.responsable_nom} />
            <Info icon={Mail} label="Email" value={filiale.responsable_email} />
            <Info icon={Phone} label="Téléphone direct" value={filiale.responsable_telephone} />
          </div>
        </Section>
      )}

      {/* Sites enfants */}
      <Section title={`Sites (${sites.length})`} icon={Network}>
        {sites.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">Aucun site sous cette filiale.</p>
        ) : (
          <ul className="space-y-1">
            {sites
              .slice()
              .sort((a, b) => a.nom.localeCompare(b.nom))
              .map((s: any) => {
                const collabsSite = collabs.filter((c: any) => c.site_id === s.id);
                return (
                  <li key={s.id}>
                    <Link
                      to="/dashboard/listes/sites/$id"
                      params={{ id: s.id }}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm hover:bg-muted/40"
                    >
                      <MapPinned className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="font-medium text-card-foreground">{s.nom}</span>
                      {!s.is_active && (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                          archivé
                        </span>
                      )}
                      {s.ville && <span className="text-xs text-muted-foreground">· {s.ville}</span>}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {collabsSite.length} collaborateur{collabsSite.length > 1 ? "s" : ""}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </Link>
                  </li>
                );
              })}
          </ul>
        )}
      </Section>

      {/* Collaborateurs (de la filiale, tous sites confondus) */}
      <Section title={`Collaborateurs (${collabs.length})`} icon={Users}>
        {collabs.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">Aucun collaborateur.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="cz-table-head">
                <tr className="border-b border-border bg-muted/30 text-left">
                  <th className="px-4 py-2 font-medium text-muted-foreground">Nom</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Site</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Actif</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {collabs.map((c: any) => {
                  const site = sites.find((s: any) => s.id === c.site_id);
                  return (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-2 font-medium">{c.prenom} {c.nom}</td>
                      <td className="px-4 py-2 text-muted-foreground">{c.email}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {site ? site.nom : <span className="italic">— direct filiale —</span>}
                      </td>
                      <td className="px-4 py-2">{c.is_active ? <Check className="h-4 w-4 text-chargiz-teal" /> : "—"}</td>
                      <td className="px-4 py-2 text-right">
                        <Link to="/dashboard/collaborateur/$id" params={{ id: c.id }} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          Voir <ArrowRight className="h-3 w-3" />
                        </Link>
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

// ─── helpers ───────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="mb-6 rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border px-6 py-4">
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
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
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
      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="text-lg font-bold text-card-foreground tabular-nums">{value}</p>
    </div>
  );
}
