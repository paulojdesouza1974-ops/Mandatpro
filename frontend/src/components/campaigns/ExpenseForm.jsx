import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const categoryOptions = [
  { value: "werbematerial", label: "Werbematerial" },
  { value: "plakate", label: "Plakate" },
  { value: "flyer", label: "Flyer" },
  { value: "raummiete", label: "Raummiete" },
  { value: "catering", label: "Catering" },
  { value: "technik", label: "Technik" },
  { value: "personal", label: "Personal" },
  { value: "porto", label: "Porto" },
  { value: "online_werbung", label: "Online-Werbung" },
  { value: "sonstiges", label: "Sonstiges" },
];

export default function ExpenseForm({ open, onClose, onSave, saving }) {
  const [formData, setFormData] = useState({
    description: "",
    category: "werbematerial",
    amount: "",
    date: new Date().toISOString().split('T')[0],
    vendor: "",
    status: "geplant",
    notes: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      amount: parseFloat(formData.amount),
    });
    setFormData({ description: "", category: "werbematerial", amount: "", date: new Date().toISOString().split('T')[0], vendor: "", status: "geplant", notes: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ausgabe hinzufügen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Beschreibung *</Label>
            <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Kategorie</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="geplant">Geplant</SelectItem>
                  <SelectItem value="bezahlt">Bezahlt</SelectItem>
                  <SelectItem value="ausstehend">Ausstehend</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Betrag (€) *</Label>
              <Input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
            </div>
            <div>
              <Label>Datum</Label>
              <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Anbieter/Lieferant</Label>
            <Input value={formData.vendor} onChange={(e) => setFormData({ ...formData, vendor: e.target.value })} />
          </div>
          <div>
            <Label>Notizen</Label>
            <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button type="submit" disabled={saving}>{saving ? "Speichern..." : "Speichern"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}