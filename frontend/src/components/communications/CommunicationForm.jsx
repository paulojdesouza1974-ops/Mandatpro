import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Save, X } from "lucide-react";

const types = [
  { value: "email", label: "E-Mail" },
  { value: "telefonat", label: "Telefonat" },
  { value: "persoenlich", label: "Persönlich" },
  { value: "brief", label: "Brief" },
  { value: "sonstiges", label: "Sonstiges" },
];

const directions = [
  { value: "eingehend", label: "Eingehend" },
  { value: "ausgehend", label: "Ausgehend" },
];

const statusOptions = [
  { value: "offen", label: "Offen" },
  { value: "erledigt", label: "Erledigt" },
  { value: "wiedervorlage", label: "Wiedervorlage" },
];

const emptyComm = {
  subject: "", type: "email", direction: "eingehend",
  contact_name: "", content: "", date: new Date().toISOString().slice(0, 16),
  follow_up_date: "", status: "offen",
};

export default function CommunicationForm({ open, onClose, communication, onSave, saving }) {
  const [form, setForm] = useState(emptyComm);

  useEffect(() => {
    setForm(communication ? { ...emptyComm, ...communication } : emptyComm);
  }, [communication, open]);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-slate-900">
            {communication ? "Kommunikation bearbeiten" : "Neue Kommunikation"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Betreff *</Label>
            <Input value={form.subject} onChange={(e) => update("subject", e.target.value)} placeholder="Betreff..." required />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Art *</Label>
              <Select value={form.type} onValueChange={(v) => update("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {types.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Richtung</Label>
              <Select value={form.direction} onValueChange={(v) => update("direction", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {directions.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Status</Label>
              <Select value={form.status} onValueChange={(v) => update("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Kontakt</Label>
              <Input value={form.contact_name} onChange={(e) => update("contact_name", e.target.value)} placeholder="Name des Kontakts" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Datum</Label>
              <Input type="datetime-local" value={form.date} onChange={(e) => update("date", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Inhalt / Notizen</Label>
            <Textarea value={form.content} onChange={(e) => update("content", e.target.value)} rows={5} placeholder="Inhalt..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Wiedervorlage</Label>
            <Input type="date" value={form.follow_up_date} onChange={(e) => update("follow_up_date", e.target.value)} />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              <X className="w-4 h-4 mr-1" /> Abbrechen
            </Button>
            <Button type="submit" disabled={saving} className="bg-slate-900 hover:bg-slate-800">
              <Save className="w-4 h-4 mr-1" /> {saving ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}