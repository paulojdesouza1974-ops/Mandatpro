import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScanLine, Upload, CheckCircle2, Loader2, Pencil } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const mandateTypes = [
  { value: "stadtrat", label: "Stadtrat" },
  { value: "gemeinderat", label: "Gemeinderat" },
  { value: "kreistag", label: "Kreistag" },
  { value: "aufsichtsrat", label: "Aufsichtsrat" },
  { value: "verband", label: "Verbände" },
  { value: "sonstiges", label: "Sonstiges" },
];

export default function LevyScanImport({ open, onClose, user, onCreated }) {
  const [step, setStep] = useState("upload"); // upload | scanning | review | done
  const [fileUrl, setFileUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [extracted, setExtracted] = useState(null); // array of extracted entries
  const [entries, setEntries] = useState([]); // editable entries
  const qc = useQueryClient();

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", user?.organization],
    queryFn: () => base44.entities.Contact.filter({ organization: user.organization }),
    enabled: !!user?.organization,
  });

  const { data: rules = [] } = useQuery({
    queryKey: ["levyRules", user?.organization],
    queryFn: () => base44.entities.LevyRule.filter({ organization: user.organization }),
    enabled: !!user?.organization,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MandateLevy.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mandateLevies"] }),
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    
    // Note: File upload and AI document scanning not yet implemented
    // For now, show a message that manual entry should be used
    alert("Die automatische Dokumentenerkennung ist noch in Entwicklung. Bitte verwenden Sie 'Manuell erfassen' um Abgaben einzutragen.");
    setUploading(false);
    onClose();
  };

  const scanFile = async (url) => {
    // Document scanning requires file upload integration
    // For now, return empty to show manual entry is needed
    setExtracted([]);
    setEntries([]);
    setStep("review");
  };

  const handleImport = async () => {
    const toImport = entries.filter(e => e.selected);
    for (const e of toImport) {
      await createMutation.mutateAsync({
        organization: user.organization,
        contact_id: e.contact_id,
        contact_name: e.contact_name,
        contact_email: e.contact_email,
        mandate_type: e.mandate_type,
        mandate_body: e.mandate_body,
        period_month: e.period_month,
        gross_income: e.gross_income,
        levy_rate: e.levy_rate,
        levy_amount: e.levy_amount,
        deductions: e.deductions,
        final_levy: e.final_levy,
        scan_file_url: fileUrl,
        status: "offen",
      });
    }
    setStep("done");
  };

  const updateEntry = (idx, field, value) => {
    setEntries(prev => prev.map((e, i) => {
      if (i !== idx) return e;
      const updated = { ...e, [field]: value };
      // Recalculate if financial fields change
      if (["gross_income", "levy_rate", "deductions"].includes(field)) {
        const gross = parseFloat(field === "gross_income" ? value : updated.gross_income) || 0;
        const rate = parseFloat(field === "levy_rate" ? value : updated.levy_rate) || 0;
        const ded = parseFloat(field === "deductions" ? value : updated.deductions) || 0;
        const lamt = gross * rate / 100;
        updated.levy_amount = parseFloat(lamt.toFixed(2));
        updated.final_levy = parseFloat(Math.max(0, lamt - ded).toFixed(2));
      }
      return updated;
    }));
  };

  const handleClose = () => {
    setStep("upload");
    setFileUrl(null);
    setEntries([]);
    if (step === "done") onCreated();
    else onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-indigo-600" />
            Abrechnung einscannen
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Laden Sie die kommunale Abrechnung (PDF oder Bild) hoch. Die KI extrahiert automatisch alle Mandatsträger und deren Vergütungen.</p>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-10 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
              {uploading ? (
                <><Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" /><span className="text-sm text-slate-500">Hochladen…</span></>
              ) : (
                <><Upload className="w-8 h-8 text-slate-400 mb-2" /><span className="text-sm font-medium text-slate-600">PDF oder Bild auswählen</span><span className="text-xs text-slate-400 mt-1">PNG, JPG, PDF</span></>
              )}
              <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            </label>
          </div>
        )}

        {step === "scanning" && (
          <div className="flex flex-col items-center py-12 gap-4">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <p className="font-medium text-slate-700">KI analysiert die Abrechnung…</p>
            <p className="text-sm text-slate-400">Mandatsträger und Vergütungen werden extrahiert</p>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">{entries.filter(e=>e.selected).length} von {entries.length} Einträgen ausgewählt</p>
              <Button size="sm" variant="outline" onClick={() => setEntries(prev => prev.map(e => ({ ...e, selected: !prev.every(x=>x.selected) })))}>
                Alle {entries.every(e=>e.selected) ? "abwählen" : "auswählen"}
              </Button>
            </div>
            {entries.map((entry, idx) => (
              <div key={idx} className={`border rounded-xl p-4 space-y-3 transition-colors ${entry.selected ? "border-indigo-300 bg-indigo-50/30" : "border-slate-200 opacity-60"}`}>
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={entry.selected} onChange={e => updateEntry(idx, "selected", e.target.checked)} className="w-4 h-4 cursor-pointer" />
                  <span className="font-semibold text-slate-800">{entry.contact_name}</span>
                  <Badge variant="outline">{entry.mandate_type}</Badge>
                  <span className="text-sm text-slate-500">{entry.period_month}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Brutto-Entschädigung (€)</Label>
                    <Input type="number" value={entry.gross_income} onChange={e => updateEntry(idx, "gross_income", e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Abgabesatz (%)</Label>
                    <Input type="number" value={entry.levy_rate} onChange={e => updateEntry(idx, "levy_rate", e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Freibetrag (€)</Label>
                    <Input type="number" value={entry.deductions} onChange={e => updateEntry(idx, "deductions", e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Abgabe (€)</Label>
                    <div className="h-8 flex items-center px-3 rounded-md bg-indigo-100 font-bold text-indigo-700 text-sm">
                      {(entry.final_levy || 0).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={handleClose}>Abbrechen</Button>
              <Button onClick={handleImport} className="bg-indigo-600 hover:bg-indigo-700" disabled={!entries.some(e=>e.selected)}>
                {entries.filter(e=>e.selected).length} Einträge importieren
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center py-12 gap-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            <p className="font-semibold text-slate-800 text-lg">Import abgeschlossen</p>
            <p className="text-sm text-slate-500">Die Abgaben wurden erfolgreich erfasst.</p>
            <Button onClick={handleClose} className="bg-indigo-600 hover:bg-indigo-700 mt-2">Schließen</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}