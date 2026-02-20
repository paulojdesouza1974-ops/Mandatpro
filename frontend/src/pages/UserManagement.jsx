import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, MoreVertical, Lock, Unlock, AlertTriangle, FileText, Mail, UserPlus, Shield, UserCog } from "lucide-react";
import UserManagementDialog from "../components/admin/UserManagementDialog";
import { format } from "date-fns";
import { de } from "date-fns/locale";

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

export default function UserManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list("-created_date"),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list(),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }) => base44.entities.User.update(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const sendWarningMutation = useMutation({
    mutationFn: async ({ user }) => {
      await base44.email.sendBulk([user.email], "Zahlungserinnerung - KommunalCRM", `Sehr geehrte/r ${user.full_name},\n\nwir möchten Sie daran erinnern, dass Ihre Rechnung noch nicht beglichen wurde.\n\nBitte überprüfen Sie Ihre offenen Rechnungen und tätigen Sie die Zahlung zeitnah.\n\nMit freundlichen Grüßen\nIhr KommunalCRM Team`);
      
      return base44.entities.User.update(user.id, {
        account_status: "gemahnt",
        last_warning_date: new Date().toISOString().split("T")[0],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const inviteUserMutation = useMutation({
    mutationFn: async ({ email, role }) => {
      await base44.users.inviteUser(email, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  if (currentUser?.role !== "admin") {
    return (
      <Card className="p-12 text-center">
        <Lock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">Zugriff verweigert</h3>
        <p className="text-slate-500">Diese Seite ist nur für Administratoren zugänglich.</p>
      </Card>
    );
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.city?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || user.account_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getUserInvoices = (userEmail) => {
    return invoices.filter(inv => inv.user_email === userEmail);
  };

  const getUnpaidInvoices = (userEmail) => {
    return getUserInvoices(userEmail).filter(inv => 
      inv.status === "versendet" || inv.status === "überfällig"
    );
  };

  const handleSuspend = (user) => {
    const reason = window.prompt("Grund für die Sperrung:");
    if (reason) {
      updateUserMutation.mutate({
        userId: user.id,
        data: {
          account_status: "gesperrt",
          suspension_reason: reason,
        },
      });
    }
  };

  const handleActivate = (user) => {
    updateUserMutation.mutate({
      userId: user.id,
      data: {
        account_status: "aktiv",
        suspension_reason: "",
      },
    });
  };

  const handleSendWarning = (user) => {
    if (window.confirm(`Mahnung an ${user.full_name} (${user.email}) senden?`)) {
      sendWarningMutation.mutate({ user });
    }
  };

  const handleInviteUser = () => {
    const email = window.prompt("E-Mail-Adresse des neuen Nutzers:");
    if (!email) return;

    const roleInput = window.prompt('Rolle (admin, member, viewer, support):', 'member');
    const roleRaw = roleInput ? roleInput.toLowerCase() : 'member';
    const role = ['admin', 'member', 'viewer', 'support'].includes(roleRaw) ? roleRaw : 'member';

    if (window.confirm(`Nutzer ${email} als ${role} einladen?`)) {
      inviteUserMutation.mutate({ email, role });
    }
  };

  const handleChangeRole = (user) => {
    const roleInput = window.prompt('Neue Rolle (admin, member, viewer, support):', user.role || 'member');
    if (!roleInput) return;
    const roleRaw = roleInput.toLowerCase();
    const newRole = ['admin', 'member', 'viewer', 'support'].includes(roleRaw) ? roleRaw : 'member';

    if (window.confirm(`Rolle für ${user.full_name} (${user.email}) auf ${newRole} setzen?`)) {
      updateUserMutation.mutate({
        userId: user.id,
        data: { role: newRole },
      });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Nutzerverwaltung</h1>
          <p className="text-slate-500 mt-1">App-Nutzer verwalten und Zahlungsstatus überwachen</p>
        </div>
        <Button 
          onClick={handleInviteUser} 
          className="bg-slate-900 hover:bg-slate-800"
          disabled={inviteUserMutation.isPending}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          {inviteUserMutation.isPending ? "Wird eingeladen..." : "Nutzer einladen"}
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-sm text-slate-500 mb-1">Gesamt</div>
          <div className="text-2xl font-bold text-slate-900">{users.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-slate-500 mb-1">Aktiv</div>
          <div className="text-2xl font-bold text-green-600">
            {users.filter(u => u.account_status === "aktiv").length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-slate-500 mb-1">Gemahnt</div>
          <div className="text-2xl font-bold text-yellow-600">
            {users.filter(u => u.account_status === "gemahnt").length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-slate-500 mb-1">Gesperrt</div>
          <div className="text-2xl font-bold text-red-600">
            {users.filter(u => u.account_status === "gesperrt").length}
          </div>
        </Card>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Nutzer suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status filtern" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="aktiv">Aktiv</SelectItem>
              <SelectItem value="gemahnt">Gemahnt</SelectItem>
              <SelectItem value="gesperrt">Gesperrt</SelectItem>
              <SelectItem value="testphase">Testphase</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Laden...</div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>E-Mail</TableHead>
                <TableHead>Rolle</TableHead>
                <TableHead>Stadt</TableHead>
                <TableHead>Registriert</TableHead>
                <TableHead>Rechnungen</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const userInvoices = getUserInvoices(user.email);
                const unpaidInvoices = getUnpaidInvoices(user.email);
                
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.role === "admin" ? (
                        <Badge className="bg-purple-100 text-purple-700">
                          <Shield className="w-3 h-3 mr-1" />
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="outline">User</Badge>
                      )}
                    </TableCell>
                    <TableCell>{user.city || "-"}</TableCell>
                    <TableCell>
                      {user.created_date
                        ? format(new Date(user.created_date), "dd.MM.yyyy", { locale: de })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{userInvoices.length} gesamt</span>
                        {unpaidInvoices.length > 0 && (
                          <Badge className="bg-red-100 text-red-700">
                            {unpaidInvoices.length} offen
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[user.account_status] || "bg-gray-100 text-gray-700"}>
                        {statusLabels[user.account_status] || user.account_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedUser(user)}>
                            <FileText className="w-4 h-4 mr-2" />
                            Details anzeigen
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleToggleAdmin(user)}
                            className={user.role === "admin" ? "text-orange-600" : "text-purple-600"}
                          >
                            <UserCog className="w-4 h-4 mr-2" />
                            {user.role === "admin" ? "Admin-Rechte entziehen" : "Zum Admin machen"}
                          </DropdownMenuItem>
                          {unpaidInvoices.length > 0 && user.account_status !== "gemahnt" && (
                            <DropdownMenuItem onClick={() => handleSendWarning(user)}>
                              <Mail className="w-4 h-4 mr-2" />
                              Mahnung senden
                            </DropdownMenuItem>
                          )}
                          {user.account_status !== "gesperrt" ? (
                            <DropdownMenuItem
                              onClick={() => handleSuspend(user)}
                              className="text-red-600"
                            >
                              <Lock className="w-4 h-4 mr-2" />
                              Sperren
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleActivate(user)}
                              className="text-green-600"
                            >
                              <Unlock className="w-4 h-4 mr-2" />
                              Freigeben
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <UserManagementDialog
        open={!!selectedUser}
        onOpenChange={(open) => !open && setSelectedUser(null)}
        user={selectedUser}
        invoices={selectedUser ? getUserInvoices(selectedUser.email) : []}
        onUpdateUser={(data) => {
          updateUserMutation.mutate({
            userId: selectedUser.id,
            data,
          });
          setSelectedUser(null);
        }}
      />
    </div>
  );
}