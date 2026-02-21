import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Calendar, Euro, Users, TrendingUp, Plus, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import CampaignEventForm from "@/components/campaigns/CampaignEventForm";
import VolunteerForm from "@/components/campaigns/VolunteerForm";
import ExpenseForm from "@/components/campaigns/ExpenseForm";

const statusColors = { planung: "bg-slate-100 text-slate-700", aktiv: "bg-green-100 text-green-700", abgeschlossen: "bg-blue-100 text-blue-700", pausiert: "bg-amber-100 text-amber-700" };

export default function CampaignDetails() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get("id");
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [volunteerFormOpen, setVolunteerFormOpen] = useState(false);
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const qc = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: campaign, isLoading } = useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: async () => {
      const campaigns = await base44.entities.Campaign.filter({ id: campaignId, organization: currentUser.organization });
      return campaigns[0];
    },
    enabled: !!campaignId && !!currentUser?.organization,
  });

  const { data: events = [] } = useQuery({
    queryKey: ["campaignEvents", campaignId],
    queryFn: () => base44.entities.CampaignEvent.filter({ campaign_id: campaignId, organization: currentUser.organization }, "-date"),
    enabled: !!campaignId && !!currentUser?.organization,
  });

  const { data: volunteers = [] } = useQuery({
    queryKey: ["volunteers", currentUser?.organization],
    queryFn: () => base44.entities.Volunteer.filter({ organization: currentUser.organization }),
    enabled: !!currentUser?.organization,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["campaignExpenses", campaignId],
    queryFn: () => base44.entities.CampaignExpense.filter({ campaign_id: campaignId, organization: currentUser.organization }, "-date"),
    enabled: !!campaignId && !!currentUser?.organization,
  });

  const saveEventMutation = useMutation({
    mutationFn: (data) => base44.entities.CampaignEvent.create({ ...data, campaign_id: campaignId, organization: currentUser.organization }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["campaignEvents", campaignId] }); setEventFormOpen(false); },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id) => base44.entities.CampaignEvent.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaignEvents", campaignId] }),
  });

  const saveVolunteerMutation = useMutation({
    mutationFn: (data) => base44.entities.Volunteer.create({ ...data, organization: currentUser.organization, campaigns: [campaignId] }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["volunteers", currentUser?.organization] }); setVolunteerFormOpen(false); },
  });

  const saveExpenseMutation = useMutation({
    mutationFn: (data) => base44.entities.CampaignExpense.create({ ...data, campaign_id: campaignId, organization: currentUser.organization }),
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ["campaignExpenses", campaignId] });
      const totalExpenses = [...expenses, data].reduce((sum, e) => sum + (e.amount || 0), 0);
      await base44.entities.Campaign.update(campaignId, { budget_spent: totalExpenses });
      qc.invalidateQueries({ queryKey: ["campaign", campaignId] });
      setExpenseFormOpen(false);
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id) => base44.entities.CampaignExpense.delete(id),
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ["campaignExpenses", campaignId] });
      const totalExpenses = expenses.filter(e => e.id !== id).reduce((sum, e) => sum + (e.amount || 0), 0);
      await base44.entities.Campaign.update(campaignId, { budget_spent: totalExpenses });
      qc.invalidateQueries({ queryKey: ["campaign", campaignId] });
    },
  });

  if (isLoading) return <div className="py-12 text-center text-slate-500">Laden...</div>;
  if (!campaign) return <div className="py-12 text-center text-slate-500">Kampagne nicht gefunden</div>;

  const budgetProgress = campaign.budget_total ? (campaign.budget_spent / campaign.budget_total) * 100 : 0;
  const reachProgress = campaign.target_voters ? (campaign.contacts_reached / campaign.target_voters) * 100 : 0;
  const campaignVolunteers = volunteers.filter(v => v.campaigns?.includes(campaignId));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="select-none">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{campaign.name}</h1>
            <Badge className={statusColors[campaign.status]}>{campaign.status}</Badge>
          </div>
          {campaign.description && <p className="text-slate-500 mt-1">{campaign.description}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-slate-500">Events</div>
                <div className="text-2xl font-bold">{events.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm text-slate-500">Freiwillige</div>
                <div className="text-2xl font-bold">{campaignVolunteers.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Euro className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="text-sm text-slate-500">Budget</div>
                <div className="text-lg font-bold">{(campaign.budget_spent || 0).toLocaleString('de-DE')} €</div>
                <div className="text-xs text-slate-400">von {(campaign.budget_total || 0).toLocaleString('de-DE')} €</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <div className="text-sm text-slate-500">Erreicht</div>
                <div className="text-lg font-bold">{campaign.contacts_reached || 0}</div>
                <div className="text-xs text-slate-400">Ziel: {campaign.target_voters || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Budget-Auslastung</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={budgetProgress} className="h-2 mb-2" />
            <div className="text-sm text-slate-500">{budgetProgress.toFixed(0)}% ausgeschöpft</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Zielerreichung</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={reachProgress} className="h-2 mb-2" />
            <div className="text-sm text-slate-500">{reachProgress.toFixed(0)}% erreicht</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="volunteers">Freiwillige</TabsTrigger>
          <TabsTrigger value="expenses">Ausgaben</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Kampagnen-Events</h2>
            <Button onClick={() => setEventFormOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" /> Event hinzufügen
            </Button>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titel</TableHead>
                  <TableHead>Art</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Ort</TableHead>
                  <TableHead>Helfer</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">Keine Events</TableCell></TableRow>
                ) : (
                  events.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.title}</TableCell>
                      <TableCell>{e.type}</TableCell>
                      <TableCell>{e.date ? format(new Date(e.date), "dd.MM.yyyy HH:mm", { locale: de }) : "–"}</TableCell>
                      <TableCell>{e.location || "–"}</TableCell>
                      <TableCell>{e.volunteers_confirmed || 0} / {e.volunteers_needed || 0}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteEventMutation.mutate(e.id)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="volunteers" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Freiwillige</h2>
            <Button onClick={() => setVolunteerFormOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" /> Freiwilliger hinzufügen
            </Button>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Stunden</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaignVolunteers.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">Keine Freiwilligen</TableCell></TableRow>
                ) : (
                  campaignVolunteers.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell>{v.email || "–"}</TableCell>
                      <TableCell>{v.phone || "–"}</TableCell>
                      <TableCell>{v.events_participated || 0}</TableCell>
                      <TableCell>{v.hours_contributed || 0}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Ausgaben</h2>
            <Button onClick={() => setExpenseFormOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" /> Ausgabe hinzufügen
            </Button>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Beschreibung</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Betrag</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">Keine Ausgaben</TableCell></TableRow>
                ) : (
                  expenses.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.description}</TableCell>
                      <TableCell>{e.category}</TableCell>
                      <TableCell>{e.date ? format(new Date(e.date), "dd.MM.yyyy", { locale: de }) : "–"}</TableCell>
                      <TableCell className="font-semibold">{(e.amount || 0).toLocaleString('de-DE')} €</TableCell>
                      <TableCell><Badge variant="outline">{e.status}</Badge></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteExpenseMutation.mutate(e.id)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <CampaignEventForm open={eventFormOpen} onClose={() => setEventFormOpen(false)} onSave={saveEventMutation.mutate} saving={saveEventMutation.isPending} />
      <VolunteerForm open={volunteerFormOpen} onClose={() => setVolunteerFormOpen(false)} onSave={saveVolunteerMutation.mutate} saving={saveVolunteerMutation.isPending} />
      <ExpenseForm open={expenseFormOpen} onClose={() => setExpenseFormOpen(false)} onSave={saveExpenseMutation.mutate} saving={saveExpenseMutation.isPending} />
    </div>
  );
}