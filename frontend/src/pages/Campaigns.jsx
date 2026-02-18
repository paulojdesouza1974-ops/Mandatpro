import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Target, Search, MoreVertical, Pencil, Trash2, Eye, TrendingUp, Users, Euro } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import CampaignForm from "@/components/campaigns/CampaignForm";

const statusLabels = { planung: "Planung", aktiv: "Aktiv", abgeschlossen: "Abgeschlossen", pausiert: "Pausiert" };
const statusColors = { planung: "bg-slate-100 text-slate-700", aktiv: "bg-green-100 text-green-700", abgeschlossen: "bg-blue-100 text-blue-700", pausiert: "bg-amber-100 text-amber-700" };
const typeLabels = { kommunalwahl: "Kommunalwahl", landtagswahl: "Landtagswahl", bundestagswahl: "Bundestagswahl", europawahl: "Europawahl", themenkampagne: "Themenkampagne", mitgliederwerbung: "Mitgliederwerbung" };

export default function Campaigns() {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns", currentUser?.organization],
    queryFn: () => base44.entities.Campaign.filter({ organization: currentUser.organization }, "-created_date"),
    enabled: !!currentUser?.organization,
  });

  React.useEffect(() => {
    if (!currentUser?.organization) return;
    
    const unsubscribe = base44.entities.Campaign.subscribe(() => {
      qc.invalidateQueries({ queryKey: ["campaigns", currentUser.organization] });
    });
    
    return unsubscribe;
  }, [currentUser?.organization, qc]);

  const { data: expenses = [] } = useQuery({
    queryKey: ["campaignExpenses", currentUser?.organization],
    queryFn: () => base44.entities.CampaignExpense.filter({ organization: currentUser.organization }),
    enabled: !!currentUser?.organization,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing ? base44.entities.Campaign.update(editing.id, data) : base44.entities.Campaign.create({ ...data, organization: currentUser.organization }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["campaigns", currentUser?.organization] }); setFormOpen(false); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Campaign.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns", currentUser?.organization] }),
  });

  const filtered = campaigns.filter((c) => {
    const term = search.toLowerCase();
    return !term || (c.name || "").toLowerCase().includes(term) || (c.description || "").toLowerCase().includes(term);
  });

  const activeCampaigns = campaigns.filter(c => c.status === "aktiv").length;
  const totalBudget = campaigns.reduce((sum, c) => sum + (c.budget_total || 0), 0);
  const totalSpent = campaigns.reduce((sum, c) => sum + (c.budget_spent || 0), 0);

  const getBudgetProgress = (campaign) => {
    if (!campaign.budget_total) return 0;
    return Math.min((campaign.budget_spent / campaign.budget_total) * 100, 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kampagnen</h1>
          <p className="text-sm text-slate-500 mt-1">{campaigns.length} Kampagnen gesamt</p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="bg-slate-900 hover:bg-slate-800">
          <Target className="w-4 h-4 mr-2" /> Neue Kampagne
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Aktive Kampagnen</div>
              <div className="text-2xl font-bold text-slate-900">{activeCampaigns}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Euro className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Gesamtbudget</div>
              <div className="text-2xl font-bold text-slate-900">{totalBudget.toLocaleString('de-DE')} €</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Euro className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Ausgegeben</div>
              <div className="text-2xl font-bold text-slate-900">{totalSpent.toLocaleString('de-DE')} €</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Kampagnen suchen..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400">Kampagne</TableHead>
                <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400">Art</TableHead>
                <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400 hidden md:table-cell">Budget</TableHead>
                <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400 hidden lg:table-cell">Zeitraum</TableHead>
                <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400">Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <TableRow key={i}><TableCell colSpan={6}><div className="h-10 bg-slate-50 rounded animate-pulse" /></TableCell></TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400 text-sm">Keine Kampagnen gefunden</TableCell></TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <div>
                        <Link to={createPageUrl(`CampaignDetails?id=${c.id}`)} className="text-sm font-medium text-slate-900 hover:text-slate-700">
                          {c.name}
                        </Link>
                        {c.description && <p className="text-xs text-slate-400 truncate max-w-xs">{c.description}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{typeLabels[c.type] || c.type}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">{(c.budget_spent || 0).toLocaleString('de-DE')} € / {(c.budget_total || 0).toLocaleString('de-DE')} €</span>
                        </div>
                        <Progress value={getBudgetProgress(c)} className="h-1.5" />
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-slate-500">
                      {c.start_date ? format(new Date(c.start_date), "dd.MM.yy", { locale: de }) : "–"} - {c.end_date ? format(new Date(c.end_date), "dd.MM.yy", { locale: de }) : "–"}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${statusColors[c.status] || statusColors.planung}`}>
                        {statusLabels[c.status] || c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-8 h-8"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={createPageUrl(`CampaignDetails?id=${c.id}`)}>
                              <Eye className="w-4 h-4 mr-2" /> Details
                            </Link>
                          </DropdownMenuItem>
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

      <CampaignForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        campaign={editing}
        onSave={(data) => saveMutation.mutate(data)}
        saving={saveMutation.isPending}
      />
    </div>
  );
}