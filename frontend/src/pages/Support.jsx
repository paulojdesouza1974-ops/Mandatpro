import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, MessageSquare, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import SupportTicketDialog from "@/components/support/SupportTicketDialog";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const statusColors = {
  offen: "bg-blue-100 text-blue-700",
  in_bearbeitung: "bg-yellow-100 text-yellow-700",
  warten_auf_antwort: "bg-purple-100 text-purple-700",
  gelöst: "bg-green-100 text-green-700",
  geschlossen: "bg-gray-100 text-gray-700",
};

const priorityColors = {
  niedrig: "bg-slate-100 text-slate-600",
  mittel: "bg-blue-100 text-blue-600",
  hoch: "bg-orange-100 text-orange-600",
  dringend: "bg-red-100 text-red-700",
};

const statusIcons = {
  offen: AlertCircle,
  in_bearbeitung: Clock,
  warten_auf_antwort: MessageSquare,
  gelöst: CheckCircle2,
  geschlossen: CheckCircle2,
};

export default function SupportPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: appSettings = [] } = useQuery({
    queryKey: ["appSettings"],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  const isAppOwner = appSettings[0]?.app_owner_email === user?.email;
  const isSupportUser = isAppOwner || user?.role === "support";

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["supportTickets"],
    queryFn: () => base44.entities.SupportTicket.list("-created_date"),
    enabled: isSupportUser,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SupportTicket.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supportTickets"] });
      setDialogOpen(false);
      setSelectedTicket(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SupportTicket.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supportTickets"] });
    },
  });

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.organization_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.contact_email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    offen: tickets.filter((t) => t.status === "offen").length,
    in_bearbeitung: tickets.filter((t) => t.status === "in_bearbeitung").length,
    gelöst: tickets.filter((t) => t.status === "gelöst").length,
  };

  if (!isSupportUser) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6" data-testid="support-no-access">
        <Card className="max-w-md p-8 text-center">
          <MessageSquare className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Kein Zugriff</h2>
          <p className="text-slate-500">Diese Seite ist nur für das Support-Team zugänglich.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="support-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Support-Center</h1>
          <p className="text-slate-500 mt-1">Support-Anfragen von Organisationen verwalten</p>
        </div>
        <Button
          onClick={() => {
            setSelectedTicket(null);
            setDialogOpen(true);
          }}
          data-testid="support-new-ticket-button"
        >
          <Plus className="w-4 h-4 mr-2" />
          Neues Ticket
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="support-stats-open">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Offen</p>
                <p className="text-2xl font-bold text-slate-900">{stats.offen}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="support-stats-in-progress">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">In Bearbeitung</p>
                <p className="text-2xl font-bold text-slate-900">{stats.in_bearbeitung}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="support-stats-resolved">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Gelöst</p>
                <p className="text-2xl font-bold text-slate-900">{stats.gelöst}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Ticket suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="support-search-input"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48" data-testid="support-status-filter-trigger">
              <SelectValue placeholder="Status filtern" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="offen">Offen</SelectItem>
              <SelectItem value="in_bearbeitung">In Bearbeitung</SelectItem>
              <SelectItem value="warten_auf_antwort">Warten auf Antwort</SelectItem>
              <SelectItem value="gelöst">Gelöst</SelectItem>
              <SelectItem value="geschlossen">Geschlossen</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Laden...</div>
      ) : filteredTickets.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Keine Tickets gefunden</h3>
          <p className="text-slate-500">Es liegen derzeit keine Support-Anfragen vor</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredTickets.map((ticket) => {
            const StatusIcon = statusIcons[ticket.status];
            return (
              <Card
                key={ticket.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  setSelectedTicket(ticket);
                  setDialogOpen(true);
                }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={priorityColors[ticket.priority]}>
                          {ticket.priority}
                        </Badge>
                        <Badge className={statusColors[ticket.status]}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {ticket.status.replace(/_/g, " ")}
                        </Badge>
                        <Badge variant="outline">{ticket.category}</Badge>
                      </div>
                      <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                      <p className="text-sm text-slate-600 mt-1">
                        {ticket.organization_name} • {ticket.contact_email}
                      </p>
                    </div>
                    <div className="text-right text-sm text-slate-500">
                      {format(new Date(ticket.created_date), "dd.MM.yyyy", { locale: de })}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 line-clamp-2">{ticket.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <SupportTicketDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        ticket={selectedTicket}
        onSave={(data) =>
          updateMutation.mutate({
            id: selectedTicket?.id,
            data,
          })
        }
        onDelete={(id) => {
          if (window.confirm("Ticket wirklich löschen?")) {
            deleteMutation.mutate(id);
            setDialogOpen(false);
            setSelectedTicket(null);
          }
        }}
        isSaving={updateMutation.isPending}
      />
    </div>
  );
}