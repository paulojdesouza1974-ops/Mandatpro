import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { FilePlus, Search, Save, Printer, Trash2, Sparkles, ShieldCheck, Upload, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import PullToRefresh from "@/components/PullToRefresh";
import MotionPrintView from "@/components/motions/MotionPrintView";
import { useToast } from "@/hooks/use-toast";

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
  beschluss: "Beschluss",
  resolution: "Resolution",
  aenderungsantrag: "Änderungsantrag",
  dringlichkeitsantrag: "Dringlichkeit",
};
const priorityLabels = { niedrig: "Niedrig", mittel: "Mittel", hoch: "Hoch", dringend: "Dringend" };
const priorityColors = {
  niedrig: "bg-slate-50 text-slate-500",
  mittel: "bg-blue-50 text-blue-600",
  hoch: "bg-amber-50 text-amber-600",
  dringend: "bg-red-50 text-red-600",
};

const signatureRoles = [
  { value: "fraktionsvorsitzender", label: "Fraktionsvorsitzender" },
  { value: "stv_fraktionsvorsitzender", label: "Stv. Fraktionsvorsitzender" },
  { value: "fraktionsgeschaeftsfuehrer", label: "Fraktionsgeschäftsführer" },
  { value: "ratsmitglied", label: "Ratsmitglied" },
  { value: "sachkundiger_buerger", label: "Sachkundiger Bürger" },
];

const emptyMotion = {
  title: "",
  type: "antrag",
  status: "entwurf",
  body: "",
  committee: "",
  session_date: "",
  submitted_date: "",
  priority: "mittel",
  signature_role: "",
  signature_name: "",
  signature_role_2: "",
  signature_name_2: "",
  tags: [],
  notes: "",
  attachments: [],
};

