import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { PlusCircle, MoreVertical, Pencil, Trash2, Target, TrendingUp, AlertTriangle, CheckCircle2, Calculator, Lock, Unlock } from "lucide-react";
import { format, isWithinInterval, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import BudgetForm from "./BudgetForm";

const categoryLabels = {
  income: { mitgliedsbeitrag: "Mitgliedsbeitrag", spende: "Spende", veranstaltung: "Veranstaltung", zuschuss: "Zuschuss", sonstiges: "Sonstiges" },
  expense: { personal: "Personal", raummiete: "Raummiete", material: "Material", marketing: "Marketing", verwaltung: "Verwaltung", sonstiges: "Sonstiges" },
};

function pct(actual, planned) {
  if (!planned || planned === 0) return 0;
  return Math.round((actual / planned) * 100);
}

function StatusBadge({ percent, type }) {
  if (type === "income") {
    if (percent >= 100) return <Badge className="bg-emerald-100 text-emerald-700 text-xs">Ziel erreicht</Badge>;
    if (percent >= 75) return <Badge className="bg-blue-100 text-blue-700 text-xs">Gut</Badge>;
    return <Badge className="bg-amber-100 text-amber-700 text-xs">Ausstehend</Badge>;
  } else {
    if (percent > 100) return <Badge className="bg-red-100 text-red-700 text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Überschritten</Badge>;
    if (percent >= 80) return <Badge className="bg-amber-100 text-amber-700 text-xs">Knapp</Badge>;
    return <Badge className="bg-emerald-100 text-emerald-700 text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Im Budget</Badge>;
  }
}

function BudgetBar({ planned, actual, type }) {
  const p = Math.min(pct(actual, planned), 150);
  const isOver = actual > planned;
  const color = type === "income"
    ? (actual >= planned ? "#10b981" : "#3b82f6")
    : (isOver ? "#ef4444" : actual / planned >= 0.8 ? "#f59e0b" : "#10b981");

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-500">
        <span>Ist: {actual.toFixed(2)} €</span>
        <span>Plan: {planned.toFixed(2)} €</span>
      </div>
      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(p, 100)}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between text-xs">
        <span style={{ color }}>{pct(actual, planned)}%</span>
        <span className="text-slate-400">{isOver ? `+${(actual - planned).toFixed(2)} € über Budget` : `${(planned - actual).toFixed(2)} € verbleibend`}</span>
      </div>
    </div>
  );
}

