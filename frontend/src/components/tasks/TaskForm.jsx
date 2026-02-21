import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Save, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/apiClient";

const emptyTask = {
  title: "",
  description: "",
  status: "offen",
  priority: "mittel",
  due_date: "",
  assigned_to: "",
  related_type: "keine",
  related_id: "",
  notes: "",
};

export default function TaskForm({ open, onClose, task, onSave, saving }) {
  const [form, setForm] = useState(emptyTask);

  const { data: allUsers = [] } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => base44.entities.User.list(),
    enabled: open,
  });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const teamMembers = allUsers.filter(u => u.organization === currentUser?.organization);

  useEffect(() => {
    setForm(task ? { ...emptyTask, ...task } : emptyTask);
  }, [task, open]);

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
            {task ? "Aufgabe bearbeiten" : "Neue Aufgabe"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Titel *</Label>
            <Input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="z.B. Kontakt mit Herrn Müller aufnehmen"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Status</Label>
              <Select value={form.status} onValueChange={(v) => update("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="offen">Offen</SelectItem>
                  <SelectItem value="in_bearbeitung">In Bearbeitung</SelectItem>
                  <SelectItem value="erledigt">Erledigt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Priorität</Label>
              <Select value={form.priority} onValueChange={(v) => update("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="niedrig">Niedrig</SelectItem>
                  <SelectItem value="mittel">Mittel</SelectItem>
                  <SelectItem value="hoch">Hoch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Fälligkeitsdatum</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => update("due_date", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Zugewiesen an</Label>
              <Select value={form.assigned_to} onValueChange={(v) => update("assigned_to", v)}>
                <SelectTrigger><SelectValue placeholder="Nicht zugewiesen" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Nicht zugewiesen</SelectItem>
                  {teamMembers.map((u) => (
                    <SelectItem key={u.id} value={u.email}>
                      {u.full_name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Beschreibung</Label>
            <Textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={3}
              placeholder="Details zur Aufgabe..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Verknüpfung</Label>
              <Select value={form.related_type} onValueChange={(v) => update("related_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="keine">Keine</SelectItem>
                  <SelectItem value="kontakt">Kontakt</SelectItem>
                  <SelectItem value="termin">Termin</SelectItem>
                  <SelectItem value="antrag">Antrag</SelectItem>
                  <SelectItem value="kommunikation">Kommunikation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.related_type !== "keine" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500">ID der Entität</Label>
                <Input
                  value={form.related_id}
                  onChange={(e) => update("related_id", e.target.value)}
                  placeholder="ID"
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Notizen</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={2}
              placeholder="Zusätzliche Informationen..."
            />
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