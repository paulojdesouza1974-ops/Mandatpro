import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";
import FractionMeetingTemplateForm from "../components/fractionmeetings/FractionMeetingTemplateForm";

export default function FractionMeetingTemplatesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['fractionMeetingTemplates', currentUser?.organization],
    queryFn: () => base44.entities.FractionMeetingTemplate.filter(
      { organization: currentUser?.organization },
      '-updated_date'
    ),
    enabled: !!currentUser?.organization,
  });

  const queryClient = useQueryClient();

  const deleteTemplatesMutation = useMutation({
    mutationFn: (templateId) => base44.entities.FractionMeetingTemplate.delete(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fractionMeetingTemplates', currentUser?.organization] });
    },
  });

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  const handleDelete = (templateId) => {
    if (window.confirm('Vorlage wirklich löschen?')) {
      deleteTemplatesMutation.mutate(templateId);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingTemplate(null);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Einladungsvorlagen</h1>
            <p className="text-muted-foreground">Verwalte Vorlagen für Fraktionssitzungs-Einladungen</p>
          </div>
          <Button
            onClick={() => {
              setEditingTemplate(null);
              setShowForm(true);
            }}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Neue Vorlage
          </Button>
        </div>

        {showForm && (
          <div className="mb-8">
            <FractionMeetingTemplateForm
              template={editingTemplate}
              onClose={handleCloseForm}
              organization={currentUser?.organization}
            />
          </div>
        )}

        <div className="grid gap-4">
          {templates.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground mb-4">Keine Vorlagen vorhanden</p>
                <Button
                  onClick={() => {
                    setEditingTemplate(null);
                    setShowForm(true);
                  }}
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Erste Vorlage erstellen
                </Button>
              </CardContent>
            </Card>
          ) : (
            templates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{template.name}</h3>
                        {template.is_default && (
                          <Badge className="bg-green-100 text-green-800">Standard</Badge>
                        )}
                      </div>
                      {template.fraction_name && (
                        <p className="text-sm text-muted-foreground mb-1">{template.fraction_name}</p>
                      )}
                      {template.logo_url && (
                        <div className="mt-3 mb-3">
                          <img src={template.logo_url} alt="Logo" className="h-12 object-contain" />
                        </div>
                      )}
                      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                        {template.primary_color && (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded border"
                              style={{ backgroundColor: template.primary_color }}
                            />
                            <span>Primärfarbe: {template.primary_color}</span>
                          </div>
                        )}
                        {template.font_family && (
                          <p>Schriftart: {template.font_family}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(template)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(template.id)}
                        disabled={deleteTemplatesMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}