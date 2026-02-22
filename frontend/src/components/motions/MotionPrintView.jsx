import React, { useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Printer, X, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/apiClient";

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
  const { toast } = useToast();
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
        font-family: Arial, Helvetica, sans-serif;
        color: #222;
        background: #fff;
      }
      #motion-print-root .header {
        display: flex;
        align-items: center;
        gap: 20px;
        margin-bottom: 20px;
      }
      #motion-print-root .header-logo {
        width: 120px;
        height: auto;
      }
      #motion-print-root .header-title {
        font-size: 1.3em;
        font-weight: bold;
        color: #0072c6;
      }
      #motion-print-root .header-subtitle {
        font-size: 1em;
        color: #333;
        font-style: italic;
      }
      #motion-print-root table {
        border-collapse: collapse;
        width: 100%;
        margin: 20px 0;
        page-break-inside: auto;
      }
      #motion-print-root .doc-type-table {
        margin: 0;
        width: 260px;
      }
      #motion-print-root th,
      #motion-print-root td {
        border: 1px solid #bbb;
        padding: 8px 12px;
        text-align: left;
        font-size: 1em;
      }
      #motion-print-root th {
        background: #f2f2f2;
        font-weight: bold;
      }
      #motion-print-root .section-title {
        font-size: 1.2em;
        font-weight: bold;
        margin: 24px 0 8px 0;
        color: #0072c6;
      }
      #motion-print-root .bold {
        font-weight: bold;
      }
      #motion-print-root .italic {
        font-style: italic;
      }
      #motion-print-root .signature-table {
        margin-top: 40px;
        width: 60%;
      }
      #motion-print-root .signature-table th {
        font-size: 1em;
        font-weight: normal;
        text-align: left;
        border: none;
        background: none;
      }
      #motion-print-root .footer {
        margin-top: 40px;
        font-size: 0.95em;
        color: #666;
      }
      #motion-print-root td {
        page-break-inside: auto;
        break-inside: auto;
      }
      #motion-print-root .motion-print-body-area {
        page-break-inside: auto;
        break-inside: auto;
      }
      #motion-print-root thead {
        display: table-header-group;
      }
      #motion-print-root tfoot {
        display: table-footer-group;
      }
      #motion-print-root .avoid-break {
        break-inside: avoid;
        page-break-inside: avoid;
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
    toast({
      title: "PDF-Export",
      description: 'Bitte im Druckdialog "Als PDF speichern" wählen.',
    });
    handlePrint();
    setExporting(false);
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
          <table className="w-full" style={{ borderCollapse: "collapse" }} data-testid="motion-print-table">
            <thead style={{ display: "table-header-group" }}>
              <tr>
                <td className="pb-6">
                  <div className="header motion-print-header" data-testid="motion-print-header">
                    {logoSrc && (
                      <img
                        src={logoSrc}
                        alt="Logo"
                        className="header-logo"
                        data-testid="motion-print-logo"
                      />
                    )}
                    <div>
                      <div className="header-title">{headerName}</div>
                      {headerCity && <div className="header-subtitle">{headerCity}</div>}
                    </div>
                    <div className="doc-type-wrapper" style={{ marginLeft: "auto" }}>
                      <table className="doc-type-table" data-testid="motion-print-type-box">
                        <thead>
                          <tr>
                            <th colSpan={2}>Dokumenttyp</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="bold">Datum</td>
                            <td>{headerCity || ""} den: {format(new Date(motionDate), "dd.MM.yyyy", { locale: de })}</td>
                          </tr>
                          {DOCUMENT_TYPES.map((type) => (
                            <tr key={type.id}>
                              <td className="bold" style={{ width: "24px" }}>
                                {documentType === type.id ? "X" : ""}
                              </td>
                              <td>{type.label}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="align-top">
                  <div className="motion-print-body-area">
                    {recipientLines.length > 0 && (
                      <div className="mb-8 text-sm leading-relaxed avoid-break" data-testid="motion-print-recipient">
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
                      <div className="mt-16 grid grid-cols-2 gap-10 avoid-break" data-testid="motion-print-signatures">
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
                  </div>
                </td>
              </tr>
            </tbody>
            {(selectedTemplate?.footer_line1 || selectedTemplate?.footer_line2 || selectedTemplate?.footer_line3) && (
              <tfoot style={{ display: "table-footer-group" }}>
                <tr>
                  <td className="pt-6">
                    <div
                      className="motion-print-footer text-center text-xs border-t pt-4"
                      style={{ borderColor: selectedTemplate?.primary_color || '#000000' }}
                      data-testid="motion-print-footer"
                    >
                      <div>{selectedTemplate?.footer_line1}</div>
                      <div>{selectedTemplate?.footer_line2}</div>
                      <div>{selectedTemplate?.footer_line3}</div>
                    </div>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        
      </DialogContent>
    </Dialog>
  );
}
