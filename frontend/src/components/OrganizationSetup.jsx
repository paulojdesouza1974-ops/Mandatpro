import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export default function OrganizationSetup() {
  const [organization, setOrganization] = useState("");
  const [orgType, setOrgType] = useState("fraktion");
  const [selectedExisting, setSelectedExisting] = useState(null);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: allOrganizations = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => base44.entities.Organization.list(),
    enabled: !!currentUser,
  });

  // E-Mail-Domain extrahieren und passende Organisationen finden
  const suggestedOrgs = React.useMemo(() => {
    if (!currentUser?.email || !allOrganizations.length) return [];
    
    const domain = currentUser.email.split('@')[1];
    if (!domain) return [];

    // Finde Organisationen mit gleicher Domain
    return allOrganizations
      .filter(org => org.email?.split('@')[1] === domain)
      .map(org => org.name);
  }, [currentUser, allOrganizations]);

  // Wenn genau eine passende Organisation gefunden wurde, diese vorauswählen
  React.useEffect(() => {
    if (suggestedOrgs.length === 1 && !selectedExisting) {
      setSelectedExisting(suggestedOrgs[0]);
      setOrganization(suggestedOrgs[0]);
    }
  }, [suggestedOrgs]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalOrgName = selectedExisting || organization.trim();
    if (finalOrgName) {
      updateMutation.mutate({ organization: finalOrgName, org_type: orgType });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-slate-900 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Willkommen bei KommunalCRM
          </h1>
          <p className="text-slate-600">
            {suggestedOrgs.length > 0 
              ? `${suggestedOrgs.length} ${suggestedOrgs.length === 1 ? 'Organisation' : 'Organisationen'} mit Ihrer Domain gefunden`
              : "Bitte geben Sie Ihre Organisation ein, um fortzufahren"}
          </p>
        </div>

        {suggestedOrgs.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-blue-900">
              <Users className="w-4 h-4" />
              <p className="text-sm font-medium">
                Vorhandene Organisationen ({currentUser?.email?.split('@')[1]}):
              </p>
            </div>
            <div className="space-y-2">
              {suggestedOrgs.map((org) => (
                <button
                  key={org}
                  type="button"
                  onClick={() => {
                    setSelectedExisting(org);
                    setOrganization(org);
                  }}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    selectedExisting === org
                      ? "border-blue-500 bg-blue-100"
                      : "border-blue-200 bg-white hover:border-blue-400"
                  }`}
                >
                  <p className="text-sm font-medium text-slate-900">{org}</p>
                  <p className="text-xs text-blue-600 mt-1">
                    {selectedExisting === org ? "✓ Ausgewählt" : "Klicken zum Beitreten"}
                  </p>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedExisting(null);
                setOrganization("");
              }}
              className="text-sm text-blue-600 hover:underline"
            >
              Oder neue Organisation erstellen
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Organisationstyp</Label>
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => setOrgType("fraktion")}
                className={`flex-1 py-2 px-3 rounded-lg border-2 font-medium transition-colors ${
                  orgType === "fraktion"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 text-slate-600 hover:border-slate-400"
                }`}
              >
                Fraktion
              </button>
              <button
                type="button"
                onClick={() => setOrgType("verband")}
                className={`flex-1 py-2 px-3 rounded-lg border-2 font-medium transition-colors ${
                  orgType === "verband"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 text-slate-600 hover:border-slate-400"
                }`}
              >
                Verband
              </button>
            </div>
          </div>

          {!selectedExisting && (
            <div>
              <Label htmlFor="organization">
                {orgType === "fraktion" ? "Fraktion / Partei" : "Verband / Verein"}
              </Label>
              <Input
                id="organization"
                placeholder={orgType === "fraktion" ? "z.B. SPD Musterstadt, CDU Fraktion" : "z.B. Sportverein XY, Bürgerinitiative"}
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                required
                autoFocus
              />
              <p className="text-xs text-slate-500 mt-2">
                Ihre Daten werden nur innerhalb Ihrer Organisation sichtbar sein.
              </p>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending 
              ? "Wird gespeichert..." 
              : selectedExisting 
                ? "Organisation beitreten" 
                : "Fortfahren"}
          </Button>
        </form>
      </Card>
    </div>
  );
}