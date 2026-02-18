// DATEV Export Module - EXTF Format (Buchungsstapel)
// Compliant with DATEV CSV format specification

import { format } from 'date-fns';

// SKR03 Kontenrahmen - Vereinskontierung
export const SKR03_ACCOUNTS = {
  // Aktiva - Anlagevermögen
  '0400': { name: 'Technische Anlagen und Maschinen', type: 'aktiv' },
  '0420': { name: 'Büroeinrichtung', type: 'aktiv' },
  '0480': { name: 'Geringwertige Wirtschaftsgüter', type: 'aktiv' },
  
  // Aktiva - Umlaufvermögen  
  '1200': { name: 'Bank', type: 'aktiv' },
  '1210': { name: 'Sparkasse', type: 'aktiv' },
  '1400': { name: 'Forderungen aus Lieferungen', type: 'aktiv' },
  '1600': { name: 'Kasse', type: 'aktiv' },
  
  // Passiva - Verbindlichkeiten
  '1700': { name: 'Verbindlichkeiten aus Lieferungen', type: 'passiv' },
  '1740': { name: 'Verbindlichkeiten aus Steuern', type: 'passiv' },
  '1755': { name: 'Lohn- und Gehaltsverbindlichkeiten', type: 'passiv' },
  
  // Eigenkapital
  '2900': { name: 'Eigenkapital', type: 'passiv' },
  '2970': { name: 'Gewinnvortrag/Verlustvortrag', type: 'passiv' },
  
  // Erträge
  '4000': { name: 'Umsatzerlöse', type: 'ertrag' },
  '4100': { name: 'Steuerfreie Umsätze', type: 'ertrag' },
  '4110': { name: 'Mitgliedsbeiträge', type: 'ertrag' },
  '4120': { name: 'Spenden', type: 'ertrag' },
  '4130': { name: 'Zuschüsse', type: 'ertrag' },
  '4140': { name: 'Mandatsabgaben', type: 'ertrag' },
  '4150': { name: 'Veranstaltungseinnahmen', type: 'ertrag' },
  '4200': { name: 'Sonst. betriebliche Erträge', type: 'ertrag' },
  
  // Aufwendungen - Personal
  '6000': { name: 'Löhne und Gehälter', type: 'aufwand' },
  '6010': { name: 'Gehälter', type: 'aufwand' },
  '6020': { name: 'Ehegattengehalt', type: 'aufwand' },
  '6100': { name: 'Sozialversicherung', type: 'aufwand' },
  '6200': { name: 'Sonstige Personalkosten', type: 'aufwand' },
  
  // Aufwendungen - Raum
  '6300': { name: 'Raumkosten', type: 'aufwand' },
  '6310': { name: 'Miete', type: 'aufwand' },
  '6320': { name: 'Nebenkosten', type: 'aufwand' },
  
  // Aufwendungen - Betrieb
  '6400': { name: 'Versicherungen', type: 'aufwand' },
  '6420': { name: 'Beiträge und Gebühren', type: 'aufwand' },
  '6500': { name: 'Kfz-Kosten', type: 'aufwand' },
  '6600': { name: 'Werbekosten', type: 'aufwand' },
  '6650': { name: 'Reisekosten', type: 'aufwand' },
  '6700': { name: 'Kosten der Warenabgabe', type: 'aufwand' },
  '6800': { name: 'Porto, Telefon', type: 'aufwand' },
  '6815': { name: 'Büromaterial', type: 'aufwand' },
  '6820': { name: 'Rechts- und Beratungskosten', type: 'aufwand' },
  '6850': { name: 'Sonstige Betriebskosten', type: 'aufwand' },
  
  // Aufwendungen - Abschreibungen
  '7000': { name: 'Abschreibungen auf Sachanlagen', type: 'aufwand' },
  
  // Aufwendungen - Zinsen
  '7300': { name: 'Zinsaufwand', type: 'aufwand' },
  '7310': { name: 'Bankgebühren', type: 'aufwand' },
};

// Steuerschlüssel nach DATEV
export const TAX_CODES = {
  '0': { rate: 0, description: 'Keine Steuer' },
  '1': { rate: 0, description: 'Steuerfreie Umsätze' },
  '2': { rate: 7, description: '7% USt' },
  '3': { rate: 19, description: '19% USt' },
  '8': { rate: 7, description: '7% VSt' },
  '9': { rate: 19, description: '19% VSt' },
};

