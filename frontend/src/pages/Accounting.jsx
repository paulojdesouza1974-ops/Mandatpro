import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { PlusCircle, Search, MoreVertical, Pencil, Trash2, TrendingUp, TrendingDown, BarChart3, ScanLine, FileSpreadsheet, Download, ChevronDown, Euro, Building2 } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import IncomeForm from "@/components/accounting/IncomeForm";
import ExpenseForm from "@/components/accounting/ExpenseForm";
import ReceiptScanner from "@/components/accounting/ReceiptScanner";
import BankStatementImport from "@/components/accounting/BankStatementImport";
import BudgetReport from "@/components/accounting/BudgetReport";
import DatevExportDialog from "@/components/accounting/DatevExportDialog";
import { exportIncomeToExcel, exportExpensesToExcel, exportAllToExcel } from "@/components/accounting/ExcelExport";

const categoryLabels = {
  income: { mitgliedsbeitrag: "Mitgliedsbeitrag", spende: "Spende", veranstaltung: "Veranstaltung", zuschuss: "Zuschuss", sonstiges: "Sonstiges" },
  expense: { personal: "Personalkosten", raummiete: "Raummiete", material: "Material", marketing: "Marketing", verwaltung: "Verwaltung", sonstiges: "Sonstiges" }
};

