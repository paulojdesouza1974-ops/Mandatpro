import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar, Phone, Mail, Users } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { de } from "date-fns/locale";

export default function CalendarView({ meetings = [], communications = [], fractionMeetings = [], onDayClick }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDay = (day) => {
    const events = [];

    // Meetings
    meetings.forEach((meeting) => {
      const meetingStart = new Date(meeting.date);
      const meetingEnd = meeting.end_date ? new Date(meeting.end_date) : null;
      
      const isStartDay = isSameDay(meetingStart, day);
      const isEndDay = meetingEnd && isSameDay(meetingEnd, day);
      const isBetween = meetingEnd && day > meetingStart && day < meetingEnd;
      
      if (isStartDay || isEndDay || isBetween) {
        let timeText;
        if (isStartDay && meetingEnd) {
          timeText = `${format(meetingStart, "HH:mm", { locale: de })} - ...`;
        } else if (isEndDay) {
          timeText = `... - ${format(meetingEnd, "HH:mm", { locale: de })}`;
        } else if (isBetween) {
          timeText = "ganztägig";
        } else {
          timeText = format(meetingStart, "HH:mm", { locale: de });
        }
        
        events.push({
          type: "meeting",
          time: timeText,
          title: meeting.title,
          icon: Calendar,
          color: "bg-violet-100 text-violet-700",
        });
      }
    });

    // Fraction Meetings
    fractionMeetings.forEach((meeting) => {
      if (isSameDay(new Date(meeting.date), day)) {
        events.push({
          type: "fraction",
          time: format(new Date(meeting.date), "HH:mm", { locale: de }),
          title: meeting.title,
          icon: Users,
          color: "bg-blue-100 text-blue-700",
        });
      }
    });

    // Communications with follow-up dates
    communications.forEach((comm) => {
      if (comm.follow_up_date && isSameDay(new Date(comm.follow_up_date), day)) {
        events.push({
          type: "followup",
          time: "Wiedervorlage",
          title: comm.subject,
          icon: comm.type === "telefonat" ? Phone : Mail,
          color: "bg-amber-100 text-amber-700",
        });
      }
    });

    return events;
  };

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const today = () => setCurrentDate(new Date());

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Kalender</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={today}>
              Heute
            </Button>
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-sm font-semibold min-w-32 text-center">
              {format(currentDate, "MMMM yyyy", { locale: de })}
            </div>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before month start */}
          {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, idx) => (
            <div key={`empty-${idx}`} className="min-h-20 bg-slate-50 rounded" />
          ))}

          {/* Days of the month */}
          {daysInMonth.map((day) => {
            const events = getEventsForDay(day);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toString()}
                onClick={() => onDayClick?.(day)}
                className={`min-h-20 p-1 border rounded hover:bg-slate-50 transition-colors cursor-pointer ${
                  isToday ? "bg-blue-50 border-blue-300" : "bg-white"
                }`}
              >
                <div
                  className={`text-xs font-semibold mb-1 ${
                    isToday
                      ? "text-blue-600"
                      : isSameMonth(day, currentDate)
                      ? "text-slate-900"
                      : "text-slate-400"
                  }`}
                >
                  {format(day, "d")}
                </div>
                <div className="space-y-1">
                  {events.slice(0, 3).map((event, idx) => {
                    const Icon = event.icon;
                    return (
                      <div
                        key={idx}
                        className={`text-[9px] p-1 rounded flex items-start gap-1 ${event.color}`}
                        title={`${event.time} - ${event.title}`}
                      >
                        <Icon className="w-2.5 h-2.5 flex-shrink-0 mt-0.5" />
                        <div className="truncate leading-tight">
                          <div className="font-semibold">{event.time}</div>
                          <div className="truncate">{event.title}</div>
                        </div>
                      </div>
                    );
                  })}
                  {events.length > 3 && (
                    <div className="text-[9px] text-slate-500 pl-1">
                      +{events.length - 3} mehr
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t">
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded bg-violet-100 border border-violet-300" />
            <span className="text-slate-600">Termine</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded bg-blue-100 border border-blue-300" />
            <span className="text-slate-600">Fraktionssitzungen</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded bg-amber-100 border border-amber-300" />
            <span className="text-slate-600">Wiedervorlagen</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}