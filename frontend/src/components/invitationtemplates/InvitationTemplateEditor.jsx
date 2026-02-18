import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, X, Code } from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const AVAILABLE_PLACEHOLDERS = [
  { key: "{meeting_title}", label: "Sitzungstitel" },
  { key: "{meeting_date}", label: "Datum" },
  { key: "{meeting_time}", label: "Uhrzeit" },
  { key: "{meeting_location}", label: "Ort" },
  { key: "{meeting_agenda}", label: "Tagesordnung" },
  { key: "{organization_name}", label: "Organisationsname" },
];

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote"],
    ["link"],
  ],
};

export default function InvitationTemplateEditor({ template, onSave, onClose }) {
  const [formData, setFormData] = useState(template || {
    name: "",
    greeting: "",
    introduction: "",
    date_location_intro: "",
    agenda_intro: "",
    closing: "",
    signature: "",
    is_default: false,
  });
  const [activeTab, setActiveTab] = useState("editor");

  const update = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const insertPlaceholder = (placeholder, field) => {
    const currentValue = formData[field] || "";
    update(field, currentValue + (currentValue ? "\n" : "") + placeholder);
  };

  const renderPreview = () => {
    let preview = "";
    if (formData.greeting) preview += `${formData.greeting}\n\n`;
    if (formData.introduction) preview += `${formData.introduction}\n\n`;
    if (formData.date_location_intro) preview += `${formData.date_location_intro}\n`;
    
    // Sample data for preview
    preview += `${"{meeting_title}"}\n`;
    preview += `${"{meeting_date}"}, ${"{meeting_time}"} Uhr\n`;
    preview += `${"{meeting_location}"}\n\n`;
    
    if (formData.agenda_intro) preview += `${formData.agenda_intro}\n`;
    preview += `${"{meeting_agenda}"}\n\n`;
    
    if (formData.closing) preview += `${formData.closing}\n\n`;
    if (formData.signature) preview += `${formData.signature}`;
    
    return preview;
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? "Einladungsvorlage bearbeiten" : "Neue Einladungsvorlage"}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="preview">Vorschau</TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="space-y-4">
            <div>
              <Label>Vorlagenname *</Label>
              <Input
                value={formData.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="z.B. Formale Einladung, Kurzform, etc."
              />
            </div>

            <div className="space-y-4 border-t pt-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Anrede / Begrüßung</Label>
                  <div className="flex gap-1 flex-wrap">
                    {AVAILABLE_PLACEHOLDERS.map(p => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => insertPlaceholder(p.key, "greeting")}
                        className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded"
                        title={p.label}
                      >
                        <Code className="w-3 h-3 inline mr-1" />
                        {p.key}
                      </button>
                    ))}
                  </div>
                </div>
                <Textarea
                  value={formData.greeting}
                  onChange={(e) => update("greeting", e.target.value)}
                  placeholder="z.B. Sehr geehrte Damen und Herren,"
                  rows={2}
                />
              </div>

              <div>
                <Label>Einleitungstext</Label>
                <Textarea
                  value={formData.introduction}
                  onChange={(e) => update("introduction", e.target.value)}
                  placeholder="Willkommenstext und Kontext der Sitzung..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Text vor Datum/Ort</Label>
                <Textarea
                  value={formData.date_location_intro}
                  onChange={(e) => update("date_location_intro", e.target.value)}
                  placeholder="z.B. Hiermit laden wir Sie ein zur"
                  rows={2}
                />
              </div>

              <div>
                <Label>Text vor Tagesordnung</Label>
                <Textarea
                  value={formData.agenda_intro}
                  onChange={(e) => update("agenda_intro", e.target.value)}
                  placeholder="z.B. Folgende Punkte stehen auf der Tagesordnung:"
                  rows={2}
                />
              </div>

              <div>
                <Label>Abschlusssatz</Label>
                <Textarea
                  value={formData.closing}
                  onChange={(e) => update("closing", e.target.value)}
                  placeholder="z.B. Mit freundlichen Grüßen"
                  rows={2}
                />
              </div>

              <div>
                <Label>Signatur / Unterschriftblock</Label>
                <Textarea
                  value={formData.signature}
                  onChange={(e) => update("signature", e.target.value)}
                  placeholder="Unterschriftblock mit Namen, Position, etc."
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2 border-t pt-3">
                <input
                  type="checkbox"
                  id="default"
                  checked={formData.is_default}
                  onChange={(e) => update("is_default", e.target.checked)}
                  className="w-4 h-4"
                />
                <Label htmlFor="default" className="m-0">Als Standard-Vorlage festlegen</Label>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 min-h-96 whitespace-pre-wrap font-serif text-sm leading-relaxed">
              {renderPreview() || "Vorlage wird hier angezeigt..."}
            </div>
            <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm">
              <p className="font-semibold text-blue-900 mb-2">Verfügbare Platzhalter:</p>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_PLACEHOLDERS.map(p => (
                  <div key={p.key} className="text-blue-800">
                    <code className="bg-white px-2 py-1 rounded text-xs">{p.key}</code>
                    <span className="text-xs ml-1">→ {p.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Abbrechen
          </Button>
          <Button
            onClick={() => onSave(formData)}
            disabled={!formData.name}
          >
            <Save className="w-4 h-4 mr-2" />
            Speichern
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}