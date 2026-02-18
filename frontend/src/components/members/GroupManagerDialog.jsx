import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, PlusCircle, Users, Pencil, Check, X } from "lucide-react";

const GROUP_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

export default function GroupManagerDialog({ open, onClose, organization, contacts = [] }) {
  const qc = useQueryClient();
  const [editingGroup, setEditingGroup] = useState(null);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState(GROUP_COLORS[0]);
  const [creating, setCreating] = useState(false);

  const { data: groups = [] } = useQuery({
    queryKey: ["memberGroups", organization],
    queryFn: () => base44.entities.MemberGroup.filter({ organization }),
    enabled: !!organization,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MemberGroup.create({ ...data, organization, member_ids: [] }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["memberGroups", organization] }); setCreating(false); setNewName(""); setNewDesc(""); setNewColor(GROUP_COLORS[0]); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MemberGroup.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["memberGroups", organization] }); setEditingGroup(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MemberGroup.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["memberGroups", organization] }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Mitgliedergruppen verwalten</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {groups.map((g) => {
            const memberCount = (g.member_ids || []).filter(id => contacts.find(c => c.id === id)).length;
            const isEditing = editingGroup?.id === g.id;
            return (
              <div key={g.id} className="border border-slate-200 rounded-lg p-3">
                {isEditing ? (
                  <div className="space-y-2">
                    <Input value={editingGroup.name} onChange={e => setEditingGroup(prev => ({ ...prev, name: e.target.value }))} placeholder="Gruppenname" />
                    <Input value={editingGroup.description || ""} onChange={e => setEditingGroup(prev => ({ ...prev, description: e.target.value }))} placeholder="Beschreibung (optional)" />
                    <div className="flex gap-1 flex-wrap">
                      {GROUP_COLORS.map(c => (
                        <button key={c} onClick={() => setEditingGroup(prev => ({ ...prev, color: c }))}
                          className={`w-6 h-6 rounded-full border-2 transition-all ${editingGroup.color === c ? "border-slate-700 scale-110" : "border-transparent"}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => setEditingGroup(null)}><X className="w-3 h-3 mr-1" />Abbrechen</Button>
                      <Button size="sm" onClick={() => updateMutation.mutate({ id: g.id, data: { name: editingGroup.name, description: editingGroup.description, color: editingGroup.color } })}>
                        <Check className="w-3 h-3 mr-1" />Speichern
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color || "#6366f1" }} />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{g.name}</p>
                        {g.description && <p className="text-xs text-slate-400">{g.description}</p>}
                        <p className="text-xs text-slate-400 mt-0.5"><Users className="w-3 h-3 inline mr-1" />{memberCount} Mitglieder</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setEditingGroup(g)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-red-500" onClick={() => deleteMutation.mutate(g.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {creating ? (
            <div className="border border-indigo-200 rounded-lg p-3 bg-indigo-50 space-y-2">
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Gruppenname *" autoFocus />
              <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Beschreibung (optional)" />
              <div className="flex gap-1 flex-wrap">
                {GROUP_COLORS.map(c => (
                  <button key={c} onClick={() => setNewColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${newColor === c ? "border-slate-700 scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setCreating(false)}>Abbrechen</Button>
                <Button size="sm" onClick={() => createMutation.mutate({ name: newName, description: newDesc, color: newColor })} disabled={!newName.trim()}>
                  Anlegen
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="w-full border-dashed" onClick={() => setCreating(true)}>
              <PlusCircle className="w-4 h-4 mr-2" /> Neue Gruppe anlegen
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}