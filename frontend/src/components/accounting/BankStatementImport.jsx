import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText, Upload, Loader2, CheckCircle2, X, ChevronDown, ChevronUp, Users, Euro, AlertTriangle, Link2, Link2Off
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const INCOME_CATEGORIES = [
  { value: "mitgliedsbeitrag", label: "Mitgliedsbeitrag" },
  { value: "spende", label: "Spende" },
  { value: "mandatsabgabe", label: "Mandatsträger-Abgabe" },
  { value: "veranstaltung", label: "Veranstaltung" },
  { value: "zuschuss", label: "Zuschuss" },
  { value: "sonstiges", label: "Sonstiges" },
];

const EXPENSE_CATEGORIES = [
  { value: "personal", label: "Personalkosten" },
  { value: "raummiete", label: "Raummiete" },
  { value: "material", label: "Material" },
  { value: "marketing", label: "Marketing" },
  { value: "verwaltung", label: "Verwaltung" },
  { value: "sonstiges", label: "Sonstiges" },
];

const categoryColors = {
  mitgliedsbeitrag: "bg-blue-100 text-blue-700",
  spende: "bg-purple-100 text-purple-700",
  mandatsabgabe: "bg-amber-100 text-amber-700",
  veranstaltung: "bg-pink-100 text-pink-700",
  zuschuss: "bg-cyan-100 text-cyan-700",
  sonstiges: "bg-slate-100 text-slate-600",
  personal: "bg-red-100 text-red-700",
  raummiete: "bg-orange-100 text-orange-700",
  material: "bg-yellow-100 text-yellow-700",
  marketing: "bg-rose-100 text-rose-700",
  verwaltung: "bg-gray-100 text-gray-600",
};

// Try to match a transaction to an existing expense by amount + approximate date + vendor
function findMatchingExpense(t, expenses) {
  if (t.transaction_type !== "ausgabe") return null;
  const amt = parseFloat(t.amount);
  return expenses.find((e) => {
    if (parseFloat(e.amount) !== amt) return false;
    // Allow ±7 days
    if (t.date && e.date) {
      const diff = Math.abs(new Date(t.date) - new Date(e.date)) / (1000 * 60 * 60 * 24);
      if (diff > 7) return false;
    }
    // Vendor name similarity (simple includes check)
    if (t.sender_receiver && e.vendor) {
      const a = t.sender_receiver.toLowerCase();
      const b = e.vendor.toLowerCase();
      if (!a.includes(b.split(" ")[0]) && !b.includes(a.split(" ")[0])) return false;
    }
    return true;
  }) || null;
}

