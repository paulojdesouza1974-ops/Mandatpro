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
import { TrendingUp, Info, FileText, Calculator } from "lucide-react";
import { SKR03_ACCOUNTS, CATEGORY_TO_ACCOUNT, TAX_CODES } from "./DatevExport";

// Kategorie-Optionen mit Kontenzuordnung
const INCOME_CATEGORIES = [
  { value: "mitgliedsbeitrag", label: "Mitgliedsbeitrag (Vollmitglied)", account: "4110" },
  { value: "foerdermitgliedschaft", label: "Fördermitgliedschaft", account: "4110" },
  { value: "ehrenmitgliedschaft", label: "Ehrenmitgliedschaft", account: "4110" },
  { value: "jugendmitgliedschaft", label: "Jugendmitgliedschaft", account: "4110" },
  { value: "spende", label: "Spende (allgemein)", account: "4120" },
  { value: "spende_zweckgebunden", label: "Spende (zweckgebunden)", account: "4120" },
  { value: "spende_sach", label: "Sachspende", account: "4120" },
  { value: "veranstaltung", label: "Veranstaltungseinnahme", account: "4150" },
  { value: "zuschuss", label: "Zuschuss / Förderung", account: "4130" },
  { value: "mandatsabgabe", label: "Mandatsabgabe", account: "4140" },
  { value: "sonstiges", label: "Sonstiges", account: "4200" },
];

export default function IncomeForm({ isOpen, onClose, onSubmit, defaultData }) {
  const [form, setForm] = useState({
    description: "",
    category: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    source: "",
    notes: "",
    receipt_number: "",
    tax_code: "0",
    cost_center: "",
    account_override: "",
  });
  const [activeTab, setActiveTab] = useState("basic");

  useEffect(() => {
    if (defaultData) {
      setForm({
        ...defaultData,
        tax_code: defaultData.tax_code || "0",
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
        source: "",
        notes: "",
        receipt_number: "",
        tax_code: "0",
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
      source: "",
      notes: "",
      receipt_number: "",
      tax_code: "0",
      cost_center: "",
      account_override: "",
    });
  };

  // Ermittle zugeordnetes Konto
  const selectedCategory = INCOME_CATEGORIES.find(c => c.value === form.category);
  const assignedAccount = form.account_override || selectedCategory?.account || "4200";
  const accountInfo = SKR03_ACCOUNTS[assignedAccount];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            {defaultData ? "Einnahme bearbeiten" : "Neue Einnahme erfassen"}
          </DialogTitle>
          <DialogDescription>
            Erfassen Sie eine neue Einnahme für Ihre Buchhaltung
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
                  placeholder="z.B. Mitgliedsbeitrag Max Mustermann"
                  required
                  data-testid="income-description"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Kategorie *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger data-testid="income-category">
                    <SelectValue placeholder="Bitte wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {INCOME_CATEGORIES.map(cat => (
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
                  <Label className="text-xs font-medium">Betrag (EUR) *</Label>
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
                      data-testid="income-amount"
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
                    data-testid="income-date"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Quelle / Zahler</Label>
                <Input
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  placeholder="z.B. Name, Organisation oder Mitgliedsnummer"
                  data-testid="income-source"
                />
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
              {/* DATEV Konto Info */}
              {form.category && (
                <Card className="border-emerald-200 bg-emerald-50">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Calculator className="w-5 h-5 text-emerald-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-emerald-800">Zugeordnetes Konto</p>
                        <p className="text-xs text-emerald-700 mt-0.5">
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
                  <Label className="text-xs font-medium">Belegnummer</Label>
                  <Input
                    value={form.receipt_number}
                    onChange={(e) => setForm({ ...form, receipt_number: e.target.value })}
                    placeholder="z.B. RE-2026-001"
                    data-testid="income-receipt"
                  />
                  <p className="text-xs text-slate-400">Für DATEV Belegfeld 1</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Steuerschlüssel</Label>
                  <Select value={form.tax_code} onValueChange={(v) => setForm({ ...form, tax_code: v })}>
                    <SelectTrigger data-testid="income-tax-code">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TAX_CODES).map(([code, info]) => (
                        <SelectItem key={code} value={code}>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-[10px]">{code}</Badge>
                            <span className="text-sm">{info.description}</span>
                          </div>
                        </SelectItem>
                      ))}
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
                  data-testid="income-cost-center"
                />
                <p className="text-xs text-slate-400">Optional - DATEV KOST1</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Konto überschreiben</Label>
                <Select 
                  value={form.account_override} 
                  onValueChange={(v) => setForm({ ...form, account_override: v })}
                >
                  <SelectTrigger data-testid="income-account-override">
                    <SelectValue placeholder="Standard-Konto verwenden" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Standard-Konto verwenden</SelectItem>
                    {Object.entries(SKR03_ACCOUNTS)
                      .filter(([_, info]) => info.type === 'ertrag')
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
                        Diese Einnahme wird automatisch dem Konto {assignedAccount} zugeordnet 
                        und kann über den DATEV-Export an Ihren Steuerberater übermittelt werden.
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
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" data-testid="income-submit">
              {defaultData ? "Änderungen speichern" : "Einnahme erfassen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