// Kategorie zu Konto Mapping
export const CATEGORY_TO_ACCOUNT = {
  income: {
    mitgliedsbeitrag: '4110',
    spende: '4120',
    zuschuss: '4130',
    mandatsabgabe: '4140',
    veranstaltung: '4150',
    sonstiges: '4200',
  },
  expense: {
    personal: '6010',
    raummiete: '6310',
    material: '6815',
    marketing: '6600',
    verwaltung: '6850',
    reisekosten: '6650',
    porto: '6800',
    versicherung: '6400',
    bankgebuehren: '7310',
    sonstiges: '6850',
  }
};

// DATEV Header erstellen
function createDatevHeader(settings = {}) {
  const {
    beraterNr = '0',
    mandantNr = '0',
    wirtschaftsjahrBeginn = format(new Date(), 'yyyyMMdd'),
    sachkontenLaenge = 4,
    datumVon = format(new Date(new Date().getFullYear(), 0, 1), 'yyyyMMdd'),
    datumBis = format(new Date(new Date().getFullYear(), 11, 31), 'yyyyMMdd'),
    bezeichnung = 'Buchungsstapel',
    diktatKuerzel = '',
    buchungstyp = 1, // 1 = Finanzbuchhaltung
    rechnungslegungszweck = 0,
    festschreibung = 0,
    waehrungskennzeichen = 'EUR',
  } = settings;

  const timestamp = format(new Date(), 'yyyyMMddHHmmss') + '000';
  
  // DATEV EXTF Header Format
  return [
    '"EXTF"', // Kennzeichen
    '700', // Versionsnummer
    '21', // Datenkategorie (21 = Buchungsstapel)
    `"${bezeichnung}"`,
    '13', // Formatversion
    timestamp,
    '', // reserviert
    '', // reserviert
    '', // reserviert
    '', // reserviert
    beraterNr,
    mandantNr,
    wirtschaftsjahrBeginn,
    sachkontenLaenge,
    datumVon,
    datumBis,
    `"${bezeichnung}"`,
    `"${diktatKuerzel}"`,
    buchungstyp,
    rechnungslegungszweck,
    festschreibung,
    `"${waehrungskennzeichen}"`,
    '', // reserviert
    '', // reserviert
    '', // reserviert
    '', // SKR
    '', // Branchen-Lösung
    '', // reserviert
    '', // reserviert
    '', // Anwendungsinformation
  ].join(';');
}

