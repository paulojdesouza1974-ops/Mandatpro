import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, ThumbsUp, ThumbsDown, Minus, UserCheck, CheckCircle2, Circle, FileText, Mic } from "lucide-react";

// Compute TOP label same logic as AgendaEditor
function getTopLabel(items, index) {
  const fixedStart = items.filter(i => i.type === "fixed_start" || i.type === "fixed");
  const fixedEnd   = items.filter(i => i.type === "fixed_end");
  const middle     = items.filter(i => i.type !== "fixed_start" && i.type !== "fixed_end" && i.type !== "fixed");

  const fixedStartCount = fixedStart.length;
  const item = items[index];

  if (item.type === "fixed_start" || item.type === "fixed") {
    const pos = fixedStart.indexOf(item);
    return `TOP ${pos + 1}`;
  }
  if (item.type === "fixed_end") {
    const pos = fixedEnd.indexOf(item);
    const nextMainNumber = fixedStartCount + (middle.length > 0 ? 1 : 0) + 1;
    return `TOP ${nextMainNumber + pos}`;
  }
  // middle
  const pos = middle.indexOf(item);
  const mainNumber = fixedStartCount + 1;
  if (middle.length === 1) {
    return `TOP ${mainNumber}`;
  }
  return `TOP ${mainNumber}.${pos + 1}`;
}

const VOTE_OPTIONS = [
  { value: "dafür", label: "Dafür", icon: ThumbsUp, color: "text-green-600" },
  { value: "dagegen", label: "Dagegen", icon: ThumbsDown, color: "text-red-600" },
  { value: "enthaltung", label: "Enthaltung", icon: Minus, color: "text-amber-600" },
  { value: "abwesend", label: "Abwesend", icon: Circle, color: "text-slate-400" },
];

// TOPs that are not votable (only speaker is recorded)
const NON_VOTABLE_TYPES = ["fixed_start", "fixed", "fixed_end"];

