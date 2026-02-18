import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";

export default function AppSettingsPage() {
  const queryClient = useQueryClient();

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  const currentSettings = settings[0] || {
    app_owner_name: "",
    app_owner_position: "",
    app_owner_email: "",
    app_owner_address: "",
    sender_email: "",
    sender_name: "",
  };

  const [formData, setFormData] = useState(currentSettings);

  React.useEffect(() => {
    if (settings[0]) {
      setFormData(settings[0]);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (currentSettings.id) {
        return base44.entities.AppSettings.update(currentSettings.id, data);
      }
      return base44.entities.AppSettings.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
    },
  });

  const update = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">App-Einstellungen</h1>
        <p className="text-slate-500 mt-1">
          Konfiguration für Impressum und Copyright
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>App-Inhaber / Betreiber</CardTitle>
          <CardDescription>
            Diese Daten werden im Impressum und Copyright angezeigt und gelten für alle Organisationen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Name des App-Inhabers *</Label>
              <Input
                value={formData.app_owner_name}
                onChange={(e) => update("app_owner_name", e.target.value)}
                placeholder="Max Mustermann"
              />
            </div>
            <div>
              <Label>Position/Funktion</Label>
              <Input
                value={formData.app_owner_position}
                onChange={(e) => update("app_owner_position", e.target.value)}
                placeholder="z.B. Geschäftsführer"
              />
            </div>
          </div>

          <div>
            <Label>E-Mail-Adresse</Label>
            <Input
              type="email"
              value={formData.app_owner_email}
              onChange={(e) => update("app_owner_email", e.target.value)}
              placeholder="kontakt@beispiel.de"
            />
          </div>

          <div>
            <Label>Adresse</Label>
            <Textarea
              value={formData.app_owner_address}
              onChange={(e) => update("app_owner_address", e.target.value)}
              placeholder="Straße, PLZ Ort"
              rows={3}
            />
          </div>

          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold mb-4">E-Mail-Konfiguration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Absender-E-Mail</Label>
                <Input
                  type="email"
                  value={formData.sender_email}
                  onChange={(e) => update("sender_email", e.target.value)}
                  placeholder="z.B. info@beispiel.de"
                />
              </div>
              <div>
                <Label>Absender-Name</Label>
                <Input
                  type="text"
                  value={formData.sender_name}
                  onChange={(e) => update("sender_name", e.target.value)}
                  placeholder="z.B. KommunalCRM Team"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={() => saveMutation.mutate(formData)}
              disabled={saveMutation.isPending || !formData.app_owner_name}
            >
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Wird gespeichert..." : "Speichern"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}