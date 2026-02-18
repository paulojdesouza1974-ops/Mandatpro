import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wand2 } from "lucide-react";

const incomeCategories = [
  { value: "mitgliedsbeitrag", label: "Mitgliedsbeitrag (Vollmitglied)" },
  { value: "foerdermitgliedschaft", label: "Fördermitgliedschaft" },
  { value: "ehrenmitgliedschaft", label: "Ehrenmitgliedschaft" },
  { value: "jugendmitgliedschaft", label: "Jugendmitgliedschaft" },
  { value: "spende", label: "Spende (allgemein)" },
  { value: "spende_zweckgebunden", label: "Spende (zweckgebunden)" },
  { value: "spende_sach", label: "Sachspende" },
  { value: "veranstaltung", label: "Veranstaltungseinnahme" },
  { value: "zuschuss", label: "Zuschuss / Förderung" },
  { value: "mandatsabgabe", label: "Mandatsabgabe" },
  { value: "sonstiges", label: "Sonstiges" },
];

const expenseCategories = [
  { value: "personal", label: "Personalkosten" },
  { value: "raummiete", label: "Raummiete" },
  { value: "material", label: "Material / Büro" },
  { value: "marketing", label: "Marketing" },
  { value: "verwaltung", label: "Verwaltung" },
  { value: "edv", label: "EDV / Software" },
  { value: "wahlkampf", label: "Wahlkampf" },
  { value: "sonstiges", label: "Sonstiges" },
];

// Templates: name, type, category, amount, period (full year by default)
const TEMPLATES = [
  { label: "Raummiete (12 × Monatsmiete)", type: "expense", category: "raummiete", name: "Raummiete {year}", amount: 1200 },
  { label: "EDV / Software (Jahreslizenzen)", type: "expense", category: "edv", name: "EDV & Software {year}", amount: 600 },
  { label: "Wahlkampf-Budget", type: "expense", category: "wahlkampf", name: "Wahlkampf {year}", amount: 5000 },
  { label: "Personal / Bürokraft", type: "expense", category: "personal", name: "Personal {year}", amount: 3600 },
  { label: "Marketing & Öffentlichkeitsarbeit", type: "expense", category: "marketing", name: "Marketing {year}", amount: 2000 },
  { label: "Mitgliedsbeiträge (Vollmitglieder)", type: "income", category: "mitgliedsbeitrag", name: "Mitgliedsbeiträge {year}", amount: 0 },
  { label: "Fördermitgliedschaften", type: "income", category: "foerdermitgliedschaft", name: "Fördermitgliedschaften {year}", amount: 0 },
  { label: "Spenden (allgemein)", type: "income", category: "spende", name: "Spenden {year}", amount: 0 },
  { label: "Zuschüsse / Fördergelder", type: "income", category: "zuschuss", name: "Zuschüsse {year}", amount: 0 },
];

const empty = {
  name: "",
  type: "expense",
  category: "sonstiges",
  amount: "",
  period_start: "",
  period_end: "",
  notes: "",
};

function yearRange(year) {
  return { period_start: `${year}-01-01`, period_end: `${year}-12-31` };
}

export default function BudgetForm({ open, onClose, defaultData, onSubmit, isLoading }) {
  const [form, setForm] = useState(empty);
  const [showTemplates, setShowTemplates] = useState(false);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (open) {
      if (defaultData) {
        setForm({ ...defaultData });
      } else {
        setForm({ ...empty, ...yearRange(currentYear) });
      }
      setShowTemplates(false);
    }
  }, [open, defaultData]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const categories = form.type === "income" ? incomeCategories : expenseCategories;

  const applyTemplate = (tpl) => {
    const year = currentYear;
    setForm({
      ...empty,
      ...yearRange(year),
      name: tpl.name.replace("{year}", year),
      type: tpl.type,
      category: tpl.category,
      amount: tpl.amount || "",
    });
    setShowTemplates(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{defaultData ? "Budget bearbeiten" : "Neues Budget anlegen"}</DialogTitle>
        </DialogHeader>

        {!defaultData && (
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs border-dashed border-indigo-300 text-indigo-700 hover:bg-indigo-50"
              onClick={() => setShowTemplates((v) => !v)}
            >
              <Wand2 className="w-3.5 h-3.5 mr-1.5" />
              {showTemplates ? "Vorlage ausblenden" : "Aus Vorlage erstellen"}
            </Button>
            {showTemplates && (
              <div className="grid grid-cols-1 gap-1 max-h-44 overflow-y-auto rounded-lg border border-indigo-100 p-2 bg-indigo-50">
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.label}
                    onClick={() => applyTemplate(tpl)}
                    className="text-left px-3 py-2 rounded-md text-xs hover:bg-indigo-100 transition-colors flex items-center justify-between"
                  >
                    <span className="font-medium text-slate-700">{tpl.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tpl.type === "income" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {tpl.type === "income" ? "Einnahme" : "Ausgabe"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Bezeichnung</Label>
            <Input placeholder="z.B. Raummiete 2026" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Art</Label>
              <Select value={form.type} onValueChange={(v) => { set("type", v); set("category", "sonstiges"); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Einnahme</SelectItem>
                  <SelectItem value="expense">Ausgabe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Kategorie</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Geplanter Betrag (€)</Label>
            <Input type="number" step="0.01" min="0" placeholder="0.00" value={form.amount} onChange={(e) => set("amount", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Zeitraum von</Label>
              <Input type="date" value={form.period_start} onChange={(e) => set("period_start", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Zeitraum bis</Label>
              <Input type="date" value={form.period_end} onChange={(e) => set("period_end", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Notizen</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button
            className="bg-slate-900 hover:bg-slate-800"
            disabled={isLoading || !form.name || !form.amount || !form.period_start || !form.period_end}
            onClick={() => onSubmit(form)}
          >
            {isLoading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Speichern...</> : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}