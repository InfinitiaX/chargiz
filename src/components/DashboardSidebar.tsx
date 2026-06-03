import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import logoChargiz from "@/assets/logo-chargiz.png";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  BarChart3,
  Settings,
  LogOut,
  Users,
  Car,
  Building2,
  MapPin,
  ChevronRight,
  List,
  ShieldCheck,
  Zap,
  User,
  Menu,
} from "lucide-react";

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
}

function getInitials(prenom?: string, nom?: string): string {
  const p = (prenom || "").trim()[0] || "";
  const n = (nom || "").trim()[0] || "";
  return (p + n).toUpperCase() || "U";
}

/** Horloge live affichée dans le footer de la sidebar (rafraîchit toutes les 30s) */
function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return <span className="font-mono tabular-nums">{hh}:{mm}</span>;
}

export default function DashboardSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, role } = useAuth();
  const [listesOpen, setListesOpen] = useState(
    location.pathname.includes("/dashboard/listes") ||
    location.pathname.includes("/dashboard/collaborateurs") ||
    location.pathname.includes("/dashboard/vehicules") ||
    location.pathname.includes("/dashboard/entreprises")
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const isCollab = role === "collaborateur";

  // Périmètre par rôle (CDC §1.2 + §6.2 — Lot 2 Étape 1/2/3)
  const getListesItems = (): NavItem[] => {
    const items: NavItem[] = [];
    // Admins : superadmin uniquement (CDC §1.2.1 — gestion des comptes Admin)
    if (role === "superadmin") {
      items.push({ to: "/dashboard/administration/admins", icon: ShieldCheck, label: "Admins" });
    }
    // Entreprises : superadmin (toutes) + admin (celles attribuées)
    if (role === "superadmin" || role === "admin") {
      items.push({ to: "/dashboard/listes/entreprises", icon: Building2, label: "Entreprises" });
    }
    if (role === "superadmin" || role === "admin" || role === "gestionnaire_entreprise" || role === "gestionnaire_filiale") {
      items.push({ to: "/dashboard/listes/filiales", icon: Building2, label: "Filiales" });
    }
    if (role === "superadmin" || role === "admin" || role === "gestionnaire_entreprise" ||
        role === "gestionnaire_filiale" || role === "gestionnaire_site") {
      items.push({ to: "/dashboard/listes/sites", icon: MapPin, label: "Sites" });
    }
    items.push({ to: "/dashboard/listes/vehicules", icon: Car, label: "Véhicules" });
    items.push({ to: "/dashboard/listes/collaborateurs", icon: Users, label: "Collaborateurs" });
    return items;
  };

  // Classe partagée des items de nav (avec animations CSS sidebar-link / sidebar-icon)
  const linkBase =
    "sidebar-link flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold tracking-tight";
  const linkActive = "bg-sidebar-accent text-sidebar-primary sidebar-link-active";
  const linkIdle =
    "text-sidebar-foreground/75 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground";

  /** Bloc identité : avatar gradient + nom + rôle + point vert "live" */
  const renderProfileBlock = () => {
    if (!profile) return null;
    const initials = getInitials(profile.prenom, profile.nom);
    return (
      <div className="border-b border-sidebar-border/60 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-sidebar-primary-foreground shadow-sm"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, var(--chargiz-lime) 0%, var(--chargiz-lime-dark) 100%)",
              }}
            >
              {initials}
            </div>
            <span
              aria-label="En ligne"
              className="sidebar-live-dot absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-sidebar"
              style={{ background: "var(--chargiz-lime)" }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-sidebar-foreground">
              {profile.prenom} {profile.nom}
            </p>
            <p className="truncate text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/55">
              {role?.replace(/_/g, " ") || "—"}
            </p>
          </div>
        </div>
      </div>
    );
  };

  /** Footer dynamique : statut système + heure live */
  const renderStatusFooter = () => {
    return (
      <div className="border-t border-sidebar-border/60 px-4 py-3">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-sidebar-foreground/45">
          <span className="flex items-center gap-1.5">
            <span
              className="sidebar-live-dot h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--chargiz-lime)" }}
            />
            Système OK
          </span>
          <LiveClock />
        </div>
      </div>
    );
  };

  const renderSidebarContent = () => {
    if (isCollab) {
      const collabNav: NavItem[] = [
        { to: "/dashboard", icon: Zap, label: "Ma performance" },
        { to: "/dashboard/mes-infos", icon: User, label: "Mes informations" },
        { to: "/dashboard/mes-consommations", icon: BarChart3, label: "Mes consommations" },
        { to: "/dashboard/reglages", icon: Settings, label: "Réglages" },
      ];

      return (
        <>
          <div className="flex h-16 items-center justify-center border-b border-sidebar-border/60 px-6">
            <img src={logoChargiz} alt="ChargiZ" className="h-7 w-auto" />
          </div>
          {renderProfileBlock()}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
            {collabNav.map((item) => {
              const isActive = item.to === "/dashboard"
                ? location.pathname === "/dashboard"
                : location.pathname.startsWith(item.to);
              return (
                <Link key={item.to} to={item.to} className={`${linkBase} ${isActive ? linkActive : linkIdle}`}>
                  <item.icon className="sidebar-icon h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-sidebar-border/60 p-3">
            <button
              onClick={handleLogout}
              className={`${linkBase} w-full text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground`}
            >
              <LogOut className="sidebar-icon h-5 w-5" />
              Déconnexion
            </button>
          </div>
          {renderStatusFooter()}
        </>
      );
    }

    const listesItems = getListesItems();
    const isListeActive = listesItems.some(i => location.pathname.startsWith(i.to));

    return (
      <>
        <div className="flex h-16 items-center justify-center border-b border-sidebar-border/60 px-6">
          <img src={logoChargiz} alt="ChargiZ" className="h-7 w-auto" />
        </div>

        {renderProfileBlock()}

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
          <Link
            to="/dashboard"
            className={`${linkBase} ${location.pathname === "/dashboard" ? linkActive : linkIdle}`}
          >
            <LayoutDashboard className="sidebar-icon h-5 w-5" />
            {role === "gestionnaire_entreprise" ? "Accueil" : "Dashboard"}
          </Link>

          <Link
            to="/dashboard/statistiques"
            className={`${linkBase} ${location.pathname.startsWith("/dashboard/statistiques") ? linkActive : linkIdle}`}
          >
            <BarChart3 className="sidebar-icon h-5 w-5" />
            Statistiques
          </Link>

          <button
            onClick={() => setListesOpen(!listesOpen)}
            className={`${linkBase} w-full ${isListeActive ? linkActive : linkIdle}`}
          >
            <List className="sidebar-icon h-5 w-5" />
            Listes
            <ChevronRight
              className={`ml-auto h-4 w-4 transition-transform duration-300 ease-in-out ${listesOpen ? "rotate-90" : ""}`}
            />
          </button>
          {/* Sous-menu animé : hauteur + opacité fluides (grid 0fr→1fr) */}
          <div
            className={`grid transition-all duration-300 ease-in-out ${
              listesOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <div className="ml-4 space-y-0.5 pt-0.5">
                {listesItems.map((item) => {
                  const isActive = location.pathname.startsWith(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`sidebar-link flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-semibold tracking-tight ${
                        isActive ? linkActive : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                      }`}
                    >
                      <item.icon className="sidebar-icon h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {(role === "superadmin" || role === "admin" || role === "gestionnaire_entreprise") && (
            <Link
              to="/dashboard/administration"
              className={`${linkBase} ${location.pathname.startsWith("/dashboard/administration") ? linkActive : linkIdle}`}
            >
              <ShieldCheck className="sidebar-icon h-5 w-5" />
              Administration
            </Link>
          )}

          <Link
            to="/dashboard/reglages"
            className={`${linkBase} ${location.pathname.startsWith("/dashboard/reglages") ? linkActive : linkIdle}`}
          >
            <Settings className="sidebar-icon h-5 w-5" />
            Réglages
          </Link>
        </nav>

        <div className="border-t border-sidebar-border/60 p-3">
          <button
            onClick={handleLogout}
            className={`${linkBase} w-full text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground`}
          >
            <LogOut className="sidebar-icon h-5 w-5" />
            Déconnexion
          </button>
        </div>
        {renderStatusFooter()}
      </>
    );
  };

  return (
    <>
      {/* Mobile top bar with hamburger */}
      <div className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar px-4 md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button
              aria-label="Ouvrir le menu"
              className="rounded-lg p-2 text-sidebar-foreground hover:bg-sidebar-accent/50"
            >
              <Menu className="h-6 w-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="sidebar-bg-gradient w-64 border-r-sidebar-border bg-sidebar p-0 text-sidebar-foreground [&>button]:text-sidebar-foreground">
            <div className="flex h-full flex-col">
              {renderSidebarContent()}
            </div>
          </SheetContent>
        </Sheet>
        <img src={logoChargiz} alt="ChargiZ" className="h-6 w-auto" />
        <div className="w-10" />
      </div>

      {/* Desktop fixed sidebar */}
      <aside className="sidebar-bg-gradient fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col bg-sidebar text-sidebar-foreground md:flex">
        {renderSidebarContent()}
      </aside>
    </>
  );
}
