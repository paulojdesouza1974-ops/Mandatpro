import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Save, X, Sparkles, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

const meetingTypes = [
  { value: "gemeinderatssitzung", label: "Gemeinderatssitzung" },
  { value: "ausschusssitzung", label: "Ausschusssitzung" },
  { value: "fraktionssitzung", label: "Fraktionssitzung" },
  { value: "buergersprechstunde", label: "Bürgersprechstunde" },
  { value: "parteitreffen", label: "Parteitreffen" },
  { value: "sonstiges", label: "Sonstiges" },
];

const statusOptions = [
  { value: "geplant", label: "Geplant" },
  { value: "abgeschlossen", label: "Abgeschlossen" },
  { value: "abgesagt", label: "Abgesagt" },
];

const emptyMeeting = {
  title: "", type: "gemeinderatssitzung", date: "", end_date: "",
  location: "", agenda: "", minutes: "", status: "geplant",
};

export default function MeetingForm({ isOpen, open, onClose, meeting, defaultData, onSave, saving }) {
  const dialogOpen = isOpen ?? open;
  const [form, setForm] = useState(emptyMeeting);
  const [generating, setGenerating] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);

  useEffect(() => {
    if (defaultData) {
      // Convert Date object to datetime-local string format
      const dateStr = defaultData.date instanceof Date 
        ? defaultData.date.toISOString().slice(0, 16)
        : defaultData.date;
      setForm({ ...emptyMeeting, ...defaultData, date: dateStr });
    } else {
      setForm(meeting ? { ...emptyMeeting, ...meeting } : emptyMeeting);
    }
  }, [meeting, defaultData, dialogOpen]);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  const generateProtocol = async () => {
    if (!form.agenda) return;
    setGenerating(true);
    const response = await base44.ai.generateProtocol(`Du bist Protokollant einer kommunalpolitischen Sitzung in Deutschland.
      
Sitzung: ${form.title}
Datum: ${form.date ? new Date(form.date).toLocaleDateString('de-DE') : 'n/a'}
Ort: ${form.location || 'n/a'}

Tagesordnung:
${form.agenda}

Erstelle ein professionelles Sitzungsprotokoll im üblichen Format:
- Kopfbereich (Sitzung, Datum, Ort, Teilnehmer)
- Behandlung der einzelnen Tagesordnungspunkte
- Beschlüsse und Abstimmungsergebnisse (beispielhaft)
- Ende der Sitzung

Verwende formale Sprache, ca. 400-600 Wörter.`);
    setForm((f) => ({ ...f, minutes: response.content || "" }));
    setGenerating(false);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="meeting-dialog">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-slate-900">
            {meeting ? "Termin bearbeiten" : "Neuer Termin"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Titel *</Label>
            <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="z.B. Gemeinderatssitzung März" required data-testid="meeting-title-input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Art</Label>
              <Select value={form.type} onValueChange={(v) => update("type", v)}>
                <SelectTrigger data-testid="meeting-type-trigger"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {meetingTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Status</Label>
              <Select value={form.status} onValueChange={(v) => update("status", v)}>
                <SelectTrigger data-testid="meeting-status-trigger"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Start Datum & Uhrzeit *</Label>
              <Input type="datetime-local" value={form.date} onChange={(e) => update("date", e.target.value)} required data-testid="meeting-start-date-input" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Ende (optional)</Label>
              <Input type="datetime-local" value={form.end_date || ""} onChange={(e) => update("end_date", e.target.value)} data-testid="meeting-end-date-input" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Ort</Label>
            <Input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="z.B. Rathaus, Saal 1" data-testid="meeting-location-input" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Tagesordnung</Label>
            <Textarea value={form.agenda} onChange={(e) => update("agenda", e.target.value)} rows={4} placeholder="TOP 1: ..." data-testid="meeting-agenda-textarea" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-slate-500">Protokoll</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateProtocol}
                disabled={generating || !form.agenda}
                className="text-xs h-7 gap-1"
                data-testid="meeting-generate-protocol-button"
              >
                {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {generating ? "Generiert..." : "Mit KI generieren"}
              </Button>
            </div>
            <Textarea value={form.minutes} onChange={(e) => update("minutes", e.target.value)} rows={4} placeholder="Notizen zur Sitzung..." data-testid="meeting-minutes-textarea" />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving} data-testid="meeting-cancel-button">
              <X className="w-4 h-4 mr-1" /> Abbrechen
            </Button>
            <Button type="submit" disabled={saving} className="bg-slate-900 hover:bg-slate-800" data-testid="meeting-save-button">
              <Save className="w-4 h-4 mr-1" /> {saving ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}