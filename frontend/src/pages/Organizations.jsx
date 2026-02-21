import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Landmark, Search, Plus, MoreVertical, Pencil, Trash2, Mail, Phone, Globe, MapPin } from "lucide-react";
import { createPageUrl } from "@/utils";
import OrganizationForm from "@/components/organizations/OrganizationForm";

export default function Organizations() {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ["organizations", currentUser?.organization],
    queryFn: () => base44.entities.Organization.filter({ name: currentUser.organization }),
    enabled: !!currentUser?.organization,
  });

  React.useEffect(() => {
    if (!currentUser?.organization) return;
    
    const unsubscribe = base44.entities.Organization.subscribe(() => {
      qc.invalidateQueries({ queryKey: ["organizations", currentUser.organization] });
    });
    
    return unsubscribe;
  }, [currentUser?.organization, qc]);

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editing
        ? base44.entities.Organization.update(editing.id, data)
        : base44.entities.Organization.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["organizations", currentUser?.organization] });
      setFormOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Organization.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["organizations", currentUser?.organization] }),
  });

  const filtered = organizations.filter((org) => {
    const term = search.toLowerCase();
    return (
      !term ||
      (org.name || "").toLowerCase().includes(term) ||
      (org.city || "").toLowerCase().includes(term) ||
      (org.email || "").toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meine Organisation</h1>
          <p className="text-sm text-slate-500 mt-1">Organisationsdaten verwalten</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-40 animate-pulse bg-slate-50 border-0" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Landmark className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-400 text-sm">Keine Organisationen gefunden</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((org) => (
            <Card key={org.id} className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = createPageUrl("OrganizationDetails") + "?id=" + org.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Landmark className="w-5 h-5 text-slate-600" />
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(org);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4 mr-2" /> Bearbeiten
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(org.id);
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Löschen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <h3 className="font-semibold text-base text-slate-900 mb-1">{org.name}</h3>

                {org.city && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                    <MapPin className="w-3 h-3" />
                    {org.city}
                  </div>
                )}

                <div className="space-y-1.5 mt-3">
                  {org.email && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <a href={`mailto:${org.email}`} className="hover:underline truncate">
                        {org.email}
                      </a>
                    </div>
                  )}

                  {org.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <a href={`tel:${org.phone}`} className="hover:underline">
                        {org.phone}
                      </a>
                    </div>
                  )}

                  {org.website && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Globe className="w-3 h-3 text-slate-400" />
                      <a
                        href={org.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline truncate"
                      >
                        {org.website.replace(/^https?:\/\//, "")}
                      </a>
                    </div>
                  )}
                </div>

                {org.description && (
                  <p className="text-xs text-slate-500 mt-3 line-clamp-2">{org.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <OrganizationForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        organization={editing}
        onSave={(data) => saveMutation.mutate(data)}
        saving={saveMutation.isPending}
      />
    </div>
  );
}