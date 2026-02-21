import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/apiClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Phone, MapPin, CalendarDays, Euro, CheckCircle2, XCircle, Users, Tag } from "lucide-react";
import { format } from "date-fns";

const statusColors = { aktiv: "bg-green-100 text-green-700", inaktiv: "bg-red-100 text-red-700", interessent: "bg-yellow-100 text-yellow-700" };

export default function MemberProfileDialog({ open, onClose, contact, organization }) {
  const { data: groups = [] } = useQuery({
    queryKey: ["memberGroups", organization],
    queryFn: () => base44.entities.MemberGroup.filter({ organization }),
    enabled: !!organization && open,
  });

  if (!contact) return null;

  const memberGroups = groups.filter(g => (g.member_ids || []).includes(contact.id));
  const feeOpen = contact.membership_fee && !contact.fee_paid;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Mitgliederprofil</DialogTitle>
        </DialogHeader>

        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xl font-bold">
            {((contact.first_name || "")[0] || "") + ((contact.last_name || "")[0] || "") || "?"}
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900">{contact.first_name} {contact.last_name}</p>
            {contact.member_number && <p className="text-xs text-slate-400 font-mono">Nr. {contact.member_number}</p>}
            <Badge className={`text-xs mt-1 ${statusColors[contact.status] || statusColors.aktiv}`}>{contact.status || "aktiv"}</Badge>
          </div>
        </div>

        {/* Beitragsstatus – prominent */}
        <Card className={`border-0 ${feeOpen ? "bg-red-50" : "bg-emerald-50"}`}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {feeOpen
                  ? <XCircle className="w-5 h-5 text-red-500" />
                  : <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                <div>
                  <p className={`text-sm font-semibold ${feeOpen ? "text-red-700" : "text-emerald-700"}`}>
                    {feeOpen ? "Beitrag ausstehend" : "Beitrag bezahlt"}
                  </p>
                  <p className="text-xs text-slate-500">Jahresbeitrag {new Date().getFullYear()}</p>
                </div>
              </div>
              {contact.membership_fee && (
                <span className={`text-lg font-bold ${feeOpen ? "text-red-700" : "text-emerald-700"}`}>
                  {Number(contact.membership_fee).toFixed(2)} €
                </span>
              )}
            </div>
            {feeOpen && (
              <p className="text-xs text-red-500 mt-2 pl-7">
                Offener Betrag: {Number(contact.membership_fee).toFixed(2)} € – Beitrag wurde noch nicht entrichtet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Kontaktdaten */}
        <div className="space-y-2 text-sm">
          {contact.email && (
            <div className="flex items-center gap-2 text-slate-600">
              <Mail className="w-4 h-4 text-slate-400" />
              <a href={`mailto:${contact.email}`} className="hover:underline text-indigo-600">{contact.email}</a>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center gap-2 text-slate-600">
              <Phone className="w-4 h-4 text-slate-400" />
              <span>{contact.phone}</span>
            </div>
          )}
          {(contact.street || contact.city) && (
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span>{[contact.street, [contact.postal_code, contact.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</span>
            </div>
          )}
          {contact.entry_date && (
            <div className="flex items-center gap-2 text-slate-600">
              <CalendarDays className="w-4 h-4 text-slate-400" />
              <span>Mitglied seit {format(new Date(contact.entry_date), "dd.MM.yyyy")}</span>
            </div>
          )}
        </div>

        {/* Gruppen */}
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1"><Users className="w-3.5 h-3.5" />Zugehörige Gruppen</p>
          {memberGroups.length === 0
            ? <p className="text-xs text-slate-400">Keiner Gruppe zugeordnet</p>
            : (
              <div className="flex gap-2 flex-wrap">
                {memberGroups.map(g => (
                  <span key={g.id} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ backgroundColor: g.color || "#6366f1" }}>
                    {g.name}
                  </span>
                ))}
              </div>
            )}
        </div>

        {/* Notizen */}
        {contact.notes && (
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Notizen</p>
            <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{contact.notes}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}