const toTestId = (value) => (value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function TopBlock({ topLabel, item, members, topData, onChange }) {
  const [open, setOpen] = useState(false);

  const votes = topData.votes || {};
  const notes = topData.notes || "";
  const done = topData.done || false;
  const speaker = topData.speaker || "";

  const isVotable = !NON_VOTABLE_TYPES.includes(item.type);
  const topId = toTestId(topLabel);
  const isDiscussionTopic = !["TOP 1", "TOP 2"].includes(topLabel);
  const isElectionTopic = ["TOP 3", "TOP 4", "TOP 5", "TOP 6", "TOP 7"].includes(topLabel);
  const isNotesOnlyTopic = ["TOP 8", "TOP 9"].includes(topLabel);

  const setVote = (memberName, vote) => {
    onChange({ ...topData, votes: { ...votes, [memberName]: vote } });
  };

  const setNotes = (v) => onChange({ ...topData, notes: v });
  const setSpeaker = (v) => onChange({ ...topData, speaker: v });
  const toggleDone = () => onChange({ ...topData, done: !done });

  const voteCounts = VOTE_OPTIONS.reduce((acc, opt) => {
    acc[opt.value] = Object.values(votes).filter(v => v === opt.value).length;
    return acc;
  }, {});

  const totalVoted = Object.values(votes).filter(Boolean).length;

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${done ? "border-green-200 bg-green-50/30" : "border-slate-200 bg-white"}`} data-testid={`live-protocol-${topId}`}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
        data-testid={`live-protocol-${topId}-toggle`}
      >
        {done
          ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
          : <Circle className="w-4 h-4 text-slate-300 shrink-0" />
        }
        <span className="text-xs font-bold text-slate-400 w-16 shrink-0">{topLabel}</span>
        <span className="flex-1 text-sm font-medium text-slate-800">{item.title}</span>
        {item.type === "motion" && <FileText className="w-3 h-3 text-blue-400 shrink-0" />}
        {totalVoted > 0 && (
          <div className="flex gap-1 shrink-0">
            {voteCounts["dafür"] > 0 && <Badge className="bg-green-100 text-green-700 text-xs px-1.5 py-0">{voteCounts["dafür"]}✓</Badge>}
            {voteCounts["dagegen"] > 0 && <Badge className="bg-red-100 text-red-700 text-xs px-1.5 py-0">{voteCounts["dagegen"]}✗</Badge>}
            {voteCounts["enthaltung"] > 0 && <Badge className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0">{voteCounts["enthaltung"]}–</Badge>}
          </div>
        )}
        {open ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>

      {/* Body */}
      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-3">

          {/* Redner (nur für TOP 1 und TOP 2) */}
          {!isVotable && !isElectionTopic && (
             <div>
               <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
                 <Mic className="w-3 h-3" /> Redner / Sitzungsleitung
               </p>
               <Textarea
                 value={speaker}
                 onChange={e => setSpeaker(e.target.value)}
                 placeholder="z.B. der Fraktionsvorsitzer Bodo Gilz begrüßt alle mitglieder..."
                 rows={2}
                 className="text-sm"
                 data-testid={`live-protocol-${topId}-speaker`}
               />
             </div>
           )}

          {/* Kandidaten-Input für Wahl-TOPs */}
          {isElectionTopic && !isNotesOnlyTopic && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Kandidaten zur Wahl</p>
              <Textarea
                value={topData.candidates || ""}
                onChange={e => onChange({ ...topData, candidates: e.target.value })}
                placeholder="Namen der Kandidaten eingeben (eine pro Zeile)"
                rows={2}
                className="text-sm"
                data-testid={`live-protocol-${topId}-candidates`}
              />
            </div>
          )}

          {/* Abstimmung pro Mitglied (nur für abstimmungsfähige TOPs) */}
          {(isVotable || isElectionTopic) && !isNotesOnlyTopic && members.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
                <UserCheck className="w-3 h-3" /> Abstimmung
              </p>
              <div className="space-y-1.5">
                {members.map((member) => {
                  const memberId = toTestId(member);
                  return (
                  <div key={member} className="flex items-center gap-2">
                    <span className="text-sm text-slate-700 w-40 shrink-0 truncate">{member}</span>
                    <div className="flex gap-1 flex-wrap">
                      {VOTE_OPTIONS.map(opt => {
                        const Icon = opt.icon;
                        const active = votes[member] === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setVote(member, active ? null : opt.value)}
                            data-testid={`live-protocol-${topId}-vote-${memberId}-${opt.value}`}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-all
                              ${active
                                ? opt.value === "dafür" ? "bg-green-100 border-green-400 text-green-700"
                                  : opt.value === "dagegen" ? "bg-red-100 border-red-400 text-red-700"
                                  : opt.value === "enthaltung" ? "bg-amber-100 border-amber-400 text-amber-700"
                                  : "bg-slate-200 border-slate-400 text-slate-600"
                                : "bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                              }`}
                          >
                            <Icon className="w-3 h-3" />
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
                })}
              </div>

              {/* Summary */}
              {totalVoted > 0 && (
                <div className="mt-3 flex gap-3 text-sm font-medium">
                  <span className="text-green-600">Dafür: {voteCounts["dafür"]}</span>
                  <span className="text-red-600">Dagegen: {voteCounts["dagegen"]}</span>
                  <span className="text-amber-600">Enthaltung: {voteCounts["enthaltung"]}</span>
                  {voteCounts["abwesend"] > 0 && <span className="text-slate-400">Abwesend: {voteCounts["abwesend"]}</span>}
                </div>
              )}
            </div>
          )}

          {/* Notizen (nur für Diskussions-TOPs und Notes-Only-TOPs) */}
          {(isDiscussionTopic && !isElectionTopic) || isNotesOnlyTopic && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Notizen / Diskussion</p>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Diskussionspunkte, Ergebnisse..."
                rows={3}
                className="text-sm"
                data-testid={`live-protocol-${topId}-notes`}
              />
            </div>
          )}

          {/* Abgehakt */}
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant={done ? "default" : "outline"}
              className={done ? "bg-green-600 hover:bg-green-700" : ""}
              onClick={toggleDone}
              data-testid={`live-protocol-${topId}-done`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              {done ? "Erledigt" : "Als erledigt markieren"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LiveProtocol({ meeting, members = [], topData, onChange }) {
  const items = meeting.agenda_items || [];

  return (
    <div className="space-y-2" data-testid="live-protocol">
      {items.map((item, i) => {
        const label = getTopLabel(items, i);
        const key = `top_${i}`;
        return (
          <TopBlock
            key={key}
            topLabel={label}
            item={item}
            members={members}
            topData={topData[key] || {}}
            onChange={(data) => onChange({ ...topData, [key]: data })}
          />
        );
      })}
    </div>
  );
}