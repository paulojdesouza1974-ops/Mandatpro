import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const typeOptions = [
  { value: "kommunalwahl", label: "Kommunalwahl" },
  { value: "landtagswahl", label: "Landtagswahl" },
  { value: "bundestagswahl", label: "Bundestagswahl" },
  { value: "europawahl", label: "Europawahl" },
  { value: "themenkampagne", label: "Themenkampagne" },
  { value: "mitgliederwerbung", label: "Mitgliederwerbung" },
];

const statusOptions = [
  { value: "planung", label: "Planung" },
  { value: "aktiv", label: "Aktiv" },
  { value: "abgeschlossen", label: "Abgeschlossen" },
  { value: "pausiert", label: "Pausiert" },
];

export default function CampaignForm({ open, onClose, campaign, onSave, saving }) {
  const [formData, setFormData] = useState(campaign || {
    name: "",
    description: "",
    type: "themenkampagne",
    status: "planung",
    start_date: "",
    end_date: "",
    budget_total: "",
    target_voters: "",
    goals: "",
    notes: "",
  });

  React.useEffect(() => {
    if (campaign) setFormData(campaign);
  }, [campaign]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      budget_total: formData.budget_total ? parseFloat(formData.budget_total) : 0,
      target_voters: formData.target_voters ? parseInt(formData.target_voters) : 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{campaign ? "Kampagne bearbeiten" : "Neue Kampagne"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Kampagnenname *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="type">Art *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {typeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="start_date">Startdatum</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="end_date">Enddatum</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="budget_total">Gesamtbudget (€)</Label>
              <Input
                id="budget_total"
                type="number"
                step="0.01"
                value={formData.budget_total}
                onChange={(e) => setFormData({ ...formData, budget_total: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="target_voters">Zielanzahl Wähler</Label>
              <Input
                id="target_voters"
                type="number"
                value={formData.target_voters}
                onChange={(e) => setFormData({ ...formData, target_voters: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="goals">Kampagnenziele</Label>
              <Textarea
                id="goals"
                value={formData.goals}
                onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                rows={2}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="notes">Notizen</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
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