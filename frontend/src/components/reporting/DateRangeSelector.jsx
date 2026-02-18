import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { startOfYear, endOfYear, startOfMonth, endOfMonth, subMonths, subYears, format } from "date-fns";

const presets = [
  { label: "Dieses Jahr", from: () => startOfYear(new Date()), to: () => endOfYear(new Date()) },
  { label: "Letztes Jahr", from: () => startOfYear(subYears(new Date(), 1)), to: () => endOfYear(subYears(new Date(), 1)) },
  { label: "Letzte 6 Monate", from: () => startOfMonth(subMonths(new Date(), 5)), to: () => endOfMonth(new Date()) },
  { label: "Letzte 3 Monate", from: () => startOfMonth(subMonths(new Date(), 2)), to: () => endOfMonth(new Date()) },
  { label: "Dieser Monat", from: () => startOfMonth(new Date()), to: () => endOfMonth(new Date()) },
];

export default function DateRangeSelector({ value, onChange }) {
  const apply = (preset) => {
    onChange({
      from: preset.from().toISOString().split("T")[0],
      to: preset.to().toISOString().split("T")[0],
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1">
        {presets.map(p => (
          <Button
            key={p.label}
            size="sm"
            variant="outline"
            className="text-xs h-7 px-2"
            onClick={() => apply(p)}
          >
            {p.label}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          value={value.from}
          onChange={e => onChange({ ...value, from: e.target.value })}
          className="h-7 text-xs w-36"
        />
        <span className="text-xs text-slate-400">–</span>
        <Input
          type="date"
          value={value.to}
          onChange={e => onChange({ ...value, to: e.target.value })}
          className="h-7 text-xs w-36"
        />
      </div>
    </div>
  );
}