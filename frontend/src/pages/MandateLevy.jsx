import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/apiClient";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, ScanLine, Send, CheckCircle2, AlertCircle, Settings, Euro, FileText, ChevronDown } from "lucide-react";
import LevyScanImport from "@/components/mandate/LevyScanImport";
import LevyRulesManager from "@/components/mandate/LevyRulesManager";
import LevyNoticeDialog from "@/components/mandate/LevyNoticeDialog";
import LevyManualForm from "@/components/mandate/LevyManualForm";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const statusColors = {
  offen: "bg-amber-100 text-amber-800",
  bescheid_versendet: "bg-blue-100 text-blue-800",
  bezahlt: "bg-emerald-100 text-emerald-800",
  mahnbescheid: "bg-red-100 text-red-800",
};
const statusLabels = {
  offen: "Offen",
  bescheid_versendet: "Bescheid versendet",
  bezahlt: "Bezahlt",
  mahnbescheid: "Mahnbescheid",
};
const mandateLabels = {
  gemeinderat: "Gemeinderat",
  kreistag: "Kreistag",
  landtag: "Landtag",
  bundestag: "Bundestag",
  bezirksvertretung: "Bezirksvertretung",
  ausschuss: "Ausschuss",
  sonstiges: "Sonstiges",
  ratsmitglied: "Ratsmitglied",
  kreistagsmitglied: "Kreistagsmitglied",
  bürgermeister: "Bürgermeister",
};

export default function MandateLevyPage() {
  const [tab, setTab] = useState("levies");
  const [scanOpen, setScanOpen] = useState(false);
  const [noticeLevy, setNoticeLevy] = useState(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [editLevy, setEditLevy] = useState(null);
  const qc = useQueryClient();

  const { data: user } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });

  const { data: levies = [], isLoading } = useQuery({
    queryKey: ["mandateLevies", user?.organization],
    queryFn: () => base44.entities.MandateLevy.filter({ organization: user.organization }, "-period_month"),
    enabled: !!user?.organization,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MandateLevy.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mandateLevies"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MandateLevy.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mandateLevies"] }),
  });

  const markPaid = (levy) =>
    updateMutation.mutate({ id: levy.id, data: { status: "bezahlt", payment_date: new Date().toISOString().split("T")[0] } });

  // Summary stats
  const totalOpen = levies.filter(l => l.status === "offen").reduce((s, l) => s + (l.final_levy || 0), 0);
  const totalSent = levies.filter(l => l.status === "bescheid_versendet").reduce((s, l) => s + (l.final_levy || 0), 0);
  const totalPaid = levies.filter(l => l.status === "bezahlt").reduce((s, l) => s + (l.final_levy || 0), 0);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mandatsträger-Abgabe</h1>
          <p className="text-sm text-slate-500 mt-1">Abrechnungen scannen, Abgaben berechnen & Bescheide versenden</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setTab("rules")} className="gap-2">
            <Settings className="w-4 h-4" /> Regeln
          </Button>
          <Button variant="outline" onClick={() => { setEditLevy(null); setManualOpen(true); }} className="gap-2">
            <PlusCircle className="w-4 h-4" /> Manuell erfassen
          </Button>
          <Button onClick={() => setScanOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <ScanLine className="w-4 h-4" /> Abrechnung einscannen
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Offene Abgaben</p>
              <p className="text-xl font-bold text-slate-900">{totalOpen.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Send className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Bescheid versendet</p>
              <p className="text-xl font-bold text-slate-900">{totalSent.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Eingegangen</p>
              <p className="text-xl font-bold text-slate-900">{totalPaid.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="levies">Abgaben</TabsTrigger>
          <TabsTrigger value="rules">Abgabe-Regeln</TabsTrigger>
        </TabsList>

        <TabsContent value="levies" className="space-y-3 mt-4">
          {isLoading && <p className="text-sm text-slate-500">Laden…</p>}
          {!isLoading && levies.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <Euro className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Noch keine Abgaben erfasst</p>
              <p className="text-sm mt-1">Scannen Sie eine Abrechnung ein oder erfassen Sie manuell.</p>
            </div>
          )}
          {levies.map((levy) => (
            <Card key={levy.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900 truncate">{levy.contact_name || "–"}</span>
                      <Badge className={statusColors[levy.status]}>{statusLabels[levy.status]}</Badge>
                      <Badge variant="outline">{mandateLabels[levy.mandate_type] || levy.mandate_type}</Badge>
                    </div>
                    <div className="text-sm text-slate-500 flex flex-wrap gap-3">
                      <span>{levy.mandate_body || ""}</span>
                      <span>Monat: <strong>{levy.period_month}</strong></span>
                      <span>Brutto: <strong>{(levy.gross_income || 0).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</strong></span>
                      <span>Satz: <strong>{levy.levy_rate}%</strong></span>
                      {levy.deductions > 0 && <span>Abzug: <strong>-{levy.deductions.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</strong></span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Abgabe</p>
                      <p className="text-lg font-bold text-indigo-700">{(levy.final_levy || 0).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1">
                          Aktionen <ChevronDown className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setNoticeLevy(levy)}>
                          <FileText className="w-4 h-4 mr-2 text-blue-600" /> Bescheid erstellen & senden
                        </DropdownMenuItem>
                        {levy.status !== "bezahlt" && (
                          <DropdownMenuItem onClick={() => markPaid(levy)}>
                            <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" /> Als bezahlt markieren
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => { setEditLevy(levy); setManualOpen(true); }}>
                          <PlusCircle className="w-4 h-4 mr-2" /> Bearbeiten
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => deleteMutation.mutate(levy.id)}>
                          Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <LevyRulesManager user={user} />
        </TabsContent>
      </Tabs>

      <LevyScanImport
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        user={user}
        onCreated={() => { setScanOpen(false); qc.invalidateQueries({ queryKey: ["mandateLevies"] }); }}
      />

      {noticeLevy && (
        <LevyNoticeDialog
          levy={noticeLevy}
          onClose={() => setNoticeLevy(null)}
          onSent={(id) => {
            updateMutation.mutate({ id, data: { status: "bescheid_versendet", notice_sent_date: new Date().toISOString().split("T")[0] } });
            setNoticeLevy(null);
          }}
        />
      )}

      <LevyManualForm
        open={manualOpen}
        onClose={() => { setManualOpen(false); setEditLevy(null); }}
        defaultData={editLevy}
        user={user}
        onSaved={() => { setManualOpen(false); setEditLevy(null); qc.invalidateQueries({ queryKey: ["mandateLevies"] }); }}
      />
    </div>
  );
}