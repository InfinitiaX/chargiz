import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import logoWhite from "@/assets/logo-white.jpg";
import { useState } from "react";
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
  Zap,
  User,
} from "lucide-react";

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

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const isCollab = role === "collaborateur";

  const mainNav = isCollab
    ? [
        { to: "/dashboard", icon: Zap, label: "Ma performance" },
        { to: "/dashboard/mes-infos", icon: User, label: "Mes informations" },
        { to: "/dashboard/mes-consommations", icon: BarChart3, label: "Mes consommations" },
        { to: "/dashboard/reglages", icon: Settings, label: "Paramétrage" },
      ]
    : [
        { to: "/dashboard", icon: LayoutDashboard, label: "Accueil" },
        { to: "/dashboard/statistiques", icon: BarChart3, label: "Statistiques" },
      ];

  const listesItems = [
    { to: "/dashboard/listes/filiales", icon: Building2, label: "Filiales" },
    { to: "/dashboard/listes/sites", icon: MapPin, label: "Sites" },
    { to: "/dashboard/listes/vehicules", icon: Car, label: "Véhicules" },
    { to: "/dashboard/listes/collaborateurs", icon: Users, label: "Collaborateurs" },
  ];

  const isListeActive = listesItems.some(i => location.pathname.startsWith(i.to));

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-20 items-center justify-center border-b border-sidebar-border px-6">
        <img src={logoWhite} alt="ChargiZ" className="h-10 w-auto" />
      </div>

      {profile && (
        <div className="border-b border-sidebar-border px-4 py-3">
          <p className="text-sm font-medium text-sidebar-foreground">{profile.prenom} {profile.nom}</p>
          <p className="text-xs text-sidebar-foreground/60 capitalize">{role?.replace(/_/g, " ") || "—"}</p>
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
        {mainNav.map((item) => {
          const isActive = item.to === "/dashboard"
            ? location.pathname === "/dashboard"
            : location.pathname.startsWith(item.to);
          return (
            <Link key={item.to} to={item.to}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                isActive ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}>
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}

        {!isCollab && (
          <>
            <button onClick={() => setListesOpen(!listesOpen)}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
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
                      className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                        isActive ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      }`}>
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}

            <Link to="/dashboard/reglages"
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                location.pathname.startsWith("/dashboard/reglages") ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}>
              <Settings className="h-5 w-5" />
              Réglages
            </Link>
          </>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <button onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
          <LogOut className="h-5 w-5" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
