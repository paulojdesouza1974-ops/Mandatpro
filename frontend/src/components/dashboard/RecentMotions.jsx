import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const statusLabels = {
  entwurf: "Entwurf",
  eingereicht: "Eingereicht",
  in_beratung: "In Beratung",
  angenommen: "Angenommen",
  abgelehnt: "Abgelehnt",
  zurueckgezogen: "Zurückgezogen",
};

const statusColors = {
  entwurf: "bg-slate-100 text-slate-600",
  eingereicht: "bg-blue-100 text-blue-700",
  in_beratung: "bg-amber-100 text-amber-700",
  angenommen: "bg-emerald-100 text-emerald-700",
  abgelehnt: "bg-red-100 text-red-700",
  zurueckgezogen: "bg-slate-100 text-slate-500",
};

const typeLabels = {
  antrag: "Antrag",
  anfrage: "Anfrage",
  resolution: "Resolution",
  aenderungsantrag: "Änderungsantrag",
  dringlichkeitsantrag: "Dringlichkeit",
};

const priorityDot = {
  niedrig: "bg-slate-300",
  mittel: "bg-blue-400",
  hoch: "bg-amber-400",
  dringend: "bg-red-500",
};

export default function RecentMotions({ motions, isLoading }) {
  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-900">Aktuelle Anträge</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-slate-50 rounded-lg animate-pulse" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-400" />
          Aktuelle Anträge
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {motions.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">Keine Anträge vorhanden</p>
        ) : (
          motions.map((m) => (
            <Link
              key={m.id}
              to={createPageUrl("Motions") + `?id=${m.id}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
            >
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDot[m.priority] || priorityDot.mittel}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate group-hover:text-slate-700">{m.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{typeLabels[m.type] || m.type}</p>
              </div>
              <Badge className={`text-[10px] px-2 py-0.5 ${statusColors[m.status] || statusColors.entwurf}`}>
                {statusLabels[m.status] || m.status}
              </Badge>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}