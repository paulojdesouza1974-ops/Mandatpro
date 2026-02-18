/**
 * CSV/Excel export utility for accounting data.
 * - Dates formatted as DD.MM.YYYY (German locale)
 * - Amounts formatted as German decimal (comma separator), negative for expenses
 * - Records sorted by date descending (newest first)
 * - Semicolon separator so Excel (German locale) opens columns correctly
 * - UTF-8 BOM for proper encoding
 */

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function formatAmount(amount) {
  if (amount == null) return "";
  // German number format: dot as thousand separator, comma as decimal
  return amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toCsv(rows, headers) {
  const escape = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    // Quote if contains semicolon, newline or quote
    return s.includes(";") || s.includes("\n") || s.includes('"') ? `"${s}"` : s;
  };
  const lines = [headers.map(escape).join(";")];
  rows.forEach((row) => lines.push(row.map(escape).join(";")));
  return lines.join("\n");
}

function download(content, filename) {
  const BOM = "\uFEFF"; // UTF-8 BOM for Excel
  const blob = new Blob([BOM + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const categoryLabels = {
  income: {
    mitgliedsbeitrag: "Mitgliedsbeitrag",
    spende: "Spende",
    veranstaltung: "Veranstaltung",
    zuschuss: "Zuschuss",
    sonstiges: "Sonstiges",
  },
  expense: {
    personal: "Personalkosten",
    raummiete: "Raummiete",
    material: "Material",
    marketing: "Marketing",
    verwaltung: "Verwaltung",
    sonstiges: "Sonstiges",
  },
};

const statusLabels = {
  bezahlt: "Bezahlt",
  ausstehend: "Ausstehend",
  geplant: "Geplant",
};

function sortByDateDesc(rows, dateIndex) {
  return [...rows].sort((a, b) => {
    const da = a[dateIndex] ? new Date(a[dateIndex]) : new Date(0);
    const db = b[dateIndex] ? new Date(b[dateIndex]) : new Date(0);
    return db - da;
  });
}

export function exportIncomeToExcel(income, filename = "Einnahmen.csv") {
  const headers = ["Datum", "Beschreibung", "Kategorie", "Quelle", "Betrag (EUR)", "Notizen"];
  const rawRows = income.map((i) => [
    i.date || "",
    i.description || "",
    categoryLabels.income[i.category] || i.category || "",
    i.source || "",
    i.amount,
    i.notes || "",
    i.date || "", // sort key at index 6, removed before output
  ]);
  const sorted = sortByDateDesc(rawRows, 6);
  const rows = sorted.map(([date, desc, cat, src, amount, notes]) => [
    formatDate(date),
    desc,
    cat,
    src,
    formatAmount(amount),
    notes,
  ]);
  download(toCsv(rows, headers), filename);
}

export function exportExpensesToExcel(expenses, filename = "Ausgaben.csv") {
  const headers = ["Datum", "Beschreibung", "Kategorie", "Anbieter", "Betrag (EUR)", "Status", "Notizen"];
  const rawRows = expenses.map((e) => [
    e.date || "",
    e.description || "",
    categoryLabels.expense[e.category] || e.category || "",
    e.vendor || "",
    e.amount,
    statusLabels[e.status] || e.status || "",
    e.notes || "",
    e.date || "", // sort key
  ]);
  const sorted = sortByDateDesc(rawRows, 7);
  const rows = sorted.map(([date, desc, cat, vendor, amount, status, notes]) => [
    formatDate(date),
    desc,
    cat,
    vendor,
    formatAmount(amount),
    status,
    notes,
  ]);
  download(toCsv(rows, headers), filename);
}

export function exportAllToExcel(income, expenses, filename = "Buchhaltung.csv") {
  const headers = ["Datum", "Art", "Beschreibung", "Kategorie", "Quelle/Anbieter", "Betrag (EUR)", "Status", "Notizen"];

  const incomeRows = income.map((i) => ({
    date: i.date || "",
    cols: [
      i.date || "",
      "Einnahme",
      i.description || "",
      categoryLabels.income[i.category] || i.category || "",
      i.source || "",
      i.amount,
      "",
      i.notes || "",
    ],
  }));

  const expenseRows = expenses.map((e) => ({
    date: e.date || "",
    cols: [
      e.date || "",
      "Ausgabe",
      e.description || "",
      categoryLabels.expense[e.category] || e.category || "",
      e.vendor || "",
      e.amount,
      statusLabels[e.status] || e.status || "",
      e.notes || "",
    ],
  }));

  const all = [...incomeRows, ...expenseRows]
    .sort((a, b) => {
      const da = a.date ? new Date(a.date) : new Date(0);
      const db = b.date ? new Date(b.date) : new Date(0);
      return db - da;
    })
    .map(({ cols }) => {
      const [date, art, desc, cat, src, amount, status, notes] = cols;
      return [formatDate(date), art, desc, cat, src, formatAmount(amount), status, notes];
    });

  download(toCsv(all, headers), filename);
}