import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Printer, X, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const typeLabels = {
  antrag: "Antrag",
  anfrage: "Anfrage",
  beschluss: "Beschluss",
  resolution: "Resolution",
  aenderungsantrag: "Änderungsantrag",
  dringlichkeitsantrag: "Dringlichkeitsantrag",
};

export default function MotionPrintView({ motion, open, onClose }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [exporting, setExporting] = useState(false);
  
  const { data: templates = [] } = useQuery({
    queryKey: ['printTemplates'],
    queryFn: () => base44.entities.PrintTemplate.list(),
  });

  // Define selectedTemplate and defaultTemplate based on templates array
  const defaultTemplate = templates.find(t => t.is_default) || templates[0];
  const selectedTemplate = selectedTemplateId 
    ? templates.find(t => t.id === selectedTemplateId) 
    : defaultTemplate;

  if (!motion) return null;

  const { data: orgData = [] } = useQuery({
    queryKey: ['printOrganization', motion?.organization],
    queryFn: () => base44.entities.Organization.filter({ name: motion?.organization }),
    enabled: !!motion?.organization,
  });

  const organization = orgData[0] || null;

  const headerName = selectedTemplate?.fraction_name || organization?.display_name || "Fraktion";
  const headerSubtitle = selectedTemplate?.fraction_subtitle || organization?.city || "";

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

  const footerText = selectedTemplate?.footer_text || buildFooterText();

  const logoStyle = selectedTemplate?.logo_position_x !== null && selectedTemplate?.logo_position_x !== undefined
    ? { left: `${selectedTemplate.logo_position_x}px`, top: `${selectedTemplate.logo_position_y || 0}px` }
    : { right: '0', top: '0' };
  const docBoxStyle = selectedTemplate?.document_type_box_x !== null && selectedTemplate?.document_type_box_x !== undefined
    ? { left: `${selectedTemplate.document_type_box_x}px`, top: `${selectedTemplate.document_type_box_y || 0}px` }
    : { right: '0', top: '110px' };
  
  const getRoleLabel = (role) => {
    if (role === "fraktionsvorsitzender") return "Fraktionsvorsitzender";
    if (role === "stv_fraktionsvorsitzender") return "Stv. Fraktionsvorsitzender";
    if (role === "fraktionsgeschaeftsfuehrer") return "Fraktionsgeschäftsführer";
    if (role === "ratsmitglied") return "Ratsmitglied";
    if (role === "sachkundiger_buerger") return "Sachkundiger Bürger";
    return "";
  };

  const signatureEntries = [
    {
      name: motion.signature_name || motion.created_by || "Unbekannt",
      role: motion.signature_role,
    },
    {
      name: motion.signature_name_2,
      role: motion.signature_role_2,
    },
  ].filter(entry => entry.name);

  const handlePrint = () => {
    window.print();
  };

  const handleExportWord = async () => {
    setExporting(true);
    try {
      const printContent = document.querySelector('.print-content');
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: ${selectedTemplate?.font_family || 'Arial'}, sans-serif;
      color: ${selectedTemplate?.secondary_color || '#000000'};
      margin: 2cm 2.5cm;
    }
    table {
      border-collapse: collapse;
      width: 200px;
      font-size: 9pt;
    }
    td {
      border: 1px solid black;
      padding: 4pt;
    }
    h1, h2 {
      color: ${selectedTemplate?.primary_color || '#000000'};
      font-weight: bold;
    }
    .text-center {
      text-align: center;
    }
    .font-bold {
      font-weight: bold;
    }
    .italic {
      font-style: italic;
    }
    p {
      line-height: 1.5;
      text-align: justify;
      margin-bottom: 10pt;
    }
  </style>
</head>
<body>
${printContent.innerHTML}
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${motion.title.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyy-MM-dd')}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Word Export Fehler:', error);
      alert('Fehler beim Exportieren als Word-Dokument');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const printContent = document.querySelector('.print-content');
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
      pdf.save(`${motion.title.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('PDF Export Fehler:', error);
      alert('Fehler beim Exportieren als PDF');
    } finally {
      setExporting(false);
    }
  };

  const getPositionClass = (position) => {
    const positions = {
      'oben_links': 'top-0 left-0',
      'oben_rechts': 'top-0 right-0',
      'oben_mitte': 'top-0 left-1/2 -translate-x-1/2',
      'unten_links': 'bottom-0 left-0',
      'unten_rechts': 'bottom-0 right-0',
    };
    return positions[position] || 'top-0 left-0';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center gap-2 mb-4 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">Vorlage:</span>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger className="w-64">
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
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="w-4 h-4 mr-1" /> Schließen
            </Button>
            <Button size="sm" onClick={handleExportPDF} disabled={exporting} variant="outline">
              <Download className="w-4 h-4 mr-1" /> 
              {exporting ? "Exportiere..." : "PDF"}
            </Button>
            <Button size="sm" onClick={handleExportWord} disabled={exporting} variant="outline">
              <Download className="w-4 h-4 mr-1" /> 
              {exporting ? "Exportiere..." : "Word"}
            </Button>
            <Button size="sm" onClick={handlePrint} className="bg-slate-900">
              <Printer className="w-4 h-4 mr-1" /> Drucken
            </Button>
          </div>
        </div>

        <div 
          className="print-content bg-white p-12 relative"
          style={{
            fontFamily: selectedTemplate?.font_family || 'Arial',
            color: selectedTemplate?.secondary_color || '#64748b',
          }}
        >
          {selectedTemplate?.custom_css && (
            <style dangerouslySetInnerHTML={{ __html: selectedTemplate.custom_css }} />
          )}

          {/* Header Area */}
          <div className="relative mb-10" style={{ minHeight: '4cm' }}>
            <div className="text-center">
              <div className="font-bold text-base" style={{ color: selectedTemplate?.primary_color }}>
                {headerName}
              </div>
              {headerSubtitle && (
                <div className="italic text-sm" style={{ color: selectedTemplate?.primary_color }}>
                  {headerSubtitle}
                </div>
              )}
              {selectedTemplate?.header_text && (
                <div className="text-xs mt-2 whitespace-pre-line" style={{ color: selectedTemplate?.secondary_color }}>
                  {selectedTemplate.header_text}
                </div>
              )}
            </div>

            {selectedTemplate?.logo_url && (
              <div className="absolute" style={{ ...logoStyle }}>
                <img src={selectedTemplate.logo_url} alt="Logo" className="h-16 object-contain" />
              </div>
            )}

            {selectedTemplate?.show_document_type_box && (
              <div className="absolute border border-black" style={{ ...docBoxStyle, width: '200px' }}>
                <table className="w-full text-xs">
                  <tbody>
                    <tr className="border-b border-black">
                      <td className="p-2 border-r border-black">Fraktionsantrag</td>
                      <td className="p-2 text-center">{motion.type === 'antrag' ? 'X' : ''}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="p-2 border-r border-black">Einzelantrag</td>
                      <td className="p-2 text-center">{motion.type === 'aenderungsantrag' ? 'X' : ''}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="p-2 border-r border-black">Anfrage</td>
                      <td className="p-2 text-center">{motion.type === 'anfrage' ? 'X' : ''}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="p-2 border-r border-black">Beschluss</td>
                      <td className="p-2 text-center">{motion.type === 'resolution' || motion.type === 'beschluss' ? 'X' : ''}</td>
                    </tr>
                    {selectedTemplate.date_position === 'in_box' && (
                      <tr>
                        <td className="p-2" colSpan="2">
                          Dormagen den {format(new Date(motion.created_date), "dd.MM.yyyy", { locale: de })}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recipient Address */}
          {selectedTemplate?.show_recipient_address && selectedTemplate?.recipient_title && (
            <div className="mb-12 whitespace-pre-line" style={{ color: selectedTemplate?.secondary_color }}>
              {selectedTemplate.recipient_title}
            </div>
          )}

          {/* Hauptinhalt */}
          <div className="mb-12">
            <div className="prose prose-slate max-w-none motion-body">
              <div className="whitespace-pre-wrap leading-relaxed text-base" style={{ textAlign: 'justify' }}>
                {motion.body || "Kein Inhalt vorhanden"}
              </div>
            </div>

            {motion.notes && (
              <div className="mt-8 pt-6 border-t" style={{ borderColor: selectedTemplate?.secondary_color }}>
                <p className="text-sm font-semibold mb-2">Interne Notizen:</p>
                <p className="text-sm whitespace-pre-wrap">{motion.notes}</p>
              </div>
            )}

            {/* Unterschrift - am Ende des Dokuments */}
            {selectedTemplate?.show_creator && signatureEntries.length > 0 && (
              <div className="mt-16 grid grid-cols-2 gap-8">
                {signatureEntries.map((signature, idx) => (
                  <div key={idx}>
                    <div className="border-t border-black w-48 mb-2"></div>
                    <p className="font-semibold" style={{ color: selectedTemplate?.primary_color }}>
                      {signature.name}
                    </p>
                    {signature.role && (
                      <p className="text-xs italic" style={{ color: selectedTemplate?.secondary_color }}>
                        {getRoleLabel(signature.role)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Text */}
          {footerText && (
            <div 
              className="absolute bottom-0 left-0 right-0 text-center p-4 text-xs border-t-2"
              style={{ 
                borderColor: selectedTemplate?.primary_color,
                color: selectedTemplate?.secondary_color 
              }}
            >
              {footerText}
            </div>
          )}
        </div>

        <style>{`
          @media print {
            @page {
              margin: 2cm 2.5cm;
              size: A4;
            }
            
            html, body {
              margin: 0;
              padding: 0;
              width: 210mm;
              height: 297mm;
            }
            
            body > * {
              visibility: hidden;
            }
            
            .print-content,
            .print-content * {
              visibility: visible;
            }
            
            .print-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 2cm 2.5cm;
              background: white;
            }
            
            .print\\:hidden {
              display: none !important;
            }
            
            table {
              page-break-inside: avoid;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}