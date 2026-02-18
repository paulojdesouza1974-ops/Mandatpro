import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { FilePlus, UserPlus, MessageSquarePlus, Plus, Zap, ArrowRight } from "lucide-react";

const actions = [
  { 
    label: "Neuer Antrag", 
    description: "Antrag erstellen",
    icon: FilePlus, 
    page: "Motions", 
    params: "?new=1", 
    color: "bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-100" 
  },
  { 
    label: "Kontakt anlegen", 
    description: "Person hinzufügen",
    icon: UserPlus, 
    page: "Contacts", 
    params: "?new=1", 
    color: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100" 
  },
  { 
    label: "Kommunikation", 
    description: "Vorgang erfassen",
    icon: MessageSquarePlus, 
    page: "Communications", 
    params: "?new=1", 
    color: "bg-violet-50 text-violet-700 hover:bg-violet-100 border-violet-100" 
  },
  { 
    label: "Neuer Termin", 
    description: "Termin planen",
    icon: Plus, 
    page: "Meetings", 
    params: "?new=1", 
    color: "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-100" 
  },
];

export default function QuickActions() {
  return (
    <Card className="bg-white border border-slate-200 shadow-soft" data-testid="quick-actions">
      <CardHeader className="pb-3 border-b border-slate-100">
        <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-slate-900">
            <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2} />
          </div>
          Schnellaktionen
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <div className="space-y-2">
          {actions.map((a) => (
            <Link
              key={a.label}
              to={createPageUrl(a.page) + (a.params || "")}
              data-testid={`quick-action-${a.page.toLowerCase()}`}
              className={`
                flex items-center gap-3 p-3 rounded-lg text-sm font-medium 
                border transition-all duration-200 
                group hover:shadow-sm
                ${a.color}
              `}
            >
              <div className="p-2 rounded-lg bg-white/60">
                <a.icon className="w-4 h-4" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{a.label}</p>
                <p className="text-xs opacity-70">{a.description}</p>
              </div>
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-200" />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