// Spaltenüberschriften für Buchungsstapel
function getColumnHeaders() {
  return [
    'Umsatz (ohne Soll/Haben-Kz)',
    'Soll/Haben-Kennzeichen',
    'WKZ Umsatz',
    'Kurs',
    'Basis-Umsatz',
    'WKZ Basis-Umsatz',
    'Konto',
    'Gegenkonto (ohne BU-Schlüssel)',
    'BU-Schlüssel',
    'Belegdatum',
    'Belegfeld 1',
    'Belegfeld 2',
    'Skonto',
    'Buchungstext',
    'Postensperre',
    'Diverse Adressnummer',
    'Geschäftspartnerbank',
    'Sachverhalt',
    'Zinssperre',
    'Beleglink',
    'Beleginfo - Art 1',
    'Beleginfo - Inhalt 1',
    'Beleginfo - Art 2',
    'Beleginfo - Inhalt 2',
    'Beleginfo - Art 3',
    'Beleginfo - Inhalt 3',
    'Beleginfo - Art 4',
    'Beleginfo - Inhalt 4',
    'Beleginfo - Art 5',
    'Beleginfo - Inhalt 5',
    'Beleginfo - Art 6',
    'Beleginfo - Inhalt 6',
    'Beleginfo - Art 7',
    'Beleginfo - Inhalt 7',
    'Beleginfo - Art 8',
    'Beleginfo - Inhalt 8',
    'KOST1 - Kostenstelle',
    'KOST2 - Kostenstelle',
    'Kost-Menge',
    'EU-Land u. UStID',
    'EU-Steuersatz',
    'Abw. Versteuerungsart',
    'Sachverhalt L+L',
    'Funktionsergänzung L+L',
    'BU 49 Hauptfunktionstyp',
    'BU 49 Hauptfunktionsnummer',
    'BU 49 Funktionsergänzung',
    'Zusatzinformation - Art 1',
    'Zusatzinformation - Inhalt 1',
    'Zusatzinformation - Art 2',
    'Zusatzinformation - Inhalt 2',
    'Zusatzinformation - Art 3',
    'Zusatzinformation - Inhalt 3',
    'Zusatzinformation - Art 4',
    'Zusatzinformation - Inhalt 4',
    'Zusatzinformation - Art 5',
    'Zusatzinformation - Inhalt 5',
    'Zusatzinformation - Art 6',
    'Zusatzinformation - Inhalt 6',
    'Zusatzinformation - Art 7',
    'Zusatzinformation - Inhalt 7',
    'Zusatzinformation - Art 8',
    'Zusatzinformation - Inhalt 8',
    'Zusatzinformation - Art 9',
    'Zusatzinformation - Inhalt 9',
    'Zusatzinformation - Art 10',
    'Zusatzinformation - Inhalt 10',
    'Stück',
    'Gewicht',
    'Zahlweise',
    'Fälligkeit',
    'Skontotyp',
    'Auftragsnummer',
    'Buchungstyp',
    'USt-Schlüssel (Anzahlungen)',
    'EU-Land (Anzahlungen)',
    'Sachverhalt L+L (Anzahlungen)',
    'EU-Steuersatz (Anzahlungen)',
    'Erlöskonto (Anzahlungen)',
    'Herkunft-Kz',
    'Buchungs GUID',
    'KOST-Datum',
    'SEPA-Mandatsreferenz',
    'Skontosperre',
    'Gesellschaftername',
    'Beteiligtennummer',
    'Identifikationsnummer',
    'Zeichnernummer',
    'Postensperre bis',
    'Bezeichnung SoBil-Sachverhalt',
    'Kennzeichen SoBil-Buchung',
    'Festschreibung',
    'Leistungsdatum',
    'Datum Zuord. Steuerperiode',
    'Fälligkeit',
    'Generalumkehr (GU)',
    'Steuersatz',
    'Land',
  ].join(';');
}

// Einzelne Buchung formatieren
function formatBookingRow(booking) {
  const {
    amount, // Betrag (immer positiv)
    isDebit, // true = Soll, false = Haben
    account, // Konto
    counterAccount, // Gegenkonto
    taxCode = '', // BU-Schlüssel
    date, // Datum
    receiptNumber = '', // Belegnummer
    receiptField2 = '', // Belegfeld 2
    description = '', // Buchungstext
    costCenter1 = '', // Kostenstelle 1
    costCenter2 = '', // Kostenstelle 2
  } = booking;

  const formattedAmount = Math.abs(amount).toFixed(2).replace('.', ',');
  const sollHaben = isDebit ? 'S' : 'H';
  const formattedDate = format(new Date(date), 'ddMM');
  
  // Array mit 116 Feldern (DATEV Standard)
  const row = new Array(116).fill('');
  
  row[0] = formattedAmount; // Umsatz
  row[1] = sollHaben; // Soll/Haben
  row[2] = 'EUR'; // WKZ
  row[3] = ''; // Kurs
  row[4] = ''; // Basis-Umsatz
  row[5] = ''; // WKZ Basis
  row[6] = account; // Konto
  row[7] = counterAccount; // Gegenkonto
  row[8] = taxCode; // BU-Schlüssel
  row[9] = formattedDate; // Belegdatum (DDMM)
  row[10] = `"${receiptNumber}"`; // Belegfeld 1
  row[11] = `"${receiptField2}"`; // Belegfeld 2
  row[12] = ''; // Skonto
  row[13] = `"${description.substring(0, 60)}"`; // Buchungstext (max 60 Zeichen)
  row[36] = costCenter1; // KOST1
  row[37] = costCenter2; // KOST2
  
  return row.join(';');
}

// Einnahme zu DATEV Buchung konvertieren
export function incomeToDatevBooking(income) {
  const account = CATEGORY_TO_ACCOUNT.income[income.category] || '4200';
  const bankAccount = '1200'; // Standard Bankkonto
  
  return {
    amount: income.amount,
    isDebit: true, // Bank wird belastet (Soll)
    account: bankAccount,
    counterAccount: account,
    taxCode: income.tax_code || '',
    date: income.date,
    receiptNumber: income.receipt_number || `E${income.id?.substring(0, 8) || ''}`,
    description: income.description || '',
    costCenter1: income.cost_center || '',
  };
}

