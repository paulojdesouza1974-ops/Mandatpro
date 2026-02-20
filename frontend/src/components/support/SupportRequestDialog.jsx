
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function SupportRequestDialog({ open, onOpenChange, organization, contactEmail, onSuccess }) {
  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    category: "technisch",
    priority: "mittel",
    attachments: [],
  });
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await base44.files.upload(file);
      setFormData((prev) => ({
        ...prev,
        attachments: [
          ...(prev.attachments || []),
          { file_url: result.file_url, file_name: result.file_name },
        ],
      }));
    } catch (error) {
      console.error(error);
      alert("Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, idx) => idx !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject || !formData.description) {
      alert("Bitte Betreff und Beschreibung ausfüllen.");
      return;
    }

    const payload = {
      organization_name: organization,
      contact_email: contactEmail,
      subject: formData.subject,
      description: formData.description,
      category: formData.category,
      priority: formData.priority,
      status: "offen",
      assigned_to: "",
      attachments: formData.attachments,
      notes: "",
      resolution: "",
    };

    await base44.entities.SupportTicket.create(payload);
    onSuccess?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl" data-testid="support-request-dialog">
        <DialogHeader>
          <DialogTitle>Support-Anfrage senden</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Betreff *</Label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              data-testid="support-request-subject"
            />
          </div>
          <div>
            <Label>Beschreibung *</Label>
            <Textarea
              value={formData.description}
              rows={5}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              data-testid="support-request-description"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Kategorie</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger data-testid="support-request-category-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technisch">Technisch</SelectItem>
                  <SelectItem value="abrechnung">Abrechnung</SelectItem>
                  <SelectItem value="feature_anfrage">Feature-Anfrage</SelectItem>
                  <SelectItem value="sonstiges">Sonstiges</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priorität</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger data-testid="support-request-priority-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="niedrig">Niedrig</SelectItem>
                  <SelectItem value="mittel">Mittel</SelectItem>
                  <SelectItem value="hoch">Hoch</SelectItem>
                  <SelectItem value="dringend">Dringend</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Anhänge</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("support-request-attachments").click()}
                disabled={uploading}
                data-testid="support-request-upload-button"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? "Lädt..." : "Datei hochladen"}
              </Button>
              <input
                id="support-request-attachments"
                type="file"
                className="hidden"
                onChange={handleUpload}
                data-testid="support-request-attachments-input"
              />
            </div>
            {formData.attachments?.length > 0 && (
              <div className="mt-2 space-y-2">
                {formData.attachments.map((file, idx) => (
                  <div
                    key={file.file_url}
                    className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 text-sm"
                    data-testid={`support-request-attachment-${idx}`}
                  >
                    <span>{file.file_name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="text-slate-400 hover:text-slate-600"
                      data-testid={`support-request-attachment-remove-${idx}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="support-request-cancel">
              Abbrechen
            </Button>
            <Button type="submit" data-testid="support-request-submit">Senden</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
