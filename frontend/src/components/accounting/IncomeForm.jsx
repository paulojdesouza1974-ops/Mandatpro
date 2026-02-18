import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function IncomeForm({ isOpen, onClose, onSubmit, defaultData }) {
  const [form, setForm] = useState({
    description: "",
    category: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    source: "",
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
        source: "",
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
      source: "",
      notes: "",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{defaultData ? "Einnahme bearbeiten" : "Neue Einnahme"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Beschreibung *</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="z.B. Mitgliedsbeitrag"
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
                <SelectItem value="mitgliedsbeitrag">Mitgliedsbeitrag (Vollmitglied)</SelectItem>
                <SelectItem value="foerdermitgliedschaft">Fördermitgliedschaft</SelectItem>
                <SelectItem value="ehrenmitgliedschaft">Ehrenmitgliedschaft</SelectItem>
                <SelectItem value="jugendmitgliedschaft">Jugendmitgliedschaft</SelectItem>
                <SelectItem value="spende">Spende (allgemein)</SelectItem>
                <SelectItem value="spende_zweckgebunden">Spende (zweckgebunden)</SelectItem>
                <SelectItem value="spende_sach">Sachspende</SelectItem>
                <SelectItem value="veranstaltung">Veranstaltungseinnahme</SelectItem>
                <SelectItem value="zuschuss">Zuschuss / Förderung</SelectItem>
                <SelectItem value="mandatsabgabe">Mandatsabgabe</SelectItem>
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

          <div className="space-y-2">
            <Label>Quelle/Zahler</Label>
            <Input
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              placeholder="z.B. Name oder Organisation"
            />
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