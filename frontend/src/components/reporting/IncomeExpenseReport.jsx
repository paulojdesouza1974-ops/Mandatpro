import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from "recharts";
import { TrendingUp, TrendingDown, ArrowUpDown } from "lucide-react";
import { format, parseISO, eachMonthOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { de } from "date-fns/locale";

const incomeCategoryLabels = {
  mitgliedsbeitrag: "Mitgliedsbeitrag",
  foerdermitgliedschaft: "Fördermitgliedschaft",
  ehrenmitgliedschaft: "Ehrenmitglied",
  jugendmitgliedschaft: "Jugendmitglied",
  spende: "Spende",
  spende_zweckgebunden: "Spende (zweckgeb.)",
  spende_sach: "Sachspende",
  veranstaltung: "Veranstaltung",
  zuschuss: "Zuschuss",
  mandatsabgabe: "Mandatsabgabe",
  sonstiges: "Sonstiges",
};

const expenseCategoryLabels = {
  personal: "Personal",
  raummiete: "Raummiete",
  material: "Material",
  marketing: "Marketing",
  verwaltung: "Verwaltung",
  edv: "EDV",
  wahlkampf: "Wahlkampf",
  sonstiges: "Sonstiges",
};

const PIE_COLORS = ["#6366f1","#10b981","#f59e0b","#3b82f6","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316","#84cc16"];

export default function IncomeExpenseReport({ income, expenses, dateRange }) {
  const totalIncome = income.reduce((s, i) => s + (i.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const balance = totalIncome - totalExpenses;

  // Monthly breakdown
  const monthlyData = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return [];
    const months = eachMonthOfInterval({ start: new Date(dateRange.from), end: new Date(dateRange.to) });
    return months.map(month => {
      const monthStr = format(month, "yyyy-MM");
      const inc = income.filter(i => i.date && i.date.startsWith(monthStr)).reduce((s, i) => s + (i.amount || 0), 0);
      const exp = expenses.filter(e => e.date && e.date.startsWith(monthStr)).reduce((s, e) => s + (e.amount || 0), 0);
      return {
        month: format(month, "MMM yy", { locale: de }),
        Einnahmen: inc,
        Ausgaben: exp,
        Saldo: inc - exp,
      };
    });
  }, [income, expenses, dateRange]);

  // Category breakdown
  const incomeByCategory = useMemo(() => {
    const map = {};
    income.forEach(i => {
      const cat = i.category || "sonstiges";
      map[cat] = (map[cat] || 0) + (i.amount || 0);
    });
    return Object.entries(map).map(([cat, value]) => ({ name: incomeCategoryLabels[cat] || cat, value }));
  }, [income]);

  const expenseByCategory = useMemo(() => {
    const map = {};
    expenses.forEach(e => {
      const cat = e.category || "sonstiges";
      map[cat] = (map[cat] || 0) + (e.amount || 0);
    });
    return Object.entries(map).map(([cat, value]) => ({ name: expenseCategoryLabels[cat] || cat, value }));
  }, [expenses]);

  return (
    <div className="space-y-6 mt-4">
      {/* KPI Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-emerald-50">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-600 font-medium uppercase">Einnahmen</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{totalIncome.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</p>
                <p className="text-xs text-emerald-500 mt-1">{income.length} Buchungen</p>
              </div>
              <TrendingUp className="w-8 h-8 text-emerald-400 opacity-40" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-red-50">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-600 font-medium uppercase">Ausgaben</p>
                <p className="text-2xl font-bold text-red-700 mt-1">{totalExpenses.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</p>
                <p className="text-xs text-red-500 mt-1">{expenses.length} Buchungen</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-400 opacity-40" />
            </div>
          </CardContent>
        </Card>
        <Card className={`border-0 shadow-sm ${balance >= 0 ? "bg-blue-50" : "bg-orange-50"}`}>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-medium uppercase ${balance >= 0 ? "text-blue-600" : "text-orange-600"}`}>Saldo</p>
                <p className={`text-2xl font-bold mt-1 ${balance >= 0 ? "text-blue-700" : "text-orange-700"}`}>
                  {balance >= 0 ? "+" : ""}{balance.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                </p>
                <p className={`text-xs mt-1 ${balance >= 0 ? "text-blue-500" : "text-orange-500"}`}>
                  {balance >= 0 ? "Überschuss" : "Defizit"}
                </p>
              </div>
              <ArrowUpDown className={`w-8 h-8 opacity-40 ${balance >= 0 ? "text-blue-400" : "text-orange-400"}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Bar Chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">Monatliche Einnahmen & Ausgaben</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v.toLocaleString("de-DE")} €`} width={75} />
              <Tooltip formatter={v => `${Number(v).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Einnahmen" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Ausgaben" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly Saldo Line */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">Monatlicher Saldo</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={monthlyData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v.toLocaleString("de-DE")} €`} width={75} />
              <Tooltip formatter={v => `${Number(v).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €`} />
              <Line type="monotone" dataKey="Saldo" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category Pies */}
      <div className="grid sm:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Einnahmen nach Kategorie</CardTitle>
          </CardHeader>
          <CardContent>
            {incomeByCategory.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Keine Daten</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={incomeByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {incomeByCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => `${Number(v).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {incomeByCategory.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-slate-600">{item.name}</span>
                      </div>
                      <span className="font-semibold text-slate-800">{item.value.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Ausgaben nach Kategorie</CardTitle>
          </CardHeader>
          <CardContent>
            {expenseByCategory.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Keine Daten</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={expenseByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {expenseByCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => `${Number(v).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {expenseByCategory.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-slate-600">{item.name}</span>
                      </div>
                      <span className="font-semibold text-slate-800">{item.value.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}