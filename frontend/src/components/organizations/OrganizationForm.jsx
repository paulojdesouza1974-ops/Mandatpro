import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Save, X, Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const emptyOrg = {
  name: "",
  email: "",
  city: "",
  address: "",
  phone: "",
  website: "",
  description: "",
  owner_name: "",
  owner_position: "",
  members: [],
};

const roles = [
  { value: "fraktionsvorsitzender", label: "Fraktionsvorsitzender" },
  { value: "stv_fraktionsvorsitzender", label: "Stv. Fraktionsvorsitzender" },
  { value: "fraktionsgeschaeftsfuehrer", label: "Fraktionsgeschäftsführer" },
  { value: "ratsmitglied", label: "Ratsmitglied" },
  { value: "sachkundiger_buerger", label: "Sachkundiger Bürger" },
];

export default function OrganizationForm({ open, onClose, organization, onSave, saving }) {
  const [form, setForm] = useState(emptyOrg);

  useEffect(() => {
    setForm(organization ? { ...emptyOrg, ...organization } : emptyOrg);
  }, [organization, open]);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const addMember = () => {
    setForm((f) => ({
      ...f,
      members: [...(f.members || []), { name: "", role: "ratsmitglied" }],
    }));
  };

  const updateMember = (index, field, value) => {
    setForm((f) => ({
      ...f,
      members: f.members.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    }));
  };

  const removeMember = (index) => {
    setForm((f) => ({
      ...f,
      members: f.members.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-slate-900">
            {organization ? "Organisation bearbeiten" : "Neue Organisation"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="z.B. AfD Dormagen"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">E-Mail-Adresse</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="z.B. info@afd-dormagen.de"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Stadt</Label>
              <Input
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                placeholder="z.B. Dormagen"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Telefon</Label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="+49..."
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Adresse</Label>
            <Input
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="Straße, PLZ, Ort"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Webseite</Label>
            <Input
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Beschreibung</Label>
            <Textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={3}
              placeholder="Kurze Beschreibung..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Verantwortlicher (Inhaber)</Label>
              <Input
                value={form.owner_name}
                onChange={(e) => update("owner_name", e.target.value)}
                placeholder="Name des Verantwortlichen"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Position/Funktion</Label>
              <Input
                value={form.owner_position}
                onChange={(e) => update("owner_position", e.target.value)}
                placeholder="z.B. Fraktionsvorsitzender"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-slate-500">Mitglieder und Funktionen</Label>
              <Button type="button" size="sm" variant="outline" onClick={addMember}>
                <Plus className="w-3 h-3 mr-1" /> Mitglied hinzufügen
              </Button>
            </div>
            {form.members && form.members.length > 0 && (
              <div className="space-y-2">
                {form.members.map((member, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 p-2 bg-slate-50 rounded border">
                    <Input
                      value={member.name}
                      onChange={(e) => updateMember(index, "name", e.target.value)}
                      placeholder="Name"
                      className="text-xs"
                    />
                    <Select
                      value={member.role}
                      onValueChange={(v) => updateMember(index, "role", v)}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMember(index)}
                      className="h-8 w-8 text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
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