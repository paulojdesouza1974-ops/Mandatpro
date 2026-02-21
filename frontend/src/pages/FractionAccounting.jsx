import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/apiClient";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Euro,
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  Users,
  Briefcase,
  Package,
  Pencil,
  Trash2,
  Calendar,
  FileText,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

// Vereinfachte Kategorien für Fraktionen
const incomeCategories = [
  { value: "zuwendung_stadt", label: "Zuwendung Stadt", icon: Building2 },
  { value: "zuwendung_kreis", label: "Zuwendung Kreis", icon: Building2 },
  { value: "zuwendung_sonstige", label: "Sonstige Zuwendungen", icon: Euro },
];

const expenseCategories = [
  { value: "personal", label: "Personalkosten", icon: Users },
  { value: "miete", label: "Miete & Nebenkosten", icon: Building2 },
  { value: "verwaltung", label: "Verwaltungskosten", icon: Briefcase },
  { value: "bueromaterial", label: "Büromaterial", icon: Package },
];

export default function FractionAccounting() {
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);

  // Form states
  const [incomeForm, setIncomeForm] = useState({
    title: "",
    category: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    reference: "",
    notes: "",
  });

  const [expenseForm, setExpenseForm] = useState({
    title: "",
    category: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    reference: "",
    notes: "",
  });

  // Queries
  const { data: incomes = [] } = useQuery({
    queryKey: ["fraction_incomes", currentUser?.organization],
    queryFn: () => base44.entities.Income.filter({ organization: currentUser.organization }),
    enabled: !!currentUser?.organization,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["fraction_expenses", currentUser?.organization],
    queryFn: () => base44.entities.Expense.filter({ organization: currentUser.organization }),
    enabled: !!currentUser?.organization,
  });

  // Mutations
  const createIncomeMutation = useMutation({
    mutationFn: (data) => base44.entities.Income.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fraction_incomes"] });
      setIncomeDialogOpen(false);
      resetIncomeForm();
      toast({ title: "Einnahme gespeichert" });
    },
  });

  const updateIncomeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Income.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fraction_incomes"] });
      setEditingIncome(null);
      resetIncomeForm();
      toast({ title: "Einnahme aktualisiert" });
    },
  });

  const deleteIncomeMutation = useMutation({
    mutationFn: (id) => base44.entities.Income.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fraction_incomes"] });
      toast({ title: "Einnahme gelöscht" });
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fraction_expenses"] });
      setExpenseDialogOpen(false);
      resetExpenseForm();
      toast({ title: "Ausgabe gespeichert" });
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Expense.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fraction_expenses"] });
      setEditingExpense(null);
      resetExpenseForm();
      toast({ title: "Ausgabe aktualisiert" });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id) => base44.entities.Expense.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fraction_expenses"] });
      toast({ title: "Ausgabe gelöscht" });
    },
  });

  const resetIncomeForm = () => {
    setIncomeForm({
      title: "",
      category: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      reference: "",
      notes: "",
    });
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      title: "",
      category: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      reference: "",
      notes: "",
    });
  };

  const handleSaveIncome = () => {
    const data = {
      ...incomeForm,
      amount: parseFloat(incomeForm.amount) || 0,
      organization: currentUser.organization,
      type: "fraction",
    };

    if (editingIncome) {
      updateIncomeMutation.mutate({ id: editingIncome.id, data });
    } else {
      createIncomeMutation.mutate(data);
    }
  };

  const handleSaveExpense = () => {
    const data = {
      ...expenseForm,
      amount: parseFloat(expenseForm.amount) || 0,
      organization: currentUser.organization,
      type: "fraction",
    };

    if (editingExpense) {
      updateExpenseMutation.mutate({ id: editingExpense.id, data });
    } else {
      createExpenseMutation.mutate(data);
    }
  };

  const openEditIncome = (income) => {
    setEditingIncome(income);
    setIncomeForm({
      title: income.title || "",
      category: income.category || "",
      amount: income.amount?.toString() || "",
      date: income.date?.split("T")[0] || new Date().toISOString().split("T")[0],
      reference: income.reference || "",
      notes: income.notes || "",
    });
    setIncomeDialogOpen(true);
  };

  const openEditExpense = (expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      title: expense.title || "",
      category: expense.category || "",
      amount: expense.amount?.toString() || "",
      date: expense.date?.split("T")[0] || new Date().toISOString().split("T")[0],
      reference: expense.reference || "",
      notes: expense.notes || "",
    });
    setExpenseDialogOpen(true);
  };

  // Calculate totals
  const totalIncome = incomes.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const balance = totalIncome - totalExpenses;

  // Group expenses by category
  const expensesByCategory = expenseCategories.map((cat) => ({
    ...cat,
    total: expenses
      .filter((e) => e.category === cat.value)
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0),
  }));

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("de-DE");
  };

  const getCategoryLabel = (value, categories) => {
    return categories.find((c) => c.value === value)?.label || value;
  };

  return (
    <div className="space-y-6" data-testid="fraction-accounting">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fraktionsfinanzen</h1>
          <p className="text-slate-500 text-sm">Einnahmen und Ausgaben der Fraktion verwalten</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={incomeDialogOpen} onOpenChange={(open) => {
            setIncomeDialogOpen(open);
            if (!open) { setEditingIncome(null); resetIncomeForm(); }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" data-testid="add-income-btn">
                <Plus className="w-4 h-4 mr-2" />
                Einnahme
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingIncome ? "Einnahme bearbeiten" : "Neue Einnahme"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Bezeichnung</Label>
                  <Input
                    value={incomeForm.title}
                    onChange={(e) => setIncomeForm({ ...incomeForm, title: e.target.value })}
                    placeholder="z.B. Fraktionszuwendung Q1/2026"
                    data-testid="income-title"
                  />
                </div>
                <div>
                  <Label>Kategorie</Label>
                  <Select value={incomeForm.category} onValueChange={(v) => setIncomeForm({ ...incomeForm, category: v })}>
                    <SelectTrigger data-testid="income-category">
                      <SelectValue placeholder="Kategorie wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {incomeCategories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Betrag (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={incomeForm.amount}
                      onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                      placeholder="0,00"
                      data-testid="income-amount"
                    />
                  </div>
                  <div>
                    <Label>Datum</Label>
                    <Input
                      type="date"
                      value={incomeForm.date}
                      onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })}
                      data-testid="income-date"
                    />
                  </div>
                </div>
                <div>
                  <Label>Referenz / Aktenzeichen</Label>
                  <Input
                    value={incomeForm.reference}
                    onChange={(e) => setIncomeForm({ ...incomeForm, reference: e.target.value })}
                    placeholder="z.B. Bescheid-Nr."
                  />
                </div>
                <div>
                  <Label>Notizen</Label>
                  <Textarea
                    value={incomeForm.notes}
                    onChange={(e) => setIncomeForm({ ...incomeForm, notes: e.target.value })}
                    placeholder="Optionale Anmerkungen"
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => { setIncomeDialogOpen(false); setEditingIncome(null); resetIncomeForm(); }}>
                    Abbrechen
                  </Button>
                  <Button onClick={handleSaveIncome} disabled={!incomeForm.title || !incomeForm.amount} data-testid="save-income-btn">
                    {editingIncome ? "Speichern" : "Hinzufügen"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={expenseDialogOpen} onOpenChange={(open) => {
            setExpenseDialogOpen(open);
            if (!open) { setEditingExpense(null); resetExpenseForm(); }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" data-testid="add-expense-btn">
                <Plus className="w-4 h-4 mr-2" />
                Ausgabe
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingExpense ? "Ausgabe bearbeiten" : "Neue Ausgabe"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Bezeichnung</Label>
                  <Input
                    value={expenseForm.title}
                    onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                    placeholder="z.B. Miete Februar 2026"
                    data-testid="expense-title"
                  />
                </div>
                <div>
                  <Label>Kategorie</Label>
                  <Select value={expenseForm.category} onValueChange={(v) => setExpenseForm({ ...expenseForm, category: v })}>
                    <SelectTrigger data-testid="expense-category">
                      <SelectValue placeholder="Kategorie wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Betrag (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      placeholder="0,00"
                      data-testid="expense-amount"
                    />
                  </div>
                  <div>
                    <Label>Datum</Label>
                    <Input
                      type="date"
                      value={expenseForm.date}
                      onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                      data-testid="expense-date"
                    />
                  </div>
                </div>
                <div>
                  <Label>Referenz / Beleg-Nr.</Label>
                  <Input
                    value={expenseForm.reference}
                    onChange={(e) => setExpenseForm({ ...expenseForm, reference: e.target.value })}
                    placeholder="z.B. Rechnungs-Nr."
                  />
                </div>
                <div>
                  <Label>Notizen</Label>
                  <Textarea
                    value={expenseForm.notes}
                    onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                    placeholder="Optionale Anmerkungen"
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => { setExpenseDialogOpen(false); setEditingExpense(null); resetExpenseForm(); }}>
                    Abbrechen
                  </Button>
                  <Button onClick={handleSaveExpense} disabled={!expenseForm.title || !expenseForm.amount} data-testid="save-expense-btn">
                    {editingExpense ? "Speichern" : "Hinzufügen"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Einnahmen</p>
                <p className="text-2xl font-bold text-emerald-700">{formatCurrency(totalIncome)}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-100 bg-gradient-to-br from-red-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Ausgaben</p>
                <p className="text-2xl font-bold text-red-700">{formatCurrency(totalExpenses)}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-slate-100 bg-gradient-to-br ${balance >= 0 ? 'from-blue-50' : 'from-amber-50'} to-white`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${balance >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>Saldo</p>
                <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>{formatCurrency(balance)}</p>
              </div>
              <div className={`w-12 h-12 rounded-full ${balance >= 0 ? 'bg-blue-100' : 'bg-amber-100'} flex items-center justify-center`}>
                <Wallet className={`w-6 h-6 ${balance >= 0 ? 'text-blue-600' : 'text-amber-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expense Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ausgaben nach Kategorie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {expensesByCategory.map((cat) => {
              const Icon = cat.icon;
              const percentage = totalExpenses > 0 ? (cat.total / totalExpenses * 100).toFixed(0) : 0;
              return (
                <div key={cat.value} className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-700">{cat.label}</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(cat.total)}</p>
                  <p className="text-xs text-slate-500">{percentage}% der Ausgaben</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Income/Expenses */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="incomes">Einnahmen ({incomes.length})</TabsTrigger>
          <TabsTrigger value="expenses">Ausgaben ({expenses.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Recent Incomes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Letzte Einnahmen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {incomes.slice(0, 5).map((income) => (
                    <div key={income.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                      <div>
                        <p className="font-medium text-sm text-slate-900">{income.title}</p>
                        <p className="text-xs text-slate-500">{formatDate(income.date)}</p>
                      </div>
                      <span className="font-semibold text-emerald-600">+{formatCurrency(income.amount)}</span>
                    </div>
                  ))}
                  {incomes.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4">Noch keine Einnahmen erfasst</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Expenses */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  Letzte Ausgaben
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {expenses.slice(0, 5).map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                      <div>
                        <p className="font-medium text-sm text-slate-900">{expense.title}</p>
                        <p className="text-xs text-slate-500">{formatDate(expense.date)} · {getCategoryLabel(expense.category, expenseCategories)}</p>
                      </div>
                      <span className="font-semibold text-red-600">-{formatCurrency(expense.amount)}</span>
                    </div>
                  ))}
                  {expenses.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4">Noch keine Ausgaben erfasst</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="incomes" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {incomes.map((income) => (
                  <div key={income.id} className="flex items-center justify-between p-4 rounded-lg border border-slate-100 hover:bg-slate-50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Euro className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{income.title}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Calendar className="w-3 h-3" />
                          {formatDate(income.date)}
                          <Badge variant="outline" className="text-xs">
                            {getCategoryLabel(income.category, incomeCategories)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-lg text-emerald-600">+{formatCurrency(income.amount)}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditIncome(income)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => deleteIncomeMutation.mutate(income.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {incomes.length === 0 && (
                  <div className="text-center py-12">
                    <Euro className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Noch keine Einnahmen erfasst</p>
                    <Button variant="outline" className="mt-4" onClick={() => setIncomeDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Erste Einnahme hinzufügen
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {expenses.map((expense) => {
                  const catInfo = expenseCategories.find((c) => c.value === expense.category);
                  const Icon = catInfo?.icon || Briefcase;
                  return (
                    <div key={expense.id} className="flex items-center justify-between p-4 rounded-lg border border-slate-100 hover:bg-slate-50">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{expense.title}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Calendar className="w-3 h-3" />
                            {formatDate(expense.date)}
                            <Badge variant="outline" className="text-xs">
                              {getCategoryLabel(expense.category, expenseCategories)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-lg text-red-600">-{formatCurrency(expense.amount)}</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditExpense(expense)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => deleteExpenseMutation.mutate(expense.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {expenses.length === 0 && (
                  <div className="text-center py-12">
                    <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Noch keine Ausgaben erfasst</p>
                    <Button variant="outline" className="mt-4" onClick={() => setExpenseDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Erste Ausgabe hinzufügen
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
