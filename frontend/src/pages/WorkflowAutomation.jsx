import React, { useState } from "react";
import { base44 } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Power, PowerOff, Zap, AlertCircle } from "lucide-react";
import WorkflowRuleForm from "@/components/workflow/WorkflowRuleForm";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const triggerTypeLabels = {
  motion_created: "Antrag erstellt",
  motion_updated: "Antrag aktualisiert",
  status_changed: "Status geändert",
  priority_changed: "Priorität geändert"
};

const actionTypeLabels = {
  send_notification: "Benachrichtigung senden",
  change_status: "Status ändern",
  assign_task: "Aufgabe erstellen",
  send_email: "E-Mail senden"
};

export default function WorkflowAutomation() {
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [deleteRuleId, setDeleteRuleId] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["workflowRules", user?.organization],
    queryFn: () => base44.entities.WorkflowRule.filter({ organization: user?.organization }),
    enabled: !!user?.organization,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WorkflowRule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflowRules"] });
      setDeleteRuleId(null);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.WorkflowRule.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflowRules"] });
    },
  });

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingRule(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Lade Workflow-Regeln...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflow-Automation</h1>
          <p className="text-muted-foreground mt-1">
            Automatisiere Prozesse mit intelligenten Regeln
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Neue Regel
        </Button>
      </div>

      {rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Zap className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Keine Workflow-Regeln</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Erstelle deine erste Regel, um Prozesse zu automatisieren
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Erste Regel erstellen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rules.map((rule) => (
            <Card key={rule.id} className={!rule.is_active ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{rule.name}</CardTitle>
                      {rule.is_active ? (
                        <Badge className="bg-green-100 text-green-800">Aktiv</Badge>
                      ) : (
                        <Badge variant="secondary">Inaktiv</Badge>
                      )}
                    </div>
                    {rule.description && (
                      <CardDescription>{rule.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleActiveMutation.mutate({ id: rule.id, is_active: !rule.is_active })}
                    >
                      {rule.is_active ? (
                        <Power className="w-4 h-4 text-green-600" />
                      ) : (
                        <PowerOff className="w-4 h-4 text-gray-400" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(rule)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteRuleId(rule.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Auslöser</h4>
                    <Badge variant="outline">
                      {triggerTypeLabels[rule.trigger_type] || rule.trigger_type}
                    </Badge>
                  </div>

                  {rule.conditions && Object.keys(rule.conditions).length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Bedingungen</h4>
                      <div className="flex flex-wrap gap-2">
                        {rule.conditions.motion_type && rule.conditions.motion_type.length > 0 && (
                          <Badge variant="outline" className="bg-blue-50">
                            Typ: {rule.conditions.motion_type.join(", ")}
                          </Badge>
                        )}
                        {rule.conditions.priority && rule.conditions.priority.length > 0 && (
                          <Badge variant="outline" className="bg-orange-50">
                            Priorität: {rule.conditions.priority.join(", ")}
                          </Badge>
                        )}
                        {rule.conditions.status && rule.conditions.status.length > 0 && (
                          <Badge variant="outline" className="bg-green-50">
                            Status: {rule.conditions.status.join(", ")}
                          </Badge>
                        )}
                        {rule.conditions.committee && (
                          <Badge variant="outline" className="bg-purple-50">
                            Ausschuss: {rule.conditions.committee}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {rule.actions && rule.actions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Aktionen</h4>
                      <div className="space-y-2">
                        {rule.actions.map((action, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm bg-slate-50 p-3 rounded-lg">
                            <Zap className="w-4 h-4 mt-0.5 text-yellow-600" />
                            <div className="flex-1">
                              <div className="font-medium">
                                {actionTypeLabels[action.type] || action.type}
                              </div>
                              {action.config && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {action.config.recipient_emails && (
                                    <div>An: {action.config.recipient_emails.join(", ")}</div>
                                  )}
                                  {action.config.new_status && (
                                    <div>Neuer Status: {action.config.new_status}</div>
                                  )}
                                  {action.config.task_title && (
                                    <div>Aufgabe: {action.config.task_title}</div>
                                  )}
                                  {action.config.email_subject && (
                                    <div>Betreff: {action.config.email_subject}</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {rule.execution_count > 0 && (
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      Ausgeführt: {rule.execution_count} Mal
                      {rule.last_executed && ` • Zuletzt: ${new Date(rule.last_executed).toLocaleString()}`}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <WorkflowRuleForm
          isOpen={showForm}
          onClose={handleClose}
          rule={editingRule}
          organization={user?.organization}
        />
      )}

      <AlertDialog open={!!deleteRuleId} onOpenChange={() => setDeleteRuleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regel löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Die automatische Workflow-Regel wird dauerhaft gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteRuleId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}