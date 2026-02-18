import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const motionTypes = ["antrag", "anfrage", "resolution", "aenderungsantrag", "dringlichkeitsantrag"];
const priorities = ["niedrig", "mittel", "hoch", "dringend"];
const statuses = ["entwurf", "eingereicht", "in_beratung", "angenommen", "abgelehnt", "zurueckgezogen"];

export default function WorkflowRuleForm({ isOpen, onClose, rule, organization }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_active: true,
    trigger_type: "motion_created",
    conditions: {
      motion_type: [],
      priority: [],
      status: [],
      committee: ""
    },
    actions: []
  });

  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name || "",
        description: rule.description || "",
        is_active: rule.is_active !== false,
        trigger_type: rule.trigger_type || "motion_created",
        conditions: rule.conditions || { motion_type: [], priority: [], status: [], committee: "" },
        actions: rule.actions || []
      });
    }
  }, [rule]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data, organization };
      if (rule?.id) {
        return base44.entities.WorkflowRule.update(rule.id, payload);
      }
      return base44.entities.WorkflowRule.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflowRules"] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const addAction = (type) => {
    const newAction = {
      type,
      config: type === "send_notification" || type === "send_email" 
        ? { recipient_emails: [] }
        : type === "change_status"
        ? { new_status: "" }
        : { task_title: "", task_description: "" }
    };
    setFormData({ ...formData, actions: [...formData.actions, newAction] });
  };

  const updateAction = (index, field, value) => {
    const updatedActions = [...formData.actions];
    updatedActions[index].config[field] = value;
    setFormData({ ...formData, actions: updatedActions });
  };

  const removeAction = (index) => {
    const updatedActions = formData.actions.filter((_, i) => i !== index);
    setFormData({ ...formData, actions: updatedActions });
  };

  const toggleConditionValue = (field, value) => {
    const current = formData.conditions[field] || [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    setFormData({
      ...formData,
      conditions: { ...formData.conditions, [field]: updated }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? "Regel bearbeiten" : "Neue Workflow-Regel"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label>Name der Regel *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="z.B. Benachrichtigung bei dringenden Anträgen"
                required
              />
            </div>

            <div>
              <Label>Beschreibung</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optionale Beschreibung der Regel"
                rows={2}
              />
            </div>

            <div>
              <Label>Auslöser *</Label>
              <Select value={formData.trigger_type} onValueChange={(v) => setFormData({ ...formData, trigger_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="motion_created">Antrag erstellt</SelectItem>
                  <SelectItem value="motion_updated">Antrag aktualisiert</SelectItem>
                  <SelectItem value="status_changed">Status geändert</SelectItem>
                  <SelectItem value="priority_changed">Priorität geändert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold mb-4">Bedingungen (optional)</h3>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Antragstyp</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {motionTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleConditionValue("motion_type", type)}
                      className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                        formData.conditions.motion_type?.includes(type)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-accent"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs">Priorität</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {priorities.map((priority) => (
                    <button
                      key={priority}
                      type="button"
                      onClick={() => toggleConditionValue("priority", priority)}
                      className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                        formData.conditions.priority?.includes(priority)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-accent"
                      }`}
                    >
                      {priority}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs">Status</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {statuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => toggleConditionValue("status", status)}
                      className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                        formData.conditions.status?.includes(status)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-accent"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs">Ausschuss</Label>
                <Input
                  value={formData.conditions.committee || ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    conditions: { ...formData.conditions, committee: e.target.value }
                  })}
                  placeholder="z.B. Finanzausschuss"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Aktionen</h3>
              <Select onValueChange={addAction}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Aktion hinzufügen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="send_notification">Benachrichtigung senden</SelectItem>
                  <SelectItem value="send_email">E-Mail senden</SelectItem>
                  <SelectItem value="change_status">Status ändern</SelectItem>
                  <SelectItem value="assign_task">Aufgabe erstellen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              {formData.actions.map((action, idx) => (
                <div key={idx} className="p-4 border rounded-lg bg-slate-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium">
                      {action.type === "send_notification" && "Benachrichtigung senden"}
                      {action.type === "send_email" && "E-Mail senden"}
                      {action.type === "change_status" && "Status ändern"}
                      {action.type === "assign_task" && "Aufgabe erstellen"}
                    </h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAction(idx)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>

                  {(action.type === "send_notification" || action.type === "send_email") && (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Empfänger E-Mails (kommagetrennt)</Label>
                        <Input
                          value={action.config.recipient_emails?.join(", ") || ""}
                          onChange={(e) => updateAction(idx, "recipient_emails", e.target.value.split(",").map(s => s.trim()))}
                          placeholder="email1@example.com, email2@example.com"
                        />
                      </div>
                      {action.type === "send_email" && (
                        <>
                          <div>
                            <Label className="text-xs">Betreff</Label>
                            <Input
                              value={action.config.email_subject || ""}
                              onChange={(e) => updateAction(idx, "email_subject", e.target.value)}
                              placeholder="E-Mail Betreff"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Nachricht</Label>
                            <Textarea
                              value={action.config.email_body || ""}
                              onChange={(e) => updateAction(idx, "email_body", e.target.value)}
                              placeholder="E-Mail Inhalt"
                              rows={3}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {action.type === "change_status" && (
                    <div>
                      <Label className="text-xs">Neuer Status</Label>
                      <Select
                        value={action.config.new_status || ""}
                        onValueChange={(v) => updateAction(idx, "new_status", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Status wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map((status) => (
                            <SelectItem key={status} value={status}>{status}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {action.type === "assign_task" && (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Aufgabentitel</Label>
                        <Input
                          value={action.config.task_title || ""}
                          onChange={(e) => updateAction(idx, "task_title", e.target.value)}
                          placeholder="Titel der neuen Aufgabe"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Beschreibung</Label>
                        <Textarea
                          value={action.config.task_description || ""}
                          onChange={(e) => updateAction(idx, "task_description", e.target.value)}
                          placeholder="Beschreibung der Aufgabe"
                          rows={2}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {formData.actions.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Füge Aktionen hinzu, die ausgeführt werden sollen
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Speichert..." : "Speichern"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}