import React, { useState } from "react";
import { base44 } from "@/api/apiClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

export default function FractionMeetingTemplateForm({ template, onClose, organization }) {
  const [formData, setFormData] = useState(template || {
    name: "",
    logo_url: "",
    fraction_name: "",
    fraction_subtitle: "",
    fraction_address: "",
    header_text: "",
    footer_text: "",
    primary_color: "#1e293b",
    secondary_color: "#64748b",
    font_family: "Arial",
    is_default: false,
  });

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const templateData = {
        ...data,
        organization,
      };
      if (template?.id) {
        return base44.entities.FractionMeetingTemplate.update(template.id, templateData);
      }
      return base44.entities.FractionMeetingTemplate.create(templateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fractionMeetingTemplates', organization] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const update = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{template ? 'Vorlage bearbeiten' : 'Neue Vorlage'}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <Label>Vorlagenname</Label>
            <Input
              value={formData.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="z.B. Standardvorlage 2024"
              required
            />
          </div>

          {/* Logo */}
          <div>
            <Label>Logo-URL</Label>
            <Input
              value={formData.logo_url}
              onChange={(e) => update('logo_url', e.target.value)}
              placeholder="https://..."
              type="url"
            />
            {formData.logo_url && (
              <img src={formData.logo_url} alt="Preview" className="mt-2 h-16 object-contain" />
            )}
          </div>

          {/* Fraktionsinformationen */}
          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4">Fraktionsinformationen</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fraktionsname</Label>
                <Input
                  value={formData.fraction_name}
                  onChange={(e) => update('fraction_name', e.target.value)}
                  placeholder="z.B. Grüne Fraktion"
                />
              </div>
              <div>
                <Label>Untertitel</Label>
                <Input
                  value={formData.fraction_subtitle}
                  onChange={(e) => update('fraction_subtitle', e.target.value)}
                  placeholder="z.B. im Stadtrat München"
                />
              </div>
            </div>
            <div className="mt-4">
              <Label>Adresse</Label>
              <Textarea
                value={formData.fraction_address}
                onChange={(e) => update('fraction_address', e.target.value)}
                placeholder="Straße, PLZ Ort"
                rows={3}
              />
            </div>
          </div>

          {/* Kopf- und Fußzeile */}
          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4">Kopf- und Fußzeile</h3>
            <div className="space-y-4">
              <div>
                <Label>Kopfzeilen-Text</Label>
                <Textarea
                  value={formData.header_text}
                  onChange={(e) => update('header_text', e.target.value)}
                  placeholder="Optionaler Text in der Kopfzeile"
                  rows={2}
                />
              </div>
              <div>
                <Label>Fußzeilen-Text</Label>
                <Textarea
                  value={formData.footer_text}
                  onChange={(e) => update('footer_text', e.target.value)}
                  placeholder="z.B. Kontaktinformationen, Website, etc."
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Design */}
          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4">Design</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Primärfarbe</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => update('primary_color', e.target.value)}
                    className="w-12 h-9 rounded cursor-pointer"
                  />
                  <Input
                    value={formData.primary_color}
                    onChange={(e) => update('primary_color', e.target.value)}
                    placeholder="#000000"
                  />
                </div>
              </div>
              <div>
                <Label>Sekundärfarbe</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.secondary_color}
                    onChange={(e) => update('secondary_color', e.target.value)}
                    className="w-12 h-9 rounded cursor-pointer"
                  />
                  <Input
                    value={formData.secondary_color}
                    onChange={(e) => update('secondary_color', e.target.value)}
                    placeholder="#000000"
                  />
                </div>
              </div>
              <div>
                <Label>Schriftart</Label>
                <Select value={formData.font_family} onValueChange={(value) => update('font_family', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Arial">Arial</SelectItem>
                    <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                    <SelectItem value="Calibri">Calibri</SelectItem>
                    <SelectItem value="Georgia">Georgia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Standard-Vorlage */}
          <div className="border-t pt-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_default}
                onChange={(e) => update('is_default', e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-medium">Dies ist die Standard-Vorlage</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} type="button">
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending || !formData.name}
              className="bg-primary hover:bg-primary/90"
            >
              {saveMutation.isPending ? 'Speichert...' : 'Speichern'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}