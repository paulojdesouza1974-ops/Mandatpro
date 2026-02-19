import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
  Euro,
  BarChart3,
  ChevronRight,
  LogOut,
  Settings,
  Bell,
  Search,
  FolderOpen,
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
  { name: "Fraktionssitzungen", icon: CalendarDays, page: "FractionMeetings" },
  { name: "Finanzen", icon: Euro, page: "FractionAccounting" },
  { name: "Termine", icon: CalendarDays, page: "Meetings" },
  { name: "Kommunikation", icon: MessageCircle, page: "Communications" },
  { name: "Dokumente", icon: FolderOpen, page: "Documents" },
  { name: "Meine Organisation", icon: Landmark, page: "Organizations" },
  { name: "Druckvorlagen", icon: FileText, page: "PrintTemplates" },
  { name: "Vorlagen-Editor", icon: FileText, page: "TemplateEditor" },
  { name: "Nutzerverwaltung", icon: UserIcon, page: "UserManagement", adminOnly: true },
  { name: "Organisationsverwaltung", icon: Landmark, page: "AdminOrganizations", adminOnly: true, ownerOnly: true },
  { name: "Rechnungen", icon: Mail, page: "Invoices", adminOnly: true, ownerOnly: true },
  { name: "Support", icon: MessageCircle, page: "Support", adminOnly: true, ownerOnly: true },
  { name: "App-Einstellungen", icon: Settings, page: "AppSettings", adminOnly: true },
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
  const location = useLocation();

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
      <React.Suspense fallback={
        <div className="fixed inset-0 flex items-center justify-center bg-background">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-sky-500 rounded-full animate-spin"></div>
        </div>
      }>
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
      <header 
        className="lg:hidden fixed top-0 left-0 right-0 z-[200] glass-header px-4 h-14 flex items-center justify-between" 
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
            <Landmark className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-heading font-bold text-slate-900 text-sm">KommunalCRM</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            data-testid="mobile-search-btn"
          >
            <Search className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 select-none"
            data-testid="mobile-menu-btn"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      {/* Sidebar - Dark Theme */}
      <aside className={`
        fixed top-0 left-0 z-[150] h-full w-64 
        bg-slate-900 border-r border-slate-800
        transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        flex flex-col
      `} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {/* Logo Section */}
        <div className="p-5 border-b border-slate-800 hidden lg:block">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Landmark className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-white text-base leading-tight">KommunalCRM</h1>
              <p className="text-[11px] text-slate-400 font-medium">Politische Arbeit</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 mt-14 lg:mt-0 overflow-y-auto custom-scrollbar">
          <div className="space-y-1">
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
                  data-testid={`nav-${item.page.toLowerCase()}`}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                    transition-all duration-200 select-none group
                    ${isActive
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                    }
                  `}
                >
                  <item.icon className={`w-[18px] h-[18px] transition-colors ${isActive ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-400'}`} strokeWidth={1.75} />
                  <span className="flex-1">{item.name}</span>
                  {isActive && (
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-slate-800">
          <Link
            to={createPageUrl("Profile")}
            onClick={() => setSidebarOpen(false)}
            data-testid="nav-profile"
            className={`
              flex items-center gap-3 px-3 py-3 rounded-lg text-sm
              transition-all duration-200 select-none group
              ${currentPageName === "Profile"
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }
            `}
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white font-semibold text-sm">
              {user?.full_name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-200 truncate">{user?.full_name || "Profil"}</p>
              {user?.city && (
                <p className="text-xs text-slate-500 truncate">{user.city}</p>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
          </Link>
          
          {/* Logout Button */}
          <button
            onClick={async () => {
              const { base44 } = await import("@/api/base44Client");
              await base44.auth.logout();
              window.location.href = "/login";
            }}
            data-testid="logout-btn"
            className="w-full mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            Abmelden
          </button>
          
          {/* Footer Links */}
          <div className="flex items-center justify-between px-3 pt-3 mt-2 border-t border-slate-800">
            <Link
              to={createPageUrl("Privacy")}
              onClick={() => setSidebarOpen(false)}
              className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
              data-testid="nav-privacy"
            >
              Datenschutz
            </Link>
            <span className="text-slate-700">•</span>
            <Link
              to={createPageUrl("Imprint")}
              onClick={() => setSidebarOpen(false)}
              className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
              data-testid="nav-imprint"
            >
              Impressum
            </Link>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[140] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:ml-64 pt-14 lg:pt-0 pb-20 lg:pb-0 min-h-screen">
        <div className="p-4 lg:p-6 xl:p-8">
          <PageTransition>
            {children}
          </PageTransition>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav 
        className="lg:hidden fixed bottom-0 left-0 right-0 z-[200] bg-white border-t border-slate-200 shadow-elevated" 
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid grid-cols-4 h-16">
          {bottomNavItems.map((item) => {
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                data-testid={`bottom-nav-${item.page.toLowerCase()}`}
                className={`
                  flex flex-col items-center justify-center gap-1 select-none
                  transition-all duration-200
                  ${isActive
                    ? "text-slate-900"
                    : "text-slate-400 active:bg-slate-50"
                  }
                `}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-slate-100' : ''}`}>
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-sky-600' : ''}`} strokeWidth={isActive ? 2 : 1.5} />
                </div>
                <span className={`text-[10px] font-medium ${isActive ? 'text-slate-900' : ''}`}>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
