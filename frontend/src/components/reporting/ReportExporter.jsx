import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, FileText, Download, CheckCircle2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";

const incomeCategoryLabels = {
  mitgliedsbeitrag: "Mitgliedsbeitrag", foerdermitgliedschaft: "Fördermitgliedschaft",
  ehrenmitgliedschaft: "Ehrenmitglied", jugendmitgliedschaft: "Jugendmitglied",
  spende: "Spende", spende_zweckgebunden: "Spende (zweckgeb.)", spende_sach: "Sachspende",
  veranstaltung: "Veranstaltung", zuschuss: "Zuschuss", mandatsabgabe: "Mandatsabgabe", sonstiges: "Sonstiges",
};
const expenseCategoryLabels = {
  personal: "Personal", raummiete: "Raummiete", material: "Material",
  marketing: "Marketing", verwaltung: "Verwaltung", edv: "EDV", wahlkampf: "Wahlkampf", sonstiges: "Sonstiges",
};

function downloadCSV(filename, headers, rows) {
  const bom = "\uFEFF";
  const csv = bom + [headers.join(";"), ...rows.map(r => r.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(";"))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function downloadPDF(title, headers, rows, dateRange) {
  // Build a printable HTML and use window.print
  const tableRows = rows.map(r => `<tr>${r.map(c => `<td style="border:1px solid #e2e8f0;padding:6px 10px;font-size:12px">${c ?? ""}</td>`).join("")}</tr>`).join("");
  const html = `
    <html><head><title>${title}</title>
    <style>body{font-family:Arial,sans-serif;margin:20px}h1{font-size:18px;color:#1e293b}p.sub{font-size:12px;color:#64748b;margin-bottom:16px}table{border-collapse:collapse;width:100%}th{background:#f8fafc;border:1px solid #e2e8f0;padding:8px 10px;font-size:11px;text-align:left;text-transform:uppercase;color:#64748b}@media print{@page{margin:15mm}}</style>
    </head><body>
    <h1>${title}</h1>
    <p class="sub">Zeitraum: ${dateRange.from} – ${dateRange.to} &nbsp;|&nbsp; Erstellt: ${format(new Date(), "dd.MM.yyyy HH:mm")}</p>
    <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${tableRows}</tbody></table>
    </body></html>`;
  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 500);
}

export default function ReportExporter({ income, expenses, mandateLevies, budgets, dateRange }) {
  const [exported, setExported] = useState(null);

  const fmt = (n) => Number(n || 0).toLocaleString("de-DE", { minimumFractionDigits: 2 });
  const fmtDate = (d) => { try { return format(parseISO(d), "dd.MM.yyyy"); } catch { return d || ""; } };

  const incomeHeaders = ["Datum", "Beschreibung", "Kategorie", "Betrag (EUR)", "Quelle"];
  const incomeRows = income.map(i => [fmtDate(i.date), i.description, incomeCategoryLabels[i.category] || i.category, fmt(i.amount), i.source || ""]);

  const expenseHeaders = ["Datum", "Beschreibung", "Kategorie", "Betrag (EUR)", "Anbieter", "Status"];
  const expenseRows = expenses.map(e => [fmtDate(e.date), e.description, expenseCategoryLabels[e.category] || e.category, fmt(e.amount), e.vendor || "", e.status || ""]);

  const levyHeaders = ["Monat", "Mandatsträger", "Mandatsart", "Gremium", "Brutto (EUR)", "Abgabe (EUR)", "Status"];
  const levyRows = mandateLevies.map(l => [l.period_month, l.contact_name, l.mandate_type, l.mandate_body || "", fmt(l.gross_income), fmt(l.final_levy), l.status]);

  const budgetHeaders = ["Name", "Typ", "Kategorie", "Betrag (EUR)", "Von", "Bis"];
  const budgetRows = budgets.map(b => [b.name, b.type === "income" ? "Einnahme" : "Ausgabe", b.category, fmt(b.amount), b.period_start, b.period_end]);

  const totalIncome = income.reduce((s, i) => s + (i.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  const notify = (key) => { setExported(key); setTimeout(() => setExported(null), 2000); };

  const reports = [
    {
      key: "income_csv",
      label: "Einnahmen",
      format: "CSV",
      icon: FileSpreadsheet,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      count: income.length,
      total: `${fmt(totalIncome)} €`,
      onExport: () => { downloadCSV(`einnahmen_${dateRange.from}_${dateRange.to}.csv`, incomeHeaders, incomeRows); notify("income_csv"); },
    },
    {
      key: "income_pdf",
      label: "Einnahmen",
      format: "PDF",
      icon: FileText,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      count: income.length,
      total: `${fmt(totalIncome)} €`,
      onExport: () => { downloadPDF("Einnahmenbericht", incomeHeaders, incomeRows, dateRange); notify("income_pdf"); },
    },
    {
      key: "expense_csv",
      label: "Ausgaben",
      format: "CSV",
      icon: FileSpreadsheet,
      color: "text-red-600",
      bg: "bg-red-50",
      count: expenses.length,
      total: `${fmt(totalExpenses)} €`,
      onExport: () => { downloadCSV(`ausgaben_${dateRange.from}_${dateRange.to}.csv`, expenseHeaders, expenseRows); notify("expense_csv"); },
    },
    {
      key: "expense_pdf",
      label: "Ausgaben",
      format: "PDF",
      icon: FileText,
      color: "text-red-600",
      bg: "bg-red-50",
      count: expenses.length,
      total: `${fmt(totalExpenses)} €`,
      onExport: () => { downloadPDF("Ausgabenbericht", expenseHeaders, expenseRows, dateRange); notify("expense_pdf"); },
    },
    {
      key: "levy_csv",
      label: "Mandatsabgaben",
      format: "CSV",
      icon: FileSpreadsheet,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      count: mandateLevies.length,
      total: null,
      onExport: () => { downloadCSV(`mandatsabgaben.csv`, levyHeaders, levyRows); notify("levy_csv"); },
    },
    {
      key: "budget_csv",
      label: "Budgetplan",
      format: "CSV",
      icon: FileSpreadsheet,
      color: "text-orange-600",
      bg: "bg-orange-50",
      count: budgets.length,
      total: null,
      onExport: () => { downloadCSV(`budgetplan.csv`, budgetHeaders, budgetRows); notify("budget_csv"); },
    },
    {
      key: "all_csv",
      label: "Gesamtbericht",
      format: "CSV",
      icon: FileSpreadsheet,
      color: "text-slate-600",
      bg: "bg-slate-100",
      count: income.length + expenses.length,
      total: `Saldo: ${fmt(totalIncome - totalExpenses)} €`,
      onExport: () => {
        const allHeaders = ["Typ", ...incomeHeaders];
        const allRows = [
          ...incomeRows.map(r => ["Einnahme", ...r]),
          ...expenseRows.map(r => ["Ausgabe", ...r]),
        ];
        downloadCSV(`gesamtbericht_${dateRange.from}_${dateRange.to}.csv`, allHeaders, allRows);
        notify("all_csv");
      },
    },
  ];

  return (
    <div className="space-y-6 mt-4">
      <Card className="border-0 shadow-sm bg-slate-50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Download className="w-4 h-4 text-slate-400" />
            <span>Alle Exporte beziehen sich auf den gewählten Zeitraum: <strong>{dateRange.from}</strong> bis <strong>{dateRange.to}</strong></span>
          </div>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map(r => (
          <Card key={r.key} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${r.bg}`}>
                  <r.icon className={`w-5 h-5 ${r.color}`} />
                </div>
                <Badge variant="outline" className="text-xs">{r.format}</Badge>
              </div>
              <p className="font-semibold text-slate-800 text-sm">{r.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{r.count} Einträge{r.total ? ` · ${r.total}` : ""}</p>
              <Button
                className="w-full mt-4 h-8 text-xs"
                variant={exported === r.key ? "default" : "outline"}
                onClick={r.onExport}
              >
                {exported === r.key ? (
                  <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Exportiert!</>
                ) : (
                  <><Download className="w-3.5 h-3.5 mr-1.5" /> {r.format} herunterladen</>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}