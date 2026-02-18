import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Search, MoreVertical, Pencil, Trash2, Mail, Phone, Users, CheckCircle2, XCircle, CalendarDays, Euro, Tag, Send, Eye } from "lucide-react";
import ContactForm from "@/components/contacts/ContactForm";
import PullToRefresh from "@/components/PullToRefresh";
import GroupManagerDialog from "@/components/members/GroupManagerDialog";
import AssignGroupDialog from "@/components/members/AssignGroupDialog";
import BulkMailDialog from "@/components/members/BulkMailDialog";
import MemberProfileDialog from "@/components/members/MemberProfileDialog";
import { format } from "date-fns";

const categoryLabels = {
  parteimitglied: "Parteimitglied",
  buerger: "Bürger:in",
  fraktionskollege: "Fraktion",
  verwaltung: "Verwaltung",
  presse: "Presse",
  verein: "Verein",
  sonstige: "Sonstige",
};

const categoryColors = {
  parteimitglied: "bg-blue-100 text-blue-700",
  buerger: "bg-slate-100 text-slate-700",
  fraktionskollege: "bg-violet-100 text-violet-700",
  verwaltung: "bg-emerald-100 text-emerald-700",
  presse: "bg-amber-100 text-amber-700",
  verein: "bg-pink-100 text-pink-700",
  sonstige: "bg-gray-100 text-gray-600",
};

const statusColors = {
  aktiv: "bg-green-100 text-green-700",
  inaktiv: "bg-red-100 text-red-700",
  interessent: "bg-yellow-100 text-yellow-700",
};