export default function BudgetReport({ organization, income = [], expenses = [], mandateLevies = [] }) {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [planYear, setPlanYear] = useState(String(new Date().getFullYear()));

  const { data: budgets = [] } = useQuery({
    queryKey: ["budgets", organization],
    queryFn: () => base44.entities.Budget.filter({ organization }),
    enabled: !!organization,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", organization],
    queryFn: () => base44.entities.Contact.filter({ organization }),
    enabled: !!organization,
  });

  // Jahresplanung berechnen
  const activeMembers = contacts.filter(c => c.status === "aktiv" || !c.status);
  const memberCount = activeMembers.length;
  const avgMemberFee = memberCount > 0
    ? activeMembers.reduce((sum, c) => sum + (c.membership_fee || 0), 0) / memberCount
    : 0;
  const totalMemberFees = activeMembers.reduce((sum, c) => sum + (c.membership_fee || 0), 0);

  // Mandatsabgaben: Durchschnitt der letzten Monate hochrechnen auf 12
  const yearLevies = mandateLevies.filter(l => {
    if (!l.period_month) return false;
    return l.period_month.startsWith(planYear);
  });
  const levyMonths = [...new Set(yearLevies.map(l => l.period_month))].length || 1;
  const levyTotal = yearLevies.reduce((sum, l) => sum + (l.final_levy || 0), 0);
  const levyMonthlyAvg = levyTotal / levyMonths;
  const levyYearProjected = levyMonthlyAvg * 12;

  const plannedTotal = totalMemberFees + levyYearProjected;

  // Ist-Einnahmen im gewählten Jahr
  const actualMemberFeeIncome = income
    .filter(i => i.category === "mitgliedsbeitrag" && i.date && i.date.startsWith(planYear))
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const actualLevyIncome = mandateLevies
    .filter(l => l.status === "bezahlt" && l.period_month && l.period_month.startsWith(planYear))
    .reduce((sum, l) => sum + (l.final_levy || 0), 0);

  const actualTotal = actualMemberFeeIncome + actualLevyIncome;

  // ── Jahresausgaben Plan vs. Ist ──────────────────────────────────────────
  const expenseCategoryConfig = [
    { cat: "raummiete", label: "Raummiete", monthly: true },
    { cat: "personal", label: "Personal", monthly: true },
    { cat: "verwaltung", label: "Verwaltung", monthly: true },
    { cat: "edv", label: "EDV / Software", monthly: true },
    { cat: "material", label: "Material / Büro", monthly: false },
    { cat: "marketing", label: "Marketing", monthly: false },
    { cat: "wahlkampf", label: "Wahlkampf", monthly: false },
    { cat: "sonstiges", label: "Sonstiges", monthly: false },
  ];

  // State für manuelle monatliche Werte (Fixkosten-Planung)
  const [monthlyOverrides, setMonthlyOverrides] = useState({});

  const actualExpensesByCategory = expenseCategoryConfig.map(({ cat, label, monthly }) => {
    const actual = expenses
      .filter(e => e.category === cat && e.date && e.date.startsWith(planYear))
      .reduce((s, e) => s + (e.amount || 0), 0);

    // 1. Explizites Budget für dieses Jahr?
    const budgetPlanned = budgets
      .filter(b => b.type === "expense" && b.category === cat &&
        b.period_start && b.period_start.startsWith(planYear))
      .reduce((s, b) => s + (b.amount || 0), 0);

    // 2. Manueller monatlicher Override (Fixkosten ×12)?
    const manualMonthly = monthlyOverrides[cat];

    // 3. Fallback: Ø aus Vergangenheit ×12
    const historicMonthly = (() => {
      const months = [...new Set(expenses.filter(e => e.category === cat && e.date).map(e => e.date.slice(0, 7)))];
      if (months.length === 0) return 0;
      const total = expenses.filter(e => e.category === cat).reduce((s, e) => s + (e.amount || 0), 0);
      return (total / months.length) * 12;
    })();

    const planned = budgetPlanned || (manualMonthly != null ? manualMonthly * 12 : historicMonthly);
    const monthlyAmount = manualMonthly != null ? manualMonthly : (budgetPlanned > 0 ? budgetPlanned / 12 : historicMonthly / 12);

    return { cat, label, actual, planned, monthly, monthlyAmount: monthly ? monthlyAmount : null };
  }).filter(r => r.actual > 0 || r.planned > 0 || monthlyOverrides[r?.cat] != null);

  const totalPlannedExpenses = actualExpensesByCategory.reduce((s, r) => s + r.planned, 0);
  const totalActualExpenses = actualExpensesByCategory.reduce((s, r) => s + r.actual, 0);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Budget.create({ ...data, organization, amount: parseFloat(data.amount) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["budgets", organization] }); setFormOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Budget.update(data.id, { ...data, amount: parseFloat(data.amount) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["budgets", organization] }); setFormOpen(false); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Budget.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgets", organization] }),
  });

  // Compute actual amounts per budget
  const enriched = useMemo(() => {
    return budgets.map((b) => {
      const start = parseISO(b.period_start);
      const end = parseISO(b.period_end);
      const source = b.type === "income" ? income : expenses;
      const actual = source
        .filter((item) => {
          if (item.category !== b.category) return false;
          if (!item.date) return false;
          return isWithinInterval(parseISO(item.date), { start, end });
        })
        .reduce((sum, item) => sum + (item.amount || 0), 0);
      return { ...b, actual };
    });
  }, [budgets, income, expenses]);

  // Filter
  const now = new Date();
  const filtered = enriched.filter((b) => {
    if (filterType !== "all" && b.type !== filterType) return false;
    if (filterPeriod === "active") {
      const s = parseISO(b.period_start), e = parseISO(b.period_end);
      if (now < s || now > e) return false;
    }
    return true;
  });

  // Chart data
  const chartData = filtered.map((b) => ({
    name: categoryLabels[b.type]?.[b.category] || b.category,
    Geplant: b.amount,
    "Ist-Wert": b.actual,
    type: b.type,
  }));

  const totalPlanned = { income: 0, expense: 0 };
  const totalActual = { income: 0, expense: 0 };
  enriched.forEach((b) => { totalPlanned[b.type] += b.amount; totalActual[b.type] += b.actual; });

  const copyPrevYear = async () => {
    const prevYear = String(parseInt(planYear) - 1);
    const prevBudgets = budgets.filter(b => b.period_start && b.period_start.startsWith(prevYear));
    if (prevBudgets.length === 0) { alert(`Keine Budgets für ${prevYear} gefunden.`); return; }
    for (const b of prevBudgets) {
      await base44.entities.Budget.create({
        organization,
        name: b.name.replace(prevYear, planYear),
        type: b.type,
        category: b.category,
        amount: b.amount,
        period_start: b.period_start.replace(prevYear, planYear),
        period_end: b.period_end.replace(prevYear, planYear),
        notes: b.notes,
      });
    }
    qc.invalidateQueries({ queryKey: ["budgets", organization] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-3 items-center flex-wrap">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-36 text-xs"><SelectValue placeholder="Alle Typen" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Typen</SelectItem>
              <SelectItem value="income">Einnahmen</SelectItem>
              <SelectItem value="expense">Ausgaben</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPeriod} onValueChange={setFilterPeriod}>
            <SelectTrigger className="w-36 text-xs"><SelectValue placeholder="Alle Zeiträume" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Zeiträume</SelectItem>
              <SelectItem value="active">Aktuell aktive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-dashed"
            onClick={copyPrevYear}
            title={`Budgets von ${parseInt(planYear) - 1} nach ${planYear} kopieren`}
          >
            Vorjahr kopieren ({parseInt(planYear) - 1} → {planYear})
          </Button>
          <Button
            onClick={() => { setEditing(null); setFormOpen(true); }}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Budget anlegen
          </Button>
        </div>
      </div>

      {/* Jahresplanung */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-blue-50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-indigo-600" />
              <CardTitle className="text-sm font-semibold text-indigo-800">Geplante Jahreseinnahmen {planYear}</CardTitle>
            </div>
            <select
              value={planYear}
              onChange={e => setPlanYear(e.target.value)}
              className="h-8 rounded-md border border-indigo-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            >
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
            <div className="bg-white/80 rounded-lg p-3 space-y-1">
              <p className="text-xs text-slate-500">Mitgliedsbeiträge (Plan)</p>
              <p className="text-lg font-bold text-emerald-700">{totalMemberFees.toFixed(2)} €</p>
              <p className="text-xs text-slate-400">{memberCount} aktive Mitglieder × ⌀ {avgMemberFee.toFixed(2)} €</p>
            </div>
            <div className="bg-white/80 rounded-lg p-3 space-y-1">
              <p className="text-xs text-slate-500">Abgaben (Prognose)</p>
              <p className="text-lg font-bold text-indigo-700">{levyYearProjected.toFixed(2)} €</p>
              <p className="text-xs text-slate-400">
                {levyMonths === 1 && levyTotal === 0
                  ? "Keine Daten für dieses Jahr"
                  : `⌀ ${levyMonthlyAvg.toFixed(2)} €/Monat × 12`}
              </p>
            </div>
            <div className="bg-white/80 rounded-lg p-3 space-y-2">
              <p className="text-xs text-slate-500">Ist-Einnahmen {planYear}</p>
              <p className="text-lg font-bold text-emerald-700">{actualTotal.toFixed(2)} €</p>
              <div className="space-y-0.5">
                <p className="text-xs text-slate-400">Beiträge: {actualMemberFeeIncome.toFixed(2)} €</p>
                <p className="text-xs text-slate-400">Abgaben bezahlt: {actualLevyIncome.toFixed(2)} €</p>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(pct(actualTotal, plannedTotal), 100)}%` }}
                />
              </div>
              <p className="text-xs text-emerald-700 font-medium">{pct(actualTotal, plannedTotal)}% des Plans erreicht</p>
            </div>
            <div className="bg-indigo-600 rounded-lg p-3 space-y-1 text-white">
              <p className="text-xs text-indigo-200">Gesamtplanung {planYear}</p>
              <p className="text-lg font-bold">{plannedTotal.toFixed(2)} €</p>
              <p className="text-xs text-indigo-200">Beiträge + Abgaben</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jahresausgaben Plan vs. Ist */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-orange-50">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-red-600" />
            <CardTitle className="text-sm font-semibold text-red-800">Geplante Jahresausgaben {planYear} – Soll vs. Ist</CardTitle>
          </div>
          <p className="text-xs text-slate-500 mt-1">Fixkosten: monatlichen Betrag eingeben → Jahresplan wird automatisch ×12 berechnet</p>
        </CardHeader>
        <CardContent className="pt-0 space-y-1">
          {/* Fixkosten Kategorien */}
          {expenseCategoryConfig.map(({ cat, label, monthly }) => {
            const row = actualExpensesByCategory.find(r => r.cat === cat);
            const actual = row?.actual || 0;
            const planned = row?.planned || 0;
            const p = planned > 0 ? Math.min((actual / planned) * 100, 150) : 0;
            const isOver = actual > planned && planned > 0;
            const color = isOver ? "#ef4444" : p >= 80 ? "#f59e0b" : "#10b981";
            const manualVal = monthlyOverrides[cat];

            return (
              <div key={cat} className="bg-white/60 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {monthly ? (
                      <Lock className="w-3 h-3 text-slate-400" title="Fixkosten" />
                    ) : (
                      <Unlock className="w-3 h-3 text-slate-300" title="Variable Kosten" />
                    )}
                    <span className="text-xs font-semibold text-slate-700">{label}</span>
                    {monthly && <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-medium">Fixkosten</span>}
                  </div>
                  {monthly && (
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        value={manualVal ?? ""}
                        onChange={e => {
                          const v = e.target.value === "" ? undefined : parseFloat(e.target.value);
                          setMonthlyOverrides(prev => ({ ...prev, [cat]: v }));
                        }}
                        className="h-7 w-24 text-xs text-right"
                      />
                      <span className="text-xs text-slate-500 whitespace-nowrap">€ / Monat</span>
                      {manualVal != null && (
                        <span className="text-xs text-indigo-600 font-semibold whitespace-nowrap">= {(manualVal * 12).toFixed(0)} € / Jahr</span>
                      )}
                    </div>
                  )}
                </div>
                {(planned > 0 || actual > 0) && (
                  <>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Plan: <span className="font-semibold text-slate-700">{planned.toFixed(2)} €</span>
                        {monthly && planned > 0 && <span className="text-slate-400 ml-1">(⌀ {(planned / 12).toFixed(2)} €/Mon.)</span>}
                      </span>
                      <span style={{ color }} className="font-semibold">Ist: {actual.toFixed(2)} €</span>
                      {isOver && <AlertTriangle className="w-3 h-3 text-red-500" />}
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(p, 100)}%`, backgroundColor: color }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span style={{ color }}>{planned > 0 ? Math.round((actual / planned) * 100) : "–"}%</span>
                      <span>{isOver ? `+${(actual - planned).toFixed(2)} € über Budget` : planned > 0 ? `${(planned - actual).toFixed(2)} € verbleibend` : "kein Budget geplant"}</span>
                    </div>
                  </>
                )}
                {planned === 0 && actual === 0 && !monthly && (
                  <p className="text-[10px] text-slate-300 italic">Noch keine Daten</p>
                )}
              </div>
            );
          })}

          {/* Gesamtzeile */}
          {(totalPlannedExpenses > 0 || totalActualExpenses > 0) && (
            <div className="pt-2 border-t border-red-100 flex items-center justify-between flex-wrap gap-2">
              <div className="flex gap-4 text-xs">
                <span className="text-slate-600">Gesamt Plan: <span className="font-bold text-slate-800">{totalPlannedExpenses.toFixed(2)} €</span></span>
                <span className={totalActualExpenses > totalPlannedExpenses ? "text-red-600 font-bold" : "text-emerald-600 font-bold"}>
                  Ist: {totalActualExpenses.toFixed(2)} €
                </span>
              </div>
              <div className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                totalActualExpenses > totalPlannedExpenses ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
              }`}>
                {totalActualExpenses > totalPlannedExpenses
                  ? `+${(totalActualExpenses - totalPlannedExpenses).toFixed(2)} € überzogen`
                  : `${(totalPlannedExpenses - totalActualExpenses).toFixed(2)} € verbleibend`}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm bg-emerald-50">
          <CardContent className="pt-5">
            <p className="text-xs text-emerald-600 font-medium uppercase">Einnahmen – Plan vs. Ist</p>
            <p className="text-xl font-bold text-emerald-700 mt-1">{totalActual.income.toFixed(2)} € / {totalPlanned.income.toFixed(2)} €</p>
            <div className="mt-2 h-2 w-full bg-emerald-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(pct(totalActual.income, totalPlanned.income), 100)}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-red-50">
          <CardContent className="pt-5">
            <p className="text-xs text-red-600 font-medium uppercase">Ausgaben – Plan vs. Ist</p>
            <p className="text-xl font-bold text-red-700 mt-1">{totalActual.expense.toFixed(2)} € / {totalPlanned.expense.toFixed(2)} €</p>
            <div className="mt-2 h-2 w-full bg-red-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${totalActual.expense > totalPlanned.expense ? "bg-red-600" : "bg-red-400"}`}
                style={{ width: `${Math.min(pct(totalActual.expense, totalPlanned.expense), 100)}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart */}
      {chartData.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Budget-Auslastung – Übersicht</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 4, right: 20, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v} €`} />
                <Tooltip formatter={(v) => `${Number(v).toFixed(2)} €`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Geplant" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Ist-Wert" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => {
                    const isOver = entry["Ist-Wert"] > entry["Geplant"];
                    const color = entry.type === "income"
                      ? (entry["Ist-Wert"] >= entry["Geplant"] ? "#10b981" : "#3b82f6")
                      : (isOver ? "#ef4444" : "#10b981");
                    return <Cell key={i} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Budget Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Noch keine Budgets angelegt</p>
          <p className="text-xs mt-1">Klicken Sie auf „Budget anlegen" um zu starten.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((b) => (
            <Card key={b.id} className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-slate-900 truncate">{b.name}</p>
                      <Badge variant="outline" className="text-xs">
                        {b.type === "income" ? "Einnahme" : "Ausgabe"}
                      </Badge>
                      <StatusBadge percent={pct(b.actual, b.amount)} type={b.type} />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {categoryLabels[b.type]?.[b.category] || b.category} &bull; {format(parseISO(b.period_start), "dd.MM.yy", { locale: de })} – {format(parseISO(b.period_end), "dd.MM.yy", { locale: de })}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditing(b); setFormOpen(true); }}>
                        <Pencil className="w-4 h-4 mr-2" /> Bearbeiten
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => deleteMutation.mutate(b.id)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Löschen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <BudgetBar planned={b.amount} actual={b.actual} type={b.type} />
                {/* Variance chip */}
                {b.amount > 0 && (
                  <div className="mt-2 flex items-center gap-1.5">
                    {(() => {
                      const variance = b.actual - b.amount;
                      const pctV = Math.round((variance / b.amount) * 100);
                      if (b.type === "expense") {
                        if (variance > 0) return <span className="inline-flex items-center gap-1 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold"><AlertTriangle className="w-3 h-3" />+{variance.toFixed(2)} € ({pctV > 0 ? "+" : ""}{pctV}%) über Plan</span>;
                        if (pctV <= -20) return <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold"><CheckCircle2 className="w-3 h-3" />{variance.toFixed(2)} € ({pctV}%) unter Plan</span>;
                        return null;
                      } else {
                        if (variance >= 0) return <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold"><CheckCircle2 className="w-3 h-3" />+{variance.toFixed(2)} € über Plan</span>;
                        if (pctV <= -25) return <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold"><AlertTriangle className="w-3 h-3" />{variance.toFixed(2)} € ({pctV}%) unter Plan</span>;
                        return null;
                      }
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <BudgetForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        defaultData={editing}
        isLoading={createMutation.isPending || updateMutation.isPending}
        onSubmit={(data) => editing ? updateMutation.mutate({ ...data, id: editing.id }) : createMutation.mutate(data)}
      />
    </div>
  );
}