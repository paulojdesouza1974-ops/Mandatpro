import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, ExternalLink, AlertCircle, CheckCircle, Clock, ArrowRight } from "lucide-react";
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

const statusConfig = {
  entwurf: { color: "bg-slate-50 text-slate-600 border-slate-200", icon: Clock },
  eingereicht: { color: "bg-sky-50 text-sky-700 border-sky-200", icon: FileText },
  in_beratung: { color: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  angenommen: { color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle },
  abgelehnt: { color: "bg-red-50 text-red-700 border-red-200", icon: AlertCircle },
  zurueckgezogen: { color: "bg-slate-50 text-slate-500 border-slate-200", icon: Clock },
};

const typeLabels = {
  antrag: "Antrag",
  anfrage: "Anfrage",
  resolution: "Resolution",
  aenderungsantrag: "Änderungsantrag",
  dringlichkeitsantrag: "Dringlichkeit",
};

const priorityConfig = {
  niedrig: { dot: "bg-slate-300", label: "Niedrig" },
  mittel: { dot: "bg-sky-400", label: "Mittel" },
  hoch: { dot: "bg-amber-400", label: "Hoch" },
  dringend: { dot: "bg-red-500 animate-pulse", label: "Dringend" },
};

export default function RecentMotions({ motions, isLoading }) {
  if (isLoading) {
    return (
      <Card className="bg-white border border-slate-200 shadow-soft" data-testid="recent-motions-loading">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-900">Aktuelle Anträge</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-50 rounded-lg animate-pulse" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-slate-200 shadow-soft" data-testid="recent-motions">
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-amber-100">
              <FileText className="w-3.5 h-3.5 text-amber-600" strokeWidth={2} />
            </div>
            Aktuelle Anträge
          </CardTitle>
          <Link 
            to={createPageUrl("Motions")} 
            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
            data-testid="motions-view-all"
          >
            Alle anzeigen
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        {motions.length === 0 ? (
          <div className="py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">Keine offenen Anträge</p>
            <Link 
              to={createPageUrl("Motions") + "?new=1"} 
              className="text-xs text-sky-600 hover:text-sky-700 mt-2 inline-block"
            >
              Antrag erstellen
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {motions.map((m) => {
              const priority = priorityConfig[m.priority] || priorityConfig.mittel;
              const status = statusConfig[m.status] || statusConfig.entwurf;
              
              return (
                <Link
                  key={m.id}
                  to={createPageUrl("Motions") + `?id=${m.id}`}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                  data-testid={`motion-item-${m.id}`}
                >
                  {/* Priority Indicator */}
                  <div className="flex-shrink-0 flex flex-col items-center gap-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${priority.dot}`} title={priority.label} />
                    <div className="w-px h-6 bg-slate-200" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-slate-700">
                      {m.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-400 font-medium">
                        {typeLabels[m.type] || m.type}
                      </span>
                      {m.created_date && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-slate-400">
                            {new Date(m.created_date).toLocaleDateString('de-DE')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Status Badge */}
                  <Badge 
                    className={`text-[10px] px-2 py-1 font-semibold border flex items-center gap-1 ${status.color}`}
                  >
                    <status.icon className="w-3 h-3" />
                    {statusLabels[m.status] || m.status}
                  </Badge>
                  
                  {/* Arrow */}
                  <ArrowRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