export default function BankStatementImport({ open, onClose, organization, contacts = [], existingExpenses = [] }) {
  const [step, setStep] = useState("upload");
  const [transactions, setTransactions] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [selected, setSelected] = useState({});
  const fileInputRef = useRef();
  const qc = useQueryClient();

  const toggleExpand = (idx) => setExpanded((e) => ({ ...e, [idx]: !e[idx] }));
  const toggleSelect = (idx) => setSelected((s) => ({ ...s, [idx]: !s[idx] }));
  const toggleAll = () => {
    const allSelected = transactions.every((_, i) => selected[i]);
    const next = {};
    transactions.forEach((_, i) => { next[i] = !allSelected; });
    setSelected(next);
  };

  const updateTransaction = (idx, field, value) => {
    setTransactions((ts) => ts.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setStep("scanning");

    try {
      await base44.files.upload(file);
      alert("Der Kontoauszug-Import per KI ist aktuell in Entwicklung. Bitte Buchungen manuell erfassen.");
    } catch (error) {
      console.error("Upload Fehler:", error);
      alert("Fehler beim Hochladen des Kontoauszugs");
    } finally {
      setStep("upload");
    }
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      const toImport = transactions.filter((_, i) => selected[i]);
      const promises = toImport.map(async (t) => {
        if (t.transaction_type === "einnahme") {
          return base44.entities.Income.create({
            organization,
            description: t.description,
            category: t.category,
            amount: parseFloat(t.amount),
            date: t.date,
            source: t.sender_receiver,
            notes: t.matched_contact ? `Zugeordnet: ${t.matched_contact}` : undefined,
          });
        } else {
          // If we have a matched existing expense, update it to "bezahlt"
          if (t.matched_expense && t.matched_expense.id) {
            return base44.entities.Expense.update(t.matched_expense.id, {
              status: "bezahlt",
              notes: (t.matched_expense.notes ? t.matched_expense.notes + " | " : "") + `Abgeglichen via Kontoauszug ${t.date}`,
            });
          }
          // Otherwise create a new expense
          return base44.entities.Expense.create({
            organization,
            description: t.description,
            category: t.category,
            amount: parseFloat(t.amount),
            date: t.date,
            vendor: t.sender_receiver,
            status: "bezahlt",
          });
        }
      });
      await Promise.all(promises);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["income", organization] });
      qc.invalidateQueries({ queryKey: ["expenses", organization] });
      setStep("done");
    },
  });

  const handleClose = () => {
    setStep("upload");
    setTransactions([]);
    setExpanded({});
    setSelected({});
    onClose();
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const selectedIncome = transactions.filter((t, i) => selected[i] && t.transaction_type === "einnahme").reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
  const selectedExpense = transactions.filter((t, i) => selected[i] && t.transaction_type === "ausgabe").reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

  // Group by category for summary
  const categorySummary = {};
  transactions.forEach((t, i) => {
    if (!selected[i]) return;
    const key = t.category || "sonstiges";
    if (!categorySummary[key]) categorySummary[key] = { count: 0, total: 0, type: t.transaction_type };
    categorySummary[key].count++;
    categorySummary[key].total += parseFloat(t.amount) || 0;
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <FileText className="w-5 h-5 text-blue-600" />
            Kontoauszug importieren
          </DialogTitle>
        </DialogHeader>

        {/* Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Laden Sie einen Kontoauszug als PDF oder Bild hoch. Die KI erkennt alle Buchungen automatisch und ordnet sie Mitgliedsbeiträgen, Spenden, Mandatsabgaben usw. zu.
            </p>
            <div
              className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              data-testid="bank-statement-upload-dropzone"
            >
              <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-600">Kontoauszug auswählen</p>
              <p className="text-xs text-slate-400 mt-1">PDF, JPG oder PNG</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} data-testid="bank-statement-upload-input" />
          </div>
        )}

        {/* Scanning */}
        {step === "scanning" && (
          <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-700">KI analysiert den Kontoauszug...</p>
              <p className="text-xs text-slate-400 mt-1">Buchungen werden erkannt und kategorisiert</p>
            </div>
          </div>
        )}

        {/* Review */}
        {step === "review" && transactions.length > 0 && (
          <div className="space-y-4">
            {/* Summary bar */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400">Buchungen</p>
                <p className="text-lg font-bold text-slate-800">{selectedCount}</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3">
                <p className="text-xs text-emerald-500">Einnahmen</p>
                <p className="text-lg font-bold text-emerald-700">+{selectedIncome.toFixed(2)} €</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-xs text-red-400">Ausgaben</p>
                <p className="text-lg font-bold text-red-700">-{selectedExpense.toFixed(2)} €</p>
              </div>
            </div>

            {/* Category chips */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(categorySummary).map(([cat, info]) => (
                <span key={cat} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${categoryColors[cat] || "bg-slate-100 text-slate-600"}`}>
                  {INCOME_CATEGORIES.find(c => c.value === cat)?.label || EXPENSE_CATEGORIES.find(c => c.value === cat)?.label || cat}
                  <span className="opacity-60">×{info.count}</span>
                </span>
              ))}
            </div>

            {/* Select all */}
            <div className="flex items-center justify-between">
              <button onClick={toggleAll} className="text-xs text-blue-600 hover:underline" data-testid="bank-statement-toggle-all-button">
                {transactions.every((_, i) => selected[i]) ? "Alle abwählen" : "Alle auswählen"}
              </button>
              <span className="text-xs text-slate-400">{selectedCount} von {transactions.length} ausgewählt</span>
            </div>

            {/* Transaction list */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {transactions.map((t, idx) => (
                <div
                  key={idx}
                  className={`border rounded-lg transition-colors ${selected[idx] ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-50"}`}
                >
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={!!selected[idx]}
                      onChange={() => toggleSelect(idx)}
                      className="accent-blue-600 w-4 h-4 flex-shrink-0"
                      data-testid={`bank-statement-transaction-checkbox-${idx}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-slate-800 truncate">{t.sender_receiver || t.description}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${categoryColors[t.category] || "bg-slate-100 text-slate-500"}`}>
                          {INCOME_CATEGORIES.find(c => c.value === t.category)?.label || EXPENSE_CATEGORIES.find(c => c.value === t.category)?.label || t.category}
                        </span>
                        {t.matched_contact && (
                          <span className="text-xs text-blue-600 flex items-center gap-1"><Users className="w-3 h-3" />{t.matched_contact}</span>
                        )}
                        {t.matched_expense && (
                          <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 flex items-center gap-1 px-1.5 py-0.5 rounded-full">
                            <Link2 className="w-3 h-3" />Beleg: {t.matched_expense.description?.slice(0, 20)}
                          </span>
                        )}
                        {t.confidence === "niedrig" && (
                          <AlertTriangle className="w-3 h-3 text-amber-400" title="Niedrige Erkennungssicherheit" />
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate">{t.description} · {t.date}</p>
                    </div>
                    <span className={`text-sm font-semibold flex-shrink-0 ${t.transaction_type === "einnahme" ? "text-emerald-600" : "text-red-500"}`}>
                      {t.transaction_type === "einnahme" ? "+" : "-"}{parseFloat(t.amount || 0).toFixed(2)} €
                    </span>
                    <button onClick={() => toggleExpand(idx)} className="text-slate-300 hover:text-slate-500 flex-shrink-0" data-testid={`bank-statement-toggle-expand-${idx}`}>
                      {expanded[idx] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                  {expanded[idx] && (
                    <div className="px-3 pb-3 pt-1 grid grid-cols-2 gap-2 border-t border-slate-100">
                      <div>
                        <label className="text-xs text-slate-400">Beschreibung</label>
                        <Input className="h-7 text-xs mt-0.5" value={t.description} onChange={(e) => updateTransaction(idx, "description", e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400">Betrag (€)</label>
                        <Input className="h-7 text-xs mt-0.5" type="number" step="0.01" value={t.amount} onChange={(e) => updateTransaction(idx, "amount", e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400">Kategorie</label>
                        <Select value={t.category} onValueChange={(v) => updateTransaction(idx, "category", v)}>
                          <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(t.transaction_type === "einnahme" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400">Art</label>
                        <Select value={t.transaction_type} onValueChange={(v) => updateTransaction(idx, "transaction_type", v)}>
                          <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="einnahme">Einnahme</SelectItem>
                            <SelectItem value="ausgabe">Ausgabe</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}><X className="w-4 h-4 mr-1" />Abbrechen</Button>
              <Button
                className="bg-slate-900 hover:bg-slate-800"
                onClick={() => importMutation.mutate()}
                disabled={importMutation.isPending || selectedCount === 0}
              >
                {importMutation.isPending
                  ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Importieren...</>
                  : <><Euro className="w-4 h-4 mr-1" />{selectedCount} Buchung{selectedCount !== 1 ? "en" : ""} importieren</>
                }
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Done */}
        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-10">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-slate-800">Import erfolgreich!</p>
              <p className="text-sm text-slate-400 mt-1">
                {selectedCount} Buchungen importiert.{" "}
                {transactions.filter((t, i) => selected[i] && t.matched_expense).length > 0 && (
                  <span className="text-emerald-600 font-medium">
                    {transactions.filter((t, i) => selected[i] && t.matched_expense).length} Belege automatisch abgeglichen.
                  </span>
                )}
              </p>
            </div>
            <Button onClick={handleClose} className="bg-slate-900 hover:bg-slate-800">Schließen</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}