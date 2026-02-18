import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { AlertTriangle, CheckCircle2, TrendingDown, TrendingUp, Info } from "lucide-react";
import { format, addMonths, startOfMonth, endOfMonth, parseISO, eachMonthOfInterval } from "date-fns";
import { de } from "date-fns/locale";

export default function CashFlowForecast({ income, expenses, budgets, mandateLevies }) {
  const [horizon, setHorizon] = useState(6);

  const forecast = useMemo(() => {
    const now = new Date();

    // Historical averages per month (last 12 months)
    const last12months = Array.from({ length: 12 }, (_, i) => {
      const m = addMonths(now, -(11 - i));
      return format(m, "yyyy-MM");
    });

    const avgIncome = (() => {
      const total = income.filter(i => i.date && last12months.some(m => i.date.startsWith(m))).reduce((s, i) => s + (i.amount || 0), 0);
      return total / 12;
    })();

    const avgExpenses = (() => {
      const total = expenses.filter(e => e.date && last12months.some(m => e.date.startsWith(m))).reduce((s, e) => s + (e.amount || 0), 0);
      return total / 12;
    })();

    // Current balance: all-time income minus expenses
    const totalIncomeSoFar = income.reduce((s, i) => s + (i.amount || 0), 0);
    const totalExpensesSoFar = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    let runningBalance = totalIncomeSoFar - totalExpensesSoFar;

    // Levy monthly avg
    const levyMonthly = (() => {
      const paid = mandateLevies.filter(l => l.status === "bezahlt");
      const months = [...new Set(paid.map(l => l.period_month).filter(Boolean))].length || 1;
      const total = paid.reduce((s, l) => s + (l.final_levy || 0), 0);
      return total / months;
    })();

    // Budget-based planned income/expense per month for forecast period
    const getMonthBudget = (monthStr, type) => {
      return budgets
        .filter(b => b.type === type && b.period_start && b.period_start <= monthStr + "-31" && b.period_end >= monthStr + "-01")
        .reduce((s, b) => {
          // Distribute budget over its months
          const start = b.period_start.slice(0, 7);
          const end = b.period_end.slice(0, 7);
          const months = eachMonthOfInterval({ start: new Date(b.period_start), end: new Date(b.period_end) }).length || 1;
          return s + b.amount / months;
        }, 0);
    };

    // Build forecast months
    const months = Array.from({ length: horizon }, (_, i) => addMonths(startOfMonth(now), i + 1));
    const data = [];

    for (const month of months) {
      const monthStr = format(month, "yyyy-MM");
      const budgetIncome = getMonthBudget(monthStr, "income");
      const budgetExpense = getMonthBudget(monthStr, "expense");

      const expectedIncome = budgetIncome > 0 ? budgetIncome : avgIncome + levyMonthly;
      const expectedExpense = budgetExpense > 0 ? budgetExpense : avgExpenses;

      runningBalance += expectedIncome - expectedExpense;

      data.push({
        month: format(month, "MMM yy", { locale: de }),
        "Erwartete Einnahmen": Math.round(expectedIncome * 100) / 100,
        "Erwartete Ausgaben": Math.round(expectedExpense * 100) / 100,
        "Lfd. Saldo": Math.round(runningBalance * 100) / 100,
        saldo: runningBalance,
      });
    }

    return { data, avgIncome, avgExpenses, levyMonthly, currentBalance: totalIncomeSoFar - totalExpensesSoFar };
  }, [income, expenses, budgets, mandateLevies, horizon]);

  const negativeMonths = forecast.data.filter(d => d.saldo < 0).length;
  const minSaldo = Math.min(...forecast.data.map(d => d.saldo));
  const status = negativeMonths === 0 ? "good" : negativeMonths <= 2 ? "warn" : "bad";

  return (
    <div className="space-y-6 mt-4">
      {/* Status Banner */}
      <Card className={`border-0 shadow-sm ${status === "good" ? "bg-emerald-50" : status === "warn" ? "bg-amber-50" : "bg-red-50"}`}>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            {status === "good" ? <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" /> :
             status === "warn" ? <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" /> :
             <TrendingDown className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />}
            <div>
              <p className={`font-semibold text-sm ${status === "good" ? "text-emerald-800" : status === "warn" ? "text-amber-800" : "text-red-800"}`}>
                {status === "good" && "Cashflow stabil – keine Engpässe erwartet"}
                {status === "warn" && `Achtung: ${negativeMonths} Monat(e) mit negativem Saldo prognostiziert`}
                {status === "bad" && `Warnung: ${negativeMonths} Monate mit negativem Saldo – Handlungsbedarf!`}
              </p>
              <p className={`text-xs mt-1 ${status === "good" ? "text-emerald-600" : status === "warn" ? "text-amber-600" : "text-red-600"}`}>
                Prognose basiert auf historischen Ø-Werten und vorhandenen Budgetplänen • Aktuelles Saldo: {forecast.currentBalance.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500">Ø Einnahmen/Monat</p>
            <p className="text-lg font-bold text-emerald-700 mt-1">{(forecast.avgIncome + forecast.levyMonthly).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500">Ø Ausgaben/Monat</p>
            <p className="text-lg font-bold text-red-700 mt-1">{forecast.avgExpenses.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500">Ø Abgaben/Monat</p>
            <p className="text-lg font-bold text-indigo-700 mt-1">{forecast.levyMonthly.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</p>
          </CardContent>
        </Card>
        <Card className={`border-0 shadow-sm ${minSaldo < 0 ? "bg-red-50" : "bg-emerald-50"}`}>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500">Tiefstes Saldo</p>
            <p className={`text-lg font-bold mt-1 ${minSaldo < 0 ? "text-red-700" : "text-emerald-700"}`}>
              {minSaldo.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Horizon selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Prognosezeitraum:</span>
        {[3, 6, 12].map(h => (
          <Button key={h} size="sm" variant={horizon === h ? "default" : "outline"} className="h-7 text-xs px-3" onClick={() => setHorizon(h)}>
            {h} Monate
          </Button>
        ))}
      </div>

      {/* Area Chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">Cashflow-Verlauf (Prognose)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={forecast.data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v.toLocaleString("de-DE")} €`} width={80} />
              <Tooltip formatter={v => `${Number(v).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €`} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="Erwartete Einnahmen" stroke="#10b981" fill="url(#incomeGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="Erwartete Ausgaben" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="Lfd. Saldo" stroke="#6366f1" fill="url(#saldoGrad)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly detail table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">Monatliche Prognose-Details</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="text-left px-4 py-2 text-xs font-medium text-slate-500 uppercase">Monat</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-slate-500 uppercase">Einnahmen</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-slate-500 uppercase">Ausgaben</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-slate-500 uppercase">Monatssaldo</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-slate-500 uppercase">Lfd. Saldo</th>
              </tr>
            </thead>
            <tbody>
              {forecast.data.map((row, i) => {
                const monthlySaldo = row["Erwartete Einnahmen"] - row["Erwartete Ausgaben"];
                return (
                  <tr key={i} className={`border-b ${row.saldo < 0 ? "bg-red-50/50" : "hover:bg-slate-50/50"}`}>
                    <td className="px-4 py-2.5 font-medium text-slate-700">{row.month}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-600 font-medium">+{row["Erwartete Einnahmen"].toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</td>
                    <td className="px-4 py-2.5 text-right text-red-600 font-medium">-{row["Erwartete Ausgaben"].toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${monthlySaldo >= 0 ? "text-slate-700" : "text-red-700"}`}>
                      {monthlySaldo >= 0 ? "+" : ""}{monthlySaldo.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                    </td>
                    <td className={`px-4 py-2.5 text-right font-bold ${row.saldo >= 0 ? "text-indigo-700" : "text-red-700"}`}>
                      {row.saldo.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                      {row.saldo < 0 && <AlertTriangle className="inline w-3 h-3 ml-1 text-red-500" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}