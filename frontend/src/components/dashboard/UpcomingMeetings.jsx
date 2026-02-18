import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const typeLabels = {
  gemeinderatssitzung: "Gemeinderat",
  ausschusssitzung: "Ausschuss",
  fraktionssitzung: "Fraktion",
  buergersprechstunde: "Bürgersprechstunde",
  parteitreffen: "Parteitreffen",
  sonstiges: "Sonstiges",
};

const typeColors = {
  gemeinderatssitzung: "bg-sky-50 text-sky-700 border-sky-200",
  ausschusssitzung: "bg-violet-50 text-violet-700 border-violet-200",
  fraktionssitzung: "bg-emerald-50 text-emerald-700 border-emerald-200",
  buergersprechstunde: "bg-amber-50 text-amber-700 border-amber-200",
  parteitreffen: "bg-rose-50 text-rose-700 border-rose-200",
  sonstiges: "bg-slate-50 text-slate-700 border-slate-200",
};

export default function UpcomingMeetings({ meetings, isLoading }) {
  if (isLoading) {
    return (
      <Card className="bg-white border border-slate-200 shadow-soft" data-testid="upcoming-meetings-loading">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-900">Nächste Termine</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-50 rounded-lg animate-pulse" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-slate-200 shadow-soft" data-testid="upcoming-meetings">
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-emerald-100">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2} />
            </div>
            Nächste Termine
          </CardTitle>
          <Link 
            to={createPageUrl("Meetings")} 
            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
            data-testid="meetings-view-all"
          >
            Alle anzeigen
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        {meetings.length === 0 ? (
          <div className="py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">Keine anstehenden Termine</p>
            <Link 
              to={createPageUrl("Meetings") + "?new=1"} 
              className="text-xs text-sky-600 hover:text-sky-700 mt-2 inline-block"
            >
              Termin erstellen
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {meetings.map((m, idx) => (
              <div 
                key={m.id} 
                className={`
                  flex items-start gap-4 p-3 rounded-lg 
                  hover:bg-slate-50 transition-colors group
                  ${idx === 0 ? 'bg-slate-50/50' : ''}
                `}
                data-testid={`meeting-item-${m.id}`}
              >
                {/* Date Badge */}
                <div className={`
                  flex-shrink-0 w-14 h-14 rounded-xl 
                  ${idx === 0 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900'}
                  flex flex-col items-center justify-center
                  group-hover:scale-105 transition-transform duration-200
                `}>
                  <span className="text-lg font-bold leading-none">
                    {m.date ? format(new Date(m.date), "dd") : "--"}
                  </span>
                  <span className="text-[10px] uppercase font-semibold mt-0.5 opacity-70">
                    {m.date ? format(new Date(m.date), "MMM", { locale: de }) : ""}
                  </span>
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0 py-0.5">
                  <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-slate-700">
                    {m.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                    {m.date && (
                      <span className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {format(new Date(m.date), "HH:mm")} Uhr
                        {m.end_date && ` – ${format(new Date(m.end_date), "HH:mm")} Uhr`}
                      </span>
                    )}
                    {m.location && (
                      <span className="text-xs text-slate-500 flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate max-w-[150px]">{m.location}</span>
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Type Badge */}
                <Badge 
                  className={`text-[10px] px-2 py-1 font-semibold border ${typeColors[m.type] || typeColors.sonstiges}`}
                >
                  {typeLabels[m.type] || m.type}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
