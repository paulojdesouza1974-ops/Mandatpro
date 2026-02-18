import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users, FileText, CalendarDays, MessageCircle, TrendingUp, Activity } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import UpcomingMeetings from "@/components/dashboard/UpcomingMeetings";
import RecentMotions from "@/components/dashboard/RecentMotions";
import QuickActions from "@/components/dashboard/QuickActions";
import CalendarView from "@/components/dashboard/CalendarView";
import NewUsers from "@/components/dashboard/NewUsers";
import PullToRefresh from "@/components/PullToRefresh";
import MeetingForm from "@/components/meetings/MeetingForm";
import FinanceForecast from "@/components/dashboard/FinanceForecast";

export default function Dashboard() {
  const [meetingFormOpen, setMeetingFormOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const qc = useQueryClient();
  
  const handleRefresh = async () => {
    await qc.invalidateQueries({ queryKey: ["contacts"] });
    await qc.invalidateQueries({ queryKey: ["motions"] });
    await qc.invalidateQueries({ queryKey: ["meetings"] });
    await qc.invalidateQueries({ queryKey: ["communications"] });
    await qc.invalidateQueries({ queryKey: ["fractionMeetings"] });
  };
  
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });
  
  const { data: contacts = [], isLoading: loadingContacts } = useQuery({
    queryKey: ["contacts", currentUser?.organization],
    queryFn: () => base44.entities.Contact.filter({ organization: currentUser.organization }, "-created_date"),
    enabled: !!currentUser?.organization,
  });

  const { data: motions = [], isLoading: loadingMotions } = useQuery({
    queryKey: ["motions", currentUser?.organization],
    queryFn: () => base44.entities.Motion.filter({ organization: currentUser.organization }, "-created_date", 10),
    enabled: !!currentUser?.organization,
  });

  const { data: meetings = [], isLoading: loadingMeetings } = useQuery({
    queryKey: ["meetings", currentUser?.organization],
    queryFn: () => base44.entities.Meeting.filter({ organization: currentUser.organization }, "-date", 5),
    enabled: !!currentUser?.organization,
  });

  const { data: comms = [], isLoading: loadingComms } = useQuery({
    queryKey: ["communications", currentUser?.organization],
    queryFn: () => base44.entities.Communication.filter({ organization: currentUser.organization }, "-created_date"),
    enabled: !!currentUser?.organization,
  });

  const { data: fractionMeetings = [] } = useQuery({
    queryKey: ["fractionMeetings", currentUser?.organization],
    queryFn: () => base44.entities.FractionMeeting.filter({ organization: currentUser.organization }, "-date"),
    enabled: !!currentUser?.organization,
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list("-created_date", 5),
    enabled: currentUser?.role === "admin",
  });

  React.useEffect(() => {
    if (!currentUser?.organization) return;
    
    const unsubscribeContact = base44.entities.Contact.subscribe(() => {
      qc.invalidateQueries({ queryKey: ["contacts", currentUser.organization] });
    });
    
    const unsubscribeMotion = base44.entities.Motion.subscribe(() => {
      qc.invalidateQueries({ queryKey: ["motions", currentUser.organization] });
    });
    
    const unsubscribeMeeting = base44.entities.Meeting.subscribe(() => {
      qc.invalidateQueries({ queryKey: ["meetings", currentUser.organization] });
    });
    
    const unsubscribeComm = base44.entities.Communication.subscribe(() => {
      qc.invalidateQueries({ queryKey: ["communications", currentUser.organization] });
    });
    
    const unsubscribeFraction = base44.entities.FractionMeeting.subscribe(() => {
      qc.invalidateQueries({ queryKey: ["fractionMeetings", currentUser.organization] });
    });
    
    return () => {
      unsubscribeContact();
      unsubscribeMotion();
      unsubscribeMeeting();
      unsubscribeComm();
      unsubscribeFraction();
    };
  }, [currentUser?.organization, qc]);

  const upcomingMeetings = meetings.filter(
    (m) => m.status === "geplant" && new Date(m.date) >= new Date()
  );

  const openMotions = motions.filter(
    (m) => !["angenommen", "abgelehnt", "zurueckgezogen"].includes(m.status)
  );

  const openComms = comms.filter((c) => c.status === "offen" || c.status === "wiedervorlage");

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6 animate-fade-in" data-testid="dashboard">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Übersicht</p>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Willkommen zurück{currentUser?.full_name ? `, ${currentUser.full_name.split(' ')[0]}` : ''}
            </h1>
            <p className="text-sm text-slate-500 mt-1">Ihre kommunalpolitische Arbeit auf einen Blick</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Activity className="w-3.5 h-3.5" />
            <span>Letzte Aktualisierung: {new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</span>
          </div>
        </div>

        {/* Stats Grid - Bento Style */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Kontakte"
            value={loadingContacts ? "–" : contacts.length}
            icon={Users}
            accent="sky"
            trend={contacts.length > 0 ? `${contacts.filter(c => new Date(c.created_date) > new Date(Date.now() - 30*24*60*60*1000)).length} neu (30 Tage)` : null}
          />
          <StatCard
            label="Offene Anträge"
            value={loadingMotions ? "–" : openMotions.length}
            icon={FileText}
            accent="amber"
            trend={openMotions.length > 0 ? `${openMotions.filter(m => m.priority === 'dringend' || m.priority === 'hoch').length} mit Priorität` : null}
          />
          <StatCard
            label="Nächste Termine"
            value={loadingMeetings ? "–" : upcomingMeetings.length}
            icon={CalendarDays}
            accent="emerald"
            trend={upcomingMeetings.length > 0 ? `Nächster: ${upcomingMeetings[0]?.title?.substring(0, 20)}...` : null}
          />
          <StatCard
            label="Offene Vorgänge"
            value={loadingComms ? "–" : openComms.length}
            icon={MessageCircle}
            accent="violet"
            trend={openComms.length > 0 ? `${openComms.filter(c => c.status === 'wiedervorlage').length} Wiedervorlagen` : null}
          />
        </div>

        {/* Calendar Section */}
        <CalendarView 
          meetings={meetings} 
          communications={comms}
          fractionMeetings={fractionMeetings}
          onDayClick={(date) => {
            setSelectedDate(date);
            setMeetingFormOpen(true);
          }}
        />

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Column - 8 cols */}
          <div className="lg:col-span-8 space-y-6">
            <RecentMotions motions={openMotions.slice(0, 6)} isLoading={loadingMotions} />
            <UpcomingMeetings meetings={upcomingMeetings.slice(0, 5)} isLoading={loadingMeetings} />
            {currentUser?.org_type === "verband" && (
              <FinanceForecast organization={currentUser?.organization} />
            )}
          </div>
          
          {/* Right Column - 4 cols */}
          <div className="lg:col-span-4 space-y-6">
            <QuickActions />
            {currentUser?.role === "admin" && (
              <NewUsers users={users} isLoading={loadingUsers} />
            )}
          </div>
        </div>
      </div>

      <MeetingForm
        isOpen={meetingFormOpen}
        onClose={() => {
          setMeetingFormOpen(false);
          setSelectedDate(null);
        }}
        defaultData={selectedDate ? { date: selectedDate } : null}
        onSave={async (data) => {
          await base44.entities.Meeting.create({ ...data, organization: currentUser.organization });
          await qc.invalidateQueries({ queryKey: ["meetings", currentUser.organization] });
          setMeetingFormOpen(false);
          setSelectedDate(null);
        }}
      />
    </PullToRefresh>
  );
}
