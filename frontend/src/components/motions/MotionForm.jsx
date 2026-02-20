import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Save, X, Sparkles, Loader2, Upload, File, Trash2, FileText } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

const types = [
  { value: "antrag", label: "Antrag" },
  { value: "anfrage", label: "Anfrage" },
  { value: "beschluss", label: "Beschluss" },
  { value: "resolution", label: "Resolution" },
  { value: "aenderungsantrag", label: "Änderungsantrag" },
  { value: "dringlichkeitsantrag", label: "Dringlichkeitsantrag" },
];

const statuses = [
  { value: "entwurf", label: "Entwurf" },
  { value: "eingereicht", label: "Eingereicht" },
  { value: "in_beratung", label: "In Beratung" },
  { value: "angenommen", label: "Angenommen" },
  { value: "abgelehnt", label: "Abgelehnt" },
  { value: "zurueckgezogen", label: "Zurückgezogen" },
];

const priorities = [
  { value: "niedrig", label: "Niedrig" },
  { value: "mittel", label: "Mittel" },
  { value: "hoch", label: "Hoch" },
  { value: "dringend", label: "Dringend" },
];

const signatureRoles = [
  { value: "fraktionsvorsitzender", label: "Fraktionsvorsitzender" },
  { value: "stv_fraktionsvorsitzender", label: "Stv. Fraktionsvorsitzender" },
  { value: "fraktionsgeschaeftsfuehrer", label: "Fraktionsgeschäftsführer" },
  { value: "ratsmitglied", label: "Ratsmitglied" },
  { value: "sachkundiger_buerger", label: "Sachkundiger Bürger" },
];

const emptyMotion = {
  title: "", type: "antrag", status: "entwurf", body: "",
  committee: "", session_date: "", submitted_date: "",
  priority: "mittel", signature_role: "", signature_name: "", signature_role_2: "", signature_name_2: "", tags: [], notes: "", attachments: [],
};

export default function MotionForm({ open, onClose, motion, onSave, saving }) {
  const [form, setForm] = useState(emptyMotion);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [identifying, setIdentifying] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
    enabled: !!user,
  });

  const currentOrg = organizations.find(org => org.name === user?.organization);
  const members = currentOrg?.members || [];

  useEffect(() => {
    setForm(motion ? { ...emptyMotion, ...motion } : emptyMotion);
  }, [motion, open]);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // File upload not yet implemented - show message
      alert('Datei-Upload ist noch in Entwicklung. Bitte fügen Sie die Datei manuell als Anhang bei.');
    } catch (error) {
      console.error('Upload Fehler:', error);
      alert('Fehler beim Hochladen der Datei');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index) => {
    setForm((f) => ({
      ...f,
      attachments: f.attachments.filter((_, i) => i !== index),
    }));
  };

  const identifyDocument = async (attachment) => {
    setIdentifying(true);
    try {
      // Document analysis not yet implemented
      alert('Dokument-Analyse ist noch in Entwicklung.');
    } catch (error) {
      console.error('Analyse Fehler:', error);
      alert('Fehler beim Analysieren des Dokuments');
    } finally {
      setIdentifying(false);
    }
  };

  const generateWithAI = async () => {
    if (!form.title) return;
    setGenerating(true);
    const typeLabel = types.find((t) => t.value === form.type)?.label || form.type;
    const decisionLabel = form.type === "anfrage" ? "Fragestellung" : "Beschlussvorlage";
    const adminLine = form.type === "anfrage"
      ? "Die Verwaltung wird um eine schriftliche Beantwortung bis zur nächsten Sitzung gebeten."
      : "Die Verwaltung wird beauftragt, ein Konzept bis zur nächsten Sitzung des Rates vorzulegen, das Standorte, technische Umsetzung, Kosten sowie Pflege und Ersatz regelt. Dabei sind bestehende Beflaggungsvorschriften von Bund und Land zu beachten.";

    try {
      const prompt = `Formuliere einen kommunalpolitischen ${typeLabel} im Stil unserer Standardvorlage.

Struktur (bitte exakt mit Überschriften):
${typeLabel}: ${form.title}
${typeLabel}: [Kurzfassung in 6-10 Wörtern]

${decisionLabel}
[Konkreter Text, 2-4 Sätze]
${adminLine}

Begründung
[3-5 Absätze: Ausgangslage, Problem, Nutzen, ggf. rechtlicher Rahmen]

Beispiele aus anderen Kommunen
[1 Absatz mit 2-3 konkreten Städten/Landkreisen als Referenz]

WICHTIG:
- Keine Empfängeradresse, keine Grußformel, keine Unterschriften.
- Sachlich, formal, klar strukturiert.
- Absätze mit Leerzeile trennen.`;

      const res = await base44.ai.generateText(prompt, 'motion');
      if (res.success && res.content) {
        setForm((f) => ({ ...f, body: res.content }));
      } else {
        alert('Fehler bei der KI-Generierung');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      alert('Fehler bei der KI-Generierung: ' + error.message);
    }
    setGenerating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-slate-900">
            {motion ? "Antrag bearbeiten" : "Neuer Antrag / Anfrage"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Titel *</Label>
            <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="z.B. Sanierung der Radwege im Ortsteil Nord" required />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Art *</Label>
              <Select value={form.type} onValueChange={(v) => update("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {types.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
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
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Priorität</Label>
              <Select value={form.priority} onValueChange={(v) => update("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Ausschuss/Gremium</Label>
              <Input value={form.committee} onChange={(e) => update("committee", e.target.value)} placeholder="z.B. Bauausschuss" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Sitzungsdatum</Label>
              <Input type="date" value={form.session_date} onChange={(e) => update("session_date", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Unterschrift Position</Label>
              <Select value={form.signature_role || ""} onValueChange={(v) => update("signature_role", v)}>
                <SelectTrigger><SelectValue placeholder="Position wählen..." /></SelectTrigger>
                <SelectContent>
                  {signatureRoles.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Name</Label>
              {members.length > 0 && form.signature_role ? (
                <Select 
                  value={form.signature_name || ""} 
                  onValueChange={(v) => update("signature_name", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Person wählen..." /></SelectTrigger>
                  <SelectContent>
                    {members
                      .filter(m => m.role === form.signature_role)
                      .map((m, idx) => (
                        <SelectItem key={idx} value={m.name}>{m.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input 
                  value={form.signature_name || ""} 
                  onChange={(e) => update("signature_name", e.target.value)} 
                  placeholder="Name eingeben..." 
                />
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-slate-500">Antragstext</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateWithAI}
                disabled={generating || !form.title}
                className="text-xs h-7 gap-1"
              >
                {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {generating ? "Generiert..." : "Mit KI generieren"}
              </Button>
            </div>
            <Textarea
              value={form.body}
              onChange={(e) => update("body", e.target.value)}
              rows={10}
              placeholder="Text des Antrags / der Anfrage..."
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Interne Notizen</Label>
            <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={2} placeholder="Notizen..." />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500">Anhänge</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={uploading}
                className="text-xs"
              >
                {uploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                {uploading ? "Lädt hoch..." : "Dokument hochladen"}
              </Button>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
              />
            </div>
            {form.attachments && form.attachments.length > 0 && (
              <div className="space-y-2 mt-2">
                {form.attachments.map((att, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <File className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <a
                        href={att.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-700 hover:text-slate-900 truncate"
                      >
                        {att.file_name}
                      </a>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => identifyDocument(att)}
                        disabled={identifying}
                        title="Dokument analysieren"
                      >
                        {identifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-600 hover:text-red-700"
                        onClick={() => removeAttachment(index)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
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