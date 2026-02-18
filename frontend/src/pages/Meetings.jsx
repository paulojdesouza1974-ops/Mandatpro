import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CalendarPlus, Search, MoreVertical, Pencil, Trash2, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import MeetingForm from "@/components/meetings/MeetingForm";
import PullToRefresh from "@/components/PullToRefresh";

const typeLabels = { gemeinderatssitzung: "Gemeinderat", ausschusssitzung: "Ausschuss", fraktionssitzung: "Fraktion", buergersprechstunde: "Bürgersprechstunde", parteitreffen: "Parteitreffen", sonstiges: "Sonstiges" };
const typeColors = { gemeinderatssitzung: "bg-blue-100 text-blue-700", ausschusssitzung: "bg-violet-100 text-violet-700", fraktionssitzung: "bg-emerald-100 text-emerald-700", buergersprechstunde: "bg-amber-100 text-amber-700", parteitreffen: "bg-rose-100 text-rose-700", sonstiges: "bg-slate-100 text-slate-700" };
const statusLabels = { geplant: "Geplant", abgeschlossen: "Abgeschlossen", abgesagt: "Abgesagt" };
const statusColors = { geplant: "bg-blue-100 text-blue-700", abgeschlossen: "bg-emerald-100 text-emerald-700", abgesagt: "bg-red-100 text-red-700" };

export default function Meetings() {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["meetings", currentUser?.organization],
    queryFn: () => base44.entities.Meeting.filter({ organization: currentUser.organization }, "-date"),
    enabled: !!currentUser?.organization,
  });

  React.useEffect(() => {
    if (!currentUser?.organization) return;
    
    const unsubscribe = base44.entities.Meeting.subscribe(() => {
      qc.invalidateQueries({ queryKey: ["meetings", currentUser.organization] });
    });
    
    return unsubscribe;
  }, [currentUser?.organization, qc]);

  const saveMutation = useMutation({
    mutationFn: (data) => editing ? base44.entities.Meeting.update(editing.id, data) : base44.entities.Meeting.create({ ...data, organization: currentUser.organization }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["meetings", currentUser?.organization] }); setFormOpen(false); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Meeting.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings", currentUser?.organization] }),
  });

  const filtered = meetings.filter((m) => {
    const term = search.toLowerCase();
    return !term || (m.title || "").toLowerCase().includes(term) || (m.location || "").toLowerCase().includes(term);
  });

  const handleRefresh = async () => {
    await qc.invalidateQueries({ queryKey: ["meetings", currentUser?.organization] });
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Termine & Sitzungen</h1>
          <p className="text-sm text-slate-500 mt-1">{meetings.length} Termine</p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="bg-slate-900 hover:bg-slate-800">
          <CalendarPlus className="w-4 h-4 mr-2" /> Neuer Termin
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Suchen..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400">Termin</TableHead>
                <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400">Art</TableHead>
                <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400 hidden md:table-cell">Ort</TableHead>
                <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400">Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <TableRow key={i}><TableCell colSpan={5}><div className="h-10 bg-slate-50 rounded animate-pulse" /></TableCell></TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400 text-sm">Keine Termine gefunden</TableCell></TableRow>
              ) : (
                filtered.map((m) => (
                  <TableRow key={m.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{m.title}</p>
                        {m.date && (
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {format(new Date(m.date), "dd. MMMM yyyy, HH:mm", { locale: de })} Uhr
                            {m.end_date && ` - ${format(new Date(m.end_date), "dd. MMMM yyyy, HH:mm", { locale: de })} Uhr`}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${typeColors[m.type] || typeColors.sonstiges}`}>
                        {typeLabels[m.type] || m.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {m.location ? (
                        <span className="text-sm text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{m.location}
                        </span>
                      ) : "–"}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${statusColors[m.status] || statusColors.geplant}`}>
                        {statusLabels[m.status] || m.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-8 h-8"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditing(m); setFormOpen(true); }}>
                            <Pencil className="w-4 h-4 mr-2" /> Bearbeiten
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteMutation.mutate(m.id)} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" /> Löschen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <MeetingForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        meeting={editing}
        onSave={(data) => saveMutation.mutate(data)}
        saving={saveMutation.isPending}
      />
      </div>
    </PullToRefresh>
  );
}