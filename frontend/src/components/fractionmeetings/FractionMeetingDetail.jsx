import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, CalendarDays, MapPin, Users, Edit2, Trash2,
  Printer, Download, Sparkles, Save, FileText, ListChecks, Mail, Radio
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { base44 } from "@/api/apiClient";
import { useQuery } from "@tanstack/react-query";
import FractionMeetingFormNew from "./FractionMeetingFormNew";
import LiveProtocol from "./LiveProtocol";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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

export default function FractionMeetingDetail({ meeting, onBack, onUpdate, onDelete }) {
  const [showEdit, setShowEdit] = useState(false);
  const [protocol, setProtocol] = useState(meeting.protocol || "");
  const [liveData, setLiveData] = useState(meeting.live_protocol_data || {});
  const [generating, setGenerating] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);

  const agendaItems = meeting.agenda_items || [];

  const { data: orgUsers = [] } = useQuery({
    queryKey: ["orgUsers", meeting.organization],
    queryFn: () => base44.entities.User.filter({ organization: meeting.organization }),
    enabled: !!meeting.organization,
  });

  const members = orgUsers.map(u => u.full_name || u.email).filter(Boolean);

  const handleSaveLive = () => {
    onUpdate({ ...meeting, live_protocol_data: liveData });
  };

  const handleUpdate = (data) => {
    const agendaText = (data.agenda_items || []).map((item, i) => `TOP ${i + 1}: ${item.title}`).join('\n');
    onUpdate({ ...data, agenda: agendaText });
    setShowEdit(false);
  };

  const handleSaveProtocol = () => {
    onUpdate({ ...meeting, protocol });
  };

  const generateProtocol = async () => {
    setGenerating(true);
    try {
      const agendaText = agendaItems.map((item, i) => `TOP ${i + 1}: ${item.title}`).join('\n');
      const response = await base44.ai.generateText(
        `Erstelle ein professionelles Sitzungsprotokoll für eine Fraktionssitzung:

Titel: ${meeting.title}
Datum: ${meeting.date ? format(new Date(meeting.date), "dd.MM.yyyy", { locale: de }) : ""}
Ort: ${meeting.location || ""}
Tagesordnung:
${agendaText}

Erstelle ein strukturiertes Protokoll mit allen TOPs. Verwende Platzhalter [Name] für noch ausstehende Details. Jeder TOP hat Überschrift, Diskussion und ggf. Abstimmungsergebnis. Füge am Ende Unterschriftenzeilen für Sitzungsleitung und Protokollführer ein.`,
        "meeting"
      );
      if (response?.content) {
        setProtocol(response.content);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const summarizeProtocol = async () => {
    if (!protocol) return;
    setSummarizing(true);
    try {
      const response = await base44.ai.generateText(
        `Erstelle eine prägnante Zusammenfassung (max. 300 Wörter) des folgenden Protokolls mit: wichtigste Themen, Entscheidungen, nächste Schritte.\n\nProtokoll:\n${protocol}`,
        "meeting"
      );
      if (response?.content) {
        setProtocol(protocol + '\n\n---\n\nZUSAMMENFASSUNG:\n\n' + response.content);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSummarizing(false);
    }
  };

  const extractDecisions = async () => {
    if (!protocol) return;
    setExtracting(true);
    try {
      const response = await base44.ai.generateText(
        `Extrahiere alle Beschlüsse und Entscheidungen aus dem folgenden Protokoll. Format: • [TOP/Thema]: [Beschluss] - [Abstimmungsergebnis]\n\nProtokoll:\n${protocol}`,
        "meeting"
      );
      if (response?.content) {
        setProtocol(protocol + '\n\n---\n\nWICHTIGE BESCHLÜSSE:\n\n' + response.content);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setExtracting(false);
    }
  };

  const exportProtocolWord = () => {
    if (!protocol) return;
    const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;font-size:11pt;line-height:1.5;margin:2cm;white-space:pre-wrap;}</style></head><body>${protocol.replace(/\n/g, '<br>')}</body></html>`;
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Protokoll_${meeting.title?.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyy-MM-dd')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportInvitationPDF = async () => {
    setExporting(true);
    try {
      const el = document.querySelector('.invitation-print-content');
      if (!el) return;
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Einladung_${meeting.title?.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const sendInvitation = async () => {
    if (!meeting.attendees?.length) { alert('Keine Teilnehmer hinterlegt.'); return; }
    if (!meeting.invitation_text) { alert('Kein Einladungstext vorhanden.'); return; }
    setSendingInvite(true);
    try {
      const agendaText = agendaItems.map((item, i) => `TOP ${i + 1}: ${item.title}`).join('\n');
      const dateStr = meeting.date ? format(new Date(meeting.date), "dd. MMMM yyyy, HH:mm", { locale: de }) + ' Uhr' : '';
      const body = `${meeting.invitation_text}\n\nDatum: ${dateStr}\nOrt: ${meeting.location || ''}\n\nTagesordnung:\n${agendaText}`;

      await base44.email.sendInvitation({
        to: meeting.attendees,
        subject: `Einladung: ${meeting.title}`,
        body,
        organization: meeting.organization,
      });
      onUpdate({ ...meeting, status: "einladung_versendet", invitation_sent_date: new Date().toISOString() });
      alert(`Einladung an ${meeting.attendees.length} Teilnehmer gesendet.`);
    } catch (err) {
      console.error(err);
      alert('Fehler beim Versenden der Einladungen');
    } finally {
      setSendingInvite(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="fraction-meeting-detail">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 mt-1" data-testid="meeting-detail-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900" data-testid="meeting-detail-title">{meeting.title}</h1>
            <Badge className={statusColors[meeting.status] || "bg-slate-100 text-slate-700"} data-testid="meeting-detail-status">
              {statusLabels[meeting.status] || meeting.status}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
            {meeting.date && (
              <span className="flex items-center gap-1" data-testid="meeting-detail-date">
                <CalendarDays className="w-3.5 h-3.5" />
                {format(new Date(meeting.date), "dd. MMMM yyyy, HH:mm", { locale: de })} Uhr
              </span>
            )}
            {meeting.location && (
              <span className="flex items-center gap-1" data-testid="meeting-detail-location">
                <MapPin className="w-3.5 h-3.5" />
                {meeting.location}
              </span>
            )}
            {meeting.attendees?.length > 0 && (
              <span className="flex items-center gap-1" data-testid="meeting-detail-attendees">
                <Users className="w-3.5 h-3.5" />
                {meeting.attendees.length} Teilnehmer
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setShowEdit(true)} data-testid="meeting-detail-edit">
            <Edit2 className="w-4 h-4 mr-1" /> Bearbeiten
          </Button>
          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={onDelete} data-testid="meeting-detail-delete">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="agenda" className="w-full">
        <TabsList className="grid w-full grid-cols-4" data-testid="meeting-detail-tabs">
          <TabsTrigger value="agenda" data-testid="meeting-tab-agenda">Tagesordnung</TabsTrigger>
          <TabsTrigger value="invitation" data-testid="meeting-tab-invitation">Einladung</TabsTrigger>
          <TabsTrigger value="live" className="flex items-center gap-1" data-testid="meeting-tab-live">
            <Radio className="w-3 h-3 text-red-500" /> Live
          </TabsTrigger>
          <TabsTrigger value="protocol" data-testid="meeting-tab-protocol">Protokoll</TabsTrigger>
        </TabsList>

        {/* Tagesordnung */}
        <TabsContent value="agenda" className="mt-4">
          <div className="bg-white border rounded-xl p-5">
            {agendaItems.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">Keine TOPs hinterlegt.</p>
            ) : (
              <div className="space-y-2">
                {agendaItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
                    <span className="text-xs font-bold text-slate-400 w-14 shrink-0 pt-0.5">TOP {i + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{item.title}</p>
                      {item.type === "motion" && item.file_url && (
                        <a href={item.file_url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-0.5">
                          <FileText className="w-3 h-3" /> Dokument anzeigen
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Einladung */}
        <TabsContent value="invitation" className="mt-4">
          <div className="flex justify-end gap-2 mb-3">
            <Button variant="outline" size="sm" onClick={exportInvitationPDF} disabled={exporting} data-testid="meeting-invitation-pdf">
              <Download className="w-4 h-4 mr-1" /> {exporting ? "..." : "PDF"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()} data-testid="meeting-invitation-print">
              <Printer className="w-4 h-4 mr-1" /> Drucken
            </Button>
            <Button size="sm" onClick={sendInvitation} disabled={sendingInvite} className="bg-slate-900" data-testid="meeting-invitation-send">
              <Mail className="w-4 h-4 mr-1" /> {sendingInvite ? "Sende..." : "Einladung versenden"}
            </Button>
          </div>

          <div className="invitation-print-content bg-white border rounded-xl p-8" data-testid="meeting-invitation-preview">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Einladung zur Fraktionssitzung</h1>
              {meeting.date && (
                <div className="text-slate-600">
                  {format(new Date(meeting.date), "dd. MMMM yyyy, HH:mm", { locale: de })} Uhr
                </div>
              )}
              {meeting.location && <div className="text-slate-600">{meeting.location}</div>}
            </div>

            {meeting.invitation_text && (
              <div className="mb-8 whitespace-pre-wrap leading-relaxed text-slate-700">
                {meeting.invitation_text}
              </div>
            )}

            {meeting.attendees?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Teilnehmer:</h3>
                <p className="text-sm text-slate-600">{meeting.attendees.join(', ')}</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Live Protokoll */}
        <TabsContent value="live" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Live-Protokoll</h3>
                <p className="text-xs text-slate-400">Abstimmungen und Notizen direkt während der Sitzung erfassen</p>
              </div>
              <Button size="sm" onClick={handleSaveLive} data-testid="meeting-live-save">
                <Save className="w-3 h-3 mr-1" /> Speichern
              </Button>
            </div>
            <LiveProtocol
              meeting={meeting}
              members={members}
              topData={liveData}
              onChange={setLiveData}
            />
          </div>
        </TabsContent>

        {/* Protokoll */}
        <TabsContent value="protocol" className="mt-4">
          <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <h3 className="text-lg font-semibold">Protokoll</h3>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={generateProtocol} disabled={generating} data-testid="meeting-protocol-generate">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {generating ? "Generiere..." : "KI Protokoll"}
                </Button>
                <Button size="sm" variant="outline" onClick={summarizeProtocol} disabled={summarizing || !protocol} data-testid="meeting-protocol-summarize">
                  <FileText className="w-3 h-3 mr-1" />
                  {summarizing ? "..." : "Zusammenfassen"}
                </Button>
                <Button size="sm" variant="outline" onClick={extractDecisions} disabled={extracting || !protocol} data-testid="meeting-protocol-extract">
                  <ListChecks className="w-3 h-3 mr-1" />
                  {extracting ? "..." : "Beschlüsse"}
                </Button>
                <Button size="sm" variant="outline" onClick={exportProtocolWord} disabled={!protocol} data-testid="meeting-protocol-export">
                  <Download className="w-3 h-3 mr-1" /> Word
                </Button>
                <Button size="sm" onClick={handleSaveProtocol} disabled={!protocol} data-testid="meeting-protocol-save">
                  <Save className="w-3 h-3 mr-1" /> Speichern
                </Button>
              </div>
            </div>
            <Textarea
              value={protocol}
              onChange={(e) => setProtocol(e.target.value)}
              placeholder="Protokoll der Sitzung... (oder mit KI generieren)"
              rows={22}
              className="font-mono text-sm"
            />
          </div>
        </TabsContent>
      </Tabs>

      {showEdit && (
        <FractionMeetingFormNew
          meeting={meeting}
          onSave={handleUpdate}
          onClose={() => setShowEdit(false)}
          currentUser={{ organization: meeting.organization }}
        />
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .invitation-print-content, .invitation-print-content * { visibility: visible; }
          .invitation-print-content { position: absolute; left: 0; top: 0; width: 100%; padding: 2cm; }
        }
      `}</style>
    </div>
  );
}