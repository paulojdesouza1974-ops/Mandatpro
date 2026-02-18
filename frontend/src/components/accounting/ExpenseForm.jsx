import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, Info, Calculator } from "lucide-react";
import { SKR03_ACCOUNTS, TAX_CODES } from "./DatevExport";

// Kategorie-Optionen mit Kontenzuordnung
const EXPENSE_CATEGORIES = [
  { value: "personal", label: "Gehälter / Löhne", account: "6010" },
  { value: "sozialversicherung", label: "Sozialversicherung", account: "6100" },
  { value: "honorare", label: "Honorare / Fremdleistungen", account: "6200" },
  { value: "raummiete", label: "Miete / Raumkosten", account: "6310" },
  { value: "nebenkosten", label: "Nebenkosten (Strom, Heizung)", account: "6320" },
  { value: "versicherung", label: "Versicherungen", account: "6400" },
  { value: "kfz", label: "KFZ-Kosten", account: "6500" },
  { value: "marketing", label: "Werbung / Marketing", account: "6600" },
  { value: "reisekosten", label: "Reisekosten", account: "6650" },
  { value: "porto", label: "Porto / Telefon / Internet", account: "6800" },
  { value: "material", label: "Büromaterial", account: "6815" },
  { value: "beratung", label: "Rechts- und Beratungskosten", account: "6820" },
  { value: "bankgebuehren", label: "Bankgebühren", account: "7310" },
  { value: "verwaltung", label: "Verwaltungskosten", account: "6850" },
  { value: "sonstiges", label: "Sonstige Kosten", account: "6850" },
];

