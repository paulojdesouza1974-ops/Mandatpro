import React, { useState, useEffect } from "react";
import { base44 } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  Save, Eye, FileText, Plus, Trash2, Copy, Printer, 
  Download, Settings, Layout, Type, Upload, Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

// Document types with checkbox options
const DOCUMENT_TYPES = [
  { id: "einzelantrag", label: "Einzelantrag" },
  { id: "fraktionsantrag", label: "Fraktionsantrag" },
  { id: "fraktionsanfrage", label: "Fraktionsanfrage" },
  { id: "beschlusskontrolle", label: "Beschlusskontrolle" },
];

// Faction members from website
const FACTION_MEMBERS = [
  { name: "Bodo Gilz", title: "Fraktionsvorsitzender", email: "bodo.gilz@afd-dormagen.de", kreistag: true },
  { name: "Niklas Odendahl", title: "1. stv. Fraktionsvorsitzender", email: "niklas.odendahl@afd-dormagen.de", kreistag: true },
  { name: "Maxim Filimonov", title: "2. stv. Fraktionsvorsitzender", email: "", kreistag: false },
  { name: "Paulo de Souza", title: "Ratsmitglied", email: "", kreistag: false },
  { name: "Maria Schiffer", title: "Ratsmitglied", email: "", kreistag: true },
];

const DEFAULT_TEMPLATE = {
  name: "Neue Vorlage",
  description: "",
  // Header
  faction_name: "AfD Fraktion im Rat der Stadt Dormagen",
  city: "Dormagen",
  // Recipient
  recipient_name: "Herrn Bürgermeister Erik Lierenfeld",
  recipient_institution: "Neues Rathaus",
  recipient_street: "Paul-Wierich-Platz 2",
  recipient_postal: "41539 Dormagen",
  // Signers (in document body)
  signer1_name: "Bodo Gilz",
  signer1_title: "Fraktionsvorsitzender",
  signer2_name: "Niklas Odendahl",
  signer2_title: "1. stv. Fraktionsvorsitzender",
  // Footer (faction info)
  footer_line1: "AfD Fraktion im Rat der Stadt Dormagen",
  footer_line2: "Paul-Wierich-Platz 2 | 41539 Dormagen",
  footer_line3: "kontakt@afd-dormagen.de | www.afd-dormagen.de",
  // Styling
  font_family: "Times New Roman",
  primary_color: "#000000",
  logo_url: "",
  logo_base64: "",
  is_default: false,
};

const LOGO_DIMENSIONS = {
  widthPx: 140,
  heightPx: 70,
  widthMm: 35,
  heightMm: 18,
};

const getLogoSrc = (template) => template?.logo_base64 || template?.logo_url || template?.logo || "";

const getLogoFormat = (logoSrc) => {
  if (!logoSrc || typeof logoSrc !== "string") return null;
  const match = logoSrc.match(/^data:image\/(png|jpe?g)/i);
  if (!match) return null;
  const format = match[1].toLowerCase();
  return format === "png" ? "PNG" : "JPEG";
};

