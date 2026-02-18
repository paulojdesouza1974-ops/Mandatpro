import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Landmark, Mail, Phone, Globe, MapPin, ArrowLeft, Pencil, Trash2, Newspaper, Users, UserCircle, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import OrganizationForm from "@/components/organizations/OrganizationForm";

export default function OrganizationDetails() {
  const [formOpen, setFormOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const qc = useQueryClient();
  
  const urlParams = new URLSearchParams(window.location.search);
  const orgId = urlParams.get("id");

  const { data: organization, isLoading } = useQuery({
    queryKey: ["organization", orgId],
    queryFn: async () => {
      const orgs = await base44.entities.Organization.list();
      return orgs.find(o => o.id === orgId);
    },
    enabled: !!orgId,
  });

  const { data: mediaPosts = [] } = useQuery({
    queryKey: ["mediaPosts", organization?.name],
    queryFn: () => base44.entities.MediaPost.filter({ organization: organization.name }, "-created_date"),
    enabled: !!organization?.name,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", organization?.name],
    queryFn: () => base44.entities.Contact.filter({ organization: organization.name }, "-created_date"),
    enabled: !!organization?.name,
  });

  React.useEffect(() => {
    if (!organization?.name) return;
    
    const unsubscribeContacts = base44.entities.Contact.subscribe(() => {
      qc.invalidateQueries({ queryKey: ["contacts", organization.name] });
    });
    
    const unsubscribeUsers = base44.entities.User.subscribe(() => {
      qc.invalidateQueries({ queryKey: ["allUsers"] });
    });
    
    const unsubscribeMedia = base44.entities.MediaPost.subscribe(() => {
      qc.invalidateQueries({ queryKey: ["mediaPosts", organization.name] });
    });
    
    return () => {
      unsubscribeContacts();
      unsubscribeUsers();
      unsubscribeMedia();
    };
  }, [organization?.name, qc]);

  const { data: allUsers = [] } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => base44.entities.User.list(),
  });

  const appUsers = allUsers.filter(u => u.organization === organization?.name);
  const availableUsers = allUsers.filter(u => !u.organization || u.organization !== organization?.name);
  
  // Combine app users and contacts as members
  const members = [
    ...appUsers.map(u => ({ ...u, type: "user", name: u.full_name })),
    ...contacts.map(c => ({ ...c, type: "contact", name: `${c.first_name || ""} ${c.last_name || ""}`.trim() }))
  ];

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Organization.update(orgId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["organization", orgId] });
      qc.invalidateQueries({ queryKey: ["organizations"] });
      setFormOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Organization.delete(orgId),
    onSuccess: () => {
      window.location.href = createPageUrl("Organizations");
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: (userId) => base44.entities.User.update(userId, { organization: organization.name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allUsers"] });
      setAddMemberOpen(false);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3" />
        <div className="h-64 bg-slate-200 rounded" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="text-center py-12">
        <Landmark className="w-12 h-12 mx-auto text-slate-300 mb-3" />
        <p className="text-slate-500">Organisation nicht gefunden</p>
        <Link to={createPageUrl("Organizations")}>
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Zurück zur Übersicht
          </Button>
        </Link>
      </div>
    );
  }

  const statusLabels = {
    entwurf: "Entwurf",
    geplant: "Geplant",
    veroeffentlicht: "Veröffentlicht",
  };

  const platformLabels = {
    facebook: "Facebook",
    instagram: "Instagram",
    twitter: "Twitter",
    linkedin: "LinkedIn",
    webseite: "Webseite",
    zeitung: "Zeitung",
    sonstiges: "Sonstiges",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to={createPageUrl("Organizations")}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{organization.name}</h1>
          {organization.city && (
            <p className="text-sm text-slate-500 mt-1">{organization.city}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setFormOpen(true)}
          >
            <Pencil className="w-4 h-4 mr-2" /> Bearbeiten
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (confirm("Organisation wirklich löschen?")) {
                deleteMutation.mutate();
              }
            }}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organisationsinformationen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            {organization.email && (
              <div className="space-y-1">
                <p className="text-xs text-slate-500 font-medium">E-Mail</p>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <a
                    href={`mailto:${organization.email}`}
                    className="text-sm text-slate-700 hover:underline"
                  >
                    {organization.email}
                  </a>
                </div>
              </div>
            )}

            {organization.phone && (
              <div className="space-y-1">
                <p className="text-xs text-slate-500 font-medium">Telefon</p>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <a
                    href={`tel:${organization.phone}`}
                    className="text-sm text-slate-700 hover:underline"
                  >
                    {organization.phone}
                  </a>
                </div>
              </div>
            )}

            {organization.website && (
              <div className="space-y-1">
                <p className="text-xs text-slate-500 font-medium">Webseite</p>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <a
                    href={organization.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-slate-700 hover:underline"
                  >
                    {organization.website.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              </div>
            )}

            {organization.address && (
              <div className="space-y-1">
                <p className="text-xs text-slate-500 font-medium">Adresse</p>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <p className="text-sm text-slate-700">{organization.address}</p>
                </div>
              </div>
            )}
          </div>

          {organization.description && (
            <div className="space-y-1 pt-2 border-t">
              <p className="text-xs text-slate-500 font-medium">Beschreibung</p>
              <p className="text-sm text-slate-700">{organization.description}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {organization.email && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.location.href = `mailto:${organization.email}`}
              >
                <Mail className="w-4 h-4 mr-2" /> E-Mail senden
              </Button>
            )}
            {organization.phone && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.location.href = `tel:${organization.phone}`}
              >
                <Phone className="w-4 h-4 mr-2" /> Anrufen
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCircle className="w-4 h-4" />
              Mitglieder
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{members.length}</Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddMemberOpen(true)}
              >
                <UserPlus className="w-3 h-3 mr-1" /> Hinzufügen
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">
              Keine Mitglieder vorhanden
            </p>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={`${member.type}-${member.id}`}
                  className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm text-slate-900">
                          {member.name}
                        </h4>
                        {member.type === "user" ? (
                          <Badge variant="outline" className="text-xs">App-Nutzer</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Kontakt</Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{member.email}</p>
                      {member.type === "contact" && member.position && (
                        <p className="text-xs text-slate-400 mt-1">{member.position}</p>
                      )}
                      {member.type === "user" && member.city && (
                        <p className="text-xs text-slate-400 mt-1">{member.city}</p>
                      )}
                    </div>
                    {member.type === "user" && member.role === "admin" && (
                      <Badge variant="outline" className="text-xs flex-shrink-0">Admin</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Newspaper className="w-4 h-4" />
                Medienbeiträge
              </CardTitle>
              <Badge variant="secondary">{mediaPosts.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {mediaPosts.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                Keine Medienbeiträge vorhanden
              </p>
            ) : (
              <div className="space-y-3">
                {mediaPosts.slice(0, 5).map((post) => (
                  <div
                    key={post.id}
                    className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <h4 className="font-medium text-sm text-slate-900">{post.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {platformLabels[post.platform] || post.platform}
                      </Badge>
                    </div>
                    {post.content && (
                      <p className="text-xs text-slate-500 line-clamp-2">{post.content}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        variant={post.status === "veroeffentlicht" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {statusLabels[post.status] || post.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {mediaPosts.length > 5 && (
                  <Link to={createPageUrl("Media")}>
                    <Button variant="ghost" size="sm" className="w-full">
                      Alle anzeigen ({mediaPosts.length})
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Kontakte
              </CardTitle>
              <Badge variant="secondary">{contacts.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                Keine Kontakte vorhanden
              </p>
            ) : (
              <div className="space-y-3">
                {contacts.slice(0, 5).map((contact) => (
                  <div
                    key={contact.id}
                    className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                  >
                    <h4 className="font-medium text-sm text-slate-900">
                      {contact.first_name} {contact.last_name}
                    </h4>
                    {contact.position && (
                      <p className="text-xs text-slate-500 mt-0.5">{contact.position}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
                        >
                          <Mail className="w-3 h-3" />
                        </a>
                      )}
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                {contacts.length > 5 && (
                  <Link to={createPageUrl("Contacts")}>
                    <Button variant="ghost" size="sm" className="w-full">
                      Alle anzeigen ({contacts.length})
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <OrganizationForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        organization={organization}
        onSave={(data) => updateMutation.mutate(data)}
        saving={updateMutation.isPending}
      />

      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mitglied hinzufügen</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {availableUsers.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                Keine verfügbaren Benutzer
              </p>
            ) : (
              availableUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-slate-300"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{user.full_name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => addMemberMutation.mutate(user.id)}
                    disabled={addMemberMutation.isPending}
                  >
                    Hinzufügen
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}