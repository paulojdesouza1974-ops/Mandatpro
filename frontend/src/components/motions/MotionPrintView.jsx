import React, { useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Printer, X, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/apiClient";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const DOCUMENT_TYPES = [
  { id: "einzelantrag", label: "Einzelantrag" },
  { id: "fraktionsantrag", label: "Fraktionsantrag" },
  { id: "fraktionsanfrage", label: "Fraktionsanfrage" },
  { id: "beschlusskontrolle", label: "Beschlusskontrolle" },
];

const LOGO_DIMENSIONS = {
  widthPx: 140,
  heightPx: 70,
};

const getLogoSrc = (template) => template?.logo_base64 || template?.logo_url || template?.logo || "";

const mapMotionTypeToDocType = (type) => {
  if (type === "anfrage") return "fraktionsanfrage";
  if (type === "aenderungsantrag") return "einzelantrag";
  if (type === "antrag" || type === "dringlichkeitsantrag") return "fraktionsantrag";
  if (type === "beschluss" || type === "resolution") return "beschlusskontrolle";
  return "fraktionsantrag";
};

const shouldPrependTitle = (body) => !/^\s*(Antrag|Anfrage|Beschluss|Resolution)/i.test(body || "");

export default function MotionPrintView({ motion, open, onClose }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [exporting, setExporting] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ["printTemplates", motion?.organization],
    queryFn: () => base44.entities.PrintTemplate.filter({ organization: motion?.organization }),
    enabled: !!motion?.organization,
  });

  if (!motion) return null;

  const defaultTemplate = templates.find((t) => t.is_default) || templates[0];
  const selectedTemplate = selectedTemplateId
    ? templates.find((t) => t.id === selectedTemplateId)
    : defaultTemplate;

  const logoSrc = getLogoSrc(selectedTemplate);
  const documentType = mapMotionTypeToDocType(motion.type);
  const motionDate = motion.submitted_date || motion.created_date || new Date().toISOString();

  const recipientLines = [
    selectedTemplate?.recipient_name,
    selectedTemplate?.recipient_institution,
    selectedTemplate?.recipient_street,
    selectedTemplate?.recipient_postal,
  ].filter(Boolean);

  const headerName = selectedTemplate?.faction_name || "Fraktion";
  const headerCity = selectedTemplate?.city || "";

  const bodyText = motion.body || "";
  const displayText = shouldPrependTitle(bodyText)
    ? `Antrag: ${motion.title || ""}\n\n${bodyText}`.trim()
    : bodyText || `Antrag: ${motion.title || ""}`;

  const paragraphs = displayText.split(/\n\s*\n/).filter(Boolean);

  const signatureEntries = [
    {
      name: motion.signature_name || motion.created_by || "",
      role: motion.signature_role,
    },
    {
      name: motion.signature_name_2 || "",
      role: motion.signature_role_2,
    },
  ].filter((entry) => entry.name);

  const getRoleLabel = (role) => {
    if (role === "fraktionsvorsitzender") return "Fraktionsvorsitzender";
    if (role === "stv_fraktionsvorsitzender") return "Stv. Fraktionsvorsitzender";
    if (role === "fraktionsgeschaeftsfuehrer") return "Fraktionsgeschäftsführer";
    if (role === "ratsmitglied") return "Ratsmitglied";
    if (role === "sachkundiger_buerger") return "Sachkundiger Bürger";
    return "";
  };

  const handlePrint = () => {
    const printContent = document.querySelector('.motion-print-content');
    if (!printContent) {
      alert("Druckansicht ist nicht verfügbar.");
      return;
    }

    const existingWrapper = document.getElementById('motion-print-root');
    if (existingWrapper) {
      existingWrapper.remove();
    }

    const printWrapper = document.createElement('div');
    printWrapper.id = 'motion-print-root';
    const clone = printContent.cloneNode(true);
    clone.style.padding = '0';
    clone.style.margin = '0';
    clone.style.width = '100%';
    clone.style.boxSizing = 'border-box';
    printWrapper.appendChild(clone);
    document.body.appendChild(printWrapper);

    const existingStyle = document.getElementById('motion-print-style');
    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement('style');
    style.id = 'motion-print-style';
    style.innerHTML = `
      #motion-print-root {
        position: fixed;
        left: -9999px;
        top: 0;
        width: 210mm;
      }
      #motion-print-root .motion-print-content {
        padding: 0 !important;
        width: 100% !important;
        box-sizing: border-box;
      }
      @media print {
        body * {
          visibility: hidden !important;
        }
        #motion-print-root,
        #motion-print-root * {
          visibility: visible !important;
        }
        #motion-print-root {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          padding: 2cm 2.5cm;
          background: white;
        }
        @page {
          margin: 2cm 2.5cm;
          size: A4;
        }
      }
    `;
    document.head.appendChild(style);

    const cleanup = () => {
      printWrapper.remove();
      style.remove();
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);
    window.print();
    setTimeout(cleanup, 1500);
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const printContent = document.querySelector('.motion-print-content');
      const canvas = await html2canvas(printContent, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${motion.title?.replace(/[^a-z0-9]/gi, '_') || 'antrag'}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('PDF Export Fehler:', error);
      alert('Fehler beim Exportieren als PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" data-testid="motion-print-dialog">
        <div className="flex justify-between items-center gap-2 mb-4 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">Vorlage:</span>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger className="w-64" data-testid="motion-print-template-select">
                <SelectValue placeholder={defaultTemplate?.name || "Standard"} />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name} {template.is_default ? "(Standard)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} data-testid="motion-print-close">
              <X className="w-4 h-4 mr-1" /> Schließen
            </Button>
            <Button size="sm" onClick={handleExportPDF} disabled={exporting} variant="outline" data-testid="motion-print-pdf">
              <Download className="w-4 h-4 mr-1" />
              {exporting ? "Exportiere..." : "PDF"}
            </Button>
            <Button size="sm" onClick={handlePrint} className="bg-slate-900" data-testid="motion-print-button">
              <Printer className="w-4 h-4 mr-1" /> Drucken
            </Button>
          </div>
        </div>

        <div
          className="motion-print-content bg-white p-12 relative"
          style={{
            fontFamily: selectedTemplate?.font_family || 'Times New Roman',
            color: selectedTemplate?.primary_color || '#000000',
          }}
          data-testid="motion-print-content"
        >
          <div className="flex justify-between items-start mb-8" data-testid="motion-print-header">
            <div className="font-bold text-sm flex-1">
              <div>{headerName}</div>
              {headerCity && <div className="italic text-xs">{headerCity}</div>}
            </div>
            <div className="flex flex-col items-end gap-2">
              {logoSrc && (
                <img
                  src={logoSrc}
                  alt="Logo"
                  className="object-contain"
                  style={{ width: LOGO_DIMENSIONS.widthPx, height: LOGO_DIMENSIONS.heightPx }}
                  data-testid="motion-print-logo"
                />
              )}
              <div className="border border-black p-2 text-xs w-48" data-testid="motion-print-type-box">
                <div className="mb-1">{headerCity || ""} den: {format(new Date(motionDate), "dd.MM.yyyy", { locale: de })}</div>
                <div className="grid grid-cols-2 gap-1 mt-2">
                  {DOCUMENT_TYPES.map((type) => (
                    <div key={type.id} className="flex items-center gap-1">
                      <div className="w-3 h-3 border border-black flex items-center justify-center text-[8px]">
                        {documentType === type.id ? "X" : ""}
                      </div>
                      <span className="text-[9px]">{type.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {recipientLines.length > 0 && (
            <div className="mb-8 text-sm leading-relaxed" data-testid="motion-print-recipient">
              {recipientLines.map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
            </div>
          )}

          <div className="space-y-4 text-sm" data-testid="motion-print-body">
            {paragraphs.map((paragraph, idx) => (
              <p key={idx} className="whitespace-pre-wrap leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>

          {signatureEntries.length > 0 && (
            <div className="mt-16 grid grid-cols-2 gap-10" data-testid="motion-print-signatures">
              {signatureEntries.map((signature, idx) => (
                <div key={idx}>
                  <div className="border-t border-black w-48 mb-2"></div>
                  <p className="font-semibold">{signature.name}</p>
                  {signature.role && (
                    <p className="text-xs italic">{getRoleLabel(signature.role)}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {(selectedTemplate?.footer_line1 || selectedTemplate?.footer_line2 || selectedTemplate?.footer_line3) && (
            <div
              className="absolute bottom-0 left-0 right-0 text-center p-4 text-xs border-t"
              style={{ borderColor: selectedTemplate?.primary_color || '#000000' }}
              data-testid="motion-print-footer"
            >
              <div>{selectedTemplate?.footer_line1}</div>
              <div>{selectedTemplate?.footer_line2}</div>
              <div>{selectedTemplate?.footer_line3}</div>
            </div>
          )}
        </div>
        
      </DialogContent>
    </Dialog>
  );
}
