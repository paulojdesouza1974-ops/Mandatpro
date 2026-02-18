import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function ExpenseForm({ isOpen, onClose, onSubmit, defaultData }) {
  const [form, setForm] = useState({
    description: "",
    category: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    vendor: "",
    status: "geplant",
    notes: "",
  });

  useEffect(() => {
    if (defaultData) {
      setForm(defaultData);
    } else {
      setForm({
        description: "",
        category: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        vendor: "",
        status: "geplant",
        notes: "",
      });
    }
  }, [defaultData, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.description || !form.category || !form.amount || !form.date) {
      alert("Bitte füllen Sie alle erforderlichen Felder aus");
      return;
    }
    onSubmit({ ...form, amount: parseFloat(form.amount) });
    setForm({
      description: "",
      category: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      vendor: "",
      status: "geplant",
      notes: "",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{defaultData ? "Ausgabe bearbeiten" : "Neue Ausgabe"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Beschreibung *</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="z.B. Bürobedarf"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Kategorie *</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Bitte wählen..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personalkosten</SelectItem>
                <SelectItem value="raummiete">Raummiete</SelectItem>
                <SelectItem value="material">Material</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="verwaltung">Verwaltung</SelectItem>
                <SelectItem value="sonstiges">Sonstiges</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Betrag (EUR) *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Datum *</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Anbieter/Lieferant</Label>
              <Input
                value={form.vendor}
                onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                placeholder="Firmenname"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Status wählen..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="geplant">Geplant</SelectItem>
                  <SelectItem value="bezahlt">Bezahlt</SelectItem>
                  <SelectItem value="ausstehend">Ausstehend</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notizen</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Zusätzliche Informationen..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            <Button type="submit">
              {defaultData ? "Änderungen speichern" : "Hinzufügen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}