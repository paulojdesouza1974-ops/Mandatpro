import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Printer, Copy, CheckCircle2, Loader2, FileText } from "lucide-react";

export default function LevyNoticeDialog({ levy, onClose, onSent }) {
  const [generating, setGenerating] = useState(false);
  const [noticeText, setNoticeText] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: orgs = [] } = useQuery({
    queryKey: ["organizations", levy.organization],
    queryFn: () => base44.entities.Organization.filter({ name: levy.organization }),
  });
  const org = orgs[0];

  React.useEffect(() => {
    if (org !== undefined) generateNotice(org);
  }, [org]);

  const generateNotice = async (orgData) => {
    setGenerating(true);
    try {
      const senderName = orgData?.display_name || orgData?.name || levy.organization || "[Organisation]";
      const senderAddress = [orgData?.address, orgData?.city].filter(Boolean).join(", ") || "[Adresse]";

      const prompt = `Erstelle einen formellen Gebührenbescheid (auf Deutsch) für einen Mandatsträger.

Absender (oben links im Briefkopf):
${senderName}
${senderAddress}

Empfänger:
- Name: ${levy.contact_name}
- Mandat: ${levy.mandate_type} bei ${levy.mandate_body || "–"}

Abrechnungsdaten:
- Abrechnungsmonat: ${levy.period_month}
- Brutto-Aufwandsentschädigung: ${(levy.gross_income || 0).toFixed(2)} €
- Abgabesatz: ${levy.levy_rate}%
- Berechnete Abgabe: ${(levy.final_levy || 0).toFixed(2)} €
- Freibetrag/Abzüge: ${(levy.deductions || 0).toFixed(2)} €
- Zu zahlende Abgabe: ${(levy.final_levy || 0).toFixed(2)} €

Der Bescheid soll als formeller Brief aufgebaut sein mit vollständigem Briefkopf (Absender oben links, Ort und Datum oben rechts, Empfänger darunter). Professionell und förmlich. Zahlungsziel: 14 Tage nach Erhalt. Bankverbindung: ${orgData?.iban || "[BANKVERBINDUNG EINFÜGEN]"}`;

      const response = await fetch("/api/ai/generate-notice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, levy_data: levy, organization_data: orgData }),
      });
      
      const data = await response.json();
      if (data.success) {
        setNoticeText(data.content);
      } else {
        throw new Error(data.detail || "Fehler bei der Generierung");
      }
    } catch (error) {
      console.error("Notice generation error:", error);
      // Fallback to template
      const senderName = orgData?.display_name || orgData?.name || levy.organization || "[Organisation]";
      setNoticeText(`${senderName}
[Adresse]

${new Date().toLocaleDateString('de-DE')}

${levy.contact_name}
[Adresse des Empfängers]

Gebührenbescheid – Mandatsträgerabgabe ${levy.period_month}

Sehr geehrte(r) ${levy.contact_name},

gemäß der Satzung zur Mandatsträgerabgabe berechnen wir Ihnen für den Abrechnungsmonat ${levy.period_month} folgende Abgabe:

Brutto-Aufwandsentschädigung: ${(levy.gross_income || 0).toFixed(2)} €
Abgabesatz: ${levy.levy_rate}%
Abzüge/Freibetrag: ${(levy.deductions || 0).toFixed(2)} €
────────────────────────────────
Zu zahlende Abgabe: ${(levy.final_levy || 0).toFixed(2)} €

Bitte überweisen Sie den Betrag innerhalb von 14 Tagen auf folgendes Konto:
${orgData?.iban || "[BANKVERBINDUNG EINFÜGEN]"}
Verwendungszweck: MTA ${levy.period_month} ${levy.contact_name}

Mit freundlichen Grüßen,
Der Vorstand`);
    }
    setGenerating(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(noticeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const win = window.open("", "_blank");
    win.document.write(`<html><head><title>Gebührenbescheid – ${levy.contact_name}</title>
      <style>body{font-family:Arial,sans-serif;font-size:13px;line-height:1.6;padding:40px;white-space:pre-wrap;}</style>
      </head><body>${noticeText.replace(/\n/g, "<br/>")}</body></html>`);
    win.document.close();
    win.print();
  };

  const handleDone = () => onSent(levy.id);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Gebührenbescheid erstellen
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-lg text-sm">
            <div><span className="text-slate-500">Mandatsträger:</span> <strong>{levy.contact_name}</strong></div>
            <div><span className="text-slate-500">Monat:</span> <strong>{levy.period_month}</strong></div>
            <div><span className="text-slate-500">Brutto:</span> <strong>{(levy.gross_income||0).toFixed(2)} €</strong></div>
            <div><span className="text-slate-500">Abgabe:</span> <strong className="text-indigo-700">{(levy.final_levy||0).toFixed(2)} €</strong></div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Bescheid-Text
              {generating && <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />}
            </Label>
            {generating ? (
              <div className="flex items-center gap-2 py-10 justify-center text-slate-400 border rounded-lg">
                <Loader2 className="w-5 h-5 animate-spin" /> KI erstellt Bescheid…
              </div>
            ) : (
              <Textarea
                value={noticeText}
                onChange={e => setNoticeText(e.target.value)}
                rows={16}
                className="text-sm font-mono"
              />
            )}
          </div>

          {!generating && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              Den Bescheid können Sie ausdrucken oder den Text kopieren und per E-Mail versenden.
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button variant="outline" onClick={handleCopy} disabled={generating} className="gap-2">
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? "Kopiert!" : "Text kopieren"}
            </Button>
            <Button variant="outline" onClick={handlePrint} disabled={generating} className="gap-2">
              <Printer className="w-4 h-4" /> Drucken / PDF
            </Button>
            <Button onClick={handleDone} disabled={generating} className="bg-blue-600 hover:bg-blue-700 gap-2">
              <CheckCircle2 className="w-4 h-4" /> Als versendet markieren
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}