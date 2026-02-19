import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Sparkles, Users, Send, CheckSquare, Square, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

const EMAIL_TEMPLATES = [
  { id: "newsletter", label: "📰 Newsletter", description: "Allgemeiner Informationsbrief an Mitglieder" },
  { id: "kreisparteitag", label: "🏛️ Kreisparteitag-Einladung", description: "Einladung zum Kreisparteitag" },
  { id: "stammtisch", label: "🍺 Stammtisch-Einladung", description: "Einladung zum nächsten Stammtisch" },
  { id: "wahlkampf", label: "🗳️ Wahlkampf-Freiwillige", description: "Aufruf zur Wahlkampfunterstützung" },
  { id: "vorstandssitzung", label: "📋 Vorstandssitzung", description: "Einladung zur Vorstandssitzung" },
  { id: "mitgliederversammlung", label: "👥 Mitgliederversammlung", description: "Einladung zur Mitgliederversammlung" },
  { id: "sonstiges", label: "✉️ Sonstiges", description: "Freies Thema eingeben" },
];

export default function BulkEmail() {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customTopic, setCustomTopic] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [filterWard, setFilterWard] = useState("alle");
  const [filterStatus, setFilterStatus] = useState("aktiv");
  const [showContacts, setShowContacts] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(null);

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", user?.organization],
    queryFn: () => base44.entities.Contact.filter({ organization: user?.organization }),
    enabled: !!user?.organization,
  });

  const wards = ["alle", ...Array.from(new Set(contacts.map(c => c.ward).filter(Boolean)))];

  const filteredContacts = contacts.filter(c => {
    const wardMatch = filterWard === "alle" || c.ward === filterWard;
    const statusMatch = filterStatus === "alle" || c.status === filterStatus;
    const hasEmail = !!c.email;
    return wardMatch && statusMatch && hasEmail;
  });

  const toggleContact = (id) => {
    setSelectedContacts(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedContacts(filteredContacts.map(c => c.id));
  const selectNone = () => setSelectedContacts([]);

  const generateEmail = async () => {
    const topic = selectedTemplate?.id === "sonstiges" ? customTopic : selectedTemplate?.label;
    if (!topic) return;
    setGenerating(true);
    try {
      const result = await base44.ai.generateEmail(topic, user?.organization || "Ortsverband");
      setSubject(result.subject || "");
      setBody(result.body || "");
    } catch (error) {
      console.error("E-Mail generation error:", error);
      // Set fallback content on error
      setSubject(`${topic} - Information`);
      setBody(`Sehr geehrte Mitglieder,\n\nhiermit informieren wir Sie über ${topic}.\n\nWeitere Details folgen in Kürze.\n\nMit freundlichen Grüßen,\nDer Vorstand`);
    }
    setGenerating(false);
  };

  const sendEmails = async () => {
    if (!selectedContacts.length || !subject || !body) return;
    setSending(true);
    const recipientContacts = contacts.filter(c => selectedContacts.includes(c.id));
    for (const contact of recipientContacts) {
      await base44.integrations.Core.SendEmail({
        to: contact.email,
        subject,
        body: `Liebe(r) ${contact.first_name || ""} ${contact.last_name},\n\n${body}`,
        from_name: user?.organization || "AfD Fraktion Dormagen",
      });
    }
    setSentCount(recipientContacts.length);
    setSending(false);
  };

  if (sentCount !== null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">E-Mails versendet!</h2>
          <p className="text-muted-foreground mb-6">{sentCount} E-Mails wurden erfolgreich verschickt.</p>
          <Button onClick={() => { setSentCount(null); setSelectedContacts([]); setSubject(""); setBody(""); setSelectedTemplate(null); }}>
            Neue E-Mail erstellen
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Mail className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Massen-E-Mail</h1>
            <p className="text-muted-foreground text-sm">KI-gestützte E-Mails an Mitglieder senden</p>
          </div>
        </div>

        {/* Step 1: Template */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">1</span>
              Thema auswählen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {EMAIL_TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t)}
                  className={`text-left p-3 rounded-lg border-2 transition-all ${
                    selectedTemplate?.id === t.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="font-medium text-sm">{t.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
                </button>
              ))}
            </div>

            {selectedTemplate?.id === "sonstiges" && (
              <div className="mt-4">
                <Input
                  placeholder="Thema eingeben (z.B. Sommerfest 2025)..."
                  value={customTopic}
                  onChange={e => setCustomTopic(e.target.value)}
                />
              </div>
            )}

            <Button
              className="mt-4 w-full"
              onClick={generateEmail}
              disabled={!selectedTemplate || generating || (selectedTemplate?.id === "sonstiges" && !customTopic)}
            >
              {generating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> KI erstellt E-Mail...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> E-Mail mit KI generieren</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Step 2: Edit email */}
        {(subject || body) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">2</span>
                E-Mail bearbeiten
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Betreff</label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Betreff..." />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Nachricht</label>
                <Textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  className="min-h-[200px]"
                  placeholder="E-Mail-Text..."
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Recipients */}
        {(subject || body) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">3</span>
                Empfänger auswählen
                {selectedContacts.length > 0 && (
                  <Badge className="ml-auto">{selectedContacts.length} ausgewählt</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alle">Alle Status</SelectItem>
                    <SelectItem value="aktiv">Aktiv</SelectItem>
                    <SelectItem value="inaktiv">Inaktiv</SelectItem>
                    <SelectItem value="interessent">Interessent</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterWard} onValueChange={setFilterWard}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Stadtteil" />
                  </SelectTrigger>
                  <SelectContent>
                    {wards.map(w => (
                      <SelectItem key={w} value={w}>{w === "alle" ? "Alle Stadtteile" : w}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Select all / none */}
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  <CheckSquare className="w-4 h-4 mr-1" /> Alle auswählen ({filteredContacts.length})
                </Button>
                <Button variant="outline" size="sm" onClick={selectNone}>
                  <Square className="w-4 h-4 mr-1" /> Keine
                </Button>
                <button
                  className="ml-auto flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setShowContacts(!showContacts)}
                >
                  {showContacts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {showContacts ? "Ausblenden" : "Liste anzeigen"}
                </button>
              </div>

              {/* Contact list */}
              {showContacts && (
                <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                  {filteredContacts.length === 0 && (
                    <p className="p-4 text-sm text-muted-foreground text-center">Keine Kontakte mit E-Mail gefunden.</p>
                  )}
                  {filteredContacts.map(contact => (
                    <label
                      key={contact.id}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedContacts.includes(contact.id)}
                        onCheckedChange={() => toggleContact(contact.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{contact.first_name} {contact.last_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                      </div>
                      {contact.ward && <Badge variant="outline" className="text-xs">{contact.ward}</Badge>}
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Send button */}
        {selectedContacts.length > 0 && subject && body && (
          <Button
            size="lg"
            className="w-full"
            onClick={sendEmails}
            disabled={sending}
          >
            {sending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Sende E-Mails...</>
            ) : (
              <><Send className="w-4 h-4" /> {selectedContacts.length} E-Mail{selectedContacts.length !== 1 ? "s" : ""} senden</>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}