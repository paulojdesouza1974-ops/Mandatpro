import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, Sparkles } from "lucide-react";
import { base44 } from "@/api/apiClient";
import { useQuery } from "@tanstack/react-query";
import AgendaEditor from "./AgendaEditor";

const DEFAULT_TOPS = [
  { title: "Begrüßung", type: "fixed_start" },
  { title: "Eröffnung der Sitzung", type: "fixed_start" },
  { title: "Wahl der Versammlungsleitung", type: "fixed_start" },
  { title: "Wahl des Protokollführers", type: "fixed_start" },
  { title: "Feststellung der Beschlussfähigkeit", type: "fixed_start" },
  { title: "Genehmigung des Protokolls", type: "fixed_start" },
  { title: "Verschiedenes", type: "fixed_end" },
  { title: "Nächster Sitzungstermin", type: "fixed_end" },
  { title: "Schließung der Sitzung", type: "fixed_end" },
];

const statusOptions = [
  { value: "geplant", label: "Geplant" },
  { value: "einladung_versendet", label: "Einladung versendet" },
  { value: "abgeschlossen", label: "Abgeschlossen" },
  { value: "abgesagt", label: "Abgesagt" },
];

export default function FractionMeetingFormNew({ meeting, onSave, onClose, saving, currentUser }) {
  const [formData, setFormData] = useState(meeting || {
    title: "",
    date: "",
    location: "",
    agenda_items: DEFAULT_TOPS,
    invitation_text: "",
    protocol: "",
    attendees: [],
    status: "geplant",
  });
  const [attendeeInput, setAttendeeInput] = useState("");
  const [generatingInvitation, setGeneratingInvitation] = useState(false);

  const { data: orgUsers = [] } = useQuery({
    queryKey: ["orgUsers", currentUser?.organization],
    queryFn: () => base44.entities.User.filter({ organization: currentUser.organization }),
    enabled: !!currentUser?.organization,
  });

  const { data: appSettings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  useEffect(() => {
    if (!meeting && orgUsers.length > 0 && formData.attendees.length === 0) {
      const emails = orgUsers.map(u => u.email).filter(Boolean);
      setFormData(prev => ({ ...prev, attendees: emails }));
    }
  }, [orgUsers, meeting]);

  const update = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const addAttendee = () => {
    if (attendeeInput && attendeeInput.includes('@')) {
      update('attendees', [...(formData.attendees || []), attendeeInput]);
      setAttendeeInput("");
    }
  };

  const removeAttendee = (email) => {
    update('attendees', formData.attendees.filter(e => e !== email));
  };

  const generateInvitation = async () => {
    setGeneratingInvitation(true);
    try {
      const items = formData.agenda_items || [];
      const fixedStart = items.filter(i => i.type === "fixed_start" || i.type === "fixed");
      const fixedEnd   = items.filter(i => i.type === "fixed_end");
      const middle     = items.filter(i => i.type !== "fixed_start" && i.type !== "fixed_end" && i.type !== "fixed");

      let topCounter = 0;
      const formatLabel = (type, idx) => {
        if (type === "fixed_start" || type === "fixed") return `TOP ${++topCounter}`;
        if (type !== "fixed_end") {
          if (idx === 0) { topCounter++; return `TOP ${topCounter}`; }
          return `  ${fixedStart.length + 1}.${idx}`;
        }
        return `TOP ${++topCounter}`;
      };

      const agendaLines = [
        ...fixedStart.map((item, i) => `TOP ${i + 1}: ${item.title}`),
        ...middle.map((item, i) => {
          if (i === 0) return `TOP ${fixedStart.length + 1}: ${item.title}`;
          return `  ${fixedStart.length + 1}.${i}: ${item.title}`;
        }),
        ...fixedEnd.map((item, i) => `TOP ${fixedStart.length + (middle.length > 0 ? 2 : 1) + i}: ${item.title}`),
      ];

      const agendaText = agendaLines.join('\n');

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Erstelle eine vollständige, professionelle Einladung für eine Fraktionssitzung.

Titel: ${formData.title}
Datum: ${formData.date ? new Date(formData.date).toLocaleString('de-DE') : ''}
Ort: ${formData.location || ''}

Der Einladungstext soll folgendes VOLLSTÄNDIG enthalten:
1. Förmliche Anrede und Einleitung
2. Die vollständige Tagesordnung mit allen TOPs (genau so wie unten angegeben, keine Änderungen):
${agendaText}
3. Abschließende Grußformel

Wichtig: Die Tagesordnung soll DIREKT im Einladungstext integriert sein, nicht separat. Kein separater "Tagesordnung:"-Block nötig, sondern fließend im Text.`,
      });

      update('invitation_text', response);
    } catch (error) {
      console.error(error);
    } finally {
      setGeneratingInvitation(false);
    }
  };

  // Build agenda text from items for backward compat
  const handleSave = () => {
    const agendaText = (formData.agenda_items || [])
      .map((item, i) => `TOP ${i + 1}: ${item.title}`)
      .join('\n');
    onSave({ ...formData, agenda: agendaText });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{meeting ? "Fraktionssitzung bearbeiten" : "Neue Fraktionssitzung"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <Label>Titel *</Label>
            <Input
              value={formData.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Fraktionssitzung März 2026"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Datum und Uhrzeit *</Label>
              <Input
                type="datetime-local"
                value={formData.date ? formData.date.slice(0, 16) : ""}
                onChange={(e) => update("date", e.target.value ? new Date(e.target.value).toISOString() : "")}
              />
            </div>
            <div>
              <Label>Ort</Label>
              <Input
                value={formData.location || ""}
                onChange={(e) => update("location", e.target.value)}
                placeholder="Rathaus, Sitzungssaal..."
              />
            </div>
          </div>

          <div>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(v) => update("status", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tagesordnung / TOPs */}
          <div className="border rounded-xl p-4 bg-slate-50">
            <AgendaEditor
              items={formData.agenda_items || []}
              onChange={(items) => update("agenda_items", items)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Einladungstext</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={generateInvitation}
                disabled={!formData.title || generatingInvitation}
              >
                <Sparkles className="w-3 h-3 mr-1" />
                {generatingInvitation ? "Generiere..." : "Mit KI generieren"}
              </Button>
            </div>
            <Textarea
              value={formData.invitation_text}
              onChange={(e) => update("invitation_text", e.target.value)}
              placeholder="Einladungstext für E-Mail..."
              rows={6}
            />
          </div>

          <div>
            <Label>Teilnehmer</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={attendeeInput}
                onChange={(e) => setAttendeeInput(e.target.value)}
                placeholder="name@example.com"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAttendee())}
              />
              <Button type="button" onClick={addAttendee} variant="outline">Hinzufügen</Button>
            </div>
            {formData.attendees?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.attendees.map((email, idx) => (
                  <div key={idx} className="bg-slate-100 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    {email}
                    <button type="button" onClick={() => removeAttendee(email)} className="text-slate-400 hover:text-slate-600">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              <X className="w-4 h-4 mr-2" /> Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={!formData.title || !formData.date || saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Wird gespeichert..." : "Speichern"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}