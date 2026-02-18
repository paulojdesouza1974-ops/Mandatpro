import React, { useState, useEffect } from "react";
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
import { Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function SupportTicketDialog({
  open,
  onOpenChange,
  ticket,
  onSave,
  onDelete,
  isSaving,
}) {
  const [formData, setFormData] = useState({
    organization_name: "",
    contact_email: "",
    subject: "",
    description: "",
    category: "technisch",
    priority: "mittel",
    status: "offen",
    notes: "",
    resolution: "",
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => base44.entities.Organization.list(),
  });

  useEffect(() => {
    if (ticket) {
      setFormData(ticket);
    } else {
      setFormData({
        organization_name: "",
        contact_email: "",
        subject: "",
        description: "",
        category: "technisch",
        priority: "mittel",
        status: "offen",
        notes: "",
        resolution: "",
      });
    }
  }, [ticket, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                <SelectTrigger>
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
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="category">Kategorie</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
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
              <Label htmlFor="priority">Priorität</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
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
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
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
          </div>

          <div>
            <Label htmlFor="notes">Interne Notizen</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Nur für dich sichtbar..."
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
            />
          </div>

          <DialogFooter className="gap-2">
            {ticket && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => onDelete(ticket.id)}
                className="mr-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Löschen
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}