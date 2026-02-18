import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, Phone, Mail, Users, Plus } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from "date-fns";
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
          color: "bg-emerald-500",
          textColor: "text-emerald-700",
          bgColor: "bg-emerald-50",
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
          color: "bg-sky-500",
          textColor: "text-sky-700",
          bgColor: "bg-sky-50",
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
          color: "bg-amber-500",
          textColor: "text-amber-700",
          bgColor: "bg-amber-50",
        });
      }
    });

    return events;
  };

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  return (
    <Card className="bg-white border border-slate-200 shadow-soft" data-testid="calendar-view">
      <CardHeader className="pb-4 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-slate-900">
              <Calendar className="w-3.5 h-3.5 text-white" strokeWidth={2} />
            </div>
            Kalender
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToToday}
              className="text-xs font-medium h-8 px-3 border-slate-200 hover:bg-slate-50"
              data-testid="calendar-today-btn"
            >
              Heute
            </Button>
            
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={prevMonth}
                className="h-7 w-7 hover:bg-white rounded-md"
                data-testid="calendar-prev-btn"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="text-sm font-semibold min-w-[140px] text-center text-slate-700 px-2">
                {format(currentDate, "MMMM yyyy", { locale: de })}
              </div>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={nextMonth}
                className="h-7 w-7 hover:bg-white rounded-md"
                data-testid="calendar-next-btn"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day, idx) => (
            <div 
              key={day} 
              className={`
                text-center text-[11px] font-semibold uppercase tracking-wider py-2
                ${idx >= 5 ? 'text-slate-400' : 'text-slate-500'}
              `}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before month start */}
          {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, idx) => (
            <div key={`empty-${idx}`} className="min-h-24 lg:min-h-28 bg-slate-50/50 rounded-lg" />
          ))}

          {/* Days of the month */}
          {daysInMonth.map((day) => {
            const events = getEventsForDay(day);
            const dayIsToday = isToday(day);
            const dayOfWeek = day.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            return (
              <div
                key={day.toString()}
                onClick={() => onDayClick?.(day)}
                className={`
                  min-h-24 lg:min-h-28 p-1.5 rounded-lg transition-all duration-200 cursor-pointer
                  border group relative
                  ${dayIsToday 
                    ? "bg-sky-50 border-sky-200 ring-1 ring-sky-200" 
                    : isWeekend 
                      ? "bg-slate-50/50 border-transparent hover:bg-slate-100 hover:border-slate-200"
                      : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-200"
                  }
                `}
                data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
              >
                {/* Day Number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`
                      text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full
                      transition-colors
                      ${dayIsToday
                        ? "bg-sky-600 text-white"
                        : isSameMonth(day, currentDate)
                          ? "text-slate-700 group-hover:bg-slate-200"
                          : "text-slate-400"
                      }
                    `}
                  >
                    {format(day, "d")}
                  </span>
                  
                  {/* Add button on hover */}
                  <button 
                    className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-sky-500 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDayClick?.(day);
                    }}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                
                {/* Events */}
                <div className="space-y-1">
                  {events.slice(0, 2).map((event, idx) => {
                    const Icon = event.icon;
                    return (
                      <div
                        key={idx}
                        className={`
                          text-[10px] px-1.5 py-1 rounded-md flex items-center gap-1
                          ${event.bgColor} ${event.textColor}
                          truncate
                        `}
                        title={`${event.time} - ${event.title}`}
                      >
                        <div className={`w-1 h-3 rounded-full ${event.color} flex-shrink-0`} />
                        <span className="truncate font-medium">{event.title}</span>
                      </div>
                    );
                  })}
                  {events.length > 2 && (
                    <div className="text-[10px] text-slate-500 font-medium pl-1">
                      +{events.length - 2} weitere
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Termine</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-2 h-2 rounded-full bg-sky-500" />
            <span>Fraktionssitzungen</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Wiedervorlagen</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
