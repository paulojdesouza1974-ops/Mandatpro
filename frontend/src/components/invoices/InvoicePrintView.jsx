import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function InvoicePrintView({ open, onOpenChange, invoice }) {
  const [isExporting, setIsExporting] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportWord = async () => {
    setIsExporting(true);
    try {
      const content = document.getElementById("invoice-content");
      if (!content) return;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 40px; }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .company-info { text-align: right; }
            .invoice-title { font-size: 28px; font-weight: bold; margin-bottom: 30px; }
            .recipient { margin-bottom: 30px; }
            .details { display: flex; gap: 40px; margin-bottom: 30px; }
            .details-section { flex: 1; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
            th { background-color: #f8fafc; font-weight: bold; }
            .totals { text-align: right; margin-top: 20px; }
            .totals-row { display: flex; justify-content: flex-end; gap: 100px; padding: 8px 0; }
            .total-amount { font-size: 20px; font-weight: bold; border-top: 2px solid #1e293b; padding-top: 12px; margin-top: 12px; }
            .notes { margin-top: 40px; padding: 20px; background-color: #f8fafc; border-radius: 8px; }
            .bank-details { margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 style="margin: 0; font-size: 24px;">${user?.fraction_name || "Fraktion"}</h1>
              ${user?.fraction_address ? `<p style="margin: 5px 0 0 0;">${user.fraction_address}</p>` : ""}
            </div>
            <div class="company-info">
              <p style="margin: 0;"><strong>Rechnungsnr.:</strong> ${invoice.invoice_number}</p>
              <p style="margin: 5px 0 0 0;"><strong>Datum:</strong> ${invoice.invoice_date ? format(new Date(invoice.invoice_date), "dd.MM.yyyy", { locale: de }) : ""}</p>
            </div>
          </div>

          <div class="invoice-title">Rechnung</div>

          <div class="recipient">
            <p style="margin: 0;"><strong>${invoice.recipient_name}</strong></p>
            ${invoice.recipient_address ? `<p style="margin: 5px 0 0 0; white-space: pre-line;">${invoice.recipient_address}</p>` : ""}
          </div>

          <div class="details">
            ${invoice.due_date ? `
            <div class="details-section">
              <p style="margin: 0;"><strong>Fälligkeitsdatum:</strong></p>
              <p style="margin: 5px 0 0 0;">${format(new Date(invoice.due_date), "dd.MM.yyyy", { locale: de })}</p>
            </div>
            ` : ""}
            ${invoice.payment_method ? `
            <div class="details-section">
              <p style="margin: 0;"><strong>Zahlungsart:</strong></p>
              <p style="margin: 5px 0 0 0;">${invoice.payment_method}</p>
            </div>
            ` : ""}
          </div>

          <table>
            <thead>
              <tr>
                <th>Beschreibung</th>
                <th style="text-align: center;">Menge</th>
                <th style="text-align: right;">Einzelpreis</th>
                <th style="text-align: right;">Gesamt</th>
              </tr>
            </thead>
            <tbody>
              ${(invoice.items || []).map(item => `
                <tr>
                  <td>${item.description || ""}</td>
                  <td style="text-align: center;">${item.quantity || 0}</td>
                  <td style="text-align: right;">${(item.unit_price || 0).toFixed(2)} €</td>
                  <td style="text-align: right;">${(item.total || 0).toFixed(2)} €</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row">
              <div>Zwischensumme:</div>
              <div>${(invoice.subtotal || 0).toFixed(2)} €</div>
            </div>
            <div class="totals-row">
              <div>MwSt. (${invoice.tax_rate || 19}%):</div>
              <div>${(invoice.tax_amount || 0).toFixed(2)} €</div>
            </div>
            <div class="totals-row total-amount">
              <div>Gesamtbetrag:</div>
              <div>${(invoice.total_amount || 0).toFixed(2)} €</div>
            </div>
          </div>

          ${invoice.bank_details ? `
          <div class="bank-details">
            <p style="margin: 0;"><strong>Bankverbindung:</strong></p>
            <p style="margin: 5px 0 0 0; white-space: pre-line;">${invoice.bank_details}</p>
          </div>
          ` : ""}

          ${invoice.notes ? `
          <div class="notes">
            <p style="margin: 0;"><strong>Zahlungshinweise:</strong></p>
            <p style="margin: 10px 0 0 0; white-space: pre-line;">${invoice.notes}</p>
          </div>
          ` : ""}
        </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: "application/msword" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Rechnung_${invoice.invoice_number || "unbenannt"}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export fehlgeschlagen:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Rechnung anzeigen</DialogTitle>
        </DialogHeader>

        <div className="flex gap-3 mb-4 print:hidden">
          <Button onClick={handlePrint} variant="outline">
            <Printer className="w-4 h-4 mr-2" />
            Drucken
          </Button>
          <Button onClick={handleExportWord} disabled={isExporting}>
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? "Exportiere..." : "Als Word exportieren"}
          </Button>
        </div>

        <div className="overflow-auto max-h-[calc(90vh-200px)]">
          <div id="invoice-content" className="bg-white p-12 print:p-0">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-2xl font-bold mb-1">{user?.fraction_name || "Fraktion"}</h1>
                {user?.fraction_address && (
                  <p className="text-sm text-slate-600 whitespace-pre-line">{user.fraction_address}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm"><strong>Rechnungsnr.:</strong> {invoice.invoice_number}</p>
                <p className="text-sm">
                  <strong>Datum:</strong>{" "}
                  {invoice.invoice_date
                    ? format(new Date(invoice.invoice_date), "dd.MM.yyyy", { locale: de })
                    : ""}
                </p>
              </div>
            </div>

            <h2 className="text-3xl font-bold mb-8">Rechnung</h2>

            <div className="mb-8">
              <p className="font-semibold text-lg">{invoice.recipient_name}</p>
              {invoice.recipient_address && (
                <p className="text-slate-600 whitespace-pre-line">{invoice.recipient_address}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              {invoice.due_date && (
                <div>
                  <p className="text-sm font-semibold mb-1">Fälligkeitsdatum:</p>
                  <p>{format(new Date(invoice.due_date), "dd.MM.yyyy", { locale: de })}</p>
                </div>
              )}
              {invoice.payment_method && (
                <div>
                  <p className="text-sm font-semibold mb-1">Zahlungsart:</p>
                  <p className="capitalize">{invoice.payment_method}</p>
                </div>
              )}
            </div>

            <table className="w-full mb-6">
              <thead>
                <tr className="border-b-2 border-slate-900">
                  <th className="text-left py-3">Beschreibung</th>
                  <th className="text-center py-3">Menge</th>
                  <th className="text-right py-3">Einzelpreis</th>
                  <th className="text-right py-3">Gesamt</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.items || []).map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-200">
                    <td className="py-3">{item.description}</td>
                    <td className="text-center py-3">{item.quantity}</td>
                    <td className="text-right py-3">{(item.unit_price || 0).toFixed(2)} €</td>
                    <td className="text-right py-3">{(item.total || 0).toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end mb-8">
              <div className="w-80 space-y-2">
                <div className="flex justify-between py-2">
                  <span>Zwischensumme:</span>
                  <span className="font-semibold">{(invoice.subtotal || 0).toFixed(2)} €</span>
                </div>
                <div className="flex justify-between py-2">
                  <span>MwSt. ({invoice.tax_rate || 19}%):</span>
                  <span className="font-semibold">{(invoice.tax_amount || 0).toFixed(2)} €</span>
                </div>
                <div className="flex justify-between py-3 border-t-2 border-slate-900 text-lg font-bold">
                  <span>Gesamtbetrag:</span>
                  <span>{(invoice.total_amount || 0).toFixed(2)} €</span>
                </div>
              </div>
            </div>

            {invoice.bank_details && (
              <div className="mb-6">
                <p className="font-semibold mb-2">Bankverbindung:</p>
                <p className="text-slate-700 whitespace-pre-line">{invoice.bank_details}</p>
              </div>
            )}

            {invoice.notes && (
              <div className="bg-slate-50 p-6 rounded-lg">
                <p className="font-semibold mb-2">Zahlungshinweise:</p>
                <p className="text-slate-700 whitespace-pre-line">{invoice.notes}</p>
              </div>
            )}
          </div>
        </div>

        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #invoice-content, #invoice-content * {
              visibility: visible;
            }
            #invoice-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}