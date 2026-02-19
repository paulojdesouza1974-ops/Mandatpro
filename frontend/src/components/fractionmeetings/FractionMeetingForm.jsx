import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

const statusOptions = [
  { value: "geplant", label: "Geplant" },
  { value: "einladung_versendet", label: "Einladung versendet" },
  { value: "abgeschlossen", label: "Abgeschlossen" },
  { value: "abgesagt", label: "Abgesagt" },
];

export default function FractionMeetingForm({ meeting, onSave, onClose, saving }) {
  const [formData, setFormData] = useState(meeting || {
    title: "",
    date: "",
    location: "",
    agenda: "",
    invitation_text: "",
    protocol: "",
    attendees: [],
    status: "geplant",
  });
  const [attendeeInput, setAttendeeInput] = useState("");
  const [generatingInvitation, setGeneratingInvitation] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: orgUsers = [] } = useQuery({
    queryKey: ["orgUsers", currentUser?.organization],
    queryFn: () => base44.entities.User.filter({ organization: currentUser.organization }),
    enabled: !!currentUser?.organization,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['fractionMeetingTemplates', currentUser?.organization],
    queryFn: () => base44.entities.FractionMeetingTemplate.filter(
      { organization: currentUser?.organization },
      '-updated_date'
    ),
    enabled: !!currentUser?.organization,
  });

  const { data: appSettings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  // Automatisch Teilnehmer aus Organisation laden (nur bei neuen Meetings)
  useEffect(() => {
    if (!meeting && orgUsers.length > 0 && formData.attendees.length === 0) {
      const emails = orgUsers.map(user => user.email).filter(Boolean);
      setFormData(prev => ({ ...prev, attendees: emails }));
    }
  }, [orgUsers, meeting, formData.attendees.length]);

  const update = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
      const prompt = `Erstelle eine professionelle Einladung für eine Fraktionssitzung mit folgenden Details:

Titel: ${formData.title}
Datum: ${formData.date}
Ort: ${formData.location}
Tagesordnung:
${formData.agenda}

Die Einladung soll förmlich und professionell sein, aber auch freundlich. Füge eine passende Anrede und Grußformel hinzu.`;

      const response = await base44.ai.generateInvitation(prompt);

      update('invitation_text', response.content || "");
    } catch (error) {
      console.error('Fehler beim Generieren:', error);
      alert('Fehler beim Generieren der Einladung');
    } finally {
      setGeneratingInvitation(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="fraction-meeting-dialog">
        <DialogHeader>
          <DialogTitle>
            {meeting ? "Fraktionssitzung bearbeiten" : "Neue Fraktionssitzung"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Titel *</Label>
            <Input
              value={formData.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Fraktionssitzung März 2024"
              data-testid="fraction-meeting-title-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Datum und Uhrzeit *</Label>
              <Input
                type="datetime-local"
                value={formData.date ? formData.date.slice(0, 16) : ""}
                onChange={(e) => update("date", e.target.value ? new Date(e.target.value).toISOString() : "")}
                data-testid="fraction-meeting-date-input"
              />
            </div>
            <div>
              <Label>Ort</Label>
              <Select value={formData.location || ""} onValueChange={(v) => update("location", v)}>
                <SelectTrigger data-testid="fraction-meeting-location-trigger">
                  <SelectValue placeholder="Ort wählen oder eingeben..." />
                </SelectTrigger>
                <SelectContent>
                  {appSettings[0]?.app_owner_address && (
                    <SelectItem value={appSettings[0].app_owner_address}>
                      📍 Rathaus: {appSettings[0].app_owner_address}
                    </SelectItem>
                  )}
                  {templates.map(template => 
                    template.fraction_address && (
                      <SelectItem key={template.id} value={template.fraction_address}>
                        🏛️ {template.name}: {template.fraction_address}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(v) => update("status", v)}>
              <SelectTrigger data-testid="fraction-meeting-status-trigger">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tagesordnung</Label>
            <Textarea
              value={formData.agenda}
              onChange={(e) => update("agenda", e.target.value)}
              placeholder="1. Begrüßung&#10;2. Protokoll der letzten Sitzung&#10;3. ..."
              rows={5}
              data-testid="fraction-meeting-agenda-textarea"
            />
          </div>

          <div>
            <Label className="flex items-center justify-between">
              <span>Einladungstext</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={generateInvitation}
                disabled={!formData.title || !formData.agenda || generatingInvitation}
                data-testid="fraction-meeting-generate-invitation-button"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                {generatingInvitation ? "Generiere..." : "Mit KI generieren"}
              </Button>
            </Label>
            <Textarea
              value={formData.invitation_text}
              onChange={(e) => update("invitation_text", e.target.value)}
              placeholder="Einladungstext für E-Mail..."
              rows={8}
              data-testid="fraction-meeting-invitation-textarea"
            />
          </div>

          <div>
            <Label>Teilnehmer (E-Mail-Adressen)</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={attendeeInput}
                onChange={(e) => setAttendeeInput(e.target.value)}
                placeholder="name@example.com"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAttendee())}
                data-testid="fraction-meeting-attendee-input"
              />
              <Button type="button" onClick={addAttendee} data-testid="fraction-meeting-add-attendee-button">Hinzufügen</Button>
            </div>
            {formData.attendees && formData.attendees.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.attendees.map((email, idx) => (
                  <div key={idx} className="bg-slate-100 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    {email}
                    <button
                      type="button"
                      onClick={() => removeAttendee(email)}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              <X className="w-4 h-4 mr-2" />
              Abbrechen
            </Button>
            <Button
              onClick={() => onSave(formData)}
              disabled={!formData.title || !formData.date || saving}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Wird gespeichert..." : "Speichern"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}