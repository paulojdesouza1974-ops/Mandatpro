import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScanLine, Upload, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const incomeCategories = [
  { value: "mitgliedsbeitrag", label: "Mitgliedsbeitrag" },
  { value: "spende", label: "Spende" },
  { value: "veranstaltung", label: "Veranstaltung" },
  { value: "zuschuss", label: "Zuschuss" },
  { value: "sonstiges", label: "Sonstiges" },
];

const expenseCategories = [
  { value: "personal", label: "Personalkosten" },
  { value: "raummiete", label: "Raummiete" },
  { value: "material", label: "Material" },
  { value: "marketing", label: "Marketing" },
  { value: "verwaltung", label: "Verwaltung" },
  { value: "sonstiges", label: "Sonstiges" },
];

export default function ReceiptScanner({ open, onClose, organization }) {
  const [step, setStep] = useState("upload"); // upload | scanning | review | done
  const [fileUrl, setFileUrl] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [scanned, setScanned] = useState(null);
  const [form, setForm] = useState({});
  const fileInputRef = useRef();
  const qc = useQueryClient();

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setStep("scanning");

    try {
      const { file_url } = await base44.files.upload(file);
      setFileUrl(file_url);

      const response = await base44.ai.scanReceipt(file_url, organization);
      const result = response?.data || {};

      setScanned(result);
      setForm({
        description: result.description || "",
        vendor: result.vendor || "",
        amount: result.amount || "",
        date: result.date || "",
        transaction_type: result.transaction_type || "ausgabe",
        category: result.category || "sonstiges",
        notes: result.notes || "",
      });

      setStep("review");
    } catch (error) {
      console.error("Upload Fehler:", error);
      alert("Fehler beim Beleg-Scan. Bitte Daten manuell eingeben.");
      setScanned(null);
      setForm({
        description: "",
        vendor: "",
        amount: "",
        date: "",
        transaction_type: "ausgabe",
        category: "sonstiges",
        notes: "",
      });
      setStep("review");
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (data.transaction_type === "einnahme") {
        return base44.entities.Income.create({
          organization,
          description: data.description,
          category: data.category,
          amount: parseFloat(data.amount),
          date: data.date,
          source: data.vendor,
          notes: data.notes,
          file_url: fileUrl,
        });
      } else {
        return base44.entities.Expense.create({
          organization,
          description: data.description,
          category: data.category,
          amount: parseFloat(data.amount),
          date: data.date,
          vendor: data.vendor,
          notes: data.notes,
          status: "ausstehend",
          file_url: fileUrl,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["income", organization] });
      qc.invalidateQueries({ queryKey: ["expenses", organization] });
      setStep("done");
    },
  });

  const handleClose = () => {
    setStep("upload");
    setFileUrl(null);
    setPreviewUrl(null);
    setScanned(null);
    setForm({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <ScanLine className="w-5 h-5 text-blue-600" />
            Beleg scannen & einpflegen
          </DialogTitle>
        </DialogHeader>

        {/* Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Laden Sie ein Foto oder PDF eines Belegs hoch. Die KI liest die Daten automatisch aus und legt die Buchung an.</p>
            <div
              className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              data-testid="receipt-upload-dropzone"
            >
              <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-600">Bild oder PDF auswählen</p>
              <p className="text-xs text-slate-400 mt-1">JPG, PNG, PDF bis 10 MB</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} data-testid="receipt-upload-input" />
          </div>
        )}

        {/* Scanning */}
        {step === "scanning" && (
          <div className="flex flex-col items-center gap-4 py-8">
            {previewUrl && (
              <img src={previewUrl} alt="Beleg" className="max-h-40 rounded-lg object-contain border border-slate-100 shadow-sm" />
            )}
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700">KI analysiert den Beleg...</p>
              <p className="text-xs text-slate-400 mt-1">Betrag, Datum und Kategorie werden erkannt</p>
            </div>
          </div>
        )}

        {/* Review */}
        {step === "review" && (
          <div className="space-y-4">
            {previewUrl && (
              <img src={previewUrl} alt="Beleg" className="max-h-36 w-full rounded-lg object-contain border border-slate-100 shadow-sm bg-slate-50" />
            )}
            {scanned ? (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg" data-testid="receipt-scan-success">
                <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <p className="text-xs text-blue-700">Beleg wurde erkannt. Bitte prüfen und ggf. korrigieren:</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg" data-testid="receipt-scan-disabled">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-700">KI-Scan ist derzeit deaktiviert. Bitte die Daten manuell eintragen.</p>
              </div>
            )}

            {/* Art der Buchung */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Art der Buchung</Label>
              <Select value={form.transaction_type} onValueChange={(v) => {
                update("transaction_type", v);
                update("category", v === "einnahme" ? "sonstiges" : "sonstiges");
              }}>
                <SelectTrigger data-testid="receipt-transaction-type-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="einnahme">Einnahme</SelectItem>
                  <SelectItem value="ausgabe">Ausgabe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Beschreibung</Label>
              <Input value={form.description} onChange={(e) => update("description", e.target.value)} data-testid="receipt-description-input" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500">Betrag (€)</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={(e) => update("amount", e.target.value)} data-testid="receipt-amount-input" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500">Datum</Label>
                <Input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} data-testid="receipt-date-input" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500">{form.transaction_type === "einnahme" ? "Quelle" : "Anbieter"}</Label>
                <Input value={form.vendor} onChange={(e) => update("vendor", e.target.value)} data-testid="receipt-vendor-input" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500">Kategorie</Label>
                <Select value={form.category} onValueChange={(v) => update("category", v)}>
                  <SelectTrigger data-testid="receipt-category-trigger"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(form.transaction_type === "einnahme" ? incomeCategories : expenseCategories).map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" onClick={handleClose} data-testid="receipt-cancel-button">
                <X className="w-4 h-4 mr-1" /> Abbrechen
              </Button>
              <Button
                className="bg-slate-900 hover:bg-slate-800"
                onClick={() => saveMutation.mutate(form)}
                disabled={saveMutation.isPending}
                data-testid="receipt-save-button"
              >
                {saveMutation.isPending ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Speichern...</> : "Buchung speichern"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Done */}
        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-slate-800">Buchung erfolgreich angelegt!</p>
              <p className="text-sm text-slate-400 mt-1">
                Der Beleg wurde als <Badge className="mx-1 text-xs">{form.transaction_type === "einnahme" ? "Einnahme" : "Ausgabe"}</Badge> gespeichert.
              </p>
            </div>
            <Button onClick={handleClose} className="bg-slate-900 hover:bg-slate-800" data-testid="receipt-done-close-button">Schließen</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}