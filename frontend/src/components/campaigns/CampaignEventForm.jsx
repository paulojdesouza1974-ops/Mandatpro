import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const typeOptions = [
  { value: "infostand", label: "Infostand" },
  { value: "haustuergespraech", label: "Haustürgespräch" },
  { value: "veranstaltung", label: "Veranstaltung" },
  { value: "plakatierung", label: "Plakatierung" },
  { value: "flyerverteilung", label: "Flyerverteilung" },
  { value: "telefonaktion", label: "Telefonaktion" },
  { value: "wahlkampfauftakt", label: "Wahlkampfauftakt" },
  { value: "sonstiges", label: "Sonstiges" },
];

export default function CampaignEventForm({ open, onClose, onSave, saving }) {
  const [formData, setFormData] = useState({
    title: "",
    type: "infostand",
    date: "",
    location: "",
    description: "",
    volunteers_needed: "",
    materials_needed: "",
    notes: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      volunteers_needed: formData.volunteers_needed ? parseInt(formData.volunteers_needed) : 0,
    });
    setFormData({ title: "", type: "infostand", date: "", location: "", description: "", volunteers_needed: "", materials_needed: "", notes: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Event hinzufügen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Titel *</Label>
            <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Art</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {typeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Benötigte Helfer</Label>
              <Input type="number" value={formData.volunteers_needed} onChange={(e) => setFormData({ ...formData, volunteers_needed: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Datum & Uhrzeit *</Label>
            <Input type="datetime-local" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
          </div>
          <div>
            <Label>Ort</Label>
            <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
          </div>
          <div>
            <Label>Beschreibung</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
          </div>
          <div>
            <Label>Benötigte Materialien</Label>
            <Textarea value={formData.materials_needed} onChange={(e) => setFormData({ ...formData, materials_needed: e.target.value })} rows={2} />
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