export default function Motions() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("alle");
  const [activeTab, setActiveTab] = useState("content");
  const [selectedMotion, setSelectedMotion] = useState(null);
  const [formData, setFormData] = useState(emptyMotion);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [printMotion, setPrintMotion] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [qualityRunning, setQualityRunning] = useState(false);
  const [qualityResult, setQualityResult] = useState("");
  const [uploading, setUploading] = useState(false);
  const [identifying, setIdentifying] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: motions = [], isLoading } = useQuery({
    queryKey: ["motions", currentUser?.organization],
    queryFn: () => base44.entities.Motion.filter({ organization: currentUser.organization }, "-created_date"),
    enabled: !!currentUser?.organization,
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => base44.entities.Organization.list(),
    enabled: !!currentUser,
  });

  const { data: orgUsers = [] } = useQuery({
    queryKey: ["orgUsers", currentUser?.organization],
    queryFn: () => base44.entities.User.list(),
    enabled: !!currentUser?.organization,
  });

  const members = useMemo(() => {
    return orgUsers
      .filter((u) => u.organization === currentUser?.organization)
      .map((u) => ({
        name: u.full_name || u.email,
        role: u.org_role || "mitglied",
      }));
  }, [orgUsers, currentUser?.organization]);

  const currentOrg = useMemo(() => {
    return organizations.find((org) => org.name === currentUser?.organization) || null;
  }, [organizations, currentUser?.organization]);

  useEffect(() => {
    if (!selectedMotion && motions.length > 0) {
      setSelectedMotion(motions[0]);
      setFormData({ ...emptyMotion, ...motions[0] });
    }
  }, [motions, selectedMotion]);

  useEffect(() => {
    if (selectedMotion) {
      setFormData({ ...emptyMotion, ...selectedMotion });
    }
  }, [selectedMotion]);

  useEffect(() => {
    if (!currentUser?.organization) return;
    const unsubscribe = base44.entities.Motion.subscribe(() => {
      qc.invalidateQueries({ queryKey: ["motions", currentUser.organization] });
    });
    return unsubscribe;
  }, [currentUser?.organization, qc]);

  const saveMutation = useMutation({
    mutationFn: (data) =>
      data.id
        ? base44.entities.Motion.update(data.id, data)
        : base44.entities.Motion.create({ ...data, organization: currentUser.organization }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["motions", currentUser?.organization] });
      setSelectedMotion(result);
      setFormData({ ...emptyMotion, ...result });
      toast({
        title: result?.id ? "Antrag gespeichert" : "Antrag erstellt",
        description: "Die Änderungen wurden gespeichert.",
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: error.message || "Der Antrag konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Motion.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["motions", currentUser?.organization] });
      setShowDeleteDialog(false);
      setSelectedMotion(null);
      setFormData(emptyMotion);
      toast({ title: "Antrag gelöscht" });
    },
  });

  const filtered = motions.filter((m) => {
    const term = search.toLowerCase();
    const matchSearch =
      !term ||
      (m.title || "").toLowerCase().includes(term) ||
      (m.committee || "").toLowerCase().includes(term);
    const matchStatus = statusFilter === "alle" || m.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleRefresh = async () => {
    await qc.invalidateQueries({ queryKey: ["motions", currentUser?.organization] });
  };

  const handleSelectMotion = (motion) => {
    setSelectedMotion(motion);
    setFormData({ ...emptyMotion, ...motion });
    setQualityResult("");
  };

  const handleNewMotion = () => {
    setSelectedMotion(null);
    setFormData(emptyMotion);
    setQualityResult("");
  };

  const updateField = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleDelete = () => {
    if (selectedMotion?.id) {
      deleteMutation.mutate(selectedMotion.id);
    }
  };

  const generateWithAI = async () => {
    if (!formData.title) return;
    setGenerating(true);
    const typeLabel = typeLabels[formData.type] || formData.type;
    const decisionHeading = formData.type === "anfrage" ? "Fragestellung" : "Beschlussvorschlag";
    const orgName = currentOrg?.display_name || currentOrg?.name || currentUser?.organization || "Organisation";
    const stateName = currentOrg?.state;
    const stateLabel = stateName || "nicht angegeben";
    const legalState = stateName || "des jeweiligen Landes";
    const committeeLine = formData.committee ? `Ausschuss/Gremium: ${formData.committee}` : "Ausschuss/Gremium: nicht angegeben";
    const sessionLine = formData.session_date ? `Sitzungsdatum: ${formData.session_date}` : "Sitzungsdatum: nicht angegeben";
    const lengthGuidance = "5–12 Sätze je Abschnitt (bei einfachen Anliegen eher 5–8, bei technischen/baulichen Themen eher 8–12).";

    const systemMessage =
      "Du bist ein neutraler, juristisch vorsichtiger Fachautor für kommunale Anträge in Deutschland. Schreibe sachlich, professionell und ohne politische Wertung. Beziehe dich ausschließlich auf das angegebene Thema und erfinde keine Fakten oder Rechtsgrundlagen. Wenn etwas unsicher ist, kennzeichne es allgemein (z. B. Kommunalrecht des Landes / Gemeindeordnung) statt konkrete Paragraphen zu erfinden.";

    try {
      const prompt = `Erstelle einen kommunalpolitischen ${typeLabel} für eine deutsche Kommune.\n\nKontext:\nOrganisation: ${orgName}\nBundesland: ${stateLabel}\n${committeeLine}\n${sessionLine}\nThema: "${formData.title}"\n\nStruktur (bitte exakt mit Überschriften):\n${typeLabel}: ${formData.title}\n${decisionHeading}\n[2–4 Sätze, klare Handlungsanweisung bzw. präzise Fragestellung, neutral formuliert]\n\nBegründung\n[${lengthGuidance} Sachlich, realistisch, ohne politische Wertung. Keine anderen Themen.]\n\nRechtsgrundlage\n[Allgemeiner, sicherer Rechtsbezug. Keine erfundenen Paragraphen. Wenn unklar: "Kommunalrecht ${legalState} (z. B. Gemeindeordnung)".]\n\nWICHTIG:\n- Keine Beispiele anderer Kommunen, keine Fremdthemen.\n- Keine Empfängeradresse, keine Grußformel, keine Unterschriften.\n- Keine Vermutungen, keine Spekulationen.\n- Absätze mit Leerzeile trennen.`;

      const res = await base44.ai.generateText(prompt, "motion", systemMessage);
      if (res.success && res.content) {
        setFormData((prev) => ({ ...prev, body: res.content }));
        setQualityResult("");
      } else {
        toast({ title: "Fehler bei der KI-Generierung", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Fehler bei der KI-Generierung", description: error.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const runQualityCheck = async () => {
    if (!formData.body) {
      toast({ title: "Bitte zuerst Text erzeugen oder einfügen." });
      return;
    }
    setQualityRunning(true);
    const systemMessage =
      "Du bist ein Qualitätsprüfer für kommunalpolitische Anträge. Prüfe Themenbezug, Neutralität und rechtliche Vorsicht. Keine erfundenen Paragraphen. Antworte kurz und klar auf Deutsch.";

    try {
      const prompt = `Prüfe den folgenden Antragstext. Gib eine kurze Bewertung mit diesen Abschnitten:\n- Themenbezug (OK/WARN + 1-2 Sätze)\n- Neutralität (OK/WARN + 1-2 Sätze)\n- Rechtliche Vorsicht (OK/WARN + 1-2 Sätze)\n- Empfehlungen (max. 3 Bulletpoints)\n\nText:\n\"\"\"\n${formData.body}\n\"\"\"`;

      const res = await base44.ai.generateText(prompt, "general", systemMessage);
      if (res.success && res.content) {
        setQualityResult(res.content);
      } else {
        toast({ title: "Qualitäts-Check fehlgeschlagen", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Qualitäts-Check fehlgeschlagen", description: error.message, variant: "destructive" });
    }
    setQualityRunning(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      alert("Datei-Upload ist noch in Entwicklung. Bitte fügen Sie die Datei manuell als Anhang bei.");
    } catch (error) {
      alert("Fehler beim Hochladen der Datei");
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  const identifyDocument = async () => {
    setIdentifying(true);
    try {
      alert("Dokument-Analyse ist noch in Entwicklung.");
    } catch (error) {
      alert("Fehler beim Analysieren des Dokuments");
    } finally {
      setIdentifying(false);
    }
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6" data-testid="motions-page">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Anträge & Anfragen</h1>
            <p className="text-sm text-slate-500 mt-1">{motions.length} Dokumente gesamt</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleNewMotion} data-testid="motions-new-button">
              <FilePlus className="w-4 h-4 mr-2" /> Neuer Antrag
            </Button>
            <Button
              variant="outline"
              onClick={() => setPrintMotion(formData?.id ? formData : null)}
              disabled={!formData?.id}
              data-testid="motions-preview-button"
            >
              <Printer className="w-4 h-4 mr-2" /> Druckansicht
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="motions-save-button">
              <Save className="w-4 h-4 mr-2" /> {saveMutation.isPending ? "Speichert..." : "Speichern"}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Anträge</CardTitle>
              <CardDescription>Auswahl und Status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Suchen..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                    data-testid="motions-search-input"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="motions-status-filter">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alle">Alle Status</SelectItem>
                    {Object.entries(statusLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                {isLoading ? (
                  [1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-slate-50 rounded animate-pulse" />
                  ))
                ) : filtered.length === 0 ? (
                  <p className="text-sm text-slate-500" data-testid="motions-empty-state">
                    Keine Anträge gefunden
                  </p>
                ) : (
                  filtered.map((motion) => (
                    <button
                      key={motion.id}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedMotion?.id === motion.id
                          ? "bg-slate-100 border-slate-300"
                          : "hover:bg-slate-50 border-transparent"
                      }`}
                      onClick={() => handleSelectMotion(motion)}
                      data-testid={`motion-item-${motion.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-slate-900 line-clamp-2">{motion.title}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {typeLabels[motion.type] || motion.type}
                            {motion.session_date ? ` • ${format(new Date(motion.session_date), "dd.MM.yyyy")}` : ""}
                          </p>
                        </div>
                        <Badge className={`text-[10px] ${statusColors[motion.status] || statusColors.entwurf}`}>
                          {statusLabels[motion.status] || motion.status}
                        </Badge>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">{formData.title || "Neuer Antrag"}</CardTitle>
                  <CardDescription>Bearbeiten und drucken</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={!formData?.id}
                    data-testid="motions-delete-button"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Löschen
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="content" data-testid="motion-tab-content">Inhalt</TabsTrigger>
                  <TabsTrigger value="signatures" data-testid="motion-tab-signatures">Unterschriften</TabsTrigger>
                  <TabsTrigger value="notes" data-testid="motion-tab-notes">Notizen & Anhänge</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Titel *</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => updateField("title", e.target.value)}
                        placeholder="z.B. Parkbank-Erneuerung im Stadtpark"
                        data-testid="motion-title-input"
                      />
                    </div>
                    <div>
                      <Label>Art *</Label>
                      <Select value={formData.type} onValueChange={(v) => updateField("type", v)}>
                        <SelectTrigger data-testid="motion-type-trigger">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(typeLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label>Status</Label>
                      <Select value={formData.status} onValueChange={(v) => updateField("status", v)}>
                        <SelectTrigger data-testid="motion-status-trigger">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Priorität</Label>
                      <Select value={formData.priority} onValueChange={(v) => updateField("priority", v)}>
                        <SelectTrigger data-testid="motion-priority-trigger">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(priorityLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Sitzungsdatum</Label>
                      <Input
                        type="date"
                        value={formData.session_date}
                        onChange={(e) => updateField("session_date", e.target.value)}
                        data-testid="motion-session-date-input"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Ausschuss/Gremium</Label>
                    <Input
                      value={formData.committee}
                      onChange={(e) => updateField("committee", e.target.value)}
                      placeholder="z.B. Bauausschuss"
                      data-testid="motion-committee-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Label>Antragstext</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={generateWithAI}
                          disabled={generating || !formData.title}
                          data-testid="motion-ai-generate-button"
                        >
                          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          <span className="ml-2">{generating ? "Generiert..." : "Mit KI generieren"}</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={runQualityCheck}
                          disabled={qualityRunning || !formData.body}
                          data-testid="motion-ai-quality-check-button"
                        >
                          {qualityRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                          <span className="ml-2">{qualityRunning ? "Prüft..." : "Qualitäts-Check"}</span>
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      value={formData.body}
                      onChange={(e) => updateField("body", e.target.value)}
                      rows={12}
                      placeholder="Text des Antrags / der Anfrage..."
                      className="font-mono text-sm"
                      data-testid="motion-body-textarea"
                    />
                  </div>

                  {qualityResult && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3" data-testid="motion-quality-result">
                      <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Qualitäts-Check</p>
                      <div className="text-sm whitespace-pre-wrap text-slate-700">{qualityResult}</div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="signatures" className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Unterschrift Position</Label>
                      <Select value={formData.signature_role || ""} onValueChange={(v) => updateField("signature_role", v)}>
                        <SelectTrigger data-testid="motion-signature-role-trigger">
                          <SelectValue placeholder="Position wählen..." />
                        </SelectTrigger>
                        <SelectContent>
                          {signatureRoles.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Name</Label>
                      {members.length > 0 && formData.signature_role ? (
                        <Select
                          value={formData.signature_name || ""}
                          onValueChange={(v) => updateField("signature_name", v)}
                        >
                          <SelectTrigger data-testid="motion-signature-name-trigger">
                            <SelectValue placeholder="Person wählen..." />
                          </SelectTrigger>
                          <SelectContent>
                            {members
                              .filter((m) => m.role === formData.signature_role)
                              .map((m, idx) => (
                                <SelectItem key={idx} value={m.name}>
                                  {m.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={formData.signature_name || ""}
                          onChange={(e) => updateField("signature_name", e.target.value)}
                          placeholder="Name eingeben..."
                          data-testid="motion-signature-name-input"
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>2. Unterschrift Position</Label>
                      <Select value={formData.signature_role_2 || ""} onValueChange={(v) => updateField("signature_role_2", v)}>
                        <SelectTrigger data-testid="motion-signature-role-2-trigger">
                          <SelectValue placeholder="Position wählen..." />
                        </SelectTrigger>
                        <SelectContent>
                          {signatureRoles.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>2. Unterschrift Name</Label>
                      {members.length > 0 && formData.signature_role_2 ? (
                        <Select
                          value={formData.signature_name_2 || ""}
                          onValueChange={(v) => updateField("signature_name_2", v)}
                        >
                          <SelectTrigger data-testid="motion-signature-name-2-trigger">
                            <SelectValue placeholder="Person wählen..." />
                          </SelectTrigger>
                          <SelectContent>
                            {members
                              .filter((m) => m.role === formData.signature_role_2)
                              .map((m, idx) => (
                                <SelectItem key={idx} value={m.name}>
                                  {m.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={formData.signature_name_2 || ""}
                          onChange={(e) => updateField("signature_name_2", e.target.value)}
                          placeholder="Name eingeben..."
                          data-testid="motion-signature-name-2-input"
                        />
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="notes" className="space-y-4">
                  <div>
                    <Label>Interne Notizen</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => updateField("notes", e.target.value)}
                      rows={4}
                      placeholder="Notizen..."
                      data-testid="motion-notes-textarea"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Anhänge</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById("motion-file-upload")?.click()}
                        disabled={uploading}
                        data-testid="motion-attachment-upload-button"
                      >
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        <span className="ml-2">{uploading ? "Lädt hoch..." : "Dokument hochladen"}</span>
                      </Button>
                      <input
                        id="motion-file-upload"
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                        data-testid="motion-attachment-file-input"
                      />
                    </div>
                    {formData.attachments && formData.attachments.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {formData.attachments.map((att, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200"
                            data-testid={`motion-attachment-item-${index}`}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              <a
                                href={att.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-slate-700 hover:text-slate-900 truncate"
                              >
                                {att.file_name}
                              </a>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={identifyDocument}
                                disabled={identifying}
                                data-testid={`motion-attachment-identify-${index}`}
                              >
                                {identifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-red-600 hover:text-red-700"
                                onClick={() => removeAttachment(index)}
                                data-testid={`motion-attachment-remove-${index}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <MotionPrintView motion={printMotion} open={!!printMotion} onClose={() => setPrintMotion(null)} />

        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Antrag löschen?</DialogTitle>
              <DialogDescription>
                Möchten Sie den Antrag "{formData.title || "Unbenannt"}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)} data-testid="motion-delete-cancel">
                Abbrechen
              </Button>
              <Button variant="destructive" onClick={handleDelete} data-testid="motion-delete-confirm">
                Löschen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PullToRefresh>
  );
}
