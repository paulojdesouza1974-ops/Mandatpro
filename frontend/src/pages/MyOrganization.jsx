import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import SupportRequestDialog from "@/components/support/SupportRequestDialog";
import {
  Landmark,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Users,
  Calendar,
  Pencil,
  Save,
  X,
  CreditCard,
  FileText,
} from "lucide-react";

const ORG_ROLES = [
  { value: "fraktionsvorsitzender", label: "Fraktionsvorsitzender" },
  { value: "stv_fraktionsvorsitzender", label: "1. stv. Fraktionsvorsitzender" },
  { value: "fraktionsgeschaeftsfuehrer", label: "Fraktionsgeschäftsführer" },
  { value: "ratsmitglied", label: "Ratsmitglied" },
  { value: "sachkundiger_buerger", label: "Sachkundiger Bürger" },
  { value: "mitglied", label: "Mitglied" },
];

export default function MyOrganization() {
  const qc = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const [smtpTestEmail, setSmtpTestEmail] = useState("");
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [formData, setFormData] = useState({});

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: organization, isLoading } = useQuery({
    queryKey: ["myOrganization", currentUser?.organization],
    queryFn: async () => {
      const orgs = await base44.entities.Organization.filter({ name: currentUser.organization });
      return orgs[0] || null;
    },
    enabled: !!currentUser?.organization,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["orgContacts", currentUser?.organization],
    queryFn: () => base44.entities.Contact.filter({ organization: currentUser.organization }),
    enabled: !!currentUser?.organization,
  });

  // Fetch organization members using the new dedicated endpoint
  const { data: orgMembers = [] } = useQuery({
    queryKey: ["orgMembers", currentUser?.organization],
    queryFn: () => base44.organizations.getMembers(currentUser.organization),
    enabled: !!currentUser?.organization,
  });

  useEffect(() => {
    if (organization) {
      setFormData({
        display_name: organization.display_name || "",
        address: organization.address || "",
        city: organization.city || "",
        state: organization.state || "",
        postal_code: organization.postal_code || "",
        phone: organization.phone || "",
        email: organization.email || "",
        website: organization.website || "",
        bank_name: organization.bank_name || "",
        iban: organization.iban || "",
        bic: organization.bic || "",
        tax_number: organization.tax_number || "",
        description: organization.description || "",
        smtp_host: organization.smtp_host || "",
        smtp_port: organization.smtp_port || "",
        smtp_username: organization.smtp_username || "",
        smtp_password: organization.smtp_password || "",
        smtp_from_email: organization.smtp_from_email || "",
        smtp_from_name: organization.smtp_from_name || "",
      });
    }
  }, [organization]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Organization.update(organization.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myOrganization"] });
      setIsEditing(false);
      toast({ title: "Organisation gespeichert" });
    },
    onError: (error) => {
      toast({ title: "Fehler beim Speichern", description: error.message, variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Organization.create({
      ...data,
      name: currentUser.organization,
      type: currentUser.org_type,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myOrganization"] });
      setIsEditing(false);
      toast({ title: "Organisation erstellt" });
    },
    onError: (error) => {
      toast({ title: "Fehler beim Erstellen", description: error.message, variant: "destructive" });
    },
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: ({ userId, org_role }) => base44.users.updateRole(userId, org_role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orgMembers", currentUser?.organization] });
      toast({ title: "Mitgliederrolle aktualisiert" });
    },
    onError: (error) => {
      toast({ title: "Fehler beim Aktualisieren", description: error.message, variant: "destructive" });
    },
  });


  const handleSave = () => {
    const emailDomain = formData.email && formData.email.includes("@") ? formData.email.split("@")[1].toLowerCase() : "";
    const payload = { ...formData, email_domain: emailDomain };
    if (organization) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (organization) {
      setFormData({
        display_name: organization.display_name || "",
        address: organization.address || "",
        city: organization.city || "",
        state: organization.state || "",
        postal_code: organization.postal_code || "",
        phone: organization.phone || "",
        email: organization.email || "",
        website: organization.website || "",
        bank_name: organization.bank_name || "",
        iban: organization.iban || "",
        bic: organization.bic || "",
        tax_number: organization.tax_number || "",
        description: organization.description || "",
        smtp_host: organization.smtp_host || "",
        smtp_port: organization.smtp_port || "",
        smtp_username: organization.smtp_username || "",
        smtp_password: organization.smtp_password || "",
        smtp_from_email: organization.smtp_from_email || "",
        smtp_from_name: organization.smtp_from_name || "",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <Card className="animate-pulse">
          <CardContent className="h-96" />
        </Card>
      </div>
    );
  }

  const orgType = currentUser?.org_type === "fraktion" ? "Fraktion" : "Verband";
  const isAdmin = currentUser?.role === "admin";
  const getOrgRoleLabel = (value) => ORG_ROLES.find((role) => role.value === value)?.label || "Mitglied";

  return (
    <div className="space-y-6" data-testid="my-organization">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meine Organisation</h1>
          <p className="text-slate-500 text-sm">Organisationsdaten verwalten und bearbeiten</p>
        </div>
        {!isEditing ? (
          isAdmin ? (
            <Button onClick={() => setIsEditing(true)} data-testid="edit-org-btn">
              <Pencil className="w-4 h-4 mr-2" />
              Bearbeiten
            </Button>
          ) : (
            <Badge variant="secondary" data-testid="org-readonly-badge">Nur Admins können bearbeiten</Badge>
          )
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              <X className="w-4 h-4 mr-2" />
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending || createMutation.isPending} data-testid="save-org-btn">
              <Save className="w-4 h-4 mr-2" />
              Speichern
            </Button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Landmark className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Typ</p>
                <p className="font-semibold text-slate-900">{orgType}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Kontakte</p>
                <p className="font-semibold text-slate-900">{contacts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Erstellt</p>
                <p className="font-semibold text-slate-900">
                  {organization?.created_date 
                    ? new Date(organization.created_date).toLocaleDateString("de-DE")
                    : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  Aktiv
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-600" />
              Grunddaten
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Organisationsname</Label>
              {isEditing ? (
                <Input
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="z.B. SPD Fraktion Musterstadt"
                  data-testid="org-display-name"
                />
              ) : (
                <p className="text-slate-900 font-medium mt-1">
                  {organization?.display_name || currentUser?.organization || "-"}
                </p>
              )}
            </div>

            <div>
              <Label>Beschreibung</Label>
              {isEditing ? (
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Kurze Beschreibung der Organisation..."
                  rows={3}
                />
              ) : (
                <p className="text-slate-600 text-sm mt-1">
                  {organization?.description || "Keine Beschreibung"}
                </p>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Stadt</Label>
                {isEditing ? (
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Stadt"
                  />
                ) : (
                  <p className="text-slate-900 mt-1">{organization?.city || "-"}</p>
                )}
              </div>
              <div>
                <Label>Bundesland</Label>
                {isEditing ? (
                  <Input
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="Bundesland"
                  />
                ) : (
                  <p className="text-slate-900 mt-1">{organization?.state || "-"}</p>
                )}
              </div>
            </div>

            <div>
              <Label>Adresse</Label>
              {isEditing ? (
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Straße und Hausnummer"
                />
              ) : (
                <p className="text-slate-900 mt-1">{organization?.address || "-"}</p>
              )}
            </div>

            <div>
              <Label>PLZ</Label>
              {isEditing ? (
                <Input
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  placeholder="12345"
                  className="w-32"
                />
              ) : (
                <p className="text-slate-900 mt-1">{organization?.postal_code || "-"}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="w-5 h-5 text-slate-600" />
              Kontaktdaten
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Telefon</Label>
              {isEditing ? (
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0123 / 456789"
                />
              ) : (
                <p className="text-slate-900 mt-1 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  {organization?.phone || "-"}
                </p>
              )}
            </div>

            <div>
              <Label>E-Mail</Label>
              {isEditing ? (
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="kontakt@organisation.de"
                />
              ) : (
                <p className="text-slate-900 mt-1 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  {organization?.email || "-"}
                </p>
              )}
            </div>

            <div>
              <Label>Website</Label>
              {isEditing ? (
                <Input
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="www.organisation.de"
                />
              ) : (
                <p className="text-slate-900 mt-1 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-slate-400" />
                  {organization?.website ? (
                    <a href={`https://${organization.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {organization.website}
                    </a>
                  ) : "-"}
                </p>
              )}
            </div>

            <Separator />

            <CardTitle className="text-base flex items-center gap-2 pt-2">
              <CreditCard className="w-5 h-5 text-slate-600" />
              Bankverbindung
            </CardTitle>

            <div>
              <Label>Bank</Label>
              {isEditing ? (
                <Input
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  placeholder="Sparkasse Musterstadt"
                />
              ) : (
                <p className="text-slate-900 mt-1">{organization?.bank_name || "-"}</p>
              )}
            </div>

            <div>
              <Label>IBAN</Label>
              {isEditing ? (
                <Input
                  value={formData.iban}
                  onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                  placeholder="DE89 3704 0044 0532 0130 00"
                />
              ) : (
                <p className="text-slate-900 mt-1 font-mono text-sm">{organization?.iban || "-"}</p>
              )}
            </div>

            <div>
              <Label>BIC</Label>
              {isEditing ? (
                <Input
                  value={formData.bic}
                  onChange={(e) => setFormData({ ...formData, bic: e.target.value })}
                  placeholder="COBADEFFXXX"
                  className="w-40"
                />
              ) : (
                <p className="text-slate-900 mt-1 font-mono text-sm">{organization?.bic || "-"}</p>
              )}
            </div>

            <div>
              <Label>Steuernummer</Label>
              {isEditing ? (
                <Input
                  value={formData.tax_number}
                  onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                  placeholder="123/456/78901"
                />
              ) : (
                <p className="text-slate-900 mt-1">{organization?.tax_number || "-"}</p>
              )}
            </div>

            <Separator />

            <CardTitle className="text-base flex items-center gap-2 pt-2">
              <Mail className="w-5 h-5 text-slate-600" />
              SMTP Versand
            </CardTitle>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>SMTP Host</Label>
                {isEditing && isAdmin ? (
                  <Input
                    value={formData.smtp_host}
                    onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                    placeholder="smtp.example.com"
                    data-testid="smtp-host-input"
                  />
                ) : (
                  <p className="text-slate-900 mt-1">{organization?.smtp_host || "-"}</p>
                )}
              </div>
              <div>
                <Label>SMTP Port</Label>
                {isEditing && isAdmin ? (
                  <Input
                    value={formData.smtp_port}
                    onChange={(e) => setFormData({ ...formData, smtp_port: e.target.value })}
                    placeholder="587"
                    data-testid="smtp-port-input"
                  />
                ) : (
                  <p className="text-slate-900 mt-1">{organization?.smtp_port || "-"}</p>
                )}
              </div>
            </div>

            <div>
              <Label>SMTP Benutzername</Label>
              {isEditing && isAdmin ? (
                <Input
                  value={formData.smtp_username}
                  onChange={(e) => setFormData({ ...formData, smtp_username: e.target.value })}
                  placeholder="user@example.com"
                  data-testid="smtp-username-input"
                />
              ) : (
                <p className="text-slate-900 mt-1">{organization?.smtp_username || "-"}</p>
              )}
            </div>

            <div>
              <Label>SMTP Passwort</Label>
              {isEditing && isAdmin ? (
                <Input
                  type="password"
                  value={formData.smtp_password}
                  onChange={(e) => setFormData({ ...formData, smtp_password: e.target.value })}
                  placeholder="••••••••"
                  data-testid="smtp-password-input"
                />
              ) : (
                <p className="text-slate-900 mt-1">{organization?.smtp_password ? "••••••••" : "-"}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Absender E-Mail</Label>
                {isEditing && isAdmin ? (
                  <Input
                    type="email"
                    value={formData.smtp_from_email}
                    onChange={(e) => setFormData({ ...formData, smtp_from_email: e.target.value })}
                    placeholder="noreply@organisation.de"
                    data-testid="smtp-from-email-input"
                  />
                ) : (
                  <p className="text-slate-900 mt-1">{organization?.smtp_from_email || "-"}</p>
                )}
              </div>
              <div>
                <Label>Absender Name</Label>
                {isEditing && isAdmin ? (
                  <Input
                    value={formData.smtp_from_name}
                    onChange={(e) => setFormData({ ...formData, smtp_from_name: e.target.value })}
                    placeholder="KommunalCRM"
                    data-testid="smtp-from-name-input"
                  />
                ) : (
                  <p className="text-slate-900 mt-1">{organization?.smtp_from_name || "-"}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {organization && (
        <Card data-testid="org-members-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-600" /> Mitglieder
            </CardTitle>
            <CardDescription>Mitglieder der Organisation und ihre Rollen.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {orgMembers.length === 0 ? (
              <p className="text-sm text-slate-500" data-testid="org-members-empty">Keine Mitglieder vorhanden.</p>
            ) : (
              orgMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between border border-slate-100 rounded-lg p-3" data-testid={`org-member-${member.id}`}>
                  <div>
                    <p className="font-medium text-slate-900">{member.full_name || member.email}</p>
                    <p className="text-xs text-slate-500">{member.email}</p>
                  </div>
                  {isAdmin ? (
                    <Select
                      value={member.org_role || "mitglied"}
                      onValueChange={(value) => updateMemberRoleMutation.mutate({ userId: member.id, org_role: value })}
                    >
                      <SelectTrigger className="w-56" data-testid={`org-member-role-trigger-${member.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORG_ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary" data-testid={`org-member-role-badge-${member.id}`}>{getOrgRoleLabel(member.org_role)}</Badge>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {organization && isAdmin && (
        <Card data-testid="support-request-card">
          <CardHeader>
            <CardTitle className="text-lg">Support</CardTitle>
            <CardDescription>Support-Team kontaktieren und Anliegen dokumentieren.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setSupportDialogOpen(true)} data-testid="support-request-open-button">
              Support-Anfrage senden
            </Button>
          </CardContent>
        </Card>
      )}

      <SupportRequestDialog
        open={supportDialogOpen}
        onOpenChange={setSupportDialogOpen}
        organization={organization?.display_name || currentUser?.organization}
        contactEmail={currentUser?.email}
        onSuccess={() => toast({ title: "Support-Anfrage gesendet" })}
      />

      {/* No Organization Message */}
      {!organization && !isEditing && (
        <Card className="border-dashed border-2 border-slate-200 bg-slate-50">
          <CardContent className="py-12 text-center">
            <Landmark className="w-12 h-12 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Organisation einrichten</h3>
            <p className="text-slate-500 mb-4 max-w-md mx-auto">
              Vervollständigen Sie die Daten Ihrer Organisation, um alle Funktionen nutzen zu können.
            </p>
            <Button onClick={() => setIsEditing(true)}>
              <Pencil className="w-4 h-4 mr-2" />
              Jetzt einrichten
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
