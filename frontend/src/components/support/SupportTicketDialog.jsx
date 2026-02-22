
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/apiClient";
import { useToast } from "@/hooks/use-toast";
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
import { Trash2, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

export default function SupportTicketDialog({
  open,
  onOpenChange,
  ticket,
  onSave,
  onDelete,
  isSaving,
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    organization_name: "",
    contact_email: "",
    subject: "",
    description: "",
    category: "technisch",
    priority: "mittel",
    status: "offen",
    assigned_to: "",
    notes: "",
    resolution: "",
    attachments: [],
  });
  const [uploading, setUploading] = useState(false);

  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => base44.entities.Organization.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["supportUsers"],
    queryFn: () => base44.entities.User.list(),
  });

  const supportUsers = users.filter((user) => ["support", "admin"].includes(user.role));

  useEffect(() => {
    if (ticket) {
      setFormData({
        organization_name: ticket.organization_name || "",
        contact_email: ticket.contact_email || "",
        subject: ticket.subject || "",
        description: ticket.description || "",
        category: ticket.category || "technisch",
        priority: ticket.priority || "mittel",
        status: ticket.status || "offen",
        assigned_to: ticket.assigned_to || "",
        notes: ticket.notes || "",
        resolution: ticket.resolution || "",
        attachments: ticket.attachments || [],
      });
    } else {
      setFormData({
        organization_name: "",
        contact_email: "",
        subject: "",
        description: "",
        category: "technisch",
        priority: "mittel",
        status: "offen",
        assigned_to: "",
        notes: "",
        resolution: "",
        attachments: [],
      });
    }
  }, [ticket, open]);

  useEffect(() => {
    if (supportUsers.length > 0 && !formData.assigned_to) {
      setFormData((prev) => ({ ...prev, assigned_to: supportUsers[0].email }));
    }
  }, [supportUsers]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const required = [
      formData.organization_name,
      formData.contact_email,
      formData.subject,
      formData.description,
      formData.category,
      formData.priority,
      formData.status,
      formData.assigned_to,
    ];
    if (required.some((value) => !value)) {
      toast({
        title: "Pflichtfelder fehlen",
        description: "Bitte alle Pflichtfelder ausfüllen.",
        variant: "destructive",
      });
      return;
    }
    onSave(formData);
  };

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="support-ticket-dialog">
        <DialogHeader>
          <DialogTitle>{ticket ? "Ticket bearbeiten" : "Neues Ticket erstellen"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="organization_name">Organisation *</Label>
              <Select
                value={formData.organization_name}
                onValueChange={(value) =>
                  setFormData({ ...formData, organization_name: value })
                }
              >
                <SelectTrigger data-testid="support-ticket-organization-trigger">
                  <SelectValue placeholder="Organisation wählen" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.name}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="contact_email">Kontakt E-Mail *</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) =>
                  setFormData({ ...formData, contact_email: e.target.value })
                }
                required
                data-testid="support-ticket-contact-email"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="subject">Betreff *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
              data-testid="support-ticket-subject"
            />
          </div>

          <div>
            <Label htmlFor="description">Beschreibung *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={4}
              required
              data-testid="support-ticket-description"
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label htmlFor="category">Kategorie *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger data-testid="support-ticket-category-trigger">
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
              <Label htmlFor="priority">Priorität *</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger data-testid="support-ticket-priority-trigger">
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

            <div>
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger data-testid="support-ticket-status-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="offen">Offen</SelectItem>
                  <SelectItem value="in_bearbeitung">In Bearbeitung</SelectItem>
                  <SelectItem value="warten_auf_antwort">Warten auf Antwort</SelectItem>
                  <SelectItem value="gelöst">Gelöst</SelectItem>
                  <SelectItem value="geschlossen">Geschlossen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="assigned_to">Zuweisung *</Label>
              <Select
                value={formData.assigned_to}
                onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
              >
                <SelectTrigger data-testid="support-ticket-assigned-trigger">
                  <SelectValue placeholder="Support wählen" />
                </SelectTrigger>
                <SelectContent>
                  {supportUsers.map((u) => (
                    <SelectItem key={u.id} value={u.email}>
                      {u.full_name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="attachments">Anhänge</Label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => document.getElementById("support-attachments").click()} disabled={uploading} data-testid="support-ticket-upload-button">
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? "Lädt..." : "Datei hochladen"}
              </Button>
              <input id="support-attachments" type="file" className="hidden" onChange={handleUpload} data-testid="support-ticket-attachments-input" />
            </div>
            {formData.attachments?.length > 0 && (
              <div className="mt-2 space-y-2">
                {formData.attachments.map((file, idx) => (
                  <div key={file.file_url} className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 text-sm" data-testid={`support-ticket-attachment-${idx}`}>
                    <span>{file.file_name}</span>
                    <button type="button" onClick={() => removeAttachment(idx)} className="text-slate-400 hover:text-slate-600" data-testid={`support-ticket-attachment-remove-${idx}`}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="notes">Interne Notizen</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Nur für dich sichtbar..."
              data-testid="support-ticket-notes"
            />
          </div>

          <div>
            <Label htmlFor="resolution">Lösung/Antwort</Label>
            <Textarea
              id="resolution"
              value={formData.resolution}
              onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
              rows={3}
              placeholder="Beschreibe die Lösung..."
              data-testid="support-ticket-resolution"
            />
          </div>

          <DialogFooter className="gap-2">
            {ticket && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => onDelete(ticket.id)}
                className="mr-auto"
                data-testid="support-ticket-delete-button"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Löschen
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="support-ticket-cancel-button">
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSaving} data-testid="support-ticket-save-button">
              {isSaving ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
