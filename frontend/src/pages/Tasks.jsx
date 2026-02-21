import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CheckSquare, Search, MoreVertical, Pencil, Trash2, Calendar, User, Link as LinkIcon, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import TaskForm from "@/components/tasks/TaskForm";
import PullToRefresh from "@/components/PullToRefresh";

const statusLabels = { offen: "Offen", in_bearbeitung: "In Bearbeitung", erledigt: "Erledigt" };
const statusColors = { offen: "bg-amber-100 text-amber-700", in_bearbeitung: "bg-blue-100 text-blue-700", erledigt: "bg-emerald-100 text-emerald-700" };
const priorityLabels = { niedrig: "Niedrig", mittel: "Mittel", hoch: "Hoch" };
const priorityColors = { niedrig: "bg-slate-100 text-slate-600", mittel: "bg-blue-100 text-blue-700", hoch: "bg-red-100 text-red-700" };
const relatedTypeLabels = { kontakt: "Kontakt", termin: "Termin", antrag: "Antrag", kommunikation: "Kommunikation", keine: "–" };

export default function Tasks() {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [statusFilter, setStatusFilter] = useState("alle");
  const qc = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", currentUser?.organization],
    queryFn: () => base44.entities.Task.filter({ organization: currentUser.organization }, "-created_date"),
    enabled: !!currentUser?.organization,
  });

  React.useEffect(() => {
    if (!currentUser?.organization) return;
    
    const unsubscribe = base44.entities.Task.subscribe(() => {
      qc.invalidateQueries({ queryKey: ["tasks", currentUser.organization] });
    });
    
    return unsubscribe;
  }, [currentUser?.organization, qc]);

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editing
        ? base44.entities.Task.update(editing.id, data)
        : base44.entities.Task.create({ ...data, organization: currentUser.organization }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", currentUser?.organization] });
      setFormOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", currentUser?.organization] }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Task.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", currentUser?.organization] }),
  });

  const filtered = tasks.filter((t) => {
    const term = search.toLowerCase();
    const matchSearch = !term || (t.title || "").toLowerCase().includes(term) || (t.description || "").toLowerCase().includes(term);
    const matchStatus = statusFilter === "alle" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const myTasks = filtered.filter(t => t.assigned_to === currentUser?.email);
  const unassignedTasks = filtered.filter(t => !t.assigned_to);
  const otherTasks = filtered.filter(t => t.assigned_to && t.assigned_to !== currentUser?.email);

  const isOverdue = (task) => {
    if (!task.due_date || task.status === "erledigt") return false;
    return new Date(task.due_date) < new Date();
  };

  const handleRefresh = async () => {
    await qc.invalidateQueries({ queryKey: ["tasks", currentUser?.organization] });
  };

  const TaskTable = ({ tasks }) => (
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-50/80">
          <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400">Aufgabe</TableHead>
          <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400">Status</TableHead>
          <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400 hidden md:table-cell">Priorität</TableHead>
          <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400 hidden lg:table-cell">Zugewiesen</TableHead>
          <TableHead className="font-medium text-xs uppercase tracking-wider text-slate-400 hidden lg:table-cell">Fällig</TableHead>
          <TableHead className="w-10"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-8 text-slate-400 text-sm">
              Keine Aufgaben gefunden
            </TableCell>
          </TableRow>
        ) : (
          tasks.map((t) => (
            <TableRow key={t.id} className="hover:bg-slate-50/50 transition-colors">
              <TableCell>
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => {
                      const newStatus = t.status === "erledigt" ? "offen" : "erledigt";
                      updateStatusMutation.mutate({ id: t.id, status: newStatus });
                    }}
                    className="mt-1"
                  >
                    <CheckSquare
                      className={`w-4 h-4 ${
                        t.status === "erledigt" ? "text-emerald-600" : "text-slate-400"
                      }`}
                    />
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium ${t.status === "erledigt" ? "line-through text-slate-400" : "text-slate-900"}`}>
                        {t.title}
                      </p>
                      {isOverdue(t) && (
                        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                      )}
                    </div>
                    {t.description && (
                      <p className="text-xs text-slate-400 truncate max-w-md">{t.description}</p>
                    )}
                    {t.related_type !== "keine" && t.related_type && (
                      <div className="flex items-center gap-1 mt-1">
                        <LinkIcon className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-400">{relatedTypeLabels[t.related_type]}</span>
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={`text-[10px] ${statusColors[t.status] || statusColors.offen}`}>
                  {statusLabels[t.status] || t.status}
                </Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge variant="outline" className={`text-[10px] ${priorityColors[t.priority] || ""}`}>
                  {priorityLabels[t.priority] || t.priority}
                </Badge>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {t.assigned_to ? (
                  <div className="flex items-center gap-1 text-xs text-slate-600">
                    <User className="w-3 h-3" />
                    {t.assigned_to.split('@')[0]}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">–</span>
                )}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {t.due_date ? (
                  <div className={`flex items-center gap-1 text-xs ${isOverdue(t) ? "text-red-600 font-medium" : "text-slate-600"}`}>
                    <Calendar className="w-3 h-3" />
                    {format(new Date(t.due_date), "dd.MM.yyyy", { locale: de })}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">–</span>
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-8 h-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditing(t);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="w-4 h-4 mr-2" /> Bearbeiten
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => deleteMutation.mutate(t.id)}
                      className="text-red-600"
                    >
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
  );

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Aufgaben</h1>
            <p className="text-sm text-slate-500 mt-1">{tasks.length} Aufgaben gesamt</p>
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="bg-slate-900 hover:bg-slate-800"
          >
            <CheckSquare className="w-4 h-4 mr-2" /> Neue Aufgabe
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="text-sm text-slate-500">Meine Aufgaben</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{myTasks.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-slate-500">Nicht zugewiesen</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{unassignedTasks.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-slate-500">Andere</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{otherTasks.length}</div>
          </Card>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Aufgaben suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="alle">Alle</TabsTrigger>
            <TabsTrigger value="offen">Offen</TabsTrigger>
            <TabsTrigger value="in_bearbeitung">In Bearbeitung</TabsTrigger>
            <TabsTrigger value="erledigt">Erledigt</TabsTrigger>
          </TabsList>

          <TabsContent value={statusFilter}>
            <Card className="border-0 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                {isLoading ? (
                  <div className="p-8 text-center text-slate-400">Lädt...</div>
                ) : (
                  <TaskTable tasks={filtered} />
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <TaskForm
          open={formOpen}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          task={editing}
          onSave={(data) => saveMutation.mutate(data)}
          saving={saveMutation.isPending}
        />
      </div>
    </PullToRefresh>
  );
}