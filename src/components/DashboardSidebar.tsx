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
  ChevronDown,
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

  const getListesItems = (): NavItem[] => {
    const items: NavItem[] = [];
    if (role === "superadmin") {
      items.push({ to: "/dashboard/listes/admins", icon: ShieldCheck, label: "Admins" });
    }
    if (role === "superadmin" || role === "admin") {
      items.push({ to: "/dashboard/listes/entreprises", icon: Building2, label: "Entreprises" });
    }
    if (role === "superadmin" || role === "admin" || role === "gestionnaire_entreprise") {
      items.push({ to: "/dashboard/listes/filiales", icon: Building2, label: "Filiales" });
    }
    if (role === "superadmin" || role === "admin" || role === "gestionnaire_entreprise" || role === "gestionnaire_filiale") {
      items.push({ to: "/dashboard/listes/sites", icon: MapPin, label: "Sites" });
    }
    items.push({ to: "/dashboard/listes/vehicules", icon: Car, label: "Véhicules" });
    items.push({ to: "/dashboard/listes/collaborateurs", icon: Users, label: "Collaborateurs" });
    return items;
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
          <div className="flex h-16 items-center justify-center border-b border-sidebar-border px-6">
            <img src={logoChargiz} alt="ChargiZ" className="h-7 w-auto" />
          </div>
          {profile && (
            <div className="border-b border-sidebar-border px-4 py-3">
              <p className="text-sm font-bold text-sidebar-foreground">{profile.prenom} {profile.nom}</p>
              <p className="text-xs text-sidebar-foreground/60 capitalize">{role?.replace(/_/g, " ") || "—"}</p>
            </div>
          )}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
            {collabNav.map((item) => {
              const isActive = item.to === "/dashboard"
                ? location.pathname === "/dashboard"
                : location.pathname.startsWith(item.to);
              return (
                <Link key={item.to} to={item.to}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold transition-all ${
                    isActive ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }`}>
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-sidebar-border p-4">
            <button onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
              <LogOut className="h-5 w-5" />
              Déconnexion
            </button>
          </div>
        </>
      );
    }

    const listesItems = getListesItems();
    const isListeActive = listesItems.some(i => location.pathname.startsWith(i.to));

    return (
      <>
        <div className="flex h-16 items-center justify-center border-b border-sidebar-border px-6">
          <img src={logoChargiz} alt="ChargiZ" className="h-7 w-auto" />
        </div>

        {profile && (
          <div className="border-b border-sidebar-border px-4 py-3">
            <p className="text-sm font-bold text-sidebar-foreground">{profile.prenom} {profile.nom}</p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">{role?.replace(/_/g, " ") || "—"}</p>
          </div>
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
          <Link to="/dashboard"
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold transition-all ${
              location.pathname === "/dashboard" ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            }`}>
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </Link>

          <Link to="/dashboard/statistiques"
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold transition-all ${
              location.pathname.startsWith("/dashboard/statistiques") ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            }`}>
            <BarChart3 className="h-5 w-5" />
            Statistiques
          </Link>

          <button onClick={() => setListesOpen(!listesOpen)}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold transition-all ${
              isListeActive ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            }`}>
            <List className="h-5 w-5" />
            Listes
            {listesOpen ? <ChevronDown className="ml-auto h-4 w-4" /> : <ChevronRight className="ml-auto h-4 w-4" />}
          </button>
          {listesOpen && (
            <div className="ml-4 space-y-0.5">
              {listesItems.map((item) => {
                const isActive = location.pathname.startsWith(item.to);
                return (
                  <Link key={item.to} to={item.to}
                    className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-bold transition-all ${
                      isActive ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    }`}>
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}

          {role && (
            <Link to="/dashboard/administration"
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold transition-all ${
                location.pathname.startsWith("/dashboard/administration") ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}>
              <ShieldCheck className="h-5 w-5" />
              Administration
            </Link>
          )}

          <Link to="/dashboard/reglages"
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold transition-all ${
              location.pathname.startsWith("/dashboard/reglages") ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            }`}>
            <Settings className="h-5 w-5" />
            Réglages
          </Link>
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <button onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
            <LogOut className="h-5 w-5" />
            Déconnexion
          </button>
        </div>
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
          <SheetContent side="left" className="w-64 border-r-sidebar-border bg-sidebar p-0 text-sidebar-foreground [&>button]:text-sidebar-foreground">
            <div className="flex h-full flex-col">
              {renderSidebarContent()}
            </div>
          </SheetContent>
        </Sheet>
        <img src={logoChargiz} alt="ChargiZ" className="h-6 w-auto" />
        <div className="w-10" />
      </div>

      {/* Desktop fixed sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col bg-sidebar text-sidebar-foreground md:flex">
        {renderSidebarContent()}
      </aside>
    </>
  );
}
