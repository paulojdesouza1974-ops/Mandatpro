import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import SupportTicketDialog from "@/components/support/SupportTicketDialog";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ShieldCheck, Users, Building2, MessageSquare, Mail, Activity } from "lucide-react";

const roleLabels = {
  admin: "Admin",
  member: "Mitglied",
  viewer: "Viewer",
  support: "Support",
};

const statusColors = {
  offen: "bg-blue-100 text-blue-700",
  in_bearbeitung: "bg-yellow-100 text-yellow-700",
  warten_auf_antwort: "bg-purple-100 text-purple-700",
  gelöst: "bg-green-100 text-green-700",
  geschlossen: "bg-gray-100 text-gray-700",
};

export default function AdminConsoleView({ mode = "owner" }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userSearch, setUserSearch] = useState("");
  const [ticketSearch, setTicketSearch] = useState("");
  const [emailSearch, setEmailSearch] = useState("");
  const [logSearch, setLogSearch] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: appSettings = [] } = useQuery({
    queryKey: ["appSettings"],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  // Calculate access rights only when data is loaded
  const isAppOwner = user && appSettings[0] ? appSettings[0].app_owner_email?.toLowerCase() === user.email?.toLowerCase() : false;
  const isSupportUser = isAppOwner || user?.role === "support";
  const hasAccess = (mode === "owner" && isAppOwner) || (mode === "support" && isSupportUser);

  // Call all hooks unconditionally to avoid React Hooks error
  const { data: users = [] } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: () => base44.entities.User.list("-created_date"),
    enabled: hasAccess,
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ["adminOrganizations"],
    queryFn: () => base44.entities.Organization.list("-created_date"),
    enabled: hasAccess,
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ["adminSupportTickets"],
    queryFn: () => base44.entities.SupportTicket.list("-created_date"),
    enabled: hasAccess,
  });

  const { data: emailLogs = [] } = useQuery({
    queryKey: ["adminEmailLogs"],
    queryFn: () => base44.entities.EmailLog.list("-sent_at"),
    enabled: hasAccess,
  });

  const { data: systemLogs = [] } = useQuery({
    queryKey: ["adminSystemLogs"],
    queryFn: () => base44.entities.SystemLog.list("-created_date"),
    enabled: hasAccess,
  });

  // Show access denied message if user doesn't have access
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6" data-testid="admin-no-access">
        <Card className="max-w-md p-8 text-center">
          <ShieldCheck className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Kein Zugriff</h2>
          <p className="text-slate-500">Diese Seite ist nur für App-Eigentümer oder Support-Team zugänglich.</p>
        </Card>
      </div>
    );
  }

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      toast({ title: "Nutzer aktualisiert" });
    },
  });

  const ticketMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SupportTicket.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminSupportTickets"] });
      setDialogOpen(false);
    },
  });

  const deleteTicketMutation = useMutation({
    mutationFn: (id) => base44.entities.SupportTicket.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminSupportTickets"] });
    },
  });

  const filteredUsers = useMemo(() => {
    const term = userSearch.toLowerCase();
    return users.filter((u) =>
      !term ||
      (u.full_name || "").toLowerCase().includes(term) ||
      (u.email || "").toLowerCase().includes(term) ||
      (u.organization || "").toLowerCase().includes(term)
    );
  }, [users, userSearch]);

  const filteredTickets = useMemo(() => {
    const term = ticketSearch.toLowerCase();
    return tickets.filter((t) =>
      !term ||
      (t.subject || "").toLowerCase().includes(term) ||
      (t.organization_name || "").toLowerCase().includes(term) ||
      (t.contact_email || "").toLowerCase().includes(term)
    );
  }, [tickets, ticketSearch]);

  const filteredEmailLogs = useMemo(() => {
    const term = emailSearch.toLowerCase();
    return emailLogs.filter((log) =>
      !term ||
      (log.subject || "").toLowerCase().includes(term) ||
      (Array.isArray(log.to) ? log.to.join(",").toLowerCase().includes(term) : "")
    );
  }, [emailLogs, emailSearch]);

  const filteredSystemLogs = useMemo(() => {
    const term = logSearch.toLowerCase();
    return systemLogs.filter((log) =>
      !term ||
      (log.event_type || "").toLowerCase().includes(term) ||
      (log.message || "").toLowerCase().includes(term)
    );
  }, [systemLogs, logSearch]);

  const stats = {
    users: users.length,
    orgs: organizations.length,
    tickets: tickets.length,
    emails: emailLogs.length,
  };

  const sendResetLink = async (email) => {
    try {
      await base44.auth.requestPasswordReset(email);
      toast({ title: "Reset-Link gesendet", description: email });
      base44.entities.SystemLog.create({
        event_type: "password_reset_sent",
        message: `Reset-Link manuell gesendet an ${email}`,
        meta: { email },
      }).catch(() => {});
    } catch (error) {
      toast({ title: "Reset-Link fehlgeschlagen", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6" data-testid={mode === "owner" ? "admin-console-page" : "support-console-page"}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {mode === "owner" ? "Admin-Konsole" : "Support-Konsole"}
          </h1>
          <p className="text-slate-500 mt-1">Zentrale Steuerung für Nutzer, Organisationen und Support.</p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-4" data-testid="admin-tabs-list">
          <TabsTrigger value="overview" data-testid="admin-tab-overview">Übersicht</TabsTrigger>
          <TabsTrigger value="users" data-testid="admin-tab-users">Nutzer</TabsTrigger>
          <TabsTrigger value="organizations" data-testid="admin-tab-organizations">Organisationen</TabsTrigger>
          <TabsTrigger value="tickets" data-testid="admin-tab-tickets">Support-Tickets</TabsTrigger>
          <TabsTrigger value="emails" data-testid="admin-tab-emails">E-Mail-Logs</TabsTrigger>
          <TabsTrigger value="system" data-testid="admin-tab-system">System-Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid md:grid-cols-4 gap-4">
            <Card data-testid="admin-stat-users">
              <CardContent className="pt-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Nutzer</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.users}</p>
                </div>
                <Users className="w-6 h-6 text-slate-400" />
              </CardContent>
            </Card>
            <Card data-testid="admin-stat-orgs">
              <CardContent className="pt-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Organisationen</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.orgs}</p>
                </div>
                <Building2 className="w-6 h-6 text-slate-400" />
              </CardContent>
            </Card>
            <Card data-testid="admin-stat-tickets">
              <CardContent className="pt-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Tickets</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.tickets}</p>
                </div>
                <MessageSquare className="w-6 h-6 text-slate-400" />
              </CardContent>
            </Card>
            <Card data-testid="admin-stat-emails">
              <CardContent className="pt-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">E-Mails</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.emails}</p>
                </div>
                <Mail className="w-6 h-6 text-slate-400" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Nutzerverwaltung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Nutzer suchen..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                data-testid="admin-users-search"
              />
              <div className="space-y-3">
                {filteredUsers.map((u) => (
                  <div key={u.id} className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4" data-testid={`admin-user-${u.id}`}>
                    <div>
                      <p className="font-medium text-slate-900">{u.full_name || "Unbekannt"}</p>
                      <p className="text-sm text-slate-500">{u.email}</p>
                      <p className="text-xs text-slate-400 mt-1">{u.organization || "Keine Organisation"}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={u.role || "member"}
                        onValueChange={(value) => updateUserMutation.mutate({ id: u.id, data: { role: value } })}
                      >
                        <SelectTrigger className="w-40" data-testid={`admin-user-role-${u.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(roleLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant={u.is_active === false ? "outline" : "secondary"}
                        size="sm"
                        onClick={() => updateUserMutation.mutate({ id: u.id, data: { is_active: u.is_active === false } })}
                        data-testid={`admin-user-toggle-${u.id}`}
                      >
                        {u.is_active === false ? "Entsperren" : "Sperren"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendResetLink(u.email)}
                        data-testid={`admin-user-reset-${u.id}`}
                      >
                        Reset senden
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organizations">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Organisationen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {organizations.map((org) => (
                <div key={org.id} className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between" data-testid={`admin-org-${org.id}`}>
                  <div>
                    <p className="font-medium text-slate-900">{org.display_name || org.name}</p>
                    <p className="text-sm text-slate-500">{org.org_type || "fraktion"}</p>
                    <p className="text-xs text-slate-400">{org.email_domain || org.email || ""}</p>
                  </div>
                  <Badge className="bg-slate-100 text-slate-600">{org.status || "aktiv"}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Support-Tickets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Tickets suchen..."
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                data-testid="admin-tickets-search"
              />
              <div className="space-y-3">
                {filteredTickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    className="w-full text-left border rounded-lg p-4 hover:bg-slate-50"
                    onClick={() => { setSelectedTicket(ticket); setDialogOpen(true); }}
                    data-testid={`admin-ticket-${ticket.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{ticket.subject}</p>
                        <p className="text-sm text-slate-500">{ticket.organization_name || ticket.organization}</p>
                      </div>
                      <Badge className={statusColors[ticket.status] || "bg-slate-100 text-slate-600"}>
                        {ticket.status}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emails">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>E-Mail-Logs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="E-Mails suchen..."
                value={emailSearch}
                onChange={(e) => setEmailSearch(e.target.value)}
                data-testid="admin-emails-search"
              />
              <div className="space-y-3">
                {filteredEmailLogs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-4" data-testid={`admin-email-${log.id}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{log.subject}</p>
                        <p className="text-xs text-slate-500">{Array.isArray(log.to) ? log.to.join(", ") : log.to}</p>
                      </div>
                      <Badge className={log.status === "sent" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                        {log.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      {log.sent_at ? format(new Date(log.sent_at), "dd.MM.yyyy HH:mm", { locale: de }) : "-"}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>System-Logs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Logs durchsuchen..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                data-testid="admin-system-search"
              />
              <div className="space-y-3">
                {filteredSystemLogs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-4" data-testid={`admin-system-log-${log.id}`}>
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-slate-900">{log.event_type}</p>
                      <Activity className="w-4 h-4 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{log.message}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      {log.created_date ? format(new Date(log.created_date), "dd.MM.yyyy HH:mm", { locale: de }) : "-"}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <SupportTicketDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        ticket={selectedTicket}
        onSave={(data) => ticketMutation.mutate({ id: selectedTicket?.id, data })}
        onDelete={() => deleteTicketMutation.mutate(selectedTicket?.id)}
      />
    </div>
  );
}
