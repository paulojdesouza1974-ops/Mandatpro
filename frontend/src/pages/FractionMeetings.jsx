import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { 
  PlusCircle, Search, MoreVertical, Pencil, Trash2, Calendar, 
  MapPin, Users, FileText, Send, Sparkles, Download, Mail,
  Clock, CheckCircle, XCircle, Upload, Eye, Loader2, 
  Building2, ClipboardList, FileSignature
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import jsPDF from "jspdf";
import { useToast } from "@/hooks/use-toast";

const statusConfig = {
  geplant: { label: "Geplant", color: "bg-slate-100 text-slate-700 border-slate-200", icon: Clock },
  einladung_versendet: { label: "Einladung versendet", color: "bg-sky-50 text-sky-700 border-sky-200", icon: Mail },
  abgeschlossen: { label: "Abgeschlossen", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle },
  abgesagt: { label: "Abgesagt", color: "bg-red-50 text-red-700 border-red-200", icon: XCircle },
};

export default function FractionMeetings() {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [detailMeeting, setDetailMeeting] = useState(null);
  const [protocolDialogOpen, setProtocolDialogOpen] = useState(false);
  const [invitationDialogOpen, setInvitationDialogOpen] = useState(false);
  const [sendEmailDialogOpen, setSendEmailDialogOpen] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["fractionMeetings", currentUser?.organization],
    queryFn: () => base44.entities.FractionMeeting.filter(
      { organization: currentUser.organization },
      "-date"
    ),
    enabled: !!currentUser?.organization,
  });

  const { data: orgUsers = [] } = useQuery({
    queryKey: ["orgUsers", currentUser?.organization],
    queryFn: () => base44.entities.User.filter({ organization: currentUser.organization }),
    enabled: !!currentUser?.organization,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FractionMeeting.create({
      ...data,
      organization: currentUser.organization
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fractionMeetings"] });
      setFormOpen(false);
      setEditingMeeting(null);
      toast({
        title: "Sitzung erstellt",
        description: "Die Fraktionssitzung wurde erfolgreich angelegt.",
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: error.message || "Die Sitzung konnte nicht erstellt werden.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => base44.entities.FractionMeeting.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fractionMeetings"] });
      setFormOpen(false);
      setEditingMeeting(null);
      setDetailMeeting(null);
      toast({
        title: "Sitzung aktualisiert",
        description: "Die Änderungen wurden gespeichert.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FractionMeeting.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fractionMeetings"] });
      setDetailMeeting(null);
      toast({
        title: "Sitzung gelöscht",
        description: "Die Sitzung wurde erfolgreich gelöscht.",
      });
    },
  });

  const filteredMeetings = meetings.filter(m =>
    m.title?.toLowerCase().includes(search.toLowerCase()) ||
    m.location?.toLowerCase().includes(search.toLowerCase())
  );

  const upcomingMeetings = filteredMeetings.filter(m => 
    m.status !== 'abgeschlossen' && m.status !== 'abgesagt' && new Date(m.date) >= new Date()
  );
  const pastMeetings = filteredMeetings.filter(m => 
    m.status === 'abgeschlossen' || m.status === 'abgesagt' || new Date(m.date) < new Date()
  );

  return (
    <div className="space-y-6 animate-fade-in" data-testid="fraction-meetings-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Fraktionssitzungen</h1>
          <p className="text-sm text-slate-500 mt-1">
            Planen, einladen und protokollieren Sie Ihre Fraktionssitzungen
          </p>
        </div>
        <Button 
          onClick={() => { setEditingMeeting(null); setFormOpen(true); }}
          className="bg-slate-900 hover:bg-slate-800"
          data-testid="new-meeting-btn"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Neue Sitzung
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100">
                <Calendar className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{meetings.length}</p>
                <p className="text-xs text-slate-500">Gesamt</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-sky-200 bg-sky-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-100">
                <Clock className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-sky-900">{upcomingMeetings.length}</p>
                <p className="text-xs text-sky-600">Anstehend</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-900">
                  {meetings.filter(m => m.status === 'abgeschlossen').length}
                </p>
                <p className="text-xs text-emerald-600">Abgeschlossen</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <FileText className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-900">
                  {meetings.filter(m => m.protocol).length}
                </p>
                <p className="text-xs text-amber-600">Mit Protokoll</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Sitzungen durchsuchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
          data-testid="search-meetings"
        />
      </div>

      {/* Meetings Tabs */}
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Anstehend ({upcomingMeetings.length})</TabsTrigger>
          <TabsTrigger value="past">Vergangen ({pastMeetings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          <MeetingsList 
            meetings={upcomingMeetings} 
            isLoading={isLoading}
            onEdit={(m) => { setEditingMeeting(m); setFormOpen(true); }}
            onDelete={(id) => deleteMutation.mutate(id)}
            onViewDetails={setDetailMeeting}
          />
        </TabsContent>

        <TabsContent value="past" className="mt-4">
          <MeetingsList 
            meetings={pastMeetings} 
            isLoading={isLoading}
            onEdit={(m) => { setEditingMeeting(m); setFormOpen(true); }}
            onDelete={(id) => deleteMutation.mutate(id)}
            onViewDetails={setDetailMeeting}
          />
        </TabsContent>
      </Tabs>

      {/* Meeting Form Dialog */}
      {formOpen && (
        <MeetingFormDialog
          meeting={editingMeeting}
          orgUsers={orgUsers}
          onSave={(data) => {
            if (editingMeeting) {
              updateMutation.mutate({ id: editingMeeting.id, ...data });
            } else {
              createMutation.mutate(data);
            }
          }}
          onClose={() => { setFormOpen(false); setEditingMeeting(null); }}
          saving={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Meeting Details Dialog */}
      {detailMeeting && (
        <MeetingDetailsDialog
          meeting={detailMeeting}
          onClose={() => setDetailMeeting(null)}
          onEdit={() => { setEditingMeeting(detailMeeting); setFormOpen(true); setDetailMeeting(null); }}
          onUpdate={(data) => updateMutation.mutate({ id: detailMeeting.id, ...data })}
          onGenerateProtocol={() => { setProtocolDialogOpen(true); }}
          onSendInvitation={() => { setInvitationDialogOpen(true); }}
        />
      )}

      {/* Protocol Generation Dialog */}
      {protocolDialogOpen && detailMeeting && (
        <ProtocolGeneratorDialog
          meeting={detailMeeting}
          onClose={() => setProtocolDialogOpen(false)}
          onSave={(protocol) => {
            updateMutation.mutate({ id: detailMeeting.id, protocol, status: 'abgeschlossen' });
            setProtocolDialogOpen(false);
          }}
        />
      )}

      {/* Invitation Dialog */}
      {invitationDialogOpen && detailMeeting && (
        <InvitationDialog
          meeting={detailMeeting}
          orgUsers={orgUsers}
          onClose={() => setInvitationDialogOpen(false)}
          onSend={(data) => {
            updateMutation.mutate({ 
              id: detailMeeting.id, 
              invitation_text: data.text,
              attendees: data.recipients,
              status: 'einladung_versendet' 
            });
            setInvitationDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}

// Meetings List Component
function MeetingsList({ meetings, isLoading, onEdit, onDelete, onViewDetails }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Keine Sitzungen gefunden</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {meetings.map((meeting) => {
        const status = statusConfig[meeting.status] || statusConfig.geplant;
        const StatusIcon = status.icon;
        const meetingDate = meeting.date ? new Date(meeting.date) : null;

        return (
          <Card 
            key={meeting.id} 
            className="hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => onViewDetails(meeting)}
            data-testid={`meeting-card-${meeting.id}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Date Badge */}
                <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center">
                  {meetingDate ? (
                    <>
                      <span className="text-xl font-bold leading-none">
                        {format(meetingDate, "dd")}
                      </span>
                      <span className="text-[10px] uppercase font-semibold mt-0.5 opacity-70">
                        {format(meetingDate, "MMM", { locale: de })}
                      </span>
                    </>
                  ) : (
                    <Calendar className="w-6 h-6" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900 group-hover:text-slate-700">
                      {meeting.title}
                    </h3>
                    <Badge className={`text-xs border ${status.color}`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {status.label}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-500">
                    {meetingDate && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {format(meetingDate, "HH:mm")} Uhr
                      </span>
                    )}
                    {meeting.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {meeting.location}
                      </span>
                    )}
                    {meeting.attendees?.length > 0 && (
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        {meeting.attendees.length} Teilnehmer
                      </span>
                    )}
                    {meeting.protocol && (
                      <span className="flex items-center gap-1.5 text-emerald-600">
                        <FileText className="w-3.5 h-3.5" />
                        Protokoll vorhanden
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDetails(meeting); }}>
                      <Eye className="w-4 h-4 mr-2" /> Details anzeigen
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(meeting); }}>
                      <Pencil className="w-4 h-4 mr-2" /> Bearbeiten
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={(e) => { e.stopPropagation(); onDelete(meeting.id); }}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Löschen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Meeting Form Dialog
function MeetingFormDialog({ meeting, orgUsers, onSave, onClose, saving }) {
  const [form, setForm] = useState(meeting || {
    title: "",
    date: "",
    location: "",
    agenda: "",
    attendees: [],
    status: "geplant",
  });
  const [attendeeInput, setAttendeeInput] = useState("");

  useEffect(() => {
    if (!meeting && orgUsers.length > 0 && form.attendees.length === 0) {
      const emails = orgUsers.map(u => u.email).filter(Boolean);
      setForm(prev => ({ ...prev, attendees: emails }));
    }
  }, [orgUsers, meeting]);

  const addAttendee = () => {
    if (attendeeInput && attendeeInput.includes("@")) {
      setForm(prev => ({ ...prev, attendees: [...(prev.attendees || []), attendeeInput] }));
      setAttendeeInput("");
    }
  };

  const removeAttendee = (email) => {
    setForm(prev => ({ ...prev, attendees: prev.attendees.filter(e => e !== email) }));
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-600" />
            {meeting ? "Sitzung bearbeiten" : "Neue Fraktionssitzung"}
          </DialogTitle>
          <DialogDescription>
            Planen Sie eine neue Fraktionssitzung mit Tagesordnung und Teilnehmern
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Titel *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="z.B. Fraktionssitzung März 2026"
              data-testid="meeting-title"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Datum und Uhrzeit *</Label>
              <Input
                type="datetime-local"
                value={form.date ? form.date.slice(0, 16) : ""}
                onChange={(e) => setForm({ ...form, date: e.target.value ? new Date(e.target.value).toISOString() : "" })}
                data-testid="meeting-date"
              />
            </div>
            <div className="space-y-2">
              <Label>Ort</Label>
              <Input
                value={form.location || ""}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="z.B. Rathaus, Sitzungssaal 1"
                data-testid="meeting-location"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger data-testid="meeting-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusConfig).map(([value, config]) => (
                  <SelectItem key={value} value={value}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tagesordnung</Label>
            <Textarea
              value={form.agenda || ""}
              onChange={(e) => setForm({ ...form, agenda: e.target.value })}
              placeholder="1. Begrüßung und Feststellung der Beschlussfähigkeit&#10;2. Genehmigung des letzten Protokolls&#10;3. Berichte&#10;4. Anträge&#10;5. Verschiedenes"
              rows={6}
              data-testid="meeting-agenda"
            />
          </div>

          <div className="space-y-2">
            <Label>Teilnehmer (E-Mail-Adressen)</Label>
            <div className="flex gap-2">
              <Input
                value={attendeeInput}
                onChange={(e) => setAttendeeInput(e.target.value)}
                placeholder="name@beispiel.de"
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addAttendee())}
              />
              <Button type="button" variant="outline" onClick={addAttendee}>
                Hinzufügen
              </Button>
            </div>
            {form.attendees?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.attendees.map((email, idx) => (
                  <Badge key={idx} variant="secondary" className="pr-1">
                    {email}
                    <button
                      type="button"
                      onClick={() => removeAttendee(email)}
                      className="ml-1 hover:text-red-600"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Abbrechen
          </Button>
          <Button 
            onClick={() => onSave(form)}
            disabled={!form.title || !form.date || saving}
            data-testid="save-meeting-btn"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {saving ? "Wird gespeichert..." : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Meeting Details Dialog
function MeetingDetailsDialog({ meeting, onClose, onEdit, onUpdate, onGenerateProtocol, onSendInvitation }) {
  const status = statusConfig[meeting.status] || statusConfig.geplant;
  const meetingDate = meeting.date ? new Date(meeting.date) : null;

  const downloadProtocolPdf = async () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("PROTOKOLL", 105, 20, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.text(meeting.title, 105, 35, { align: "center" });
    
    doc.setFontSize(11);
    let y = 50;
    doc.text(`Datum: ${meetingDate ? format(meetingDate, "dd.MM.yyyy HH:mm", { locale: de }) : "-"}`, 20, y);
    y += 8;
    doc.text(`Ort: ${meeting.location || "-"}`, 20, y);
    y += 8;
    doc.text(`Anwesend: ${meeting.attendees?.join(", ") || "-"}`, 20, y, { maxWidth: 170 });
    y += 15;
    
    doc.setFont("helvetica", "bold");
    doc.text("Tagesordnung:", 20, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    const agendaLines = doc.splitTextToSize(meeting.agenda || "-", 170);
    doc.text(agendaLines, 20, y);
    y += agendaLines.length * 6 + 10;
    
    if (meeting.protocol) {
      doc.setFont("helvetica", "bold");
      doc.text("Protokoll:", 20, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      const protocolLines = doc.splitTextToSize(meeting.protocol, 170);
      doc.text(protocolLines, 20, y);
    }
    
    doc.save(`Protokoll_${meeting.title.replace(/\s+/g, "_")}.pdf`);
  };

  const downloadInvitationPdf = async () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`Einladung zur ${meeting.title}`, 20, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    let y = 40;
    doc.text(`Datum: ${meetingDate ? format(meetingDate, "dd.MM.yyyy HH:mm", { locale: de }) : "-"} Uhr`, 20, y);
    y += 8;
    doc.text(`Ort: ${meeting.location || "-"}`, 20, y);
    y += 15;
    
    doc.setFont("helvetica", "bold");
    doc.text("Tagesordnung:", 20, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    const agendaLines = doc.splitTextToSize(meeting.agenda || "-", 170);
    doc.text(agendaLines, 20, y);
    y += agendaLines.length * 6 + 15;
    
    if (meeting.invitation_text) {
      const invLines = doc.splitTextToSize(meeting.invitation_text, 170);
      doc.text(invLines, 20, y);
    }
    
    doc.save(`Einladung_${meeting.title.replace(/\s+/g, "_")}.pdf`);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl">{meeting.title}</DialogTitle>
              <DialogDescription className="mt-1">
                {meetingDate && format(meetingDate, "EEEE, dd. MMMM yyyy 'um' HH:mm 'Uhr'", { locale: de })}
              </DialogDescription>
            </div>
            <Badge className={`text-xs border ${status.color}`}>
              {status.label}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList>
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="invitation">Einladung</TabsTrigger>
            <TabsTrigger value="protocol">Protokoll</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs font-medium">Ort</span>
                  </div>
                  <p className="font-medium">{meeting.location || "Nicht angegeben"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-medium">Teilnehmer</span>
                  </div>
                  <p className="font-medium">{meeting.attendees?.length || 0} eingeladen</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Tagesordnung
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm whitespace-pre-wrap bg-slate-50 p-4 rounded-lg">
                  {meeting.agenda || "Keine Tagesordnung hinterlegt"}
                </pre>
              </CardContent>
            </Card>

            {meeting.attendees?.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Teilnehmerliste
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {meeting.attendees.map((email, idx) => (
                      <Badge key={idx} variant="secondary">{email}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="invitation" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Einladungstext</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadInvitationPdf}>
                  <Download className="w-4 h-4 mr-2" />
                  PDF herunterladen
                </Button>
                <Button size="sm" onClick={onSendInvitation}>
                  <Mail className="w-4 h-4 mr-2" />
                  Einladung versenden
                </Button>
              </div>
            </div>
            
            {meeting.invitation_text ? (
              <Card>
                <CardContent className="pt-4">
                  <pre className="text-sm whitespace-pre-wrap">{meeting.invitation_text}</pre>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <Mail className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 mb-3">Noch kein Einladungstext erstellt</p>
                  <Button onClick={onSendInvitation}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Einladung mit KI erstellen
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="protocol" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Sitzungsprotokoll</h3>
              <div className="flex gap-2">
                {meeting.protocol && (
                  <Button variant="outline" size="sm" onClick={downloadProtocolPdf}>
                    <Download className="w-4 h-4 mr-2" />
                    PDF herunterladen
                  </Button>
                )}
                <Button size="sm" onClick={onGenerateProtocol}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {meeting.protocol ? "Protokoll bearbeiten" : "Protokoll erstellen"}
                </Button>
              </div>
            </div>
            
            {meeting.protocol ? (
              <Card>
                <CardContent className="pt-4">
                  <pre className="text-sm whitespace-pre-wrap">{meeting.protocol}</pre>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <FileSignature className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 mb-3">Noch kein Protokoll erstellt</p>
                  <Button onClick={onGenerateProtocol}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Protokoll mit KI generieren
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Upload Previous Protocol */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Vorheriges Protokoll hochladen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">PDF oder Word-Datei hier ablegen</p>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    id="protocol-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // In production: upload file and store reference
                        alert(`Datei "${file.name}" würde hochgeladen werden`);
                      }
                    }}
                  />
                  <Button variant="outline" size="sm" className="mt-3" asChild>
                    <label htmlFor="protocol-upload" className="cursor-pointer">
                      <Upload className="w-4 h-4 mr-2" />
                      Datei auswählen
                    </label>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Schließen
          </Button>
          <Button onClick={onEdit}>
            <Pencil className="w-4 h-4 mr-2" />
            Bearbeiten
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Protocol Generator Dialog
function ProtocolGeneratorDialog({ meeting, onClose, onSave }) {
  const [protocol, setProtocol] = useState(meeting.protocol || "");
  const [generating, setGenerating] = useState(false);
  const [notes, setNotes] = useState("");

  const generateProtocol = async () => {
    setGenerating(true);
    try {
      const prompt = `Erstelle ein professionelles Sitzungsprotokoll für folgende Fraktionssitzung:

SITZUNG: ${meeting.title}
DATUM: ${meeting.date ? format(new Date(meeting.date), "dd.MM.yyyy HH:mm", { locale: de }) : "Nicht angegeben"}
ORT: ${meeting.location || "Nicht angegeben"}
ANWESEND: ${meeting.attendees?.join(", ") || "Nicht angegeben"}

TAGESORDNUNG:
${meeting.agenda || "Keine Tagesordnung"}

NOTIZEN/STICHPUNKTE:
${notes || "Keine zusätzlichen Notizen"}

Bitte erstelle ein vollständiges, formelles Sitzungsprotokoll mit:
- Kopfdaten (Beginn, Ende, Anwesende, Entschuldigt)
- Alle Tagesordnungspunkte mit Diskussion und Beschlüssen
- Abstimmungsergebnisse wo relevant
- Unterschriftszeilen am Ende`;

      const response = await fetch("/api/ai/generate-protocol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      
      const data = await response.json();
      if (data.success) {
        setProtocol(data.content);
      } else {
        throw new Error(data.detail || "Fehler bei der Generierung");
      }
    } catch (error) {
      console.error("Fehler:", error);
      alert("Fehler bei der KI-Generierung: " + error.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="w-5 h-5" />
            Protokoll generieren
          </DialogTitle>
          <DialogDescription>
            Geben Sie Stichpunkte ein und lassen Sie ein vollständiges Protokoll generieren
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-4">
            <div>
              <Label>Notizen und Stichpunkte</Label>
              <p className="text-xs text-slate-500 mb-2">
                Geben Sie hier Stichpunkte zur Sitzung ein (Beschlüsse, Abstimmungen, wichtige Punkte)
              </p>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="- TOP 1: Einstimmig genehmigt&#10;- TOP 2: Antrag XY mit 5:2 angenommen&#10;- TOP 3: Diskussion über..."
                rows={12}
              />
            </div>

            <Button 
              onClick={generateProtocol} 
              disabled={generating}
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generiere Protokoll...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Mit KI generieren
                </>
              )}
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Generiertes Protokoll</Label>
            <Textarea
              value={protocol}
              onChange={(e) => setProtocol(e.target.value)}
              placeholder="Das generierte Protokoll erscheint hier..."
              rows={16}
              className="font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button onClick={() => onSave(protocol)} disabled={!protocol}>
            Protokoll speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Invitation Dialog
function InvitationDialog({ meeting, orgUsers, onClose, onSend }) {
  const [invitationText, setInvitationText] = useState(meeting.invitation_text || "");
  const [recipients, setRecipients] = useState(meeting.attendees || orgUsers.map(u => u.email).filter(Boolean));
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  const generateInvitation = async () => {
    setGenerating(true);
    try {
      const prompt = `Erstelle eine professionelle Einladung zu folgender Fraktionssitzung:

TITEL: ${meeting.title}
DATUM: ${meeting.date ? format(new Date(meeting.date), "EEEE, dd. MMMM yyyy 'um' HH:mm 'Uhr'", { locale: de }) : "Wird noch bekannt gegeben"}
ORT: ${meeting.location || "Wird noch bekannt gegeben"}

TAGESORDNUNG:
${meeting.agenda || "Wird noch bekannt gegeben"}

Die Einladung soll:
- Förmlich und professionell sein
- Eine passende Anrede haben
- Um Rückmeldung bitten
- Mit einer Grußformel enden`;

      const response = await fetch("/api/ai/generate-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      
      const data = await response.json();
      if (data.success) {
        setInvitationText(data.content);
      } else {
        throw new Error(data.detail || "Fehler bei der Generierung");
      }
    } catch (error) {
      console.error("Fehler:", error);
      alert("Fehler bei der KI-Generierung: " + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const sendInvitation = async () => {
    setSending(true);
    try {
      // Generate PDF first
      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(`Einladung zur ${meeting.title}`, 20, 20);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      let y = 40;
      if (meeting.date) {
        doc.text(`Datum: ${format(new Date(meeting.date), "dd.MM.yyyy HH:mm", { locale: de })} Uhr`, 20, y);
        y += 8;
      }
      doc.text(`Ort: ${meeting.location || "-"}`, 20, y);
      y += 15;
      
      // Add invitation text (which may contain agenda)
      if (invitationText) {
        const invLines = doc.splitTextToSize(invitationText, 170);
        doc.text(invLines, 20, y);
        y += invLines.length * 6 + 15;
      } else if (meeting.agenda) {
        // Only add agenda separately if no invitation text exists
        doc.setFont("helvetica", "bold");
        doc.text("Tagesordnung:", 20, y);
        y += 8;
        doc.setFont("helvetica", "normal");
        const agendaLines = doc.splitTextToSize(meeting.agenda, 170);
        doc.text(agendaLines, 20, y);
      }
      
      const pdfBase64 = doc.output("datauristring").split(",")[1];

      // Send email with authorization token
      const token = localStorage.getItem("token");
      console.log("DEBUG: Sending invitation with token:", token ? token.substring(0, 20) + "..." : "NO TOKEN");
      
      if (!token) {
        alert("Fehler: Kein Token gefunden. Bitte melden Sie sich erneut an.");
        return;
      }
      
      const response = await fetch("/api/email/send-invitation", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          to: recipients,
          subject: `Einladung: ${meeting.title}`,
          body: invitationText,
          attachment_base64: pdfBase64,
          attachment_filename: `Einladung_${meeting.title.replace(/\s+/g, "_")}.pdf`,
        }),
      });

      const data = await response.json();
      if (data.success) {
        onSend({ text: invitationText, recipients });
      } else {
        throw new Error(data.detail || "Fehler beim Versenden");
      }
    } catch (error) {
      console.error("Fehler:", error);
      alert("Fehler beim Versenden: " + error.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Einladung versenden
          </DialogTitle>
          <DialogDescription>
            Erstellen und versenden Sie die Einladung per E-Mail
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Einladungstext</Label>
              <Button 
                variant="outline" 
                size="sm"
                onClick={generateInvitation}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                    Generiere...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 mr-2" />
                    Mit KI generieren
                  </>
                )}
              </Button>
            </div>
            <Textarea
              value={invitationText}
              onChange={(e) => setInvitationText(e.target.value)}
              placeholder="Einladungstext eingeben oder mit KI generieren..."
              rows={10}
            />
          </div>

          <div className="space-y-2">
            <Label>Empfänger ({recipients.length})</Label>
            <div className="max-h-32 overflow-y-auto border rounded-lg p-2">
              <div className="flex flex-wrap gap-2">
                {recipients.map((email, idx) => (
                  <Badge key={idx} variant="secondary" className="pr-1">
                    {email}
                    <button
                      type="button"
                      onClick={() => setRecipients(recipients.filter((_, i) => i !== idx))}
                      className="ml-1 hover:text-red-600"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <Card className="bg-sky-50 border-sky-200">
            <CardContent className="pt-4">
              <p className="text-sm text-sky-800">
                <strong>Hinweis:</strong> Die Einladung wird als E-Mail mit PDF-Anhang an alle 
                ausgewählten Empfänger versendet.
              </p>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button 
            onClick={sendInvitation} 
            disabled={!invitationText || recipients.length === 0 || sending}
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Wird versendet...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                An {recipients.length} Empfänger senden
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
