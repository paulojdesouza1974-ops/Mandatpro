import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

export default function AssignGroupDialog({ open, onClose, contact, organization }) {
  const qc = useQueryClient();

  const { data: groups = [] } = useQuery({
    queryKey: ["memberGroups", organization],
    queryFn: () => base44.entities.MemberGroup.filter({ organization }),
    enabled: !!organization && open,
  });

  const updateMutation = useMutation({
    mutationFn: ({ groupId, memberIds }) => base44.entities.MemberGroup.update(groupId, { member_ids: memberIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["memberGroups", organization] }),
  });

  const toggle = (group) => {
    const ids = group.member_ids || [];
    const isIn = ids.includes(contact.id);
    const newIds = isIn ? ids.filter(id => id !== contact.id) : [...ids, contact.id];
    updateMutation.mutate({ groupId: group.id, memberIds: newIds });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Gruppen zuordnen</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500 -mt-1">{contact?.first_name} {contact?.last_name}</p>
        <div className="space-y-2 mt-2">
          {groups.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">Noch keine Gruppen vorhanden</p>
          )}
          {groups.map(g => {
            const isIn = (g.member_ids || []).includes(contact?.id);
            return (
              <div key={g.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                <Checkbox checked={isIn} onCheckedChange={() => toggle(g)} id={g.id} />
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color || "#6366f1" }} />
                <label htmlFor={g.id} className="text-sm text-slate-700 cursor-pointer flex-1">{g.name}</label>
                <span className="text-xs text-slate-400">{(g.member_ids || []).length} Mitgl.</span>
              </div>
            );
          })}
        </div>
        <Button variant="outline" className="w-full mt-2" onClick={onClose}>Schließen</Button>
      </DialogContent>
    </Dialog>
  );
}