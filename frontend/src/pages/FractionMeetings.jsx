import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, CalendarDays, MapPin, Users, ChevronRight, Search, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import FractionMeetingFormNew from "@/components/fractionmeetings/FractionMeetingFormNew.jsx";
import FractionMeetingDetail from "@/components/fractionmeetings/FractionMeetingDetail.jsx";

const statusColors = {
  geplant: "bg-blue-100 text-blue-800",
  einladung_versendet: "bg-amber-100 text-amber-800",
  abgeschlossen: "bg-green-100 text-green-800",
  abgesagt: "bg-red-100 text-red-800",
};

const statusLabels = {
  geplant: "Geplant",
  einladung_versendet: "Einladung versendet",
  abgeschlossen: "Abgeschlossen",
  abgesagt: "Abgesagt",
};

export default function FractionMeetings() {
  const [showForm, setShowForm] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["fractionMeetings", currentUser?.organization],
    queryFn: () => base44.entities.FractionMeeting.filter(
      { organization: currentUser.organization },
      "-date"
    ),
    enabled: !!currentUser?.organization,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FractionMeeting.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["fractionMeetings"]);
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FractionMeeting.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["fractionMeetings"]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FractionMeeting.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["fractionMeetings"]);
      setSelectedMeeting(null);
    },
  });

  const filtered = meetings.filter(m =>
    m.title?.toLowerCase().includes(search.toLowerCase()) ||
    m.location?.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedMeeting) {
    const current = meetings.find(m => m.id === selectedMeeting.id) || selectedMeeting;
    return (
      <FractionMeetingDetail
        meeting={current}
        onBack={() => setSelectedMeeting(null)}
        onUpdate={(data) => updateMutation.mutate({ id: current.id, data })}
        onDelete={() => deleteMutation.mutate(current.id)}
      />
    );
  }

  return (
    <div className="space-y-6" data-testid="fraction-meetings-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fraktionssitzungen</h1>
          <p className="text-slate-500 text-sm mt-1">{meetings.length} Sitzung(en) insgesamt</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-slate-900 hover:bg-slate-800" data-testid="meeting-new-button">
          <Plus className="w-4 h-4 mr-2" />
          Neue Sitzung
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Sitzungen durchsuchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="meeting-search-input"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Keine Sitzungen gefunden</p>
          <p className="text-sm mt-1">Erstellen Sie Ihre erste Fraktionssitzung</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(meeting => (
            <div
              key={meeting.id}
              onClick={() => setSelectedMeeting(meeting)}
              className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-slate-300 cursor-pointer transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 truncate">{meeting.title}</h3>
                    <Badge className={statusColors[meeting.status] || "bg-slate-100 text-slate-700"}>
                      {statusLabels[meeting.status] || meeting.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                    {meeting.date && (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {format(new Date(meeting.date), "dd. MMMM yyyy, HH:mm", { locale: de })} Uhr
                      </span>
                    )}
                    {meeting.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {meeting.location}
                      </span>
                    )}
                    {meeting.attendees?.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {meeting.attendees.length} Teilnehmer
                      </span>
                    )}
                  </div>
                  {meeting.agenda_items?.length > 0 && (
                    <p className="text-xs text-slate-400 mt-1">{meeting.agenda_items.length} TOPs</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 mt-1 shrink-0 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <FractionMeetingFormNew
          onSave={(data) => createMutation.mutate({ ...data, organization: currentUser?.organization })}
          onClose={() => setShowForm(false)}
          saving={createMutation.isPending}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}