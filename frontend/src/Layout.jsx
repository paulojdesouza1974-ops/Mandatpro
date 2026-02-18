import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  Users,
  FileText,
  CalendarDays,
  MessageCircle,
  Mail,
  Menu,
  X,
  Landmark,
  User as UserIcon,
  Target,
  CheckSquare,
  Zap,
  Euro,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageTransition from "@/components/PageTransition";

const fraktionNavItems = [
  { name: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
  { name: "Aufgaben", icon: CheckSquare, page: "Tasks" },
  { name: "Kontakte", icon: Users, page: "Contacts" },
  { name: "Anträge", icon: FileText, page: "Motions" },
  { name: "Termine", icon: CalendarDays, page: "Meetings" },
  { name: "Kommunikation", icon: MessageCircle, page: "Communications" },
  { name: "Dokumente", icon: FileText, page: "Documents" },
  { name: "Meine Organisation", icon: Landmark, page: "Organizations" },
  { name: "Druckvorlagen", icon: FileText, page: "PrintTemplates" },
  { name: "Vorlagen-Editor", icon: FileText, page: "TemplateEditor" },
  { name: "Nutzerverwaltung", icon: UserIcon, page: "UserManagement", adminOnly: true },
  { name: "Organisationsverwaltung", icon: Landmark, page: "AdminOrganizations", adminOnly: true, ownerOnly: true },
  { name: "Rechnungen", icon: Mail, page: "Invoices", adminOnly: true, ownerOnly: true },
  { name: "Support", icon: MessageCircle, page: "Support", adminOnly: true, ownerOnly: true },
  { name: "App-Einstellungen", icon: UserIcon, page: "AppSettings", adminOnly: true },
];

const verbandNavItems = [
  { name: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
  { name: "Aufgaben", icon: CheckSquare, page: "Tasks" },
  { name: "Mitglieder", icon: Users, page: "Contacts" },
  { name: "Kampagnen", icon: Target, page: "Campaigns" },
  { name: "Buchhaltung", icon: Mail, page: "Accounting" },
  { name: "Reporting", icon: BarChart3, page: "Reporting" },
  { name: "Massen-E-Mail", icon: Mail, page: "BulkEmail" },
  { name: "Mandatsträger-Abgabe", icon: Euro, page: "MandateLevy" },
  { name: "Meine Organisation", icon: Landmark, page: "Organizations" },
  { name: "Nutzerverwaltung", icon: UserIcon, page: "UserManagement", adminOnly: true },
  { name: "Organisationsverwaltung", icon: Landmark, page: "AdminOrganizations", adminOnly: true, ownerOnly: true },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: appSettings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  const isAppOwner = appSettings[0]?.app_owner_email === user?.email;

  // Show organization setup if user doesn't have one
  if (user && !user.organization) {
    const OrganizationSetup = React.lazy(() => import("@/components/OrganizationSetup"));
    return (
      <React.Suspense fallback={<div>Laden...</div>}>
        <OrganizationSetup />
      </React.Suspense>
    );
  }

  const navItems = user?.org_type === "verband" ? verbandNavItems : fraktionNavItems;

  const bottomNavItems = [
    { name: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
    { name: "Kontakte", icon: Users, page: "Contacts" },
    { name: "Anträge", icon: FileText, page: "Motions" },
    { name: "Termine", icon: CalendarDays, page: "Meetings" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border px-4 h-14 flex items-center justify-between" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center gap-2">
          <Landmark className="w-5 h-5 text-foreground" />
          <span className="font-bold text-foreground text-sm">KommunalCRM</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="select-none">
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-40 h-full w-60 bg-card border-r border-border
        transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="p-6 border-b border-border hidden lg:block">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Landmark className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground text-sm leading-tight">KommunalCRM</h1>
              <p className="text-[10px] text-muted-foreground">Politische Arbeit</p>
            </div>
          </div>
        </div>

        <nav className="p-3 mt-14 lg:mt-0 space-y-0.5 flex-1 flex flex-col">
          <div className="space-y-0.5">
            {navItems.filter(item => {
              if (item.ownerOnly) return isAppOwner;
              if (item.adminOnly) return user?.role === "admin";
              return true;
            }).map((item) => {
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium
                    transition-all duration-200 select-none
                    ${isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }
                  `}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          <div className="mt-auto pt-3 border-t border-border space-y-0.5">
            <Link
              to={createPageUrl("Profile")}
              onClick={() => setSidebarOpen(false)}
              className={`
                flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-200 select-none
                ${currentPageName === "Profile"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }
              `}
            >
              <UserIcon className="w-4 h-4" />
              <div className="flex-1 min-w-0">
                <p className="truncate">{user?.full_name || "Profil"}</p>
                {user?.city && (
                  <p className="text-[10px] opacity-70 truncate">{user.city}</p>
                )}
              </div>
            </Link>
            
            <div className="px-3 py-2 space-y-1">
              <Link
                to={createPageUrl("Privacy")}
                onClick={() => setSidebarOpen(false)}
                className="block text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Datenschutz
              </Link>
              <Link
                to={createPageUrl("Imprint")}
                onClick={() => setSidebarOpen(false)}
                className="block text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Impressum
              </Link>
            </div>
          </div>
        </nav>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:ml-60 pt-14 lg:pt-0 pb-16 lg:pb-0">
        <PageTransition>
          {children}
        </PageTransition>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="grid grid-cols-4 h-16">
          {bottomNavItems.map((item) => {
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className={`
                  flex flex-col items-center justify-center gap-1 select-none
                  transition-colors duration-200
                  ${isActive
                    ? "text-primary"
                    : "text-muted-foreground active:bg-accent"
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}