import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, Upload, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

const categoryOptions = [
  { value: "antrag", label: "Antrag" },
  { value: "beschluss", label: "Beschluss" },
  { value: "bericht", label: "Bericht" },
  { value: "protokoll", label: "Protokoll" },
  { value: "praesentation", label: "Präsentation" },
  { value: "sonstiges", label: "Sonstiges" },
];

const visibilityOptions = [
  { value: "intern", label: "Intern" },
  { value: "oeffentlich", label: "Öffentlich" },
];

export default function DocumentForm({ document, onSave, onClose, saving }) {
  const [formData, setFormData] = useState(document || {
    title: "",
    description: "",
    category: "sonstiges",
    file_url: "",
    file_name: "",
    file_size: 0,
    fraction_meeting_id: "",
    tags: [],
    visibility: "intern",
  });
  const [tagInput, setTagInput] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ["fractionMeetings", currentUser?.organization],
    queryFn: () => base44.entities.FractionMeeting.filter({ organization: currentUser.organization }, '-date'),
    enabled: !!currentUser?.organization,
  });

  const update = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.files.upload(file);
      update("file_url", file_url);
      update("file_name", file.name);
      update("file_size", file.size);
      if (!formData.title) {
        update("title", file.name);
      }
    } catch (error) {
      console.error('Upload-Fehler:', error);
      alert('Fehler beim Hochladen der Datei');
    } finally {
      setUploading(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim()) {
      update('tags', [...(formData.tags || []), tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tag) => {
    update('tags', formData.tags.filter(t => t !== tag));
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {document ? "Dokument bearbeiten" : "Neues Dokument"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Datei hochladen *</Label>
            <div className="mt-2">
              {formData.file_url ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900">{formData.file_name}</p>
                    <p className="text-xs text-green-600">
                      {(formData.file_size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      update("file_url", "");
                      update("file_name", "");
                      update("file_size", 0);
                    }}
                    data-testid="document-remove-file-button"
                  >
                    Entfernen
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-50">
                  {uploading ? (
                    <>
                      <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                      <span className="text-sm text-slate-600">Wird hochgeladen...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-400" />
                      <span className="text-sm text-slate-600">Datei auswählen oder hierher ziehen</span>
                    </>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    data-testid="document-file-input"
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <Label>Titel *</Label>
            <Input
              value={formData.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Dokument-Titel"
              data-testid="document-title-input"
            />
          </div>

          <div>
            <Label>Beschreibung</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Kurze Beschreibung des Dokuments"
              rows={3}
              data-testid="document-description-textarea"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Kategorie *</Label>
              <Select value={formData.category} onValueChange={(v) => update("category", v)}>
                <SelectTrigger data-testid="document-category-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sichtbarkeit</Label>
              <Select value={formData.visibility} onValueChange={(v) => update("visibility", v)}>
                <SelectTrigger data-testid="document-visibility-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {visibilityOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Verknüpfte Fraktionssitzung (optional)</Label>
            <Select
              value={formData.fraction_meeting_id}
              onValueChange={(v) => update("fraction_meeting_id", v === "none" ? "" : v)}
            >
              <SelectTrigger data-testid="document-meeting-trigger">
                <SelectValue placeholder="Keine Verknüpfung" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Keine Verknüpfung</SelectItem>
                {meetings.map(meeting => (
                  <SelectItem key={meeting.id} value={meeting.id}>
                    {meeting.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Schlagwörter</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Schlagwort hinzufügen"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                data-testid="document-tag-input"
              />
              <Button type="button" onClick={addTag} data-testid="document-add-tag-button">Hinzufügen</Button>
            </div>
            {formData.tags && formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, idx) => (
                  <div key={idx} className="bg-slate-100 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-slate-500 hover:text-slate-700"
                      data-testid={`document-tag-remove-${idx}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={saving || uploading} data-testid="document-cancel-button">
              <X className="w-4 h-4 mr-2" />
              Abbrechen
            </Button>
            <Button
              onClick={() => onSave({ ...formData, upload_date: formData.upload_date || new Date().toISOString() })}
              disabled={!formData.title || !formData.file_url || saving || uploading}
              data-testid="document-save-button"
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