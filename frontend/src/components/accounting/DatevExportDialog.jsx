import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Download, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  Building2,
  Calendar,
  Settings,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Euro
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { 
  downloadDatevExport, 
  validateForDatevExport, 
  SKR03_ACCOUNTS,
  TAX_CODES 
} from "./DatevExport";

export default function DatevExportDialog({ 
  open, 
  onClose, 
  income = [], 
  expenses = [], 
  mandateLevies = [] 
}) {
  const [tab, setTab] = useState("preview");
  const [settings, setSettings] = useState({
    beraterNr: '',
    mandantNr: '',
    includeIncome: true,
    includeExpenses: true,
    includeMandateLevies: true,
    dateFrom: format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
  });
  const [isExporting, setIsExporting] = useState(false);

  // Filter data by date range
  const filterByDateRange = (items) => {
    return items.filter(item => {
      const itemDate = new Date(item.date || item.created_date);
      return itemDate >= new Date(settings.dateFrom) && itemDate <= new Date(settings.dateTo);
    });
  };

  const filteredIncome = settings.includeIncome ? filterByDateRange(income) : [];
  const filteredExpenses = settings.includeExpenses ? filterByDateRange(expenses) : [];
  const filteredLevies = settings.includeMandateLevies 
    ? filterByDateRange(mandateLevies).filter(l => l.status === 'bezahlt')
    : [];

  const validation = validateForDatevExport({
    income: filteredIncome,
    expenses: filteredExpenses,
  });

  const totalIncome = filteredIncome.reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalLevies = filteredLevies.reduce((sum, l) => sum + (l.final_levy || 0), 0);
  const totalBookings = filteredIncome.length + filteredExpenses.length + filteredLevies.length;

  const handleExport = () => {
    setIsExporting(true);
    try {
      const exportSettings = {
        beraterNr: settings.beraterNr || '0',
        mandantNr: settings.mandantNr || '0',
        datumVon: format(new Date(settings.dateFrom), 'yyyyMMdd'),
        datumBis: format(new Date(settings.dateTo), 'yyyyMMdd'),
      };

      downloadDatevExport({
        income: filteredIncome,
        expenses: filteredExpenses,
        mandateLevies: filteredLevies,
      }, exportSettings);

      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            DATEV-Export
          </DialogTitle>
          <DialogDescription>
            Exportieren Sie Ihre Buchhaltungsdaten im DATEV-Format (EXTF Buchungsstapel)
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="preview">Vorschau</TabsTrigger>
            <TabsTrigger value="settings">Einstellungen</TabsTrigger>
            <TabsTrigger value="accounts">Kontenrahmen</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="space-y-4 mt-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="border-emerald-200 bg-emerald-50">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-medium text-emerald-700">Einnahmen</span>
                  </div>
                  <p className="text-lg font-bold text-emerald-800 mt-1">
                    {filteredIncome.length} Buchungen
                  </p>
                  <p className="text-xs text-emerald-600">{totalIncome.toFixed(2)} €</p>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-600" />
                    <span className="text-xs font-medium text-red-700">Ausgaben</span>
                  </div>
                  <p className="text-lg font-bold text-red-800 mt-1">
                    {filteredExpenses.length} Buchungen
                  </p>
                  <p className="text-xs text-red-600">{totalExpenses.toFixed(2)} €</p>
                </CardContent>
              </Card>

              <Card className="border-indigo-200 bg-indigo-50">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2">
                    <Euro className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-medium text-indigo-700">Abgaben</span>
                  </div>
                  <p className="text-lg font-bold text-indigo-800 mt-1">
                    {filteredLevies.length} Buchungen
                  </p>
                  <p className="text-xs text-indigo-600">{totalLevies.toFixed(2)} €</p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-slate-50">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-600" />
                    <span className="text-xs font-medium text-slate-700">Gesamt</span>
                  </div>
                  <p className="text-lg font-bold text-slate-800 mt-1">
                    {totalBookings} Buchungen
                  </p>
                  <p className="text-xs text-slate-600">
                    {format(new Date(settings.dateFrom), 'dd.MM.yyyy')} - {format(new Date(settings.dateTo), 'dd.MM.yyyy')}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Validation Status */}
            <Card className={validation.isValid ? 'border-emerald-200' : 'border-amber-200'}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  {validation.isValid ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`font-medium ${validation.isValid ? 'text-emerald-800' : 'text-amber-800'}`}>
                      {validation.isValid ? 'Export bereit' : 'Hinweise vor Export'}
                    </p>
                    
                    {validation.errors.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {validation.errors.map((error, idx) => (
                          <p key={idx} className="text-xs text-red-600 flex items-center gap-1">
                            <span className="w-1 h-1 bg-red-600 rounded-full" />
                            {error}
                          </p>
                        ))}
                      </div>
                    )}
                    
                    {validation.warnings.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {validation.warnings.map((warning, idx) => (
                          <p key={idx} className="text-xs text-amber-600 flex items-center gap-1">
                            <span className="w-1 h-1 bg-amber-600 rounded-full" />
                            {warning}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Selection */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <p className="text-sm font-medium text-slate-700">Zu exportierende Daten</p>
                
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox 
                      checked={settings.includeIncome}
                      onCheckedChange={(checked) => setSettings(s => ({ ...s, includeIncome: checked }))}
                    />
                    <span className="text-sm">Einnahmen ({income.length} Datensätze)</span>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox 
                      checked={settings.includeExpenses}
                      onCheckedChange={(checked) => setSettings(s => ({ ...s, includeExpenses: checked }))}
                    />
                    <span className="text-sm">Ausgaben ({expenses.length} Datensätze)</span>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox 
                      checked={settings.includeMandateLevies}
                      onCheckedChange={(checked) => setSettings(s => ({ ...s, includeMandateLevies: checked }))}
                    />
                    <span className="text-sm">
                      Mandatsabgaben ({mandateLevies.filter(l => l.status === 'bezahlt').length} bezahlt)
                    </span>
                  </label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 mt-4">
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">Steuerberater-Daten</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Berater-Nr.</Label>
                    <Input 
                      placeholder="z.B. 12345"
                      value={settings.beraterNr}
                      onChange={(e) => setSettings(s => ({ ...s, beraterNr: e.target.value }))}
                    />
                    <p className="text-xs text-slate-400">Optional - DATEV Beraternummer</p>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs">Mandant-Nr.</Label>
                    <Input 
                      placeholder="z.B. 10001"
                      value={settings.mandantNr}
                      onChange={(e) => setSettings(s => ({ ...s, mandantNr: e.target.value }))}
                    />
                    <p className="text-xs text-slate-400">Optional - DATEV Mandantennummer</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">Zeitraum</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Von</Label>
                    <Input 
                      type="date"
                      value={settings.dateFrom}
                      onChange={(e) => setSettings(s => ({ ...s, dateFrom: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs">Bis</Label>
                    <Input 
                      type="date"
                      value={settings.dateTo}
                      onChange={(e) => setSettings(s => ({ ...s, dateTo: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const now = new Date();
                      setSettings(s => ({
                        ...s,
                        dateFrom: format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd'),
                        dateTo: format(now, 'yyyy-MM-dd'),
                      }));
                    }}
                  >
                    Aktuelles Jahr
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const now = new Date();
                      const lastYear = now.getFullYear() - 1;
                      setSettings(s => ({
                        ...s,
                        dateFrom: format(new Date(lastYear, 0, 1), 'yyyy-MM-dd'),
                        dateTo: format(new Date(lastYear, 11, 31), 'yyyy-MM-dd'),
                      }));
                    }}
                  >
                    Vorjahr
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const now = new Date();
                      const quarter = Math.floor(now.getMonth() / 3);
                      const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
                      const quarterEnd = new Date(now.getFullYear(), quarter * 3 + 3, 0);
                      setSettings(s => ({
                        ...s,
                        dateFrom: format(quarterStart, 'yyyy-MM-dd'),
                        dateTo: format(quarterEnd, 'yyyy-MM-dd'),
                      }));
                    }}
                  >
                    Aktuelles Quartal
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">DATEV-Format Info</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Die Exportdatei wird im EXTF-Format (Buchungsstapel) erstellt und kann direkt 
                      in DATEV Unternehmen online, DATEV Mittelstand Faktura oder über den 
                      Belegimport Ihres Steuerberaters importiert werden.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accounts" className="space-y-4 mt-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Kontenrahmen SKR03</p>
                    <p className="text-xs text-slate-500">Standardkontenrahmen für Vereine</p>
                  </div>
                  <Badge variant="outline">SKR03</Badge>
                </div>
                
                <div className="max-h-[300px] overflow-y-auto space-y-1">
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 border-b pb-2 sticky top-0 bg-white">
                    <div className="col-span-2">Konto</div>
                    <div className="col-span-8">Bezeichnung</div>
                    <div className="col-span-2">Typ</div>
                  </div>
                  
                  {Object.entries(SKR03_ACCOUNTS).map(([konto, info]) => (
                    <div key={konto} className="grid grid-cols-12 gap-2 text-sm py-1.5 hover:bg-slate-50 rounded">
                      <div className="col-span-2 font-mono text-slate-600">{konto}</div>
                      <div className="col-span-8 text-slate-800">{info.name}</div>
                      <div className="col-span-2">
                        <Badge 
                          variant="outline" 
                          className={`text-xs capitalize ${
                            info.type === 'ertrag' ? 'border-emerald-300 text-emerald-700' :
                            info.type === 'aufwand' ? 'border-red-300 text-red-700' :
                            info.type === 'aktiv' ? 'border-blue-300 text-blue-700' :
                            'border-slate-300 text-slate-700'
                          }`}
                        >
                          {info.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <p className="text-sm font-medium text-slate-700 mb-3">Steuerschlüssel</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(TAX_CODES).map(([code, info]) => (
                    <div key={code} className="flex items-center gap-2 text-sm p-2 bg-slate-50 rounded">
                      <Badge variant="outline" className="font-mono">{code}</Badge>
                      <span className="text-slate-600">{info.description}</span>
                      {info.rate > 0 && (
                        <span className="text-xs text-slate-400 ml-auto">{info.rate}%</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={!validation.isValid || totalBookings === 0 || isExporting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exportiere...' : `DATEV Export (${totalBookings} Buchungen)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
