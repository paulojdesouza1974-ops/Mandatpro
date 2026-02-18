import React from "react";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const accentColors = {
  sky: {
    bg: "bg-sky-50",
    icon: "bg-sky-100 text-sky-600",
    border: "border-sky-100",
    trend: "text-sky-600",
  },
  amber: {
    bg: "bg-amber-50",
    icon: "bg-amber-100 text-amber-600",
    border: "border-amber-100",
    trend: "text-amber-600",
  },
  emerald: {
    bg: "bg-emerald-50",
    icon: "bg-emerald-100 text-emerald-600",
    border: "border-emerald-100",
    trend: "text-emerald-600",
  },
  violet: {
    bg: "bg-violet-50",
    icon: "bg-violet-100 text-violet-600",
    border: "border-violet-100",
    trend: "text-violet-600",
  },
  slate: {
    bg: "bg-slate-50",
    icon: "bg-slate-100 text-slate-600",
    border: "border-slate-100",
    trend: "text-slate-600",
  },
};

export default function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  accent = "slate", 
  trend 
}) {
  const colors = accentColors[accent] || accentColors.slate;
  
  return (
    <Card 
      className={`
        stat-card relative overflow-hidden 
        bg-white border border-slate-200 
        shadow-soft hover:shadow-elevated 
        transition-all duration-300
        group
      `}
      data-testid={`stat-card-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="p-5">
        {/* Top Row - Label & Icon */}
        <div className="flex items-start justify-between mb-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <div className={`p-2 rounded-lg ${colors.icon} transition-transform duration-300 group-hover:scale-110`}>
            <Icon className="w-4 h-4" strokeWidth={2} />
          </div>
        </div>
        
        {/* Value */}
        <div className="space-y-1">
          <p className="font-heading text-3xl font-bold text-slate-900 tracking-tight">
            {value}
          </p>
          
          {/* Trend */}
          {trend && (
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <span className="truncate">{trend}</span>
            </p>
          )}
        </div>
      </div>
      
      {/* Decorative bottom accent */}
      <div className={`h-1 w-full ${colors.icon.split(' ')[0]} opacity-60`} />
    </Card>
  );
}
