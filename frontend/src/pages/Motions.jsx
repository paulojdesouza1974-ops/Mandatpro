import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FilePlus, Search, MoreVertical, Pencil, Trash2, Printer, Paperclip } from "lucide-react";
import { format } from "date-fns";
import MotionForm from "@/components/motions/MotionForm";
import MotionPrintView from "@/components/motions/MotionPrintView";
import PullToRefresh from "@/components/PullToRefresh";

const statusLabels = { entwurf: "Entwurf", eingereicht: "Eingereicht", in_beratung: "In Beratung", angenommen: "Angenommen", abgelehnt: "Abgelehnt", zurueckgezogen: "Zurückgezogen" };
const statusColors = { entwurf: "bg-slate-100 text-slate-600", eingereicht: "bg-blue-100 text-blue-700", in_beratung: "bg-amber-100 text-amber-700", angenommen: "bg-emerald-100 text-emerald-700", abgelehnt: "bg-red-100 text-red-700", zurueckgezogen: "bg-slate-100 text-slate-500" };
const typeLabels = { antrag: "Antrag", anfrage: "Anfrage", resolution: "Resolution", aenderungsantrag: "Änderungsantrag", dringlichkeitsantrag: "Dringlichkeit" };
const priorityLabels = { niedrig: "Niedrig", mittel: "Mittel", hoch: "Hoch", dringend: "Dringend" };
const priorityColors = { niedrig: "bg-slate-50 text-slate-500", mittel: "bg-blue-50 text-blue-600", hoch: "bg-amber-50 text-amber-600", dringend: "bg-red-50 text-red-600" };

export default function Motions() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("alle");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [printMotion, setPrintMotion] = useState(null);
  const qc = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const urlParams = new URLSearchParams(window.location.search);
  React.useEffect(() => {
    if (urlParams.get("new") === "1" && !formOpen) setFormOpen(true);
  }, []);

  const { data: motions = [], isLoading } = useQuery({
    queryKey: ["motions", currentUser?.organization],
    queryFn: () => base44.entities.Motion.filter({ organization: currentUser.organization }, "-created_date"),
    enabled: !!currentUser?.organization,
  });

  React.useEffect(() => {
    if (!currentUser?.organization) return;
    
    const unsubscribe = base44.entities.Motion.subscribe(() => {
      qc.invalidateQueries({ queryKey: ["motions", currentUser.organization] });
    });
    
    return unsubscribe;
  }, [currentUser?.organization, qc]);

  const saveMutation = useMutation({
    mutationFn: (data) => editing ? base44.entities.Motion.update(editing.id, data) : base44.entities.Motion.create({ ...data, organization: currentUser.organization }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["motions", currentUser?.organization] }); setFormOpen(false); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Motion.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["motions", currentUser?.organization] }),
  });

  const filtered = motions.filter((m) => {
    const term = search.toLowerCase();
    const matchSearch = !term || (m.title || "").toLowerCase().includes(term) || (m.committee || "").toLowerCase().includes(term);
    const matchStatus = statusFilter === "alle" || m.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleRefresh = async () => {
    await qc.invalidateQueries({ queryKey: ["motions", currentUser?.organization] });
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Anträge & Anfragen</h1>
          <p className="text-sm text-slate-500 mt-1">{motions.length} Dokumente gesamt</p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="bg-slate-900 hover:bg-slate-800">
          <FilePlus className="w-4 h-4 mr-2" /> Neuer Antrag
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Suchen..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Status</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400">Titel</TableHead>
                <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400">Art</TableHead>
                <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400">Status</TableHead>
                <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400 hidden md:table-cell">Priorität</TableHead>
                <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400 hidden lg:table-cell">Sitzung</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <TableRow key={i}><TableCell colSpan={6}><div className="h-10 bg-slate-50 rounded animate-pulse" /></TableCell></TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400 text-sm">Keine Anträge gefunden</TableCell></TableRow>
              ) : (
                filtered.map((m) => (
                  <TableRow key={m.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 max-w-xs truncate">{m.title}</p>
                          {m.committee && <p className="text-xs text-slate-400">{m.committee}</p>}
                        </div>
                        {m.attachments && m.attachments.length > 0 && (
                          <div className="flex items-center gap-1 text-slate-400">
                            <Paperclip className="w-3 h-3" />
                            <span className="text-xs">{m.attachments.length}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{typeLabels[m.type] || m.type}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${statusColors[m.status] || statusColors.entwurf}`}>
                        {statusLabels[m.status] || m.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className={`text-[10px] ${priorityColors[m.priority] || ""}`}>
                        {priorityLabels[m.priority] || m.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-slate-500">
                      {m.session_date ? format(new Date(m.session_date), "dd.MM.yyyy") : "–"}
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
                          <DropdownMenuItem onClick={() => setPrintMotion(m)}>
                            <Printer className="w-4 h-4 mr-2" /> Druckansicht
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

      <MotionForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        motion={editing}
        onSave={(data) => saveMutation.mutate(data)}
        saving={saveMutation.isPending}
      />

      <MotionPrintView
        motion={printMotion}
        open={!!printMotion}
        onClose={() => setPrintMotion(null)}
      />
      </div>
    </PullToRefresh>
  );
}