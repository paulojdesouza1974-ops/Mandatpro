import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Mail, FileText, AlertCircle } from "lucide-react";

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

export default function UserManagementDialog({ open, onOpenChange, user, invoices, onUpdateUser }) {
  const [formData, setFormData] = useState({
    account_status: "",
    admin_notes: "",
    suspension_reason: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        account_status: user.account_status || "testphase",
        admin_notes: user.admin_notes || "",
        suspension_reason: user.suspension_reason || "",
      });
    }
  }, [user]);

  if (!user) return null;

  const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const unpaidInvoices = invoices.filter(inv => 
    inv.status === "versendet" || inv.status === "überfällig"
  );
  const unpaidAmount = unpaidInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

  const handleSave = () => {
    onUpdateUser(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nutzer verwalten: {user.full_name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="invoices">
              Rechnungen ({invoices.length})
            </TabsTrigger>
            <TabsTrigger value="management">Verwaltung</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Benutzerinformationen</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Name:</span>
                  <p className="font-medium">{user.full_name}</p>
                </div>
                <div>
                  <span className="text-slate-500">E-Mail:</span>
                  <p className="font-medium">{user.email}</p>
                </div>
                <div>
                  <span className="text-slate-500">Stadt:</span>
                  <p className="font-medium">{user.city || "-"}</p>
                </div>
                <div>
                  <span className="text-slate-500">Partei:</span>
                  <p className="font-medium">{user.party_affiliation || "-"}</p>
                </div>
                <div>
                  <span className="text-slate-500">Mandat:</span>
                  <p className="font-medium">{user.mandate_type || "-"}</p>
                </div>
                <div>
                  <span className="text-slate-500">Registriert seit:</span>
                  <p className="font-medium">
                    {user.created_date
                      ? format(new Date(user.created_date), "dd.MM.yyyy", { locale: de })
                      : "-"}
                  </p>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="text-sm text-slate-500 mb-1">Rechnungen gesamt</div>
                <div className="text-2xl font-bold">{invoices.length}</div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-slate-500 mb-1">Gesamtbetrag</div>
                <div className="text-2xl font-bold">{totalInvoiceAmount.toFixed(2)} €</div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-slate-500 mb-1">Offen</div>
                <div className="text-2xl font-bold text-red-600">
                  {unpaidAmount.toFixed(2)} €
                </div>
              </Card>
            </div>

            {unpaidInvoices.length > 0 && (
              <Card className="p-4 border-yellow-200 bg-yellow-50">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-900 mb-1">
                      {unpaidInvoices.length} offene Rechnung{unpaidInvoices.length > 1 ? "en" : ""}
                    </h4>
                    <p className="text-sm text-yellow-700">
                      Gesamtbetrag: {unpaidAmount.toFixed(2)} €
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {user.suspension_reason && (
              <Card className="p-4 border-red-200 bg-red-50">
                <h4 className="font-semibold text-red-900 mb-2">Sperrgrund</h4>
                <p className="text-sm text-red-700">{user.suspension_reason}</p>
              </Card>
            )}

            {user.last_warning_date && (
              <Card className="p-4">
                <h4 className="font-semibold mb-2">Letzte Mahnung</h4>
                <p className="text-sm text-slate-600">
                  {format(new Date(user.last_warning_date), "dd.MM.yyyy", { locale: de })}
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="invoices" className="space-y-3">
            {invoices.length === 0 ? (
              <Card className="p-8 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Keine Rechnungen vorhanden</p>
              </Card>
            ) : (
              invoices.map((invoice) => (
                <Card key={invoice.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">{invoice.invoice_number}</p>
                      <p className="text-sm text-slate-600">{invoice.recipient_name}</p>
                    </div>
                    <Badge className={statusColors[invoice.status]}>
                      {statusLabels[invoice.status]}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm mt-3">
                    <div>
                      <span className="text-slate-500">Datum:</span>
                      <p className="font-medium">
                        {invoice.invoice_date
                          ? format(new Date(invoice.invoice_date), "dd.MM.yyyy", { locale: de })
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Fällig am:</span>
                      <p className="font-medium">
                        {invoice.due_date
                          ? format(new Date(invoice.due_date), "dd.MM.yyyy", { locale: de })
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Betrag:</span>
                      <p className="font-semibold">{(invoice.total_amount || 0).toFixed(2)} €</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="management" className="space-y-4">
            <div>
              <Label>Kontostatus</Label>
              <Select
                value={formData.account_status}
                onValueChange={(value) => setFormData({ ...formData, account_status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktiv">Aktiv</SelectItem>
                  <SelectItem value="gemahnt">Gemahnt</SelectItem>
                  <SelectItem value="gesperrt">Gesperrt</SelectItem>
                  <SelectItem value="testphase">Testphase</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.account_status === "gesperrt" && (
              <div>
                <Label>Sperrgrund</Label>
                <Textarea
                  value={formData.suspension_reason}
                  onChange={(e) => setFormData({ ...formData, suspension_reason: e.target.value })}
                  rows={3}
                  placeholder="Grund für die Sperrung..."
                />
              </div>
            )}

            <div>
              <Label>Admin-Notizen</Label>
              <Textarea
                value={formData.admin_notes}
                onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
                rows={5}
                placeholder="Interne Notizen zum Nutzer..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleSave}>
                Änderungen speichern
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}