export default function Contacts() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFeePaid, setFilterFeePaid] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [groupManagerOpen, setGroupManagerOpen] = useState(false);
  const [assignGroupContact, setAssignGroupContact] = useState(null);
  const [bulkMailOpen, setBulkMailOpen] = useState(false);
  const [profileContact, setProfileContact] = useState(null);
  const [filterGroup, setFilterGroup] = useState("all");
  const qc = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const isVerband = currentUser?.org_type === "verband";

  const urlParams = new URLSearchParams(window.location.search);
  const openNew = urlParams.get("new") === "1";

  React.useEffect(() => {
    if (openNew && !formOpen) setFormOpen(true);
  }, [openNew]);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts", currentUser?.organization],
    queryFn: () => base44.entities.Contact.filter({ organization: currentUser.organization }, "-created_date"),
    enabled: !!currentUser?.organization,
  });

  const { data: groups = [] } = useQuery({
    queryKey: ["memberGroups", currentUser?.organization],
    queryFn: () => base44.entities.MemberGroup.filter({ organization: currentUser.organization }),
    enabled: !!currentUser?.organization && isVerband,
  });

  React.useEffect(() => {
    if (!currentUser?.organization) return;
    const unsubscribe = base44.entities.Contact.subscribe(() => {
      qc.invalidateQueries({ queryKey: ["contacts", currentUser.organization] });
    });
    return unsubscribe;
  }, [currentUser?.organization, qc]);

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editing
        ? base44.entities.Contact.update(editing.id, data)
        : base44.entities.Contact.create({ ...data, organization: currentUser.organization }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts", currentUser?.organization] });
      setFormOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Contact.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts", currentUser?.organization] }),
  });

  const filtered = contacts.filter((c) => {
    const term = search.toLowerCase();
    const matchesSearch = !term ||
      (c.first_name || "").toLowerCase().includes(term) ||
      (c.last_name || "").toLowerCase().includes(term) ||
      (c.email || "").toLowerCase().includes(term) ||
      (c.member_number || "").toLowerCase().includes(term) ||
      (c.city || "").toLowerCase().includes(term) ||
      (c.ward || "").toLowerCase().includes(term);
    const matchesStatus = filterStatus === "all" || c.status === filterStatus;
    const matchesFeePaid = !isVerband || filterFeePaid === "all" ||
      (filterFeePaid === "paid" && c.fee_paid) ||
      (filterFeePaid === "unpaid" && !c.fee_paid);
    const matchesGroup = !isVerband || filterGroup === "all" || (() => {
      const group = groups.find(g => g.id === filterGroup);
      return group ? (group.member_ids || []).includes(c.id) : true;
    })();
    return matchesSearch && matchesStatus && matchesFeePaid && matchesGroup;
  });

  const initials = (c) => {
    const f = (c.first_name || "")[0] || "";
    const l = (c.last_name || "")[0] || "";
    return (f + l).toUpperCase() || "?";
  };

  const handleRefresh = async () => {
    await qc.invalidateQueries({ queryKey: ["contacts", currentUser?.organization] });
  };

  // Stats für Verband
  const totalMembers = contacts.length;
  const activeMembers = contacts.filter((c) => c.status === "aktiv").length;
  const feePaidCount = contacts.filter((c) => c.fee_paid).length;
  const totalFeeExpected = contacts.filter((c) => c.membership_fee && c.status === "aktiv")
    .reduce((sum, c) => sum + (c.membership_fee || 0), 0);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6 p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{isVerband ? "Mitglieder" : "Kontakte"}</h1>
            <p className="text-sm text-slate-500 mt-1">{contacts.length} {isVerband ? "Mitglieder" : "Kontakte"} gesamt</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isVerband && (
              <>
                <Button variant="outline" onClick={() => setGroupManagerOpen(true)}>
                  <Users className="w-4 h-4 mr-2" /> Gruppen
                </Button>
                <Button variant="outline" onClick={() => setBulkMailOpen(true)}>
                  <Send className="w-4 h-4 mr-2" /> Massen-E-Mail
                </Button>
              </>
            )}
            <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="bg-slate-900 hover:bg-slate-800">
              <UserPlus className="w-4 h-4 mr-2" /> {isVerband ? "Neues Mitglied" : "Neuer Kontakt"}
            </Button>
          </div>
        </div>

        {/* Stats für Verband */}
        {isVerband && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Gesamt</p>
                    <p className="text-xl font-bold text-slate-900">{totalMembers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Aktiv</p>
                    <p className="text-xl font-bold text-slate-900">{activeMembers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Euro className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Beitrag bezahlt</p>
                    <p className="text-xl font-bold text-slate-900">{feePaidCount} / {activeMembers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center">
                    <Euro className="w-4 h-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Jahresbeiträge (Soll)</p>
                    <p className="text-xl font-bold text-slate-900">{totalFeeExpected.toFixed(0)} €</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filter-Zeile */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder={isVerband ? "Name, Mitglieds-Nr., Stadt suchen..." : "Kontakte suchen..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="aktiv">Aktiv</SelectItem>
              <SelectItem value="inaktiv">Inaktiv</SelectItem>
              <SelectItem value="interessent">Interessent</SelectItem>
            </SelectContent>
          </Select>
          {isVerband && (
            <Select value={filterFeePaid} onValueChange={setFilterFeePaid}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Beitrag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Beiträge</SelectItem>
                <SelectItem value="paid">Beitrag bezahlt</SelectItem>
                <SelectItem value="unpaid">Beitrag ausstehend</SelectItem>
              </SelectContent>
            </Select>
          )}
          {isVerband && groups.length > 0 && (
            <Select value={filterGroup} onValueChange={setFilterGroup}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Gruppe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Gruppen</SelectItem>
                {groups.map(g => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  {isVerband && <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400 w-24">Mitglieds-Nr.</TableHead>}
                  <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400">Name</TableHead>
                  <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400 hidden md:table-cell">Kontakt</TableHead>
                  {isVerband ? (
                    <>
                      <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400 hidden lg:table-cell">Adresse</TableHead>
                      <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400 hidden lg:table-cell">Mitglied seit</TableHead>
                      <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400 hidden xl:table-cell">Jahresbeitrag</TableHead>
                      <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400 hidden xl:table-cell">Beitrag</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400 hidden lg:table-cell">Kategorie</TableHead>
                      <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400 hidden xl:table-cell">Stadtteil</TableHead>
                    </>
                  )}
                  <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400">Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [1, 2, 3, 4].map((i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}><div className="h-10 bg-slate-50 rounded animate-pulse" /></TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-400 text-sm">Keine Einträge gefunden</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      {isVerband && (
                        <TableCell>
                          <span className="text-xs font-mono text-slate-500">{c.member_number || "–"}</span>
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                            {initials(c)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{c.first_name} {c.last_name}</p>
                            {c.position && <p className="text-xs text-slate-400">{c.position}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-col gap-0.5 text-xs text-slate-500">
                          {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                          {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                        </div>
                      </TableCell>
                      {isVerband ? (
                        <>
                          <TableCell className="hidden lg:table-cell text-xs text-slate-500">
                            {[c.street, [c.postal_code, c.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "–"}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs text-slate-500">
                            {c.entry_date ? (
                              <span className="flex items-center gap-1">
                                <CalendarDays className="w-3 h-3" />
                                {format(new Date(c.entry_date), "dd.MM.yyyy")}
                              </span>
                            ) : "–"}
                          </TableCell>
                          <TableCell className="hidden xl:table-cell text-xs text-slate-700 font-medium">
                            {c.membership_fee ? `${Number(c.membership_fee).toFixed(2)} €` : "–"}
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">
                            {c.fee_paid
                              ? <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="w-3.5 h-3.5" /> bezahlt</span>
                              : <span className="flex items-center gap-1 text-xs text-red-500"><XCircle className="w-3.5 h-3.5" /> ausstehend</span>
                            }
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="hidden lg:table-cell">
                            <Badge className={`text-[10px] ${categoryColors[c.category] || categoryColors.sonstige}`}>
                              {categoryLabels[c.category] || c.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden xl:table-cell text-sm text-slate-500">{c.ward || "–"}</TableCell>
                        </>
                      )}
                      <TableCell>
                        <Badge className={`text-[10px] ${statusColors[c.status] || statusColors.aktiv}`}>
                          {c.status || "aktiv"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-8 h-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {isVerband && (
                              <DropdownMenuItem onClick={() => setProfileContact(c)}>
                                <Eye className="w-4 h-4 mr-2" /> Profil anzeigen
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => { setEditing(c); setFormOpen(true); }}>
                              <Pencil className="w-4 h-4 mr-2" /> Bearbeiten
                            </DropdownMenuItem>
                            {isVerband && (
                              <DropdownMenuItem onClick={() => setAssignGroupContact(c)}>
                                <Tag className="w-4 h-4 mr-2" /> Gruppe zuordnen
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => deleteMutation.mutate(c.id)} className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" /> Löschen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        <ContactForm
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          contact={editing}
          onSave={(data) => saveMutation.mutate(data)}
          saving={saveMutation.isPending}
        />
        {isVerband && (
          <>
            <GroupManagerDialog
              open={groupManagerOpen}
              onClose={() => setGroupManagerOpen(false)}
              organization={currentUser?.organization}
              contacts={contacts}
            />
            <AssignGroupDialog
              open={!!assignGroupContact}
              onClose={() => setAssignGroupContact(null)}
              contact={assignGroupContact}
              organization={currentUser?.organization}
            />
            <BulkMailDialog
              open={bulkMailOpen}
              onClose={() => setBulkMailOpen(false)}
              organization={currentUser?.organization}
              contacts={contacts}
            />
            <MemberProfileDialog
              open={!!profileContact}
              onClose={() => setProfileContact(null)}
              contact={profileContact}
              organization={currentUser?.organization}
            />
          </>
        )}
      </div>
    </PullToRefresh>
  );
}