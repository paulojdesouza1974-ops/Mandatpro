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
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Save, Eye, FileText, Plus, Trash2, Copy, Printer, 
  Download, Settings, Layout, Type, FileImage
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

const DEFAULT_TEMPLATE = {
  name: "Neue Vorlage",
  description: "",
  // Header
  faction_name: "AfD Fraktion im Rat der Stadt Dormagen",
  faction_subtitle: "",
  city: "Dormagen",
  // Recipient
  recipient_name: "Herrn Bürgermeister Erik Lierenfeld",
  recipient_institution: "Neues Rathaus",
  recipient_street: "Paul-Wierich-Platz 2",
  recipient_postal: "41539 Dormagen",
  // Footer
  signer1_name: "",
  signer1_title: "Fraktionsvorsitzender",
  signer2_name: "",
  signer2_title: "1.stv. Fraktionsvorsitzender",
  // Styling
  font_family: "Times New Roman",
  primary_color: "#000000",
  logo_url: "",
  is_default: false,
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
    // First unset all defaults
    for (const t of templates) {
      if (t.is_default && t.id !== formData.id) {
        await base44.entities.PrintTemplate.update(t.id, { is_default: false });
      }
    }
    // Set current as default
    setFormData({ ...formData, is_default: true });
    saveMutation.mutate({ ...formData, is_default: true });
  };

  const generatePDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const margin = 25;
    const pageWidth = 210;
    const contentWidth = pageWidth - 2 * margin;
    let y = margin;

    // Set font
    doc.setFont("times", "normal");

    // Header: Faction name (left) and Date (right)
    doc.setFontSize(11);
    doc.setFont("times", "bold");
    doc.text(formData.faction_name || "Fraktion", margin, y);
    
    // Date on right
    doc.setFont("times", "normal");
    const dateText = `${formData.city || "Dormagen"} den: ${previewData.date}`;
    doc.text(dateText, pageWidth - margin, y, { align: "right" });
    
    y += 10;

    // Document type checkboxes
    doc.setFontSize(10);
    let xPos = margin;
    DOCUMENT_TYPES.forEach((type) => {
      const isChecked = previewData.documentType === type.id;
      // Draw checkbox
      doc.rect(xPos, y - 3, 3, 3);
      if (isChecked) {
        doc.setFont("times", "bold");
        doc.text("X", xPos + 0.7, y - 0.5);
        doc.setFont("times", "normal");
      }
      doc.text(type.label, xPos + 5, y);
      xPos += 40;
    });
    
    y += 15;

    // Recipient address
    doc.setFontSize(11);
    const recipientLines = [
      formData.recipient_name,
      formData.recipient_institution,
      formData.recipient_street,
      formData.recipient_postal,
    ].filter(Boolean);
    
    recipientLines.forEach((line) => {
      doc.text(line, margin, y);
      y += 5;
    });

    y += 10;

    // Subject
    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.text(`Antrag: ${previewData.subject}`, margin, y);
    doc.setFont("times", "normal");
    
    y += 10;

    // Meeting reference
    doc.setFontSize(11);
    doc.text(`Sitzung des Stadtrats vom ${previewData.meetingDate}`, margin, y);
    
    y += 15;

    // Beschlussvorlage
    doc.setFont("times", "bold");
    doc.text("Beschlussvorlage", margin, y);
    doc.setFont("times", "normal");
    y += 7;
    
    const beschlussLines = doc.splitTextToSize(previewData.beschluss, contentWidth);
    beschlussLines.forEach((line) => {
      doc.text(line, margin, y);
      y += 5;
    });

    y += 10;

    // Begründung
    doc.setFont("times", "bold");
    doc.text("Begründung", margin, y);
    doc.setFont("times", "normal");
    y += 7;
    
    const begruendungLines = doc.splitTextToSize(previewData.begruendung, contentWidth);
    begruendungLines.forEach((line) => {
      if (y > 260) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 5;
    });

    // Footer with signature line
    y = 270;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 7;
    
    // Signers
    if (formData.signer1_name) {
      doc.text(formData.signer1_name, margin, y);
      doc.setFontSize(9);
      doc.text(formData.signer1_title, margin, y + 4);
    }
    
    if (formData.signer2_name) {
      doc.setFontSize(11);
      doc.text(formData.signer2_name, pageWidth / 2, y);
      doc.setFontSize(9);
      doc.text(formData.signer2_title, pageWidth / 2, y + 4);
    }

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
    <div className="space-y-6">
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
                <TabsTrigger value="header"><Layout className="w-4 h-4 mr-1" /> Kopfbereich</TabsTrigger>
                <TabsTrigger value="recipient"><FileText className="w-4 h-4 mr-1" /> Empfänger</TabsTrigger>
                <TabsTrigger value="footer"><Type className="w-4 h-4 mr-1" /> Fußzeile</TabsTrigger>
                <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-1" /> Einstellungen</TabsTrigger>
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
                    />
                  </div>
                </div>

                <div>
                  <Label>Logo URL (optional)</Label>
                  <Input
                    value={formData.logo_url}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    placeholder="https://example.com/logo.png"
                  />
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
                      />
                    </div>
                    <div>
                      <Label>Straße</Label>
                      <Input
                        value={formData.recipient_street}
                        onChange={(e) => setFormData({ ...formData, recipient_street: e.target.value })}
                        placeholder="Paul-Wierich-Platz 2"
                      />
                    </div>
                    <div>
                      <Label>PLZ und Ort</Label>
                      <Input
                        value={formData.recipient_postal}
                        onChange={(e) => setFormData({ ...formData, recipient_postal: e.target.value })}
                        placeholder="41539 Dormagen"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Footer Tab */}
              <TabsContent value="footer" className="space-y-4">
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
                      />
                    </div>
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
                        placeholder="1.stv. Fraktionsvorsitzender"
                      />
                    </div>
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
                      <SelectTrigger>
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
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={handleDuplicate}
                    disabled={!selectedTemplate}
                  >
                    <Copy className="w-4 h-4 mr-2" /> Duplizieren
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleSetDefault}
                    disabled={formData.is_default}
                  >
                    Als Standard setzen
                  </Button>
                  {selectedTemplate && (
                    <Button 
                      variant="destructive" 
                      onClick={() => setShowDeleteDialog(true)}
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
                <SelectTrigger>
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
              />
            </div>
            <div className="md:col-span-2">
              <Label>Betreff</Label>
              <Input
                value={previewData.subject}
                onChange={(e) => setPreviewData({ ...previewData, subject: e.target.value })}
              />
            </div>
          </div>

          {/* Document Preview */}
          <div className="border rounded-lg p-8 bg-white shadow-inner" style={{ fontFamily: formData.font_family }}>
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div className="font-bold">{formData.faction_name}</div>
              <div>{formData.city} den: {previewData.date}</div>
            </div>

            {/* Document Type Checkboxes */}
            <div className="flex gap-6 mb-6 text-sm">
              {DOCUMENT_TYPES.map((type) => (
                <div key={type.id} className="flex items-center gap-1">
                  <div className="w-4 h-4 border border-black flex items-center justify-center text-xs">
                    {previewData.documentType === type.id ? "X" : ""}
                  </div>
                  <span>{type.label}</span>
                </div>
              ))}
            </div>

            {/* Recipient */}
            <div className="mb-6 leading-relaxed">
              <div>{formData.recipient_name}</div>
              <div>{formData.recipient_institution}</div>
              <div>{formData.recipient_street}</div>
              <div>{formData.recipient_postal}</div>
            </div>

            {/* Subject */}
            <div className="font-bold mb-4">
              Antrag: {previewData.subject}
            </div>

            {/* Meeting Reference */}
            <div className="mb-6">
              Sitzung des Stadtrats vom {previewData.meetingDate}
            </div>

            {/* Beschlussvorlage */}
            <div className="mb-6">
              <div className="font-bold mb-2">Beschlussvorlage</div>
              <div>{previewData.beschluss}</div>
            </div>

            {/* Begründung */}
            <div className="mb-8">
              <div className="font-bold mb-2">Begründung</div>
              <div>{previewData.begruendung}</div>
            </div>

            {/* Signature Line */}
            <div className="border-t border-black pt-4 mt-auto">
              <div className="flex justify-between">
                <div>
                  <div>{formData.signer1_name || "________________"}</div>
                  <div className="text-sm text-slate-600">{formData.signer1_title}</div>
                </div>
                <div>
                  <div>{formData.signer2_name || "________________"}</div>
                  <div className="text-sm text-slate-600">{formData.signer2_title}</div>
                </div>
              </div>
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
