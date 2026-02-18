import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Mail, Users, CheckCircle2, AlertTriangle, Sparkles, Loader2 } from "lucide-react";

export default function BulkMailDialog({ open, onClose, organization, contacts = [] }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [result, setResult] = useState(null);

  const { data: groups = [] } = useQuery({
    queryKey: ["memberGroups", organization],
    queryFn: () => base44.entities.MemberGroup.filter({ organization }),
    enabled: !!organization && open,
  });

  const eligibleContacts = useMemo(() => {
    let list = contacts.filter(c => c.email);
    if (groupFilter !== "all") {
      const group = groups.find(g => g.id === groupFilter);
      if (group) list = list.filter(c => (group.member_ids || []).includes(c.id));
    }
    return list;
  }, [contacts, groups, groupFilter]);

  // Auto-select when group changes
  React.useEffect(() => {
    setSelectedIds(eligibleContacts.map(c => c.id));
  }, [groupFilter, eligibleContacts.length]);

  const toggleContact = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedIds.length === eligibleContacts.length) setSelectedIds([]);
    else setSelectedIds(eligibleContacts.map(c => c.id));
  };

  const generateEmail = async () => {
    if (!aiTopic.trim()) return;
    setGenerating(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein Assistent für eine deutsche politische Partei.
Erstelle eine professionelle E-Mail für das Thema: "${aiTopic}".
Die E-Mail soll:
- Einen passenden Betreff haben
- Einen freundlichen, professionellen Ton haben
- Auf Deutsch sein
- Ca. 150-250 Wörter im Body haben
- Den Platzhalter {name} für die Anrede verwenden (z.B. "Liebe/r {name},")
- Mit "Mit freundlichen Grüßen,\nDer Vorstand" enden

Gib die Antwort als JSON zurück mit den Feldern "subject" und "body".`,
      response_json_schema: {
        type: "object",
        properties: {
          subject: { type: "string" },
          body: { type: "string" },
        },
      },
    });
    setSubject(result.subject || "");
    setBody(result.body || "");
    setGenerating(false);
  };

  const handleSend = async () => {
    const recipients = contacts.filter(c => selectedIds.includes(c.id) && c.email);
    if (!recipients.length || !subject || !body) return;
    setSending(true);
    let success = 0, failed = 0;
    for (const c of recipients) {
      const personalBody = body
        .replace(/\{vorname\}/gi, c.first_name || "")
        .replace(/\{nachname\}/gi, c.last_name || "")
        .replace(/\{name\}/gi, `${c.first_name || ""} ${c.last_name || ""}`.trim());
      try {
        await base44.integrations.Core.SendEmail({ to: c.email, subject, body: personalBody });
        success++;
      } catch { failed++; }
    }
    setSending(false);
    setResult({ success, failed });
  };

  const resetAndClose = () => {
    setSubject(""); setBody(""); setGroupFilter("all"); setSelectedIds([]); setResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Mail className="w-4 h-4" /> Massen-E-Mail versenden
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="text-center py-8 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <p className="text-lg font-semibold text-slate-800">E-Mails versendet</p>
            <p className="text-sm text-slate-500">{result.success} erfolgreich, {result.failed} fehlgeschlagen</p>
            <Button onClick={resetAndClose}>Schließen</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Empfängergruppe */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Empfängergruppe</Label>
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Mitglieder mit E-Mail</SelectItem>
                  {groups.map(g => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name} ({(g.member_ids || []).length} Mitgl.)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Empfänger-Auswahl */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Checkbox checked={selectedIds.length === eligibleContacts.length && eligibleContacts.length > 0} onCheckedChange={toggleAll} />
                  <span className="text-xs font-medium text-slate-600">
                    <Users className="w-3 h-3 inline mr-1" />
                    {selectedIds.length} von {eligibleContacts.length} ausgewählt
                  </span>
                </div>
                {eligibleContacts.length === 0 && (
                  <Badge className="bg-amber-100 text-amber-700 text-xs"><AlertTriangle className="w-3 h-3 mr-1 inline" />Keine E-Mails vorhanden</Badge>
                )}
              </div>
              <div className="max-h-36 overflow-y-auto divide-y divide-slate-100">
                {eligibleContacts.map(c => (
                  <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50">
                    <Checkbox checked={selectedIds.includes(c.id)} onCheckedChange={() => toggleContact(c.id)} />
                    <span className="text-sm text-slate-700 flex-1">{c.first_name} {c.last_name}</span>
                    <span className="text-xs text-slate-400">{c.email}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* KI-Assistent */}
            <div className="border border-indigo-200 bg-indigo-50 rounded-lg p-3 space-y-2">
              <Label className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> KI-Assistent – E-Mail generieren
              </Label>
              <div className="flex gap-2">
                <Input
                  value={aiTopic}
                  onChange={e => setAiTopic(e.target.value)}
                  placeholder="Thema eingeben (z.B. Stammtisch, Wahlkampf, Newsletter...)"
                  className="bg-white text-sm"
                  onKeyDown={e => e.key === "Enter" && generateEmail()}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateEmail}
                  disabled={generating || !aiTopic.trim()}
                  className="shrink-0 border-indigo-300 text-indigo-700 hover:bg-indigo-100"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-indigo-600">Thema eingeben → KI erstellt Betreff und Text automatisch</p>
            </div>

            {/* Betreff & Text */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Betreff *</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Betreff der E-Mail" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">
                Nachricht * <span className="font-normal text-slate-400">(Platzhalter: {"{vorname}"}, {"{nachname}"}, {"{name}"})</span>
              </Label>
              <Textarea value={body} onChange={e => setBody(e.target.value)} rows={6} placeholder="Sehr geehrte/r {name},&#10;&#10;..." />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetAndClose}>Abbrechen</Button>
              <Button
                onClick={handleSend}
                disabled={sending || !selectedIds.length || !subject.trim() || !body.trim()}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Send className="w-4 h-4 mr-2" />
                {sending ? "Wird gesendet..." : `${selectedIds.length} E-Mails senden`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}