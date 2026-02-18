import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const typeLabels = {
  gemeinderatssitzung: "Gemeinderat",
  ausschusssitzung: "Ausschuss",
  fraktionssitzung: "Fraktion",
  buergersprechstunde: "Bürgersprechstunde",
  parteitreffen: "Parteitreffen",
  sonstiges: "Sonstiges",
};

const typeColors = {
  gemeinderatssitzung: "bg-blue-100 text-blue-700",
  ausschusssitzung: "bg-violet-100 text-violet-700",
  fraktionssitzung: "bg-emerald-100 text-emerald-700",
  buergersprechstunde: "bg-amber-100 text-amber-700",
  parteitreffen: "bg-rose-100 text-rose-700",
  sonstiges: "bg-slate-100 text-slate-700",
};

export default function UpcomingMeetings({ meetings, isLoading }) {
  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-900">Nächste Termine</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-50 rounded-lg animate-pulse" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          Nächste Termine
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {meetings.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">Keine anstehenden Termine</p>
        ) : (
          meetings.map((m) => (
            <div key={m.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-900 text-white flex flex-col items-center justify-center text-[10px] leading-tight font-semibold">
                <span>{m.date ? format(new Date(m.date), "dd") : "--"}</span>
                <span className="uppercase">{m.date ? format(new Date(m.date), "MMM", { locale: de }) : ""}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{m.title}</p>
                <div className="flex items-center gap-3 mt-1">
                  {m.date && (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(m.date), "HH:mm")} Uhr
                      {m.end_date && ` - ${format(new Date(m.end_date), "HH:mm")} Uhr`}
                    </span>
                  )}
                  {m.location && (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {m.location}
                    </span>
                  )}
                </div>
              </div>
              <Badge className={`text-[10px] px-2 py-0.5 ${typeColors[m.type] || typeColors.sonstiges}`}>
                {typeLabels[m.type] || m.type}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}