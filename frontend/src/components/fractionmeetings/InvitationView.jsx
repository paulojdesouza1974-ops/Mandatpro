import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, Download, X, Sparkles, Save, FileText, ListChecks } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { base44 } from "@/api/base44Client";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function InvitationView({ meeting, open, onClose, onUpdate }) {
  const [protocol, setProtocol] = useState(meeting.protocol || "");
  const [generatingProtocol, setGeneratingProtocol] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const printContent = document.querySelector('.invitation-print-content');
      const canvas = await html2canvas(printContent, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      const fileName = `Einladung_${meeting.title.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('PDF Export Fehler:', error);
      alert('Fehler beim Exportieren der PDF');
    } finally {
      setExporting(false);
    }
  };

  const generateProtocol = async () => {
    setGeneratingProtocol(true);
    try {
      // Tagesordnung in strukturierte TOPs umwandeln
      const agendaItems = meeting.agenda ? meeting.agenda.split('\n').filter(line => line.trim()) : [];
      
      const prompt = `Erstelle ein professionelles Protokoll für eine Fraktionssitzung EXAKT nach diesem Format und dieser Struktur:

VORLAGE-STRUKTUR (strikt einhalten):

Protokoll der Fraktionssitzung [Nummer]/[Jahr]

Datum: ${format(new Date(meeting.date), "dd.MM.yyyy", { locale: de })}
Ort: ${meeting.location || "[Ort]"}
Uhrzeit: Von ${format(new Date(meeting.date), "HH:mm", { locale: de })} Bis [Endzeit]

TOP 1: Grußwort des Fraktionsvorstands
[Beschreibung der Begrüßung und Eröffnung]

TOP 2: Wahl des Sitzungsleiters und Protokollführers
• [Name] wird einstimmig zum Sitzungsleiter gewählt.
• [Name] wird einstimmig zum Protokollführer gewählt.

TOP 3: Ordnungsgemäße Einladung
Die Einladung erfolgte am [Datum] um [Uhrzeit] per E-Mail. Es wird festgestellt, dass die Einladung fristgerecht und ordnungsgemäß zugestellt wurde.

TOP 4: Genehmigung der Tagesordnung
Die Tagesordnung wird vorgestellt und [einstimmig/mehrheitlich] genehmigt.

${agendaItems.map((item, idx) => `TOP ${idx + 5}: ${item}
[Detaillierte Beschreibung der Diskussion und Ergebnisse zu diesem Punkt]
${item.toLowerCase().includes('antrag') ? `
Der Antrag wurde [einstimmig/mehrheitlich/abgelehnt] zur Einreichung freigegeben.` : ''}
`).join('\n')}

TOP ${agendaItems.length + 5}: Verschiedenes
[Weitere besprochene Themen und organisatorische Aspekte]

TOP ${agendaItems.length + 6}: Schlusswort des Fraktionsvorsitzenden
[Name] bedankt sich bei der Fraktion für die konstruktive Mitarbeit und schließt die Sitzung um [Uhrzeit].

Unterschriften:
[Name]                           [Name]
Fraktionsvorsitzender            Protokollführer


WICHTIG:
- Verwende die EXAKTE Struktur der Vorlage
- Jeder TOP hat eine klare Überschrift
- Beschreibungen sind professionell und sachlich
- Füge [Platzhalter] für noch zu ergänzende Namen/Details ein
- Formuliere Abstimmungsergebnisse klar (einstimmig/mehrheitlich)
- Halte den Ton formal und präzise`;

      const response = await base44.ai.generateProtocol(prompt);

      setProtocol(response.content || "");
    } catch (error) {
      console.error('Fehler beim Generieren:', error);
      alert('Fehler beim Generieren des Protokolls');
    } finally {
      setGeneratingProtocol(false);
    }
  };

  const saveProtocol = () => {
    onUpdate({ ...meeting, protocol });
  };

  const summarizeProtocol = async () => {
    if (!protocol) {
      alert('Bitte erst ein Protokoll erstellen oder eingeben.');
      return;
    }
    setSummarizing(true);
    try {
      const prompt = `Erstelle eine prägnante Zusammenfassung des folgenden Fraktionssitzungs-Protokolls.

Die Zusammenfassung soll enthalten:
- Die wichtigsten besprochenen Themen
- Wesentliche Diskussionspunkte
- Getroffene Entscheidungen
- Nächste Schritte

Protokoll:
${protocol}

Halte die Zusammenfassung kurz und auf das Wesentliche fokussiert (max. 300 Wörter).`;

      const response = await base44.ai.generateText(prompt, "meeting");

      setProtocol(protocol + '\n\n---\n\nZUSAMMENFASSUNG:\n\n' + (response.content || ""));
    } catch (error) {
      console.error('Fehler beim Zusammenfassen:', error);
      alert('Fehler beim Zusammenfassen des Protokolls');
    } finally {
      setSummarizing(false);
    }
  };

  const extractDecisions = async () => {
    if (!protocol) {
      alert('Bitte erst ein Protokoll erstellen oder eingeben.');
      return;
    }
    setExtracting(true);
    try {
      const prompt = `Extrahiere ALLE wichtigen Beschlüsse und Entscheidungen aus dem folgenden Protokoll.

Protokoll:
${protocol}

Format für jeden Beschluss:
• [Thema/TOP]: [Beschluss] - [Abstimmungsergebnis wenn vorhanden]

Liste ALLE beschlossenen Anträge, Entscheidungen und Abstimmungen auf.`;

      const response = await base44.ai.generateText(prompt, "meeting");

      setProtocol(protocol + '\n\n---\n\nWICHTIGE BESCHLÜSSE:\n\n' + (response.content || ""));
    } catch (error) {
      console.error('Fehler beim Extrahieren:', error);
      alert('Fehler beim Extrahieren der Beschlüsse');
    } finally {
      setExtracting(false);
    }
  };

  const exportProtocolWord = async () => {
    if (!protocol) {
      alert('Kein Protokoll vorhanden.');
      return;
    }
    setExporting(true);
    try {
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      margin: 2cm;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
${protocol.replace(/\n/g, '<br>')}
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Protokoll_${meeting.title.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyy-MM-dd')}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Word Export Fehler:', error);
      alert('Fehler beim Exportieren als Word-Dokument');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" data-testid="invitation-view-dialog">
        <DialogHeader>
          <DialogTitle className="print:hidden">
            Einladung: {meeting.title}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="invitation" className="w-full print:hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invitation" data-testid="invitation-tab-trigger">Einladung</TabsTrigger>
            <TabsTrigger value="protocol" data-testid="protocol-tab-trigger">Protokoll</TabsTrigger>
          </TabsList>

          <TabsContent value="invitation">
            <div className="flex justify-end gap-2 mb-4 print:hidden">
              <Button variant="outline" size="sm" onClick={onClose} data-testid="invitation-close-button">
                <X className="w-4 h-4 mr-1" /> Schließen
              </Button>
              <Button size="sm" onClick={handleExportPDF} disabled={exporting} variant="outline" data-testid="invitation-export-pdf-button">
                <Download className="w-4 h-4 mr-1" /> 
                {exporting ? "Exportiere..." : "PDF"}
              </Button>
              <Button size="sm" onClick={handlePrint} className="bg-slate-900">
                <Printer className="w-4 h-4 mr-1" /> Drucken
              </Button>
            </div>

            <div className="invitation-print-content bg-white p-8 border rounded-lg">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                  Einladung zur Fraktionssitzung
                </h1>
                <div className="text-slate-600">
                  {format(new Date(meeting.date), "dd. MMMM yyyy, HH:mm", { locale: de })} Uhr
                </div>
                {meeting.location && (
                  <div className="text-slate-600">{meeting.location}</div>
                )}
              </div>

              {meeting.invitation_text && (
                <div className="mb-8 whitespace-pre-wrap leading-relaxed">
                  {meeting.invitation_text}
                </div>
              )}

              {meeting.agenda && (
                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-slate-900 mb-3">Tagesordnung:</h2>
                  <div className="whitespace-pre-wrap bg-slate-50 p-4 rounded-lg">
                    {meeting.agenda}
                  </div>
                </div>
              )}

              {meeting.attendees && meeting.attendees.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Teilnehmer:</h3>
                  <div className="text-sm text-slate-600">
                    {meeting.attendees.join(', ')}
                  </div>
                </div>
              )}

              <div className="mt-12 pt-6 border-t border-slate-200 text-xs text-slate-400">
                <p>Einladung erstellt am: {format(new Date(meeting.created_date), "dd.MM.yyyy HH:mm", { locale: de })} Uhr</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="protocol">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Protokoll</h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={generateProtocol}
                    disabled={generatingProtocol}
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {generatingProtocol ? "Generiere..." : "Neu generieren"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={summarizeProtocol}
                    disabled={summarizing || !protocol}
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    {summarizing ? "Fasst zusammen..." : "Zusammenfassen"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={extractDecisions}
                    disabled={extracting || !protocol}
                  >
                    <ListChecks className="w-3 h-3 mr-1" />
                    {extracting ? "Extrahiert..." : "Beschlüsse"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={exportProtocolWord}
                    disabled={exporting || !protocol}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    {exporting ? "Exportiert..." : "Word"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveProtocol}
                    disabled={!protocol}
                  >
                    <Save className="w-3 h-3 mr-1" />
                    Speichern
                  </Button>
                </div>
              </div>

              <Textarea
                value={protocol}
                onChange={(e) => setProtocol(e.target.value)}
                placeholder="Protokoll der Sitzung... (oder mit KI generieren lassen)"
                rows={20}
                className="font-mono text-sm"
              />

              {meeting.protocol && (
                <div className="text-xs text-slate-500">
                  Protokoll gespeichert. Zuletzt bearbeitet: {format(new Date(meeting.updated_date), "dd.MM.yyyy HH:mm", { locale: de })} Uhr
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <style jsx>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .invitation-print-content, .invitation-print-content * {
              visibility: visible;
            }
            .invitation-print-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}