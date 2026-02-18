import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Landmark, Search, MoreVertical, Receipt, Users, Mail, Phone, Globe, MapPin, Settings, Euro } from "lucide-react";
import { format, addMonths, startOfMonth, endOfMonth } from "date-fns";

export default function AdminOrganizations() {
  const [search, setSearch] = useState("");
  const [editingOrg, setEditingOrg] = useState(null);
  const [creatingInvoice, setCreatingInvoice] = useState(null);
  const qc = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: appSettings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  const isAppOwner = appSettings[0]?.app_owner_email === currentUser?.email;

  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ["allOrganizations"],
    queryFn: () => base44.entities.Organization.list("-created_date"),
    enabled: isAppOwner,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => base44.entities.User.list(),
    enabled: isAppOwner,
  });

  React.useEffect(() => {
    if (!isAppOwner) return;
    
    const unsubscribe = base44.entities.Organization.subscribe(() => {
      qc.invalidateQueries({ queryKey: ["allOrganizations"] });
    });
    
    return unsubscribe;
  }, [isAppOwner, qc]);

  const updateOrgMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Organization.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allOrganizations"] });
      setEditingOrg(null);
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: (invoiceData) => base44.entities.Invoice.create(invoiceData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setCreatingInvoice(null);
    },
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

  const getUserCount = (orgName) => {
    return allUsers.filter(u => u.organization === orgName).length;
  };

  const calculatePrice = (org, userCount) => {
    const baseUsers = org.subscription_base_users || 2;
    const basePrice = org.subscription_base_price || 20;
    const pricePerExtra = org.subscription_price_per_extra_user || 5;
    
    if (userCount <= baseUsers) return basePrice;
    return basePrice + ((userCount - baseUsers) * pricePerExtra);
  };

  const handleCreateInvoice = (org) => {
    const userCount = getUserCount(org.name);
    const baseUsers = org.subscription_base_users || 2;
    const basePrice = org.subscription_base_price || 20;
    const pricePerExtra = org.subscription_price_per_extra_user || 5;
    const totalPrice = calculatePrice(org, userCount);
    
    const today = new Date();
    const dueDate = addMonths(today, 1);
    const periodStart = startOfMonth(today);
    const periodEnd = endOfMonth(today);
    
    const items = [];
    items.push({
      description: `Basispaket (bis ${baseUsers} Nutzer)`,
      quantity: 1,
      unit_price: basePrice,
      total: basePrice
    });
    
    if (userCount > baseUsers) {
      const extraUsers = userCount - baseUsers;
      items.push({
        description: `Zusätzliche Nutzer (${extraUsers} Nutzer)`,
        quantity: extraUsers,
        unit_price: pricePerExtra,
        total: extraUsers * pricePerExtra
      });
    }
    
    const subtotal = totalPrice;
    const taxRate = 19;
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;
    
    const invoiceNumber = `INV-${org.name.substring(0, 3).toUpperCase()}-${format(today, 'yyyyMMdd')}-${Math.floor(Math.random() * 1000)}`;
    
    const invoiceData = {
      invoice_number: invoiceNumber,
      organization_id: org.id,
      recipient_name: org.name,
      recipient_address: org.address || "",
      recipient_email: org.email || "",
      invoice_date: format(today, 'yyyy-MM-dd'),
      due_date: format(dueDate, 'yyyy-MM-dd'),
      billing_period_start: format(periodStart, 'yyyy-MM-dd'),
      billing_period_end: format(periodEnd, 'yyyy-MM-dd'),
      user_count: userCount,
      items,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      status: "entwurf",
      notes: `Vielen Dank für Ihre Nutzung unserer Software.`,
      bank_details: appSettings[0]?.app_owner_address || ""
    };
    
    createInvoiceMutation.mutate(invoiceData);
  };

  if (!isAppOwner) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md p-8 text-center">
          <Landmark className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Kein Zugriff</h2>
          <p className="text-slate-500">
            Diese Seite ist nur für den App-Inhaber zugänglich.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Organisationsverwaltung</h1>
          <p className="text-sm text-slate-500 mt-1">{organizations.length} Organisationen nutzen die App</p>
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
            <Card key={i} className="h-48 animate-pulse bg-slate-50 border-0" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Landmark className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-400 text-sm">Keine Organisationen gefunden</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((org) => {
            const userCount = getUserCount(org.name);
            const monthlyPrice = calculatePrice(org, userCount);
            const status = org.subscription_status || "aktiv";
            
            return (
              <Card key={org.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Landmark className="w-5 h-5 text-slate-600" />
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-7 h-7">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingOrg(org)}>
                          <Settings className="w-4 h-4 mr-2" /> Abo verwalten
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCreateInvoice(org)}>
                          <Receipt className="w-4 h-4 mr-2" /> Rechnung erstellen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <h3 className="font-semibold text-base text-slate-900 mb-1">{org.name}</h3>

                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {org.city && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin className="w-3 h-3" />
                        {org.city}
                      </div>
                    )}
                    <Badge variant="outline" className="text-xs">
                      <Users className="w-3 h-3 mr-1" />
                      {userCount} Nutzer
                    </Badge>
                    <Badge variant={status === "aktiv" ? "default" : "secondary"} className="text-xs">
                      {status}
                    </Badge>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-600">Monatlich</span>
                      <span className="text-lg font-bold text-slate-900">{monthlyPrice.toFixed(2)} €</span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Basis: {org.subscription_base_users || 2} Nutzer ({(org.subscription_base_price || 20).toFixed(2)} €)
                      {userCount > (org.subscription_base_users || 2) && 
                        ` + ${userCount - (org.subscription_base_users || 2)} extra (${(org.subscription_price_per_extra_user || 5).toFixed(2)} € je)`
                      }
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    {org.email && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{org.email}</span>
                      </div>
                    )}

                    {org.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {org.phone}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Abo-Verwaltung Dialog */}
      <Dialog open={!!editingOrg} onOpenChange={(open) => !open && setEditingOrg(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Abo verwalten - {editingOrg?.name}</DialogTitle>
          </DialogHeader>
          
          {editingOrg && (
            <div className="space-y-4">
              <div>
                <Label>Abo-Status</Label>
                <Select
                  value={editingOrg.subscription_status || "aktiv"}
                  onValueChange={(value) => setEditingOrg({...editingOrg, subscription_status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aktiv">Aktiv</SelectItem>
                    <SelectItem value="pausiert">Pausiert</SelectItem>
                    <SelectItem value="gekündigt">Gekündigt</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Inkludierte Nutzer (Basis)</Label>
                <Input
                  type="number"
                  value={editingOrg.subscription_base_users || 2}
                  onChange={(e) => setEditingOrg({...editingOrg, subscription_base_users: parseInt(e.target.value)})}
                />
              </div>

              <div>
                <Label>Basispreis (EUR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingOrg.subscription_base_price || 20}
                  onChange={(e) => setEditingOrg({...editingOrg, subscription_base_price: parseFloat(e.target.value)})}
                />
              </div>

              <div>
                <Label>Preis pro zusätzlichem Nutzer (EUR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingOrg.subscription_price_per_extra_user || 5}
                  onChange={(e) => setEditingOrg({...editingOrg, subscription_price_per_extra_user: parseFloat(e.target.value)})}
                />
              </div>

              <div>
                <Label>Abrechnungszyklus</Label>
                <Select
                  value={editingOrg.subscription_billing_cycle || "monatlich"}
                  onValueChange={(value) => setEditingOrg({...editingOrg, subscription_billing_cycle: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monatlich">Monatlich</SelectItem>
                    <SelectItem value="jährlich">Jährlich</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Aktueller Preis</span>
                  <span className="text-xl font-bold">
                    {calculatePrice(editingOrg, getUserCount(editingOrg.name)).toFixed(2)} €
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {getUserCount(editingOrg.name)} aktive Nutzer
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingOrg(null)} className="flex-1">
                  Abbrechen
                </Button>
                <Button 
                  onClick={() => updateOrgMutation.mutate({ 
                    id: editingOrg.id, 
                    data: {
                      subscription_status: editingOrg.subscription_status,
                      subscription_base_users: editingOrg.subscription_base_users,
                      subscription_base_price: editingOrg.subscription_base_price,
                      subscription_price_per_extra_user: editingOrg.subscription_price_per_extra_user,
                      subscription_billing_cycle: editingOrg.subscription_billing_cycle
                    }
                  })}
                  className="flex-1"
                  disabled={updateOrgMutation.isPending}
                >
                  {updateOrgMutation.isPending ? "Speichern..." : "Speichern"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}