export default function TemplateEditor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_TEMPLATE);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState("header");
  
  // Preview sample data
  const [previewData, setPreviewData] = useState({
    documentType: "fraktionsantrag",
    date: new Date().toLocaleDateString("de-DE"),
    subject: "Beflaggung öffentlicher Einrichtungen mit der Bundesflagge",
    meetingDate: "28.03.2026",
    beschluss: "Alle öffentlichen Gebäude der Stadt sollen künftig dauerhaft mit der Nationalflagge beflaggt werden.",
    begruendung: "Die deutsche Flagge ist das sichtbare Symbol unserer staatlichen Einheit und unserer freiheitlich-demokratischen Ordnung.",
  });

  const logoSrc = getLogoSrc(formData);
  const toTestId = (value) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: templatesData = [], isLoading } = useQuery({
    queryKey: ["print-templates", user?.organization],
    queryFn: () => base44.entities.PrintTemplate.filter({ organization: user?.organization }),
    enabled: !!user?.organization,
  });

  useEffect(() => {
    if (templatesData.length > 0) {
      setTemplates(templatesData);
      if (!selectedTemplate) {
        const defaultTemplate = templatesData.find(t => t.is_default) || templatesData[0];
        setSelectedTemplate(defaultTemplate);
        setFormData({ ...DEFAULT_TEMPLATE, ...defaultTemplate });
      }
    }
  }, [templatesData]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const templateData = {
        ...data,
        organization: user?.organization,
      };
      if (data.id) {
        return base44.entities.PrintTemplate.update(data.id, templateData);
      }
      return base44.entities.PrintTemplate.create(templateData);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["print-templates"] });
      setSelectedTemplate(result);
      toast({ title: "Vorlage gespeichert" });
    },
    onError: (error) => {
      toast({ title: "Fehler beim Speichern", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PrintTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["print-templates"] });
      setSelectedTemplate(null);
      setFormData(DEFAULT_TEMPLATE);
      setShowDeleteDialog(false);
      toast({ title: "Vorlage gelöscht" });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleNewTemplate = () => {
    setSelectedTemplate(null);
    setFormData({ ...DEFAULT_TEMPLATE, name: "Neue Vorlage " + (templates.length + 1) });
  };

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setFormData({ ...DEFAULT_TEMPLATE, ...template });
  };

  const handleDuplicate = () => {
    const newTemplate = { 
      ...formData, 
      id: undefined, 
      name: formData.name + " (Kopie)",
      is_default: false 
    };
    setSelectedTemplate(null);
    setFormData(newTemplate);
  };

  const handleSetDefault = async () => {
    for (const t of templates) {
      if (t.is_default && t.id !== formData.id) {
        await base44.entities.PrintTemplate.update(t.id, { is_default: false });
      }
    }
    setFormData({ ...formData, is_default: true });
    saveMutation.mutate({ ...formData, is_default: true });
  };

  // Logo upload handler
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          logo_base64: reader.result,
          logo_url: reader.result,
        }));
        toast({ title: "Logo hochgeladen" });
      };
      reader.readAsDataURL(file);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const marginLeft = 25;
    const marginRight = 25;
    const pageWidth = 210;
    const contentWidth = pageWidth - marginLeft - marginRight;
    let y = 20;

    // Set font
    doc.setFont("times", "normal");

    const logoSrc = getLogoSrc(formData);
    const logoFormat = getLogoFormat(logoSrc);

    // ========== LOGO (top right, above document box) ==========
    let logoHeight = 0;
    if (logoSrc && logoFormat) {
      try {
        const logoX = pageWidth - marginRight - LOGO_DIMENSIONS.widthMm;
        const logoY = 10;
        doc.addImage(
          logoSrc,
          logoFormat,
          logoX,
          logoY,
          LOGO_DIMENSIONS.widthMm,
          LOGO_DIMENSIONS.heightMm
        );
        logoHeight = LOGO_DIMENSIONS.heightMm + 7;
      } catch (e) {
        console.error("Logo konnte nicht geladen werden:", e);
      }
    } else if (logoSrc && !logoFormat) {
      toast({
        title: "Logo-Format nicht unterstützt",
        description: "Bitte PNG oder JPG für die PDF-Ausgabe verwenden.",
        variant: "destructive",
      });
    }

    // ========== HEADER ==========
    // Left: Faction name
    doc.setFontSize(11);
    doc.setFont("times", "bold");
    doc.text(formData.faction_name || "Fraktion", marginLeft, y);
    
    // Move down if logo exists
    if (logoHeight > 0) {
      y += logoHeight;
    }
    
    // Right side: Document type box with date
    const boxX = pageWidth - marginRight - 55;
    const boxY = y - 5;
    const boxWidth = 55;
    const boxHeight = 25;
    
    // Draw box
    doc.setLineWidth(0.3);
    doc.rect(boxX, boxY, boxWidth, boxHeight);
    
    // Date inside box
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.text(`${formData.city || "Dormagen"} den:`, boxX + 2, boxY + 5);
    doc.text(previewData.date, boxX + 2, boxY + 10);
    
    // Document type checkboxes inside box
    doc.setFontSize(8);
    let checkY = boxY + 15;
    const checkSize = 2.5;
    
    // First row: Einzelantrag, Fraktionsantrag
    doc.rect(boxX + 2, checkY - 2, checkSize, checkSize);
    if (previewData.documentType === "einzelantrag") {
      doc.text("X", boxX + 2.5, checkY);
    }
    doc.text("Einzelantrag", boxX + 6, checkY);
    
    doc.rect(boxX + 28, checkY - 2, checkSize, checkSize);
    if (previewData.documentType === "fraktionsantrag") {
      doc.text("X", boxX + 28.5, checkY);
    }
    doc.text("Fraktionsantrag", boxX + 32, checkY);
    
    // Second row: Fraktionsanfrage, Beschlusskontrolle
    checkY += 5;
    doc.rect(boxX + 2, checkY - 2, checkSize, checkSize);
    if (previewData.documentType === "fraktionsanfrage") {
      doc.text("X", boxX + 2.5, checkY);
    }
    doc.text("Fraktionsanfrage", boxX + 6, checkY);
    
    doc.rect(boxX + 28, checkY - 2, checkSize, checkSize);
    if (previewData.documentType === "beschlusskontrolle") {
      doc.text("X", boxX + 28.5, checkY);
    }
    doc.text("Beschlusskontr.", boxX + 32, checkY);
    
    y += 35;

    // ========== RECIPIENT ==========
    doc.setFontSize(11);
    doc.setFont("times", "normal");
    const recipientLines = [
      formData.recipient_name,
      formData.recipient_institution,
      formData.recipient_street,
      formData.recipient_postal,
    ].filter(Boolean);
    
    recipientLines.forEach((line) => {
      doc.text(line, marginLeft, y);
      y += 5;
    });

    y += 10;

    // ========== SUBJECT ==========
    doc.setFont("times", "bold");
    doc.setFontSize(12);
    const subjectText = `Antrag: ${previewData.subject}`;
    const subjectLines = doc.splitTextToSize(subjectText, contentWidth);
    subjectLines.forEach((line) => {
      doc.text(line, marginLeft, y);
      y += 5;
    });
    doc.setFont("times", "normal");
    
    y += 5;

    // Meeting reference
    doc.setFontSize(11);
    doc.text(`Sitzung des Stadtrats vom ${previewData.meetingDate}`, marginLeft, y);
    
    y += 12;

    // ========== BESCHLUSSVORLAGE ==========
    doc.setFont("times", "bold");
    doc.text("Beschlussvorlage", marginLeft, y);
    doc.setFont("times", "normal");
    y += 6;
    
    const beschlussLines = doc.splitTextToSize(previewData.beschluss, contentWidth);
    beschlussLines.forEach((line) => {
      doc.text(line, marginLeft, y);
      y += 5;
    });

    y += 8;

    // ========== BEGRÜNDUNG ==========
    doc.setFont("times", "bold");
    doc.text("Begründung", marginLeft, y);
    doc.setFont("times", "normal");
    y += 6;
    
    const begruendungLines = doc.splitTextToSize(previewData.begruendung, contentWidth);
    begruendungLines.forEach((line) => {
      if (y > 240) {
        doc.addPage();
        y = 25;
      }
      doc.text(line, marginLeft, y);
      y += 5;
    });

    // ========== SIGNATURES (in document body) ==========
    y += 20;
    if (y > 240) {
      doc.addPage();
      y = 40;
    }
    
    // Signature lines
    doc.setLineWidth(0.3);
    doc.line(marginLeft, y, marginLeft + 50, y);
    doc.line(pageWidth / 2 + 10, y, pageWidth - marginRight, y);
    
    y += 5;
    doc.setFontSize(10);
    doc.text(formData.signer1_name || "", marginLeft, y);
    doc.text(formData.signer2_name || "", pageWidth / 2 + 10, y);
    
    y += 4;
    doc.setFontSize(9);
    doc.text(formData.signer1_title || "", marginLeft, y);
    doc.text(formData.signer2_title || "", pageWidth / 2 + 10, y);

    // ========== FOOTER (faction info) ==========
    const footerY = 280;
    doc.setLineWidth(0.5);
    doc.line(marginLeft, footerY - 5, pageWidth - marginRight, footerY - 5);
    
    doc.setFontSize(8);
    doc.setFont("times", "normal");
    doc.text(formData.footer_line1 || "", marginLeft, footerY);
    doc.text(formData.footer_line2 || "", marginLeft, footerY + 3);
    doc.text(formData.footer_line3 || "", marginLeft, footerY + 6);

    return doc;
  };

  const handlePrint = () => {
    const doc = generatePDF();
    const pdfBlob = doc.output("blob");
    const url = URL.createObjectURL(pdfBlob);
    const printWindow = window.open(url, "_blank");
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const handleDownloadPDF = () => {
    const doc = generatePDF();
    doc.save(`${formData.name || "Vorlage"}.pdf`);
  };

  if (isLoading) {
    return <div className="p-8 text-center">Laden...</div>;
  }

  return (
    <div className="space-y-6" data-testid="template-editor-page">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Druckvorlagen</h1>
          <p className="text-slate-500">Vorlagen für Anträge und Dokumente verwalten</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleNewTemplate} data-testid="new-template-btn">
            <Plus className="w-4 h-4 mr-2" /> Neue Vorlage
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Template List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Vorlagen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {templates.length === 0 ? (
              <p className="text-sm text-slate-500">Keine Vorlagen vorhanden</p>
            ) : (
              templates.map((template) => (
                <div
                  key={template.id}
                  className={`p-3 rounded-lg cursor-pointer border transition-colors ${
                    selectedTemplate?.id === template.id
                      ? "bg-slate-100 border-slate-300"
                      : "hover:bg-slate-50 border-transparent"
                  }`}
                  onClick={() => handleSelectTemplate(template)}
                  data-testid={`template-item-${template.id}`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium">{template.name}</span>
                    {template.is_default && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Standard</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Editor */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3 border-b">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg">{formData.name || "Neue Vorlage"}</CardTitle>
                <CardDescription>Vorlage bearbeiten</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowPreview(true)} data-testid="preview-btn">
                  <Eye className="w-4 h-4 mr-1" /> Vorschau
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrint} data-testid="print-btn">
                  <Printer className="w-4 h-4 mr-1" /> Drucken
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadPDF} data-testid="download-pdf-btn">
                  <Download className="w-4 h-4 mr-1" /> PDF
                </Button>
                <Button onClick={handleSave} size="sm" data-testid="save-template-btn">
                  <Save className="w-4 h-4 mr-1" /> Speichern
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="header" data-testid="tab-header-trigger"><Layout className="w-4 h-4 mr-1" /> Kopfbereich</TabsTrigger>
                <TabsTrigger value="recipient" data-testid="tab-recipient-trigger"><FileText className="w-4 h-4 mr-1" /> Empfänger</TabsTrigger>
                <TabsTrigger value="signers" data-testid="tab-signers-trigger"><Users className="w-4 h-4 mr-1" /> Unterzeichner</TabsTrigger>
                <TabsTrigger value="footer" data-testid="tab-footer-trigger"><Type className="w-4 h-4 mr-1" /> Fußzeile</TabsTrigger>
                <TabsTrigger value="settings" data-testid="tab-settings-trigger"><Settings className="w-4 h-4 mr-1" /> Einstellungen</TabsTrigger>
              </TabsList>

              {/* Header Tab */}
              <TabsContent value="header" className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Vorlagenname *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="z.B. Standard Antrag"
                      data-testid="template-name-input"
                    />
                  </div>
                  <div>
                    <Label>Beschreibung</Label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Kurze Beschreibung"
                      data-testid="template-description-input"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Fraktionsname</Label>
                    <Input
                      value={formData.faction_name}
                      onChange={(e) => setFormData({ ...formData, faction_name: e.target.value })}
                      placeholder="AfD Fraktion im Rat der Stadt Dormagen"
                      data-testid="faction-name-input"
                    />
                  </div>
                  <div>
                    <Label>Stadt</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Dormagen"
                      data-testid="template-city-input"
                    />
                  </div>
                </div>

                <div>
                  <Label>Logo hochladen</Label>
                  <div className="flex gap-4 items-start flex-wrap">
                    {/* Logo Preview - Clickable to replace */}
                    {logoSrc ? (
                      <label className="cursor-pointer group relative" data-testid="logo-preview-label">
                        <input
                          type="file"
                          onChange={handleLogoUpload}
                          accept="image/png,image/jpeg"
                          className="hidden"
                          data-testid="logo-upload-input"
                        />
                        <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-2 hover:border-blue-500 transition-colors">
                          <img 
                            src={logoSrc} 
                            alt="Logo" 
                            className="object-contain"
                            style={{ width: LOGO_DIMENSIONS.widthPx, height: LOGO_DIMENSIONS.heightPx }}
                            data-testid="logo-preview-image"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <span className="text-white text-sm font-medium">Klicken zum Ersetzen</span>
                          </div>
                        </div>
                      </label>
                    ) : (
                      <label className="cursor-pointer" data-testid="logo-upload-label">
                        <input
                          type="file"
                          onChange={handleLogoUpload}
                          accept="image/png,image/jpeg"
                          className="hidden"
                          id="logo-upload-input"
                          data-testid="logo-upload-input"
                        />
                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 hover:border-blue-500 transition-colors flex flex-col items-center gap-2">
                          <Upload className="w-8 h-8 text-slate-400" />
                          <span className="text-sm text-slate-600">Logo auswählen</span>
                        </div>
                      </label>
                    )}
                    
                    {logoSrc && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setFormData((prev) => ({ ...prev, logo_base64: "", logo_url: "" }))}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        data-testid="logo-remove-button"
                      >
                        <Trash2 className="w-4 h-4 mr-1" /> Logo entfernen
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">JPG oder PNG. Das Logo wird rechts oben im Dokument angezeigt.</p>
                </div>
              </TabsContent>

              {/* Recipient Tab */}
              <TabsContent value="recipient" className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-600 mb-4">
                    Standard-Empfänger für Anträge und Anfragen
                  </p>
                  <div className="space-y-3">
                    <div>
                      <Label>Name / Anrede</Label>
                      <Input
                        value={formData.recipient_name}
                        onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                        placeholder="Herrn Bürgermeister Erik Lierenfeld"
                        data-testid="recipient-name-input"
                      />
                    </div>
                    <div>
                      <Label>Institution</Label>
                      <Input
                        value={formData.recipient_institution}
                        onChange={(e) => setFormData({ ...formData, recipient_institution: e.target.value })}
                        placeholder="Neues Rathaus"
                        data-testid="recipient-institution-input"
                      />
                    </div>
                    <div>
                      <Label>Straße</Label>
                      <Input
                        value={formData.recipient_street}
                        onChange={(e) => setFormData({ ...formData, recipient_street: e.target.value })}
                        placeholder="Paul-Wierich-Platz 2"
                        data-testid="recipient-street-input"
                      />
                    </div>
                    <div>
                      <Label>PLZ und Ort</Label>
                      <Input
                        value={formData.recipient_postal}
                        onChange={(e) => setFormData({ ...formData, recipient_postal: e.target.value })}
                        placeholder="41539 Dormagen"
                        data-testid="recipient-postal-input"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Signers Tab (in document body) */}
              <TabsContent value="signers" className="space-y-4">
                <p className="text-sm text-slate-600">
                  Unterzeichner erscheinen am Ende des Dokumenttexts (vor der Fußzeile)
                </p>
                
                {/* Quick select from faction members */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Schnellauswahl Fraktionsmitglieder</h4>
                  <div className="flex flex-wrap gap-2">
                    {FACTION_MEMBERS.map((member) => (
                      <Button
                        key={member.name}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!formData.signer1_name) {
                            setFormData({ ...formData, signer1_name: member.name, signer1_title: member.title });
                          } else if (!formData.signer2_name) {
                            setFormData({ ...formData, signer2_name: member.name, signer2_title: member.title });
                          }
                        }}
                        data-testid={`signer-quickselect-${toTestId(member.name)}`}
                      >
                        {member.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                    <h4 className="font-medium">Unterzeichner 1</h4>
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={formData.signer1_name}
                        onChange={(e) => setFormData({ ...formData, signer1_name: e.target.value })}
                        placeholder="Name eingeben"
                        data-testid="signer1-name-input"
                      />
                    </div>
                    <div>
                      <Label>Funktion</Label>
                      <Input
                        value={formData.signer1_title}
                        onChange={(e) => setFormData({ ...formData, signer1_title: e.target.value })}
                        placeholder="Fraktionsvorsitzender"
                        data-testid="signer1-title-input"
                      />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setFormData({ ...formData, signer1_name: "", signer1_title: "" })}
                      data-testid="signer1-clear-button"
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Leeren
                    </Button>
                  </div>
                  <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                    <h4 className="font-medium">Unterzeichner 2</h4>
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={formData.signer2_name}
                        onChange={(e) => setFormData({ ...formData, signer2_name: e.target.value })}
                        placeholder="Name eingeben"
                        data-testid="signer2-name-input"
                      />
                    </div>
                    <div>
                      <Label>Funktion</Label>
                      <Input
                        value={formData.signer2_title}
                        onChange={(e) => setFormData({ ...formData, signer2_title: e.target.value })}
                        placeholder="1. stv. Fraktionsvorsitzender"
                        data-testid="signer2-title-input"
                      />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setFormData({ ...formData, signer2_name: "", signer2_title: "" })}
                      data-testid="signer2-clear-button"
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Leeren
                    </Button>
                  </div>
                </div>
              </TabsContent>
              {/* Footer Tab (faction info) */}
              <TabsContent value="footer" className="space-y-4">
                <p className="text-sm text-slate-600">
                  Fraktionsinformationen in der Fußzeile des Dokuments
                </p>
                <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                  <div>
                    <Label>Zeile 1 (Name)</Label>
                    <Input
                      value={formData.footer_line1}
                      onChange={(e) => setFormData({ ...formData, footer_line1: e.target.value })}
                      placeholder="AfD Fraktion im Rat der Stadt Dormagen"
                      data-testid="footer-line1-input"
                    />
                  </div>
                  <div>
                    <Label>Zeile 2 (Adresse)</Label>
                    <Input
                      value={formData.footer_line2}
                      onChange={(e) => setFormData({ ...formData, footer_line2: e.target.value })}
                      placeholder="Paul-Wierich-Platz 2 | 41539 Dormagen"
                      data-testid="footer-line2-input"
                    />
                  </div>
                  <div>
                    <Label>Zeile 3 (Kontakt)</Label>
                    <Input
                      value={formData.footer_line3}
                      onChange={(e) => setFormData({ ...formData, footer_line3: e.target.value })}
                      placeholder="kontakt@afd-dormagen.de | www.afd-dormagen.de"
                      data-testid="footer-line3-input"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Schriftart</Label>
                    <Select
                      value={formData.font_family}
                      onValueChange={(value) => setFormData({ ...formData, font_family: value })}
                    >
                      <SelectTrigger data-testid="font-family-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                        <SelectItem value="Arial">Arial</SelectItem>
                        <SelectItem value="Helvetica">Helvetica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Primärfarbe</Label>
                    <Input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      className="h-10 w-full"
                      data-testid="primary-color-input"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={handleDuplicate}
                    disabled={!selectedTemplate}
                    data-testid="duplicate-template-button"
                  >
                    <Copy className="w-4 h-4 mr-2" /> Duplizieren
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleSetDefault}
                    disabled={formData.is_default}
                    data-testid="set-default-template-button"
                  >
                    Als Standard setzen
                  </Button>
                  {selectedTemplate && (
                    <Button 
                      variant="destructive" 
                      onClick={() => setShowDeleteDialog(true)}
                      data-testid="delete-template-button"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Löschen
                    </Button>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vorschau</DialogTitle>
            <DialogDescription>So sieht das fertige Dokument aus</DialogDescription>
          </DialogHeader>
          
          {/* Preview Controls */}
          <div className="grid md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg mb-4">
            <div>
              <Label>Dokumenttyp</Label>
              <Select
                value={previewData.documentType}
                onValueChange={(value) => setPreviewData({ ...previewData, documentType: value })}
              >
                <SelectTrigger data-testid="preview-document-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.id} value={type.id}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Datum</Label>
              <Input
                value={previewData.date}
                onChange={(e) => setPreviewData({ ...previewData, date: e.target.value })}
                data-testid="preview-date-input"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Betreff</Label>
              <Input
                value={previewData.subject}
                onChange={(e) => setPreviewData({ ...previewData, subject: e.target.value })}
                data-testid="preview-subject-input"
              />
            </div>
          </div>

          {/* Document Preview */}
          <div className="border rounded-lg p-8 bg-white shadow-inner" style={{ fontFamily: formData.font_family, minHeight: "600px" }} data-testid="template-preview-document">
            {/* Header with logo and document type box */}
            <div className="flex justify-between items-start mb-6" data-testid="document-preview-header">
              {/* Left: Faction name */}
              <div className="font-bold text-sm flex-1" data-testid="document-preview-faction-name">{formData.faction_name}</div>
              
              {/* Right: Logo + Document type box */}
              <div className="flex flex-col items-end gap-2">
                {/* Logo */}
                {logoSrc && (
                  <img 
                    src={logoSrc} 
                    alt="Logo" 
                    className="object-contain"
                    style={{ width: LOGO_DIMENSIONS.widthPx, height: LOGO_DIMENSIONS.heightPx }}
                    data-testid="document-preview-logo"
                  />
                )}
                
                {/* Document type box */}
                <div className="border border-black p-2 text-xs w-48" data-testid="document-preview-type-box">
                  <div className="mb-1">{formData.city} den: {previewData.date}</div>
                  <div className="grid grid-cols-2 gap-1 mt-2">
                    {DOCUMENT_TYPES.map((type) => (
                      <div key={type.id} className="flex items-center gap-1">
                        <div className="w-3 h-3 border border-black flex items-center justify-center text-[8px]">
                          {previewData.documentType === type.id ? "X" : ""}
                        </div>
                        <span className="text-[9px]">{type.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Recipient */}
            <div className="mb-6 text-sm leading-relaxed" data-testid="document-preview-recipient">
              <div>{formData.recipient_name}</div>
              <div>{formData.recipient_institution}</div>
              <div>{formData.recipient_street}</div>
              <div>{formData.recipient_postal}</div>
            </div>

            {/* Subject */}
            <div className="font-bold mb-2 text-sm" data-testid="document-preview-subject">
              Antrag: {previewData.subject}
            </div>

            {/* Meeting Reference */}
            <div className="mb-6 text-sm" data-testid="document-preview-meeting-reference">
              Sitzung des Stadtrats vom {previewData.meetingDate}
            </div>

            {/* Beschlussvorlage */}
            <div className="mb-6 text-sm" data-testid="document-preview-beschluss">
              <div className="font-bold mb-2">Beschlussvorlage</div>
              <div>{previewData.beschluss}</div>
            </div>

            {/* Begründung */}
            <div className="mb-8 text-sm" data-testid="document-preview-begruendung">
              <div className="font-bold mb-2">Begründung</div>
              <div>{previewData.begruendung}</div>
            </div>

            {/* Signatures (in document body) */}
            <div className="mt-16 pt-4" data-testid="document-preview-signatures">
              <div className="flex justify-between">
                <div className="w-40">
                  <div className="border-t border-black pt-1">
                    <div className="text-sm">{formData.signer1_name || "________________"}</div>
                    <div className="text-xs text-slate-600">{formData.signer1_title}</div>
                  </div>
                </div>
                <div className="w-40">
                  <div className="border-t border-black pt-1">
                    <div className="text-sm">{formData.signer2_name || "________________"}</div>
                    <div className="text-xs text-slate-600">{formData.signer2_title}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer (faction info) */}
            <div className="mt-auto pt-8 border-t border-black text-[10px] text-slate-600">
              <div>{formData.footer_line1}</div>
              <div>{formData.footer_line2}</div>
              <div>{formData.footer_line3}</div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>Schließen</Button>
            <Button onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" /> Drucken
            </Button>
            <Button onClick={handleDownloadPDF}>
              <Download className="w-4 h-4 mr-2" /> PDF herunterladen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vorlage löschen?</DialogTitle>
            <DialogDescription>
              Möchten Sie die Vorlage "{formData.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Abbrechen</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate(selectedTemplate?.id)}>
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
