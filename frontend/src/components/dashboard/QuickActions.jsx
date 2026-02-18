import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { FilePlus, UserPlus, MessageSquarePlus, Newspaper, Zap } from "lucide-react";

const actions = [
  { label: "Neuer Antrag", icon: FilePlus, page: "Motions", params: "?new=1", color: "bg-blue-50 text-blue-600 hover:bg-blue-100" },
  { label: "Kontakt anlegen", icon: UserPlus, page: "Contacts", params: "?new=1", color: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" },
  { label: "Kommunikation", icon: MessageSquarePlus, page: "Communications", params: "?new=1", color: "bg-violet-50 text-violet-600 hover:bg-violet-100" },
  { label: "Medienbeitrag", icon: Newspaper, page: "Media", params: "?new=1", color: "bg-amber-50 text-amber-600 hover:bg-amber-100" },
];

export default function QuickActions() {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <Zap className="w-4 h-4 text-slate-400" />
          Schnellaktionen
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((a) => (
            <Link
              key={a.label}
              to={createPageUrl(a.page) + (a.params || "")}
              className={`flex items-center gap-2.5 p-3 rounded-xl text-sm font-medium transition-colors ${a.color}`}
            >
              <a.icon className="w-4 h-4" />
              {a.label}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}