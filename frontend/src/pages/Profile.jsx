import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Save, User as UserIcon, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const mandateTypes = [
  { value: "gemeinderat", label: "Gemeinderat" },
  { value: "stadtrat", label: "Stadtrat" },
  { value: "kreisrat", label: "Kreisrat" },
  { value: "landtag", label: "Landtag" },
  { value: "bundestag", label: "Bundestag" },
  { value: "fraktionsmitarbeiter", label: "Fraktionsmitarbeiter" },
  { value: "parteimitglied", label: "Parteimitglied" },
];

export default function ProfilePage() {
  const [form, setForm] = useState({});
  const qc = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name || "",
        email: user.email || "",
        organization: user.organization || "",
        org_type: user.org_type || "",
        organization_email: user.organization_email || "",
        mandate_type: user.mandate_type || "",
        party: user.party || "",
        city: user.city || "",
        district: user.district || "",
        state: user.state || "",
        position: user.position || "",
        phone: user.phone || "",
        bio: user.bio || "",
      });
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["currentUser"] });
      // Reload the page to update navigation
      window.location.reload();
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      await base44.entities.User.delete(user.id);
      await base44.auth.logout();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mein Profil</h1>
        <p className="text-sm text-slate-500 mt-1">Verwalten Sie Ihre persönlichen und politischen Informationen</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserIcon className="w-5 h-5" />
            Persönliche Informationen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500">Name *</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => update("full_name", e.target.value)}
                  placeholder="Ihr Name"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500">E-Mail *</Label>
                <Input
                  type="email"
                  value={form.email}
                  disabled
                  className="bg-slate-50 text-slate-500"
                />
                <p className="text-xs text-slate-400">E-Mail kann nicht geändert werden</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Telefonnummer</Label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="+49..."
              />
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Politische Informationen</h3>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500">Organisationstyp</Label>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      onClick={() => update("org_type", "fraktion")}
                      className={form.org_type === "fraktion" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-900 hover:bg-slate-200"}
                    >
                      Fraktion
                    </Button>
                    <Button
                      type="button"
                      onClick={() => update("org_type", "verband")}
                      className={form.org_type === "verband" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-900 hover:bg-slate-200"}
                    >
                      Verband
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-500">Organisation</Label>
                    <Input
                      value={form.organization}
                      onChange={(e) => update("organization", e.target.value)}
                      placeholder="z.B. AfD Dormagen, SPD München..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-500">Organisations-E-Mail</Label>
                    <Input
                      type="email"
                      value={form.organization_email}
                      onChange={(e) => update("organization_email", e.target.value)}
                      placeholder="z.B. info@afd-dormagen.de"
                    />
                    <p className="text-xs text-slate-400">Für Newsletter & Medienbeiträge</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-500">Art des Mandats</Label>
                    <Select value={form.mandate_type} onValueChange={(v) => update("mandate_type", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Bitte wählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {mandateTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-500">Partei/Fraktion</Label>
                    <Input
                      value={form.party}
                      onChange={(e) => update("party", e.target.value)}
                      placeholder="z.B. SPD, CDU, Grüne..."
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500">Position/Funktion</Label>
                  <Input
                    value={form.position}
                    onChange={(e) => update("position", e.target.value)}
                    placeholder="z.B. Fraktionsvorsitzende/r, Stadtrat..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-500">Gemeinde/Stadt</Label>
                    <Input
                      value={form.city}
                      onChange={(e) => update("city", e.target.value)}
                      placeholder="z.B. München"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-500">Kreis/Landkreis</Label>
                    <Input
                      value={form.district}
                      onChange={(e) => update("district", e.target.value)}
                      placeholder="z.B. München Land"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-500">Bundesland</Label>
                    <Input
                      value={form.state}
                      onChange={(e) => update("state", e.target.value)}
                      placeholder="z.B. Bayern"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500">Kurzbeschreibung</Label>
                  <Textarea
                    value={form.bio}
                    onChange={(e) => update("bio", e.target.value)}
                    rows={3}
                    placeholder="Kurze Beschreibung Ihrer politischen Arbeit..."
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="bg-slate-900 hover:bg-slate-800"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateMutation.isPending ? "Speichern..." : "Änderungen speichern"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {user?.role === "admin" && (
        <Card className="border-0 shadow-sm bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Administrator-Konto</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sie haben Administrator-Rechte und können alle Funktionen nutzen.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-red-200 dark:border-red-900 shadow-sm bg-red-50/50 dark:bg-red-950/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-red-900 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
            Gefahrenzone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Wenn Sie Ihr Konto löschen, werden alle Ihre Daten unwiderruflich entfernt. Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="select-none">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Konto löschen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sind Sie absolut sicher?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Diese Aktion kann nicht rückgängig gemacht werden. Ihr Konto und alle zugehörigen Daten werden permanent gelöscht.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteAccountMutation.mutate()}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={deleteAccountMutation.isPending}
                  >
                    {deleteAccountMutation.isPending ? "Wird gelöscht..." : "Ja, Konto löschen"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}