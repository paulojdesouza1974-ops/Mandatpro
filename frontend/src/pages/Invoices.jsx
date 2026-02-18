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
import { Plus, Search, MoreVertical, FileText, Trash2, Eye } from "lucide-react";
import InvoiceForm from "../components/invoices/InvoiceForm";
import InvoicePrintView from "../components/invoices/InvoicePrintView";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const statusColors = {
  entwurf: "bg-gray-100 text-gray-700",
  versendet: "bg-blue-100 text-blue-700",
  bezahlt: "bg-green-100 text-green-700",
  überfällig: "bg-red-100 text-red-700",
  storniert: "bg-slate-100 text-slate-700",
};

const statusLabels = {
  entwurf: "Entwurf",
  versendet: "Versendet",
  bezahlt: "Bezahlt",
  überfällig: "Überfällig",
  storniert: "Storniert",
};

export default function InvoicesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: appSettings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  const isAppOwner = appSettings[0]?.app_owner_email === user?.email;

  const { data: allInvoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date"),
    enabled: isAppOwner,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
    enabled: isAppOwner,
  });

  const invoices = allInvoices;

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Invoice.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) =>
      id ? base44.entities.Invoice.update(id, data) : base44.entities.Invoice.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setShowForm(false);
      setEditingInvoice(null);
    },
  });

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (invoice) => {
    setEditingInvoice(invoice);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Rechnung wirklich löschen?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSave = (data) => {
    saveMutation.mutate({
      id: editingInvoice?.id,
      data,
    });
  };

  if (!isAppOwner) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md p-8 text-center">
          <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Kein Zugriff</h2>
          <p className="text-slate-500">
            Diese Seite ist nur für den App-Inhaber zugänglich.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Rechnungen verwalten</h1>
          <p className="text-slate-500 mt-1">Rechnungen für Organisationen erstellen und verwalten</p>
        </div>
        <Button
          onClick={() => {
            setEditingInvoice(null);
            setShowForm(true);
          }}
          className="bg-slate-900 hover:bg-slate-800"
        >
          <Plus className="w-4 h-4 mr-2" />
          Neue Rechnung
        </Button>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Rechnung suchen..."
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
              <SelectItem value="entwurf">Entwurf</SelectItem>
              <SelectItem value="versendet">Versendet</SelectItem>
              <SelectItem value="bezahlt">Bezahlt</SelectItem>
              <SelectItem value="überfällig">Überfällig</SelectItem>
              <SelectItem value="storniert">Storniert</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Laden...</div>
      ) : filteredInvoices.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Keine Rechnungen gefunden</h3>
          <p className="text-slate-500">Erstellen Sie Ihre erste Rechnung</p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rechnungsnr.</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>Fällig am</TableHead>
                <TableHead>Zeitraum</TableHead>
                <TableHead>Nutzer</TableHead>
                <TableHead>Betrag</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                  <TableCell>{invoice.recipient_name}</TableCell>
                  <TableCell>
                    {invoice.invoice_date
                      ? format(new Date(invoice.invoice_date), "dd.MM.yyyy", { locale: de })
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {invoice.due_date
                      ? format(new Date(invoice.due_date), "dd.MM.yyyy", { locale: de })
                      : "-"}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {invoice.billing_period_start && invoice.billing_period_end
                      ? `${format(new Date(invoice.billing_period_start), "dd.MM.")} - ${format(new Date(invoice.billing_period_end), "dd.MM.yy")}`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {invoice.user_count || "-"}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {invoice.total_amount?.toFixed(2) || "0.00"} €
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[invoice.status] || "bg-gray-100 text-gray-700"}>
                      {statusLabels[invoice.status] || invoice.status}
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
                        <DropdownMenuItem onClick={() => setViewingInvoice(invoice)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Anzeigen & Exportieren
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(invoice)}>
                          <FileText className="w-4 h-4 mr-2" />
                          Bearbeiten
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(invoice.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <InvoiceForm
        open={showForm}
        onOpenChange={setShowForm}
        invoice={editingInvoice}
        onSave={handleSave}
        isSaving={saveMutation.isPending}
        users={users}
      />

      <InvoicePrintView
        open={!!viewingInvoice}
        onOpenChange={(open) => !open && setViewingInvoice(null)}
        invoice={viewingInvoice}
      />
    </div>
  );
}