export default function ExpenseForm({ isOpen, onClose, onSubmit, defaultData }) {
  const [form, setForm] = useState({
    description: "",
    category: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    vendor: "",
    status: "geplant",
    notes: "",
    receipt_number: "",
    tax_code: "9",
    cost_center: "",
    account_override: "",
  });
  const [activeTab, setActiveTab] = useState("basic");

  useEffect(() => {
    if (defaultData) {
      setForm({
        ...defaultData,
        tax_code: defaultData.tax_code || "9",
        cost_center: defaultData.cost_center || "",
        receipt_number: defaultData.receipt_number || "",
        account_override: defaultData.account_override || "",
      });
    } else {
      setForm({
        description: "",
        category: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        vendor: "",
        status: "geplant",
        notes: "",
        receipt_number: "",
        tax_code: "9",
        cost_center: "",
        account_override: "",
      });
    }
    setActiveTab("basic");
  }, [defaultData, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.description || !form.category || !form.amount || !form.date) {
      alert("Bitte füllen Sie alle erforderlichen Felder aus");
      return;
    }
    onSubmit({ ...form, amount: parseFloat(form.amount) });
    setForm({
      description: "",
      category: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      vendor: "",
      status: "geplant",
      notes: "",
      receipt_number: "",
      tax_code: "9",
      cost_center: "",
      account_override: "",
    });
  };

  // Ermittle zugeordnetes Konto
  const selectedCategory = EXPENSE_CATEGORIES.find(c => c.value === form.category);
  const assignedAccount = form.account_override || selectedCategory?.account || "6850";
  const accountInfo = SKR03_ACCOUNTS[assignedAccount];

  // Berechne Netto/Brutto/USt
  const amount = parseFloat(form.amount) || 0;
  const taxRate = TAX_CODES[form.tax_code]?.rate || 0;
  const netAmount = taxRate > 0 ? amount / (1 + taxRate / 100) : amount;
  const taxAmount = amount - netAmount;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            {defaultData ? "Ausgabe bearbeiten" : "Neue Ausgabe erfassen"}
          </DialogTitle>
          <DialogDescription>
            Erfassen Sie eine neue Ausgabe für Ihre Buchhaltung
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="basic">Grunddaten</TabsTrigger>
              <TabsTrigger value="accounting">Buchhaltung</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Beschreibung *</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="z.B. Büromaterial, Miete Januar"
                  required
                  data-testid="expense-description"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Kategorie *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger data-testid="expense-category">
                    <SelectValue placeholder="Bitte wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <span>{cat.label}</span>
                          <Badge variant="outline" className="text-[10px] font-mono ml-auto">
                            {cat.account}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Betrag brutto (EUR) *</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      placeholder="0,00"
                      required
                      className="pr-8"
                      data-testid="expense-amount"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">€</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Datum *</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                    data-testid="expense-date"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Lieferant / Anbieter</Label>
                  <Input
                    value={form.vendor}
                    onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                    placeholder="Firmenname"
                    data-testid="expense-vendor"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger data-testid="expense-status">
                      <SelectValue placeholder="Status wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="geplant">Geplant</SelectItem>
                      <SelectItem value="ausstehend">Ausstehend (Rechnung erhalten)</SelectItem>
                      <SelectItem value="bezahlt">Bezahlt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Notizen</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Zusätzliche Informationen..."
                  rows={2}
                />
              </div>
            </TabsContent>

            <TabsContent value="accounting" className="space-y-4">
              {/* Steuerberechnung */}
              {amount > 0 && (
                <Card className="border-slate-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Calculator className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-medium text-slate-700">Steuerberechnung</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Netto</p>
                        <p className="font-semibold">{netAmount.toFixed(2)} €</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">USt ({taxRate}%)</p>
                        <p className="font-semibold">{taxAmount.toFixed(2)} €</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Brutto</p>
                        <p className="font-semibold text-red-600">{amount.toFixed(2)} €</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* DATEV Konto Info */}
              {form.category && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Calculator className="w-5 h-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-800">Zugeordnetes Konto</p>
                        <p className="text-xs text-red-700 mt-0.5">
                          <span className="font-mono font-semibold">{assignedAccount}</span>
                          {" - "}
                          {accountInfo?.name || "Unbekannt"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Rechnungsnummer</Label>
                  <Input
                    value={form.receipt_number}
                    onChange={(e) => setForm({ ...form, receipt_number: e.target.value })}
                    placeholder="z.B. RE-12345"
                    data-testid="expense-receipt"
                  />
                  <p className="text-xs text-slate-400">Für DATEV Belegfeld 1</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Steuerschlüssel (VSt)</Label>
                  <Select value={form.tax_code} onValueChange={(v) => setForm({ ...form, tax_code: v })}>
                    <SelectTrigger data-testid="expense-tax-code">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-[10px]">0</Badge>
                          <span>Keine Steuer</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="8">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-[10px]">8</Badge>
                          <span>7% Vorsteuer</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="9">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-[10px]">9</Badge>
                          <span>19% Vorsteuer</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-400">DATEV BU-Schlüssel</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Kostenstelle</Label>
                <Input
                  value={form.cost_center}
                  onChange={(e) => setForm({ ...form, cost_center: e.target.value })}
                  placeholder="z.B. VORSTAND, EVENTS, PR"
                  data-testid="expense-cost-center"
                />
                <p className="text-xs text-slate-400">Optional - DATEV KOST1</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Konto überschreiben</Label>
                <Select 
                  value={form.account_override} 
                  onValueChange={(v) => setForm({ ...form, account_override: v })}
                >
                  <SelectTrigger data-testid="expense-account-override">
                    <SelectValue placeholder="Standard-Konto verwenden" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Standard-Konto verwenden</SelectItem>
                    {Object.entries(SKR03_ACCOUNTS)
                      .filter(([_, info]) => info.type === 'aufwand')
                      .map(([konto, info]) => (
                        <SelectItem key={konto} value={konto}>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-[10px]">{konto}</Badge>
                            <span className="text-sm">{info.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-400">Nur bei Bedarf ändern</p>
              </div>

              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">DATEV-Export</p>
                      <p className="text-xs text-blue-700 mt-0.5">
                        Diese Ausgabe wird automatisch dem Konto {assignedAccount} zugeordnet. 
                        Die Vorsteuer wird über den Steuerschlüssel gesteuert.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            <Button type="submit" className="bg-red-600 hover:bg-red-700" data-testid="expense-submit">
              {defaultData ? "Änderungen speichern" : "Ausgabe erfassen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
