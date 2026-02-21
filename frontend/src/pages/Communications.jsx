import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MessageSquarePlus, Search, MoreVertical, Pencil, Trash2, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";
import CommunicationForm from "@/components/communications/CommunicationForm";

const typeLabels = { email: "E-Mail", telefonat: "Telefonat", persoenlich: "Persönlich", brief: "Brief", sonstiges: "Sonstiges" };
const statusLabels = { offen: "Offen", erledigt: "Erledigt", wiedervorlage: "Wiedervorlage" };
const statusColors = { offen: "bg-amber-100 text-amber-700", erledigt: "bg-emerald-100 text-emerald-700", wiedervorlage: "bg-blue-100 text-blue-700" };

export default function Communications() {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  React.useEffect(() => {
    if (urlParams.get("new") === "1" && !formOpen) setFormOpen(true);
  }, []);

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: comms = [], isLoading } = useQuery({
    queryKey: ["communications", currentUser?.organization],
    queryFn: () => base44.entities.Communication.filter({ organization: currentUser.organization }, "-created_date"),
    enabled: !!currentUser?.organization,
  });

  React.useEffect(() => {
    if (!currentUser?.organization) return;
    
    const unsubscribe = base44.entities.Communication.subscribe(() => {
      qc.invalidateQueries({ queryKey: ["communications", currentUser.organization] });
    });
    
    return unsubscribe;
  }, [currentUser?.organization, qc]);

  const saveMutation = useMutation({
    mutationFn: (data) => editing ? base44.entities.Communication.update(editing.id, data) : base44.entities.Communication.create({ ...data, organization: currentUser.organization }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["communications", currentUser?.organization] }); setFormOpen(false); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Communication.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["communications", currentUser?.organization] }),
  });

  const filtered = comms.filter((c) => {
    const term = search.toLowerCase();
    return !term || (c.subject || "").toLowerCase().includes(term) || (c.contact_name || "").toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kommunikation</h1>
          <p className="text-sm text-slate-500 mt-1">{comms.length} Einträge</p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="bg-slate-900 hover:bg-slate-800">
          <MessageSquarePlus className="w-4 h-4 mr-2" /> Neuer Eintrag
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
                <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400">Betreff</TableHead>
                <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400">Art</TableHead>
                <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400 hidden md:table-cell">Kontakt</TableHead>
                <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400">Status</TableHead>
                <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400 hidden lg:table-cell">Datum</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <TableRow key={i}><TableCell colSpan={6}><div className="h-10 bg-slate-50 rounded animate-pulse" /></TableCell></TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400 text-sm">Keine Einträge gefunden</TableCell></TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {c.direction === "eingehend" ? (
                          <ArrowDownLeft className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        )}
                        <p className="text-sm font-medium text-slate-900 truncate max-w-xs">{c.subject}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{typeLabels[c.type] || c.type}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-slate-500">{c.contact_name || "–"}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${statusColors[c.status] || statusColors.offen}`}>
                        {statusLabels[c.status] || c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-slate-500">
                      {c.date ? format(new Date(c.date), "dd.MM.yyyy HH:mm") : "–"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-8 h-8"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditing(c); setFormOpen(true); }}>
                            <Pencil className="w-4 h-4 mr-2" /> Bearbeiten
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteMutation.mutate(c.id)} className="text-red-600">
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

      <CommunicationForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        communication={editing}
        onSave={(data) => saveMutation.mutate(data)}
        saving={saveMutation.isPending}
      />
    </div>
  );
}