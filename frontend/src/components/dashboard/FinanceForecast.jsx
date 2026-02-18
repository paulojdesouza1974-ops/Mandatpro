import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from "recharts";
import { TrendingUp, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { format, addMonths, startOfMonth, parseISO } from "date-fns";
import { de } from "date-fns/locale";

const MONTHS = 12;

function getMonthKey(date) {
  return format(date, "yyyy-MM");
}

export default function FinanceForecast({ organization }) {
  const [horizon, setHorizon] = useState(6);

  const { data: income = [] } = useQuery({
    queryKey: ["income", organization],
    queryFn: () => base44.entities.Income.filter({ organization }),
    enabled: !!organization,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", organization],
    queryFn: () => base44.entities.Expense.filter({ organization }),
    enabled: !!organization,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", organization],
    queryFn: () => base44.entities.Contact.filter({ organization }),
    enabled: !!organization,
  });

  const { data: mandateLevies = [] } = useQuery({
    queryKey: ["mandateLevies", organization],
    queryFn: () => base44.entities.MandateLevy.filter({ organization }),
    enabled: !!organization,
  });

  const forecast = useMemo(() => {
    const now = new Date();
    const activeMembers = contacts.filter(c => c.status === "aktiv" || !c.status);
    const monthlyMemberFees = activeMembers.reduce((s, c) => s + (c.membership_fee || 0), 0) / 12;

    // Durchschnittliche monatliche Mandatsabgaben (letzte 6 Monate)
    const last6 = [];
    for (let i = 5; i >= 0; i--) {
      const m = getMonthKey(addMonths(now, -i));
      const monthSum = mandateLevies
        .filter(l => l.period_month === m)
        .reduce((s, l) => s + (l.final_levy || 0), 0);
      last6.push(monthSum);
    }
    const avgMonthlyLevy = last6.reduce((s, v) => s + v, 0) / 6;

    // Durchschnittliche monatliche Ausgaben (letzte 6 Monate)
    const last6Exp = [];
    for (let i = 5; i >= 0; i--) {
      const m = addMonths(startOfMonth(now), -i);
      const mStr = getMonthKey(m);
      const monthExp = expenses
        .filter(e => e.date && e.date.startsWith(mStr))
        .reduce((s, e) => s + (e.amount || 0), 0);
      last6Exp.push(monthExp);
    }
    const avgMonthlyExpense = last6Exp.reduce((s, v) => s + v, 0) / 6;

    // Historische Ist-Daten (letzte 6 Monate)
    const historical = [];
    for (let i = 5; i >= 0; i--) {
      const date = addMonths(startOfMonth(now), -i);
      const mStr = getMonthKey(date);
      const inc = income.filter(x => x.date && x.date.startsWith(mStr)).reduce((s, x) => s + (x.amount || 0), 0);
      const exp = expenses.filter(x => x.date && x.date.startsWith(mStr)).reduce((s, x) => s + (x.amount || 0), 0);
      const levy = mandateLevies.filter(l => l.period_month === mStr).reduce((s, l) => s + (l.final_levy || 0), 0);
      historical.push({
        month: format(date, "MMM yy", { locale: de }),
        istEinnahmen: +(inc).toFixed(2),
        istAusgaben: +(exp).toFixed(2),
        prognoseEinnahmen: null,
        prognoseAusgaben: null,
        isForecast: false,
      });
    }

    // Prognose-Monate
    const future = [];
    for (let i = 1; i <= horizon; i++) {
      const date = addMonths(startOfMonth(now), i);
      future.push({
        month: format(date, "MMM yy", { locale: de }),
        istEinnahmen: null,
        istAusgaben: null,
        prognoseEinnahmen: +(monthlyMemberFees + avgMonthlyLevy).toFixed(2),
        prognoseAusgaben: +avgMonthlyExpense.toFixed(2),
        isForecast: true,
      });
    }

    const data = [...historical, ...future];

    const totalForecastIncome = future.reduce((s, m) => s + m.prognoseEinnahmen, 0);
    const totalForecastExpense = future.reduce((s, m) => s + m.prognoseAusgaben, 0);
    const balance = totalForecastIncome - totalForecastExpense;
    const monthsNegative = future.filter(m => m.prognoseEinnahmen < m.prognoseAusgaben).length;

    return { data, totalForecastIncome, totalForecastExpense, balance, monthsNegative, monthlyMemberFees, avgMonthlyLevy, avgMonthlyExpense };
  }, [income, expenses, contacts, mandateLevies, horizon]);

  const status = forecast.monthsNegative > 0
    ? "warn"
    : forecast.balance > 0
    ? "good"
    : "neutral";

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <CardTitle className="text-sm font-semibold text-slate-800">Einnahmen-Prognose</CardTitle>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-slate-500">Horizont:</span>
            {[3, 6, 12].map(h => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  horizon === h
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {h} Mo.
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status-Banner */}
        <div className={`flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm ${
          status === "warn"
            ? "bg-red-50 text-red-800"
            : status === "good"
            ? "bg-emerald-50 text-emerald-800"
            : "bg-slate-50 text-slate-700"
        }`}>
          {status === "warn"
            ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
            : status === "good"
            ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
            : <Info className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />}
          <span>
            {status === "warn"
              ? `In ${forecast.monthsNegative} von ${horizon} Prognose-Monaten übersteigen die Ausgaben die Einnahmen.`
              : status === "good"
              ? `Positive Bilanz: voraussichtlich +${forecast.balance.toFixed(2)} € in den nächsten ${horizon} Monaten.`
              : `Ausgeglichene Prognose für die nächsten ${horizon} Monate.`}
          </span>
        </div>

        {/* KPI-Zeile */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-emerald-50 p-3">
            <p className="text-xs text-emerald-600">Ø Einnahmen/Monat</p>
            <p className="text-base font-bold text-emerald-700 mt-0.5">
              {(forecast.monthlyMemberFees + forecast.avgMonthlyLevy).toFixed(2)} €
            </p>
            <p className="text-[10px] text-emerald-500 mt-0.5">
              Beiträge + Abgaben
            </p>
          </div>
          <div className="rounded-lg bg-red-50 p-3">
            <p className="text-xs text-red-600">Ø Ausgaben/Monat</p>
            <p className="text-base font-bold text-red-700 mt-0.5">
              {forecast.avgMonthlyExpense.toFixed(2)} €
            </p>
            <p className="text-[10px] text-red-400 mt-0.5">letzte 6 Monate</p>
          </div>
          <div className={`rounded-lg p-3 ${forecast.balance >= 0 ? "bg-blue-50" : "bg-amber-50"}`}>
            <p className={`text-xs ${forecast.balance >= 0 ? "text-blue-600" : "text-amber-600"}`}>
              Prognose-Saldo ({horizon} Mo.)
            </p>
            <p className={`text-base font-bold mt-0.5 ${forecast.balance >= 0 ? "text-blue-700" : "text-amber-700"}`}>
              {forecast.balance >= 0 ? "+" : ""}{forecast.balance.toFixed(2)} €
            </p>
            <p className={`text-[10px] mt-0.5 ${forecast.balance >= 0 ? "text-blue-400" : "text-amber-400"}`}>
              Einnahmen - Ausgaben
            </p>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={forecast.data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradFIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradFExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}€`} width={55} />
            <Tooltip formatter={(v, name) => v !== null ? [`${Number(v).toFixed(2)} €`, name] : ["-", name]} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine
              x={forecast.data[5]?.month}
              stroke="#94a3b8"
              strokeDasharray="4 2"
              label={{ value: "Heute", fill: "#94a3b8", fontSize: 10 }}
            />
            <Area type="monotone" dataKey="istEinnahmen" name="Ist-Einnahmen" stroke="#10b981" strokeWidth={2} fill="url(#gradIncome)" connectNulls={false} dot={false} />
            <Area type="monotone" dataKey="istAusgaben" name="Ist-Ausgaben" stroke="#ef4444" strokeWidth={2} fill="url(#gradExpense)" connectNulls={false} dot={false} />
            <Area type="monotone" dataKey="prognoseEinnahmen" name="Prognose Einnahmen" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 3" fill="url(#gradFIncome)" connectNulls={false} dot={false} />
            <Area type="monotone" dataKey="prognoseAusgaben" name="Prognose Ausgaben" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3" fill="url(#gradFExpense)" connectNulls={false} dot={false} />
          </AreaChart>
        </ResponsiveContainer>

        <p className="text-[10px] text-slate-400 text-center">
          Prognose basiert auf Ø Mitgliedsbeiträgen, Ø Mandatsabgaben (letzte 6 Monate) und Ø Ausgaben (letzte 6 Monate).
        </p>
      </CardContent>
    </Card>
  );
}