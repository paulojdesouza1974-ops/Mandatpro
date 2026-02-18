import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const statusColors = {
  aktiv: "bg-green-100 text-green-700",
  gesperrt: "bg-red-100 text-red-700",
  gemahnt: "bg-yellow-100 text-yellow-700",
  testphase: "bg-blue-100 text-blue-700",
};

const statusLabels = {
  aktiv: "Aktiv",
  gesperrt: "Gesperrt",
  gemahnt: "Gemahnt",
  testphase: "Testphase",
};

export default function NewUsers({ users, isLoading }) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">Neue Registrierungen</h2>
        </div>
        <div className="text-center py-8 text-slate-400">Laden...</div>
      </Card>
    );
  }

  if (users.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">Neue Registrierungen</h2>
        </div>
        <div className="text-center py-8 text-slate-400">Keine neuen Nutzer</div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">Neue Registrierungen</h2>
        </div>
        <Link
          to={createPageUrl("UserManagement")}
          className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1"
        >
          Alle anzeigen
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-3">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 truncate">{user.full_name}</p>
              <p className="text-sm text-slate-500 truncate">{user.email}</p>
              <p className="text-xs text-slate-400 mt-1">
                {format(new Date(user.created_date), "dd.MM.yyyy HH:mm", { locale: de })} Uhr
              </p>
            </div>
            <Badge className={statusColors[user.account_status] || "bg-gray-100 text-gray-700"}>
              {statusLabels[user.account_status] || user.account_status}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}