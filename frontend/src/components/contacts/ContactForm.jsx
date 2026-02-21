import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Save, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/apiClient";

const categories = [
  { value: "parteimitglied", label: "Parteimitglied" },
  { value: "buerger", label: "Bürger:in" },
  { value: "fraktionskollege", label: "Fraktionskollege" },
  { value: "verwaltung", label: "Verwaltung" },
  { value: "presse", label: "Presse" },
  { value: "verein", label: "Verein" },
  { value: "sonstige", label: "Sonstige" },
];

const statuses = [
  { value: "aktiv", label: "Aktiv" },
  { value: "inaktiv", label: "Inaktiv" },
  { value: "interessent", label: "Interessent" },
];

const emptyContact = {
  first_name: "", last_name: "", email: "", phone: "",
  category: "buerger", party: "", position: "", ward: "",
  street: "", postal_code: "", city: "",
  notes: "", status: "aktiv", tags: [],
  member_number: "", membership_fee: "", fee_paid: false,
  entry_date: "", exit_date: "", date_of_birth: "",
};

export default function ContactForm({ open, onClose, contact, onSave, saving }) {
  const [form, setForm] = useState(emptyContact);

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const isVerband = currentUser?.org_type === "verband";

  useEffect(() => {
    setForm(contact ? { ...emptyContact, ...contact } : emptyContact);
  }, [contact, open]);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-slate-900">
            {contact ? "Kontakt bearbeiten" : isVerband ? "Neues Mitglied" : "Neuer Kontakt"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="allgemein" className="w-full">
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="allgemein" className="flex-1">Allgemein</TabsTrigger>
              <TabsTrigger value="adresse" className="flex-1">Adresse</TabsTrigger>
              {isVerband && <TabsTrigger value="mitgliedschaft" className="flex-1">Mitgliedschaft</TabsTrigger>}
            </TabsList>

            {/* Tab: Allgemein */}
            <TabsContent value="allgemein" className="space-y-4">
              {isVerband && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500">Mitgliedsnummer</Label>
                  <Input value={form.member_number} onChange={(e) => update("member_number", e.target.value)} placeholder="z.B. M-0042" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500">Vorname</Label>
                  <Input value={form.first_name} onChange={(e) => update("first_name", e.target.value)} placeholder="Max" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500">Nachname *</Label>
                  <Input value={form.last_name} onChange={(e) => update("last_name", e.target.value)} placeholder="Mustermann" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500">E-Mail</Label>
                  <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="mail@beispiel.de" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500">Telefon</Label>
                  <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+49 ..." />
                </div>
              </div>
              {isVerband && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500">Geburtsdatum</Label>
                  <Input type="date" value={form.date_of_birth} onChange={(e) => update("date_of_birth", e.target.value)} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500">Kategorie *</Label>
                  <Select value={form.category} onValueChange={(v) => update("category", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500">Status</Label>
                  <Select value={form.status} onValueChange={(v) => update("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {!isVerband && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-500">Partei</Label>
                    <Input value={form.party} onChange={(e) => update("party", e.target.value)} placeholder="z.B. SPD, CDU..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-500">Position/Amt</Label>
                    <Input value={form.position} onChange={(e) => update("position", e.target.value)} placeholder="z.B. Stadtrat" />
                  </div>
                </div>
              )}
              {!isVerband && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500">Stadtteil/Ortsteil</Label>
                  <Input value={form.ward} onChange={(e) => update("ward", e.target.value)} placeholder="z.B. Altstadt" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500">Notizen</Label>
                <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3} placeholder="Freitext-Notizen..." />
              </div>
            </TabsContent>

            {/* Tab: Adresse */}
            <TabsContent value="adresse" className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500">Straße und Hausnummer</Label>
                <Input value={form.street} onChange={(e) => update("street", e.target.value)} placeholder="Musterstraße 1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500">Postleitzahl</Label>
                  <Input value={form.postal_code} onChange={(e) => update("postal_code", e.target.value)} placeholder="12345" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500">Stadt/Ort</Label>
                  <Input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Musterstadt" />
                </div>
              </div>
            </TabsContent>

            {/* Tab: Mitgliedschaft (nur Verband) */}
            {isVerband && (
              <TabsContent value="mitgliedschaft" className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-500">Eintrittsdatum</Label>
                    <Input type="date" value={form.entry_date} onChange={(e) => update("entry_date", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-500">Austrittsdatum</Label>
                    <Input type="date" value={form.exit_date} onChange={(e) => update("exit_date", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500">Jahresbeitrag (EUR)</Label>
                  <Input type="number" step="0.01" value={form.membership_fee} onChange={(e) => update("membership_fee", parseFloat(e.target.value) || "")} placeholder="z.B. 48.00" />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Beitrag bezahlt ({new Date().getFullYear()})</p>
                    <p className="text-xs text-slate-400">Jahresbeitrag wurde für das aktuelle Jahr entrichtet</p>
                  </div>
                  <Switch checked={!!form.fee_paid} onCheckedChange={(v) => update("fee_paid", v)} />
                </div>
              </TabsContent>
            )}
          </Tabs>

          <DialogFooter className="gap-2 mt-6">
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