export default function Accounting() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("income");
  const [incomeFormOpen, setIncomeFormOpen] = useState(false);
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [datevExportOpen, setDatevExportOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [bankImportOpen, setBankImportOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const qc = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: income = [], isLoading: incomeLoading } = useQuery({
    queryKey: ["income", currentUser?.organization],
    queryFn: () => base44.entities.Income.filter({ organization: currentUser.organization }, "-date"),
    enabled: !!currentUser?.organization,
  });

  const { data: expenses = [], isLoading: expenseLoading } = useQuery({
    queryKey: ["expenses", currentUser?.organization],
    queryFn: () => base44.entities.Expense.filter({ organization: currentUser.organization }, "-date"),
    enabled: !!currentUser?.organization,
  });

  const { data: mandateLevies = [] } = useQuery({
    queryKey: ["mandateLevies", currentUser?.organization],
    queryFn: () => base44.entities.MandateLevy.filter({ organization: currentUser.organization }),
    enabled: !!currentUser?.organization,
  });

  const levyIncome = mandateLevies.filter(l => l.status === "bezahlt").reduce((sum, l) => sum + (l.final_levy || 0), 0);
  const levyOpen = mandateLevies.filter(l => l.status === "offen" || l.status === "bescheid_versendet").reduce((sum, l) => sum + (l.final_levy || 0), 0);

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", currentUser?.organization],
    queryFn: () => base44.entities.Contact.filter({ organization: currentUser.organization }),
    enabled: !!currentUser?.organization,
  });

  const { data: receipts = [] } = useQuery({
    queryKey: ["receipts", currentUser?.organization],
    queryFn: () => base44.entities.Receipt.filter({ organization: currentUser.organization }, "-date"),
    enabled: !!currentUser?.organization,
  });

  const datevStatusQuery = useQuery({
    queryKey: ["datev-status"],
    queryFn: () => base44.datev.status(),
    enabled: false,
  });

  const createIncomeMutation = useMutation({
    mutationFn: (data) => base44.entities.Income.create({ ...data, organization: currentUser.organization }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["income", currentUser.organization] });
      setIncomeFormOpen(false);
      setEditingIncome(null);
    },
  });

  const updateIncomeMutation = useMutation({
    mutationFn: (data) => base44.entities.Income.update(data.id, { ...data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["income", currentUser.organization] });
      setIncomeFormOpen(false);
      setEditingIncome(null);
    },
  });

  const deleteIncomeMutation = useMutation({
    mutationFn: (id) => base44.entities.Income.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["income", currentUser.organization] });
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create({ ...data, organization: currentUser.organization }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses", currentUser.organization] });
      setExpenseFormOpen(false);
      setEditingExpense(null);
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.update(data.id, { ...data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses", currentUser.organization] });
      setExpenseFormOpen(false);
      setEditingExpense(null);
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id) => base44.entities.Expense.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses", currentUser.organization] });
    },
  });

  React.useEffect(() => {
    if (!currentUser?.organization) return;
    
    const unsubIncome = base44.entities.Income.subscribe(() => {
      qc.invalidateQueries({ queryKey: ["income", currentUser.organization] });
    });
    
    const unsubExpense = base44.entities.Expense.subscribe(() => {
      qc.invalidateQueries({ queryKey: ["expenses", currentUser.organization] });
    });

    const unsubReceipt = base44.entities.Receipt.subscribe(() => {
      qc.invalidateQueries({ queryKey: ["receipts", currentUser.organization] });
    });
    
    return () => {
      unsubIncome();
      unsubExpense();
      unsubReceipt();
    };
  }, [currentUser?.organization, qc]);

  const totalIncome = income.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalExpense = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
  const balance = totalIncome + levyIncome - totalExpense;

  const filteredIncome = income.filter(i => {
    const matchSearch = !search || i.description?.toLowerCase().includes(search.toLowerCase()) || i.source?.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || i.category === categoryFilter;
    return matchSearch && matchCat;
  });
  const filteredExpenses = expenses.filter(e => {
    const matchSearch = !search || e.description?.toLowerCase().includes(search.toLowerCase()) || e.vendor?.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || e.category === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Buchhaltung</h1>
          <p className="text-sm text-slate-500 mt-1">Einnahmen, Ausgaben & Belege</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setBankImportOpen(true)} variant="outline" className="border-indigo-300 text-indigo-700 hover:bg-indigo-50">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Kontoauszug
          </Button>
          <Button onClick={() => setScannerOpen(true)} variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50">
            <ScanLine className="w-4 h-4 mr-2" />
            Beleg scannen
          </Button>
          <Button onClick={() => { setEditingIncome(null); setIncomeFormOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700">
            <PlusCircle className="w-4 h-4 mr-2" />
            Einnahme
          </Button>
          <Button onClick={() => { setEditingExpense(null); setExpenseFormOpen(true); }} className="bg-red-600 hover:bg-red-700">
            <PlusCircle className="w-4 h-4 mr-2" />
            Ausgabe
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
                <Download className="w-4 h-4 mr-2" />
                Export
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDatevExportOpen(true)}>
                <Building2 className="w-4 h-4 mr-2 text-blue-600" /> DATEV-Export
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => exportIncomeToExcel(income)}>
                <TrendingUp className="w-4 h-4 mr-2 text-emerald-600" /> Einnahmen (Excel)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportExpensesToExcel(expenses)}>
                <TrendingDown className="w-4 h-4 mr-2 text-red-600" /> Ausgaben (Excel)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAllToExcel(income, expenses)}>
                <FileSpreadsheet className="w-4 h-4 mr-2 text-indigo-600" /> Alles (Excel)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="border-0 shadow-sm bg-emerald-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-600 font-medium uppercase">Gesamteinnahmen</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{totalIncome.toFixed(2)} €</p>
              </div>
              <TrendingUp className="w-8 h-8 text-emerald-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-600 font-medium uppercase">Gesamtausgaben</p>
                <p className="text-2xl font-bold text-red-700 mt-1">{totalExpense.toFixed(2)} €</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-medium uppercase">Bilanz (inkl. Abgaben)</p>
                <p className={`text-2xl font-bold mt-1 ${balance >= 0 ? "text-blue-700" : "text-red-700"}`}>{balance.toFixed(2)} €</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-indigo-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-indigo-600 font-medium uppercase">Abgaben (bezahlt)</p>
                <p className="text-2xl font-bold text-indigo-700 mt-1">{levyIncome.toFixed(2)} €</p>
              </div>
              <Euro className="w-8 h-8 text-indigo-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-600 font-medium uppercase">Abgaben (offen)</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{levyOpen.toFixed(2)} €</p>
              </div>
              <Euro className="w-8 h-8 text-amber-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-slate-200" data-testid="datev-status-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" /> DATEVconnect online
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-slate-600">
            Status: {datevStatusQuery.data?.status === "placeholder" ? "In Vorbereitung" : "Unbekannt"}
          </p>
          {datevStatusQuery.data?.message && (
            <p className="text-xs text-slate-500">{datevStatusQuery.data.message}</p>
          )}
          <Button
            variant="outline"
            className="border-slate-300 text-slate-700"
            onClick={() => datevStatusQuery.refetch()}
            data-testid="datev-status-check-button"
          >
            Status prüfen
          </Button>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="income">Einnahmen</TabsTrigger>
          <TabsTrigger value="expenses">Ausgaben</TabsTrigger>
          <TabsTrigger value="levies">Mandatsabgaben</TabsTrigger>
          <TabsTrigger value="receipts">Belege</TabsTrigger>
          <TabsTrigger value="budget">Budget & Reporting</TabsTrigger>
        </TabsList>

        <TabsContent value="income" className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Suchen..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">Alle Kategorien</option>
              <option value="mitgliedsbeitrag">Mitgliedsbeitrag</option>
              <option value="spende">Spende</option>
              <option value="veranstaltung">Veranstaltung</option>
              <option value="zuschuss">Zuschuss</option>
              <option value="sonstiges">Sonstiges</option>
            </select>
          </div>

          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b">
                    <th className="font-medium text-xs uppercase tracking-wider text-slate-400 text-left px-6 py-3">Beschreibung</th>
                    <th className="font-medium text-xs uppercase tracking-wider text-slate-400 text-left px-6 py-3">Kategorie</th>
                    <th className="font-medium text-xs uppercase tracking-wider text-slate-400 text-left px-6 py-3">Betrag</th>
                    <th className="font-medium text-xs uppercase tracking-wider text-slate-400 text-left px-6 py-3 hidden md:table-cell">Datum</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {incomeLoading ? (
                    [1, 2, 3].map(i => <tr key={i}><td colSpan={5} className="p-6"><div className="h-10 bg-slate-50 rounded animate-pulse" /></td></tr>)
                  ) : filteredIncome.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-slate-400 text-sm">Keine Einnahmen gefunden</td></tr>
                  ) : (
                    filteredIncome.map(item => (
                      <tr key={item.id} className="border-b hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4"><p className="font-medium text-slate-900">{item.description}</p></td>
                        <td className="px-6 py-4"><Badge variant="outline" className="text-xs">{categoryLabels.income[item.category]}</Badge></td>
                        <td className="px-6 py-4"><p className="font-medium text-emerald-600">+{item.amount.toFixed(2)} €</p></td>
                        <td className="px-6 py-4 hidden md:table-cell text-slate-500">{format(new Date(item.date), "dd.MM.yyyy", { locale: de })}</td>
                        <td className="px-6 py-4"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => { setEditingIncome(item); setIncomeFormOpen(true); }}><Pencil className="w-4 h-4 mr-2" /> Bearbeiten</DropdownMenuItem><DropdownMenuItem className="text-red-600" onClick={() => deleteIncomeMutation.mutate(item.id)}><Trash2 className="w-4 h-4 mr-2" /> Löschen</DropdownMenuItem></DropdownMenuContent></DropdownMenu></td>
                        </tr>
                        ))
                        )}
                        </tbody>
                        </table>
                        </div>
                        </Card>
                        </TabsContent>

                        <TabsContent value="expenses" className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Suchen..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">Alle Kategorien</option>
              <option value="personal">Personalkosten</option>
              <option value="raummiete">Raummiete</option>
              <option value="material">Material</option>
              <option value="marketing">Marketing</option>
              <option value="verwaltung">Verwaltung</option>
              <option value="sonstiges">Sonstiges</option>
            </select>
          </div>

          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b">
                    <th className="font-medium text-xs uppercase tracking-wider text-slate-400 text-left px-6 py-3">Beschreibung</th>
                    <th className="font-medium text-xs uppercase tracking-wider text-slate-400 text-left px-6 py-3">Kategorie</th>
                    <th className="font-medium text-xs uppercase tracking-wider text-slate-400 text-left px-6 py-3">Betrag</th>
                    <th className="font-medium text-xs uppercase tracking-wider text-slate-400 text-left px-6 py-3 hidden md:table-cell">Status</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {expenseLoading ? (
                    [1, 2, 3].map(i => <tr key={i}><td colSpan={5} className="p-6"><div className="h-10 bg-slate-50 rounded animate-pulse" /></td></tr>)
                  ) : filteredExpenses.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-slate-400 text-sm">Keine Ausgaben gefunden</td></tr>
                  ) : (
                    filteredExpenses.map(item => (
                      <tr key={item.id} className="border-b hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4"><p className="font-medium text-slate-900">{item.description}</p></td>
                        <td className="px-6 py-4"><Badge variant="outline" className="text-xs">{categoryLabels.expense[item.category]}</Badge></td>
                        <td className="px-6 py-4"><p className="font-medium text-red-600">-{item.amount.toFixed(2)} €</p></td>
                        <td className="px-6 py-4 hidden md:table-cell"><Badge className="text-xs" variant={item.status === "bezahlt" ? "default" : "outline"}>{item.status}</Badge></td>
                        <td className="px-6 py-4"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => { setEditingExpense(item); setExpenseFormOpen(true); }}><Pencil className="w-4 h-4 mr-2" /> Bearbeiten</DropdownMenuItem><DropdownMenuItem className="text-red-600" onClick={() => deleteExpenseMutation.mutate(item.id)}><Trash2 className="w-4 h-4 mr-2" /> Löschen</DropdownMenuItem></DropdownMenuContent></DropdownMenu></td>
                        </tr>
                        ))
                        )}
                        </tbody>
                        </table>
                        </div>
                        </Card>
                        </TabsContent>

                        <TabsContent value="levies" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{mandateLevies.length} Abgaben insgesamt</p>
            <a href="/MandateLevy" className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
              <Euro className="w-3.5 h-3.5" /> Zur Mandatsabgaben-Verwaltung →
            </a>
          </div>
          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b">
                    <th className="font-medium text-xs uppercase tracking-wider text-slate-400 text-left px-6 py-3">Mandatsträger</th>
                    <th className="font-medium text-xs uppercase tracking-wider text-slate-400 text-left px-6 py-3">Mandatsart</th>
                    <th className="font-medium text-xs uppercase tracking-wider text-slate-400 text-left px-6 py-3">Monat</th>
                    <th className="font-medium text-xs uppercase tracking-wider text-slate-400 text-left px-6 py-3">Brutto</th>
                    <th className="font-medium text-xs uppercase tracking-wider text-slate-400 text-left px-6 py-3">Abgabe</th>
                    <th className="font-medium text-xs uppercase tracking-wider text-slate-400 text-left px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mandateLevies.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-slate-400 text-sm">Keine Abgaben erfasst</td></tr>
                  ) : (
                    mandateLevies.map(levy => {
                      const statusColors = { offen: "bg-amber-100 text-amber-700", bescheid_versendet: "bg-blue-100 text-blue-700", bezahlt: "bg-emerald-100 text-emerald-700", mahnbescheid: "bg-red-100 text-red-700" };
                      const statusLabels = { offen: "Offen", bescheid_versendet: "Versendet", bezahlt: "Bezahlt", mahnbescheid: "Mahnbescheid" };
                      return (
                        <tr key={levy.id} className="border-b hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900">{levy.contact_name}</td>
                          <td className="px-6 py-4 text-slate-500 capitalize">{levy.mandate_type}</td>
                          <td className="px-6 py-4 text-slate-500">{levy.period_month}</td>
                          <td className="px-6 py-4 text-slate-700">{(levy.gross_income || 0).toFixed(2)} €</td>
                          <td className="px-6 py-4 font-semibold text-indigo-700">{(levy.final_levy || 0).toFixed(2)} €</td>
                          <td className="px-6 py-4"><span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[levy.status]}`}>{statusLabels[levy.status]}</span></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="receipts" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Suchen..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {receipts.map(receipt => (
              <Card key={receipt.id} className="border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-sm">{receipt.title}</CardTitle>
                      <p className="text-xs text-slate-500 mt-1">{receipt.vendor}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Trash2 className="w-4 h-4 mr-2" /> Löschen</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{receipt.amount.toFixed(2)} €</span>
                    <Badge className="text-xs">{receipt.transaction_type}</Badge>
                  </div>
                  <p className="text-xs text-slate-500">{format(new Date(receipt.date), "dd.MM.yyyy")}</p>
                  {receipt.file_url && (
                    <a href={receipt.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Beleg anzeigen</a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="budget">
          <BudgetReport organization={currentUser?.organization} income={income} expenses={expenses} mandateLevies={mandateLevies} />
        </TabsContent>
      </Tabs>

      <BankStatementImport open={bankImportOpen} onClose={() => setBankImportOpen(false)} organization={currentUser?.organization} contacts={contacts} existingExpenses={expenses} />
      <ReceiptScanner open={scannerOpen} onClose={() => setScannerOpen(false)} organization={currentUser?.organization} />

      <IncomeForm isOpen={incomeFormOpen} onClose={() => setIncomeFormOpen(false)} defaultData={editingIncome} onSubmit={(data) => {
        if (editingIncome) {
          updateIncomeMutation.mutate({ ...data, id: editingIncome.id });
        } else {
          createIncomeMutation.mutate(data);
        }
      }} />

      <ExpenseForm isOpen={expenseFormOpen} onClose={() => setExpenseFormOpen(false)} defaultData={editingExpense} onSubmit={(data) => {
        if (editingExpense) {
          updateExpenseMutation.mutate({ ...data, id: editingExpense.id });
        } else {
          createExpenseMutation.mutate(data);
        }
      }} />

      <DatevExportDialog
        open={datevExportOpen}
        onClose={() => setDatevExportOpen(false)}
        income={income}
        expenses={expenses}
        mandateLevies={mandateLevies}
      />
    </div>
  );
}