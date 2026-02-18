import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, FileText, Save, X, Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PrintTemplatesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ['printTemplates'],
    queryFn: () => base44.entities.PrintTemplate.list(),
  });

  const saveMutation = useMutation({
    mutationFn: async (template) => {
      if (template.id) {
        return base44.entities.PrintTemplate.update(template.id, template);
      }
      return base44.entities.PrintTemplate.create(template);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printTemplates'] });
      setShowForm(false);
      setEditingTemplate(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PrintTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printTemplates'] });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (templateId) => {
      await Promise.all(
        templates.map(t => 
          base44.entities.PrintTemplate.update(t.id, { is_default: t.id === templateId })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printTemplates'] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Druckvorlagen</h1>
          <p className="text-slate-500 mt-1">Vorlagen für Anträge und Anfragen verwalten</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Neue Vorlage
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card key={template.id} className={template.is_default ? "ring-2 ring-blue-500" : ""}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {template.name}
                {template.is_default && (
                  <Star className="w-4 h-4 fill-blue-500 text-blue-500" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {template.description && (
                <p className="text-sm text-slate-600">{template.description}</p>
              )}
              {template.fraction_name && (
                <p className="text-xs text-slate-500">
                  <strong>Fraktion:</strong> {template.fraction_name}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingTemplate(template);
                    setShowForm(true);
                  }}
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Bearbeiten
                </Button>
                {!template.is_default && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDefaultMutation.mutate(template.id)}
                  >
                    <Star className="w-3 h-3 mr-1" />
                    Standard
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (confirm('Vorlage wirklich löschen?')) {
                      deleteMutation.mutate(template.id);
                    }
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showForm && (
        <TemplateForm
          template={editingTemplate}
          onSave={(data) => saveMutation.mutate(data)}
          onClose={() => {
            setShowForm(false);
            setEditingTemplate(null);
          }}
          saving={saveMutation.isPending}
        />
      )}
    </div>
  );
}

function TemplateForm({ template, onSave, onClose, saving }) {
  const [formData, setFormData] = useState(template || {
    name: "",
    description: "",
    logo_url: "",
    logo_position: "oben_links",
    fraction_name: "",
    fraction_address: "",
    fraction_position: "oben_rechts",
    show_motion_number: true,
    show_date: true,
    show_creator: true,
    date_position: "oben_rechts",
    header_text: "",
    footer_text: "",
    primary_color: "#1e293b",
    secondary_color: "#64748b",
    font_family: "Arial",
    custom_css: "",
    is_default: false,
  });

  const update = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? "Vorlage bearbeiten" : "Neue Vorlage erstellen"}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basis" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basis">Basis</TabsTrigger>
            <TabsTrigger value="layout">Layout</TabsTrigger>
            <TabsTrigger value="stil">Stil</TabsTrigger>
            <TabsTrigger value="erweitert">Erweitert</TabsTrigger>
          </TabsList>

          <TabsContent value="basis" className="space-y-4 mt-4">
            <div>
              <Label>Name der Vorlage *</Label>
              <Input
                value={formData.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Z.B. SPD Fraktion Stadtrat"
              />
            </div>

            <div>
              <Label>Beschreibung</Label>
              <Input
                value={formData.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Kurze Beschreibung"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fraktionsname</Label>
                <Input
                  value={formData.fraction_name}
                  onChange={(e) => update("fraction_name", e.target.value)}
                  placeholder="SPD-Fraktion im Stadtrat"
                />
              </div>
              <div>
                <Label>Fraktionsadresse</Label>
                <Textarea
                  value={formData.fraction_address}
                  onChange={(e) => update("fraction_address", e.target.value)}
                  placeholder="Rathausstraße 1&#10;12345 Musterstadt"
                  rows={2}
                />
              </div>
            </div>

            <div>
              <Label>Logo-URL</Label>
              <Input
                value={formData.logo_url}
                onChange={(e) => update("logo_url", e.target.value)}
                placeholder="https://example.com/logo.png"
              />
            </div>
          </TabsContent>

          <TabsContent value="layout" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Logo-Position</Label>
                <Select value={formData.logo_position} onValueChange={(v) => update("logo_position", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oben_links">Oben Links</SelectItem>
                    <SelectItem value="oben_mitte">Oben Mitte</SelectItem>
                    <SelectItem value="oben_rechts">Oben Rechts</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Fraktionsinfo-Position</Label>
                <Select value={formData.fraction_position} onValueChange={(v) => update("fraction_position", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oben_links">Oben Links</SelectItem>
                    <SelectItem value="oben_rechts">Oben Rechts</SelectItem>
                    <SelectItem value="unten_links">Unten Links</SelectItem>
                    <SelectItem value="unten_rechts">Unten Rechts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Datumsfeld-Position</Label>
                <Select value={formData.date_position} onValueChange={(v) => update("date_position", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oben_rechts">Oben Rechts</SelectItem>
                    <SelectItem value="oben_links">Oben Links</SelectItem>
                    <SelectItem value="unten_rechts">Unten Rechts</SelectItem>
                    <SelectItem value="unten_links">Unten Links</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Anzuzeigende Felder</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.show_motion_number}
                    onChange={(e) => update("show_motion_number", e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Antragsnummer</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.show_date}
                    onChange={(e) => update("show_date", e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Datum</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.show_creator}
                    onChange={(e) => update("show_creator", e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Ersteller</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Kopfzeilen-Text</Label>
                <Textarea
                  value={formData.header_text}
                  onChange={(e) => update("header_text", e.target.value)}
                  placeholder="Optionaler Text in der Kopfzeile"
                  rows={2}
                />
              </div>
              <div>
                <Label>Fußzeilen-Text</Label>
                <Textarea
                  value={formData.footer_text}
                  onChange={(e) => update("footer_text", e.target.value)}
                  placeholder="Kontaktdaten, Website, etc."
                  rows={2}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stil" className="space-y-4 mt-4">
            <div>
              <Label>Schriftart</Label>
              <Select value={formData.font_family} onValueChange={(v) => update("font_family", v)}>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Primärfarbe (Überschriften)</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => update("primary_color", e.target.value)}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={formData.primary_color}
                    onChange={(e) => update("primary_color", e.target.value)}
                    placeholder="#1e293b"
                  />
                </div>
              </div>

              <div>
                <Label>Sekundärfarbe (Text)</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={formData.secondary_color}
                    onChange={(e) => update("secondary_color", e.target.value)}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={formData.secondary_color}
                    onChange={(e) => update("secondary_color", e.target.value)}
                    placeholder="#64748b"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="erweitert" className="space-y-4 mt-4">
            <div>
              <Label>Eigenes CSS (Erweitert)</Label>
              <Textarea
                value={formData.custom_css}
                onChange={(e) => update("custom_css", e.target.value)}
                placeholder=".motion-title { font-size: 24px; }&#10;.motion-body { line-height: 1.8; }"
                className="font-mono text-sm"
                rows={8}
              />
              <p className="text-xs text-slate-500 mt-1">
                Eigene CSS-Regeln für fortgeschrittene Anpassungen
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            <X className="w-4 h-4 mr-2" />
            Abbrechen
          </Button>
          <Button
            onClick={() => onSave(formData)}
            disabled={!formData.name || saving}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Wird gespeichert..." : "Speichern"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}