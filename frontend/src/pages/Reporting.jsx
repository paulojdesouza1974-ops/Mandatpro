import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Waves, Download } from "lucide-react";
import DateRangeSelector from "@/components/reporting/DateRangeSelector";
import IncomeExpenseReport from "@/components/reporting/IncomeExpenseReport";
import CashFlowForecast from "@/components/reporting/CashFlowForecast";
import ReportExporter from "@/components/reporting/ReportExporter";
import { startOfYear, endOfYear, startOfMonth, endOfMonth, subMonths, parseISO, isWithinInterval } from "date-fns";

export default function Reporting() {
  const [tab, setTab] = useState("income_expense");
  const [dateRange, setDateRange] = useState({
    from: startOfYear(new Date()).toISOString().split("T")[0],
    to: endOfYear(new Date()).toISOString().split("T")[0],
  });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const org = currentUser?.organization;

  const { data: income = [] } = useQuery({
    queryKey: ["income", org],
    queryFn: () => base44.entities.Income.filter({ organization: org }, "-date"),
    enabled: !!org,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", org],
    queryFn: () => base44.entities.Expense.filter({ organization: org }, "-date"),
    enabled: !!org,
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ["budgets", org],
    queryFn: () => base44.entities.Budget.filter({ organization: org }),
    enabled: !!org,
  });

  const { data: mandateLevies = [] } = useQuery({
    queryKey: ["mandateLevies", org],
    queryFn: () => base44.entities.MandateLevy.filter({ organization: org }),
    enabled: !!org,
  });

  // Filter data by selected date range
  const filteredIncome = useMemo(() => income.filter(i => {
    if (!i.date) return false;
    try {
      const d = parseISO(i.date);
      return d >= new Date(dateRange.from) && d <= new Date(dateRange.to);
    } catch { return false; }
  }), [income, dateRange]);

  const filteredExpenses = useMemo(() => expenses.filter(e => {
    if (!e.date) return false;
    try {
      const d = parseISO(e.date);
      return d >= new Date(dateRange.from) && d <= new Date(dateRange.to);
    } catch { return false; }
  }), [expenses, dateRange]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reporting</h1>
          <p className="text-sm text-slate-500 mt-1">Finanzberichte & Prognosen</p>
        </div>
        <DateRangeSelector value={dateRange} onChange={setDateRange} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="income_expense" className="flex items-center gap-1.5 text-xs">
            <BarChart3 className="w-3.5 h-3.5" /> Einnahmen & Ausgaben
          </TabsTrigger>
          <TabsTrigger value="cashflow" className="flex items-center gap-1.5 text-xs">
            <Waves className="w-3.5 h-3.5" /> Cashflow-Prognose
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="income_expense">
          <IncomeExpenseReport
            income={filteredIncome}
            expenses={filteredExpenses}
            allIncome={income}
            allExpenses={expenses}
            dateRange={dateRange}
          />
        </TabsContent>

        <TabsContent value="cashflow">
          <CashFlowForecast
            income={income}
            expenses={expenses}
            budgets={budgets}
            mandateLevies={mandateLevies}
          />
        </TabsContent>

        <TabsContent value="export">
          <ReportExporter
            income={filteredIncome}
            expenses={filteredExpenses}
            mandateLevies={mandateLevies}
            budgets={budgets}
            dateRange={dateRange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}