// Ausgabe zu DATEV Buchung konvertieren
export function expenseToDatevBooking(expense) {
  const account = CATEGORY_TO_ACCOUNT.expense[expense.category] || '6850';
  const bankAccount = '1200'; // Standard Bankkonto
  
  return {
    amount: expense.amount,
    isDebit: true, // Aufwandskonto wird belastet (Soll)
    account: account,
    counterAccount: bankAccount,
    taxCode: expense.tax_code || '',
    date: expense.date,
    receiptNumber: expense.receipt_number || `A${expense.id?.substring(0, 8) || ''}`,
    description: expense.description || '',
    costCenter1: expense.cost_center || '',
  };
}

// Mandatsabgabe zu DATEV Buchung konvertieren
export function mandateLevyToDatevBooking(levy) {
  const account = '4140'; // Mandatsabgaben
  const bankAccount = '1200';
  
  return {
    amount: levy.final_levy || 0,
    isDebit: true,
    account: bankAccount,
    counterAccount: account,
    taxCode: '',
    date: levy.payment_date || levy.created_date,
    receiptNumber: `MA${levy.period_month?.replace('/', '')}`,
    description: `Mandatsabgabe ${levy.contact_name} ${levy.period_month}`,
    costCenter1: '',
  };
}

// Kompletter DATEV Export
export function generateDatevExport(data, settings = {}) {
  const { income = [], expenses = [], mandateLevies = [] } = data;
  const lines = [];
  
  // 1. Header
  lines.push(createDatevHeader(settings));
  
  // 2. Spaltenüberschriften
  lines.push(getColumnHeaders());
  
  // 3. Einnahmen
  income.forEach(item => {
    const booking = incomeToDatevBooking(item);
    lines.push(formatBookingRow(booking));
  });
  
  // 4. Ausgaben
  expenses.forEach(item => {
    const booking = expenseToDatevBooking(item);
    lines.push(formatBookingRow(booking));
  });
  
  // 5. Mandatsabgaben (nur bezahlte)
  mandateLevies
    .filter(levy => levy.status === 'bezahlt')
    .forEach(levy => {
      const booking = mandateLevyToDatevBooking(levy);
      lines.push(formatBookingRow(booking));
    });
  
  return lines.join('\r\n');
}

// Download als Datei
export function downloadDatevExport(data, settings = {}, filename = null) {
  const content = generateDatevExport(data, settings);
  const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
  const defaultFilename = `EXTF_Buchungsstapel_${timestamp}.csv`;
  
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename || defaultFilename;
  link.click();
  URL.revokeObjectURL(link.href);
}

// Validierung vor Export
export function validateForDatevExport(data) {
  const errors = [];
  const warnings = [];
  
  const { income = [], expenses = [] } = data;
  
  // Prüfe Einnahmen
  income.forEach((item, idx) => {
    if (!item.amount || item.amount <= 0) {
      errors.push(`Einnahme ${idx + 1}: Betrag fehlt oder ungültig`);
    }
    if (!item.date) {
      errors.push(`Einnahme ${idx + 1}: Datum fehlt`);
    }
    if (!item.category) {
      warnings.push(`Einnahme ${idx + 1}: Kategorie fehlt - wird als "Sonstiges" exportiert`);
    }
  });
  
  // Prüfe Ausgaben
  expenses.forEach((item, idx) => {
    if (!item.amount || item.amount <= 0) {
      errors.push(`Ausgabe ${idx + 1}: Betrag fehlt oder ungültig`);
    }
    if (!item.date) {
      errors.push(`Ausgabe ${idx + 1}: Datum fehlt`);
    }
    if (!item.category) {
      warnings.push(`Ausgabe ${idx + 1}: Kategorie fehlt - wird als "Sonstiges" exportiert`);
    }
  });
  
  return { isValid: errors.length === 0, errors, warnings };
}

export default {
  SKR03_ACCOUNTS,
  TAX_CODES,
  CATEGORY_TO_ACCOUNT,
  generateDatevExport,
  downloadDatevExport,
  validateForDatevExport,
  incomeToDatevBooking,
  expenseToDatevBooking,
  mandateLevyToDatevBooking,
};
