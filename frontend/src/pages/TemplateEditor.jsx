import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Save, Eye, FileText, Upload, X, Copy, Star } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DOCUMENT_TYPES = {
  antrag: { label: 'Antrag', entity: 'PrintTemplate' },
  anfrage: { label: 'Anfrage', entity: 'PrintTemplate' },
  beschluss: { label: 'Beschluss', entity: 'PrintTemplate' },
  brief: { label: 'Brief', entity: 'PrintTemplate' },
  einladung: { label: 'Einladung', entity: 'FractionMeetingTemplate' },
  protokoll: { label: 'Protokoll', entity: 'ProtocolTemplate' },
};

export default function TemplateEditor() {
  const queryClient = useQueryClient();
  const [selectedDocType, setSelectedDocType] = useState('antrag');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const createEmptyTemplate = (docType) => ({
    name: "",
    description: "",
    document_type: docType,
    logo_url: "",
    logo_position: "oben_rechts",
    logo_position_x: null,
    logo_position_y: null,
    fraction_name: "",
    fraction_subtitle: "",
    fraction_address: "",
    fraction_position: "oben_mitte",
    show_document_type_box: true,
    document_type_box_position: "rechts",
    document_type_box_x: null,
    document_type_box_y: null,
    show_recipient_address: true,
    recipient_title: "",
    show_motion_number: true,
    show_date: true,
    show_creator: true,
    date_position: "in_box",
    header_text: "",
    footer_text: "",
    primary_color: "#111827",
    secondary_color: "#6b7280",
    font_family: "Times New Roman",
    custom_css: "",
  });

  const [formData, setFormData] = useState(createEmptyTemplate('antrag'));
  const previewRef = useRef(null);
  const [dragging, setDragging] = useState(null);

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: organizationData = [] } = useQuery({
    queryKey: ["template-organization", user?.organization],
    queryFn: () => base44.entities.Organization.filter({ name: user?.organization }),
    enabled: !!user?.organization,
  });

  const organization = organizationData[0] || null;

  const { data: templates = [] } = useQuery({
    queryKey: ['templates', selectedDocType, user?.organization],
    queryFn: async () => {
      const entityName = DOCUMENT_TYPES[selectedDocType].entity;
      const entity = base44.entities[entityName];
      return entity.filter({ organization: user?.organization });
    },
    enabled: !!user?.organization,
  });

  const saveMutation = useMutation({
    mutationFn: async (template) => {
      const entityName = DOCUMENT_TYPES[selectedDocType].entity;
      const entity = base44.entities[entityName];
      const data = { ...template, organization: user?.organization };
      if (selectedTemplate?.id) {
        return entity.update(selectedTemplate.id, data);
      }
      return entity.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', selectedDocType, user?.organization] });
      alert('Vorlage gespeichert!');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (template) => {
      const entityName = DOCUMENT_TYPES[selectedDocType].entity;
      const entity = base44.entities[entityName];
      const data = { 
        ...template, 
        organization: user?.organization,
        name: `${template.name} (Kopie)`,
        is_default: false
      };
      delete data.id;
      delete data.created_date;
      delete data.updated_date;
      delete data.created_by;
      return entity.create(data);
    },
    onSuccess: (newTemplate) => {
      queryClient.invalidateQueries({ queryKey: ['templates', selectedDocType, user?.organization] });
      setSelectedTemplate(newTemplate);
      alert('Vorlage dupliziert!');
    },
  });

  const uploadLogo = async (file) => {
    try {
      const { file_url } = await base44.files.upload(file);
      update("logo_url", file_url);
    } catch (error) {
      console.error("Logo-Upload fehlgeschlagen:", error);
      alert("Fehler beim Hochladen des Logos");
    }
  };

  useEffect(() => {
    if (selectedTemplate) {
      setFormData({ ...createEmptyTemplate(selectedDocType), ...selectedTemplate });
    } else {
      setFormData(createEmptyTemplate(selectedDocType));
    }
  }, [selectedTemplate, selectedDocType]);

  const update = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const buildFooterText = () => {
    if (!organization) return "";
    const lines = [];
    if (organization.display_name) lines.push(organization.display_name);
    if (organization.address) lines.push(organization.address);
    const cityLine = [organization.postal_code, organization.city].filter(Boolean).join(" ");
    if (cityLine) lines.push(cityLine);
    const contactLine = [organization.phone, organization.email, organization.website].filter(Boolean).join(" | ");
    if (contactLine) lines.push(contactLine);
    const bankLine = [organization.iban, organization.bic].filter(Boolean).join(" | ");
    if (bankLine) lines.push(`IBAN/BIC: ${bankLine}`);
    return lines.join("\n");
  };

  const defaultFooterText = buildFooterText();

  const handleDragStart = (type) => (event) => {
    if (!previewRef.current) return;
    const containerRect = previewRef.current.getBoundingClientRect();
    const targetRect = event.currentTarget.getBoundingClientRect();
    const offsetX = event.clientX - targetRect.left;
    const offsetY = event.clientY - targetRect.top;
    setDragging({ type, offsetX, offsetY, containerRect });
    event.preventDefault();
  };

  const handleDragMove = (event) => {
    if (!dragging || !previewRef.current) return;
    const containerRect = previewRef.current.getBoundingClientRect();
    const x = Math.max(0, event.clientX - containerRect.left - dragging.offsetX);
    const y = Math.max(0, event.clientY - containerRect.top - dragging.offsetY);
    if (dragging.type === "logo") {
      setFormData(prev => ({ ...prev, logo_position_x: Math.round(x), logo_position_y: Math.round(y) }));
    } else if (dragging.type === "docBox") {
      setFormData(prev => ({ ...prev, document_type_box_x: Math.round(x), document_type_box_y: Math.round(y) }));
    }
  };

  const handleDragEnd = () => {
    if (dragging) {
      setDragging(null);
    }
  };


  return (
    <div className="h-screen flex flex-col">
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <FileText className="w-6 h-6 text-slate-700" />
            <div>
              <h1 className="text-xl font-bold text-slate-900">Vorlagen-Editor</h1>
              <p className="text-sm text-slate-500">Erstellen Sie visuelle Dokumentvorlagen</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedDocType} onValueChange={(value) => {
              setSelectedDocType(value);
              setSelectedTemplate(null);
            }}>
              <SelectTrigger className="w-48" data-testid="template-doc-type-trigger">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DOCUMENT_TYPES).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select 
              value={selectedTemplate?.id || "new"} 
              onValueChange={(v) => {
                if (v === "new") {
                  setSelectedTemplate(null);
                  setFormData({
                    name: "Neue Vorlage",
                    description: "",
                    logo_url: "",
                    logo_position: "oben_links",
                    fraction_name: "Fraktion",
                    fraction_subtitle: "im Rat der Stadt",
                    fraction_address: "Musterstraße 1\n12345 Musterstadt",
                    fraction_position: "oben_rechts",
                    show_document_type_box: true,
                    document_type_box_position: "rechts",
                    show_recipient_address: true,
                    recipient_title: "Herrn\nBürgermeister",
                    show_motion_number: true,
                    show_date: true,
                    show_creator: true,
                    date_position: "in_box",
                    header_text: "",
                    footer_text: "",
                    primary_color: "#000000",
                    secondary_color: "#000000",
                    font_family: "Arial",
                    custom_css: "",
                  });
                } else {
                  const template = templates.find(t => t.id === v);
                  setSelectedTemplate(template);
                }
              }}
            >
              <SelectTrigger className="w-64" data-testid="template-select-trigger">
                <SelectValue placeholder="Vorlage auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">+ Neue Vorlage</SelectItem>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplate && (
              <Button 
                variant="outline" 
                onClick={() => duplicateMutation.mutate(formData)} 
                disabled={duplicateMutation.isPending}
                data-testid="template-duplicate-button"
              >
                <Copy className="w-4 h-4 mr-2" />
                Duplizieren
              </Button>
            )}
            <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending} data-testid="template-save-button">
              <Save className="w-4 h-4 mr-2" />
              Speichern
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Editor Panel */}
        <div className="w-96 border-r bg-slate-50 overflow-y-auto">
          <div className="p-6 space-y-6">
            <div>
              <Label className="text-sm font-semibold">Name der Vorlage</Label>
              <Input
                value={formData.name}
                onChange={(e) => update("name", e.target.value)}
                className="mt-1.5"
                data-testid="template-name-input"
              />
            </div>

            <div>
              <Label className="text-sm font-semibold">Beschreibung</Label>
              <Input
                value={formData.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Optionale Beschreibung"
                className="mt-1.5"
                data-testid="template-description-input"
              />
            </div>

            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold mb-4">Logo</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Logo hochladen</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files[0]) uploadLogo(e.target.files[0]);
                    }}
                    className="mt-1.5"
                    data-testid="template-logo-file-input"
                  />
                </div>
                <div>
                  <Label className="text-xs">oder Logo-URL</Label>
                  <Input
                    value={formData.logo_url}
                    onChange={(e) => update("logo_url", e.target.value)}
                    placeholder="https://..."
                    className="mt-1.5"
                    data-testid="template-logo-url-input"
                  />
                </div>
                <div>
                  <Label className="text-xs">Position</Label>
                  <Select value={formData.logo_position} onValueChange={(v) => update("logo_position", v)}>
                    <SelectTrigger className="mt-1.5" data-testid="template-logo-position-trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oben_links">Oben Links</SelectItem>
                      <SelectItem value="oben_mitte">Oben Mitte</SelectItem>
                      <SelectItem value="oben_rechts">Oben Rechts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold mb-4">Fraktionsinformationen</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Fraktionsname</Label>
                  <Input
                    value={formData.fraction_name}
                    onChange={(e) => update("fraction_name", e.target.value)}
                    placeholder="Z.B. Alternative für Deutschland"
                    className="mt-1.5"
                    data-testid="template-fraction-name-input"
                  />
                </div>
                <div>
                  <Label className="text-xs">Untertitel</Label>
                  <Input
                    value={formData.fraction_subtitle || ""}
                    onChange={(e) => update("fraction_subtitle", e.target.value)}
                    placeholder="Z.B. Fraktion im Rat der Stadt Dormagen"
                    className="mt-1.5"
                    data-testid="template-fraction-subtitle-input"
                  />
                </div>
                <div>
                  <Label className="text-xs">Position</Label>
                  <Select value={formData.fraction_position} onValueChange={(v) => update("fraction_position", v)}>
                    <SelectTrigger className="mt-1.5" data-testid="template-fraction-position-trigger">
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
            </div>

            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold mb-4">Empfängeradresse</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.show_recipient_address}
                    onChange={(e) => update("show_recipient_address", e.target.checked)}
                    className="w-4 h-4"
                    data-testid="template-recipient-address-toggle"
                  />
                  <span className="text-xs">Empfängeradresse anzeigen</span>
                </label>
                {formData.show_recipient_address && (
                  <div>
                    <Label className="text-xs">Standard-Empfänger</Label>
                    <Textarea
                      value={formData.recipient_title || ""}
                      onChange={(e) => update("recipient_title", e.target.value)}
                      placeholder="Herrn&#10;Bürgermeister Erik Mustermann"
                      rows={4}
                      className="mt-1.5"
                      data-testid="template-recipient-title-textarea"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold mb-4">Dokumenttyp-Box</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.show_document_type_box}
                    onChange={(e) => update("show_document_type_box", e.target.checked)}
                    className="w-4 h-4"
                    data-testid="template-doc-type-box-toggle"
                  />
                  <span className="text-xs">Dokumenttyp-Box mit Checkboxen anzeigen</span>
                </label>
                {formData.show_document_type_box && (
                  <>
                    <div>
                      <Label className="text-xs">Position der Box</Label>
                      <Select value={formData.document_type_box_position || "rechts"} onValueChange={(v) => update("document_type_box_position", v)}>
                        <SelectTrigger className="mt-1.5" data-testid="template-doc-type-box-position-trigger">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="links">Links</SelectItem>
                          <SelectItem value="mittel">Mittel</SelectItem>
                          <SelectItem value="rechts">Rechts</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Datumsposition</Label>
                      <Select value={formData.date_position} onValueChange={(v) => update("date_position", v)}>
                        <SelectTrigger className="mt-1.5" data-testid="template-date-position-trigger">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in_box">In der Dokumenttyp-Box</SelectItem>
                          <SelectItem value="oben_rechts">Oben Rechts (separat)</SelectItem>
                          <SelectItem value="oben_links">Oben Links (separat)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold mb-4">Styling</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Schriftart</Label>
                  <Select value={formData.font_family} onValueChange={(v) => update("font_family", v)}>
                    <SelectTrigger className="mt-1.5" data-testid="template-font-family-trigger">
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
                <div>
                  <Label className="text-xs">Primärfarbe</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => update("primary_color", e.target.value)}
                      className="w-14 p-1 h-9"
                      data-testid="template-primary-color-picker"
                    />
                    <Input
                      value={formData.primary_color}
                      onChange={(e) => update("primary_color", e.target.value)}
                      data-testid="template-primary-color-input"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Sekundärfarbe</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => update("secondary_color", e.target.value)}
                      className="w-14 p-1 h-9"
                      data-testid="template-secondary-color-picker"
                    />
                    <Input
                      value={formData.secondary_color}
                      onChange={(e) => update("secondary_color", e.target.value)}
                      data-testid="template-secondary-color-input"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold mb-4">Weitere Optionen</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.show_creator}
                    onChange={(e) => update("show_creator", e.target.checked)}
                    className="w-4 h-4"
                    data-testid="template-show-creator-toggle"
                  />
                  <span className="text-sm">Unterschrift/Ersteller anzeigen</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => update("is_default", e.target.checked)}
                    className="w-4 h-4"
                    data-testid="template-is-default-toggle"
                  />
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium">Als Standard-Vorlage verwenden</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold mb-4">Erweiterte Anpassungen</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Kopfzeile (optional)</Label>
                  <Textarea
                    value={formData.header_text || ""}
                    onChange={(e) => update("header_text", e.target.value)}
                    placeholder="Zusätzliche Kopfzeilen-Informationen"
                    rows={3}
                    className="mt-1.5"
                    data-testid="template-header-textarea"
                  />
                </div>
                <div>
                  <Label className="text-xs">Fußzeile (optional)</Label>
                  <Textarea
                    value={formData.footer_text || ""}
                    onChange={(e) => update("footer_text", e.target.value)}
                    placeholder={defaultFooterText || "Standard-Fußzeile"}
                    rows={4}
                    className="mt-1.5"
                    data-testid="template-footer-textarea"
                  />
                  {defaultFooterText && (
                    <p className="text-xs text-slate-500 mt-1" data-testid="template-footer-default-hint">
                      Standard-Fußzeile wird verwendet, wenn dieses Feld leer ist.
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs">Eigenes CSS (für Experten)</Label>
                  <Textarea
                    value={formData.custom_css || ""}
                    onChange={(e) => update("custom_css", e.target.value)}
                    placeholder=".motion-title { font-size: 18pt; }"
                    rows={6}
                    className="mt-1.5 font-mono text-xs"
                    data-testid="template-custom-css-textarea"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    CSS-Regeln für detaillierte Layout-Anpassungen
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="flex-1 bg-slate-100 p-8 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <TemplatePreview template={formData} />
          </div>
        </div>
      </div>
    </div>
  );
}

function TemplatePreview({ template }) {
  return (
    <div 
      className="bg-white shadow-2xl min-h-[29.7cm] relative text-sm"
      style={{ 
        fontFamily: template.font_family,
        width: '21cm',
        aspectRatio: '210 / 297',
        padding: '2cm 2.5cm'
      }}
    >
      <style>{template.custom_css}</style>

      {/* Header Area */}
      <div className="mb-12">
        {/* Fraction Name Centered at Top */}
        {template.fraction_name && (
          <div className="text-center mb-8">
            <div className="font-bold text-base" style={{ color: template.primary_color }}>
              {template.fraction_name}
            </div>
            {template.fraction_subtitle && (
              <div className="italic text-sm" style={{ color: template.primary_color }}>
                {template.fraction_subtitle}
              </div>
            )}
          </div>
        )}

        {/* Logo and Document Type Box */}
        <div className="flex justify-between items-start mb-8">
          {/* Logo Left */}
          {template.logo_url && (
            <div className="flex-shrink-0">
              <img src={template.logo_url} alt="Logo" className="h-20 object-contain" />
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Document Type Box - positioned based on setting */}
          {template.show_document_type_box && (
            <div 
              className="border border-black flex-shrink-0" 
              style={{ 
                width: '200px',
                marginLeft: template.document_type_box_position === 'links' ? '0' : 'auto',
                marginRight: template.document_type_box_position === 'rechts' ? '0' : template.document_type_box_position === 'mittel' ? 'auto' : 'auto'
              }}
            >
              <table className="w-full text-xs">
                <tbody>
                  <tr className="border-b border-black">
                    <td className="p-2 border-r border-black">Fraktionsantrag</td>
                    <td className="p-2 text-center"></td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="p-2 border-r border-black">Einzelantrag</td>
                    <td className="p-2 text-center">X</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="p-2 border-r border-black">Anfrage</td>
                    <td className="p-2 text-center"></td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="p-2 border-r border-black">Beschlusskontrolle</td>
                    <td className="p-2 text-center"></td>
                  </tr>
                  {template.date_position === 'in_box' && (
                    <tr>
                      <td className="p-2" colSpan="2">
                        Dormagen den {new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recipient Address */}
        {template.show_recipient_address && template.recipient_title && (
          <div className="mb-12 whitespace-pre-line" style={{ color: template.secondary_color }}>
            {template.recipient_title}
            <br />
            Neues Rathaus
            <br />
            Paul-Wierich-Platz 2
            <br />
            41539 Musterstadt
          </div>
        )}
      </div>

      {/* Main Content */}
      <div>
        <h1 className="font-bold text-base mb-4" style={{ color: template.primary_color }}>
          Antrag: Errichtung eines Verkehrsspiegels an der Ecke Franziskanerstraße / Saarwerdenstraße
        </h1>

        <h2 className="font-bold mb-2" style={{ color: template.primary_color }}>
          Beschlussvorlage
        </h2>

        <div className="space-y-3 mb-6 text-justify" style={{ color: template.secondary_color }}>
          <p>
            Auf der Kreuzung Franziskanerstraße und Saarwerdenstraße soll ein dauerhafter Verkehrsspiegel Richtung 
            Franziskanerstraße errichtet werden.
          </p>
          <p>
            Die Verwaltung wird beauftragt, ein Konzept bis zur nächsten Sitzung des Rates vorzulegen, welches die 
            technische Umsetzung und Kosten regelt.
          </p>
        </div>

        <h2 className="font-bold mb-2" style={{ color: template.primary_color }}>
          Begründung
        </h2>

        <div className="space-y-3 mb-8 text-justify" style={{ color: template.secondary_color }}>
          <p>
            Die Kreuzung ist wegen der unmittelbar davor, an der Franziskanerstraße liegenden Einfahrt zum einzigen 
            Supermarkt im Ort stärker befahren. Die Saarwerdenstraße wiederum ist Richtung Norden trotz des in ihrer 
            Mitte liegenden grünen Streifens an beiden Seiten davon in beide Richtungen befahrbar.
          </p>
          <p>
            Gleichzeitig verhindert eine umlaufende Hecke vom Eckhaus Nr. 12 eine frühzeitige Einsicht in die 
            Verkehrssituation Richtung Norden bzw. Westen, so dass für Verkehrsteilnehmer, trotz einer bestehenden 
            Tempobeschränkung auf 30 km/h eine Gefahrensituation entsteht.
          </p>
        </div>

        {/* Signature */}
        {template.show_creator && (
          <div className="mt-16">
            <div className="border-t border-black w-48 mb-2"></div>
            <p className="font-semibold" style={{ color: template.primary_color }}>Maxim Filimonov</p>
            <p className="text-xs italic" style={{ color: template.secondary_color }}>2. stv. Fraktionsvorsitzender</p>
          </div>
        )}
      </div>
    </div>
  );
}