import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const mandateTypes = [
  { value: "stadtrat", label: "Stadtrat" },
  { value: "gemeinderat", label: "Gemeinderat" },
  { value: "kreistag", label: "Kreistag" },
  { value: "aufsichtsrat", label: "Aufsichtsrat" },
  { value: "verband", label: "Verbände" },
  { value: "sonstiges", label: "Sonstiges" },
];

const today = new Date().toISOString().slice(0, 7); // YYYY-MM

export default function LevyManualForm({ open, onClose, defaultData, user, onSaved }) {
  const [form, setForm] = useState({
    contact_id: "", contact_name: "", contact_email: "",
    mandate_type: "gemeinderat", mandate_body: "",
    period_month: today, gross_income: "", levy_rate: 10,
    deductions: 0, notes: "",
  });
  const qc = useQueryClient();

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", user?.organization],
    queryFn: () => base44.entities.Contact.filter({ organization: user.organization }),
    enabled: !!user?.organization,
  });

  useEffect(() => {
    if (defaultData) {
      setForm({ ...defaultData });
    } else {
      setForm({ contact_id: "", contact_name: "", contact_email: "", mandate_type: "gemeinderat", mandate_body: "", period_month: today, gross_income: "", levy_rate: 10, deductions: 0, notes: "" });
    }
  }, [defaultData, open]);

  const gross = parseFloat(form.gross_income) || 0;
  const rate = parseFloat(form.levy_rate) || 0;
  const ded = parseFloat(form.deductions) || 0;
  const levy_amount = gross * rate / 100;
  const final_levy = Math.max(0, levy_amount - ded);

  const mutation = useMutation({
    mutationFn: (data) => defaultData?.id
      ? base44.entities.MandateLevy.update(defaultData.id, data)
      : base44.entities.MandateLevy.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mandateLevies"] }); onSaved(); },
  });

  const handleContactChange = (id) => {
    const c = contacts.find(c => c.id === id);
    setForm(f => ({
      ...f,
      contact_id: id,
      contact_name: c ? `${c.first_name || ""} ${c.last_name}`.trim() : "",
      contact_email: c?.email || "",
    }));
  };

  const handleSave = () => {
    mutation.mutate({
      organization: user.organization,
      ...form,
      gross_income: gross,
      levy_rate: rate,
      deductions: ded,
      levy_amount: parseFloat(levy_amount.toFixed(2)),
      final_levy: parseFloat(final_levy.toFixed(2)),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{defaultData?.id ? "Abgabe bearbeiten" : "Abgabe manuell erfassen"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Mandatsträger</Label>
            <Select value={form.contact_id} onValueChange={handleContactChange}>
              <SelectTrigger><SelectValue placeholder="Kontakt auswählen…" /></SelectTrigger>
              <SelectContent>
                {contacts.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!form.contact_id && (
            <div>
              <Label className="text-xs">Name (manuell)</Label>
              <Input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="Max Mustermann" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Mandatsart</Label>
              <Select value={form.mandate_type} onValueChange={v => setForm(f => ({ ...f, mandate_type: v }))}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {mandateTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Gremium/Körperschaft</Label>
              <Input value={form.mandate_body} onChange={e => setForm(f => ({ ...f, mandate_body: e.target.value }))} placeholder="z.B. Gemeinderat Musterstadt" />
            </div>
            <div>
              <Label className="text-xs">Abrechnungsmonat (YYYY-MM)</Label>
              <Input type="month" value={form.period_month} onChange={e => setForm(f => ({ ...f, period_month: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Brutto-Entschädigung (€)</Label>
              <Input type="number" value={form.gross_income} onChange={e => setForm(f => ({ ...f, gross_income: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <Label className="text-xs">Abgabesatz (%)</Label>
              <Input type="number" value={form.levy_rate} onChange={e => setForm(f => ({ ...f, levy_rate: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Freibetrag / Abzüge (€)</Label>
              <Input type="number" value={form.deductions} onChange={e => setForm(f => ({ ...f, deductions: e.target.value }))} />
            </div>
          </div>

          <div className="flex items-center justify-between bg-indigo-50 rounded-lg px-4 py-3">
            <span className="text-sm text-slate-600">Berechnete Abgabe:</span>
            <span className="text-xl font-bold text-indigo-700">{final_levy.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span>
          </div>

          <div>
            <Label className="text-xs">Notizen</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700" disabled={mutation.isPending}>
              {defaultData?.id ? "Speichern" : "Erfassen"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}