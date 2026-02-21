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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/apiClient";

export default function InvoiceForm({ open, onOpenChange, invoice, onSave, isSaving, users }) {
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });
  const [formData, setFormData] = useState({
    invoice_number: "",
    user_email: "",
    recipient_name: "",
    recipient_address: "",
    recipient_email: "",
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: "",
    items: [{ description: "", quantity: 1, unit_price: 0, total: 0 }],
    subtotal: 0,
    tax_rate: 19,
    tax_amount: 0,
    total_amount: 0,
    notes: "",
    status: "entwurf",
    payment_method: "überweisung",
    bank_details: "",
  });

  useEffect(() => {
    if (invoice) {
      setFormData({
        ...invoice,
        items: invoice.items?.length ? invoice.items : [{ description: "", quantity: 1, unit_price: 0, total: 0 }],
      });
    } else {
      setFormData({
        invoice_number: "",
        user_email: "",
        recipient_name: "",
        recipient_address: "",
        recipient_email: "",
        invoice_date: new Date().toISOString().split("T")[0],
        due_date: "",
        items: [{ description: "", quantity: 1, unit_price: 0, total: 0 }],
        subtotal: 0,
        tax_rate: 19,
        tax_amount: 0,
        total_amount: 0,
        notes: "",
        status: "entwurf",
        payment_method: "überweisung",
        bank_details: "",
      });
    }
  }, [invoice, open]);

  const calculateTotals = (items, taxRate) => {
    const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;
    return { subtotal, taxAmount, totalAmount };
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;

    if (field === "quantity" || field === "unit_price") {
      const quantity = parseFloat(newItems[index].quantity) || 0;
      const unitPrice = parseFloat(newItems[index].unit_price) || 0;
      newItems[index].total = quantity * unitPrice;
    }

    const { subtotal, taxAmount, totalAmount } = calculateTotals(newItems, formData.tax_rate);

    setFormData({
      ...formData,
      items: newItems,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
    });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: "", quantity: 1, unit_price: 0, total: 0 }],
    });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    const { subtotal, taxAmount, totalAmount } = calculateTotals(newItems, formData.tax_rate);
    setFormData({
      ...formData,
      items: newItems,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
    });
  };

  const handleTaxRateChange = (value) => {
    const taxRate = parseFloat(value) || 0;
    const { subtotal, taxAmount, totalAmount } = calculateTotals(formData.items, taxRate);
    setFormData({
      ...formData,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: totalAmount,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {invoice ? "Rechnung bearbeiten" : "Neue Rechnung erstellen"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {currentUser?.role === "admin" && (
            <div>
              <Label>App-Nutzer auswählen *</Label>
              <Select
                value={formData.user_email}
                onValueChange={(value) => {
                  const selectedUser = users?.find(u => u.email === value);
                  setFormData({ 
                    ...formData, 
                    user_email: value,
                    recipient_name: selectedUser?.full_name || "",
                    recipient_email: value,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nutzer wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.email}>
                      {user.full_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Rechnungsnummer *</Label>
              <Input
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entwurf">Entwurf</SelectItem>
                  <SelectItem value="versendet">Versendet</SelectItem>
                  <SelectItem value="bezahlt">Bezahlt</SelectItem>
                  <SelectItem value="überfällig">Überfällig</SelectItem>
                  <SelectItem value="storniert">Storniert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Rechnungsdatum *</Label>
              <Input
                type="date"
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Fälligkeitsdatum</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Empfänger *</Label>
            <Input
              placeholder="Name"
              value={formData.recipient_name}
              onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
              required
            />
            <Textarea
              placeholder="Adresse"
              value={formData.recipient_address}
              onChange={(e) => setFormData({ ...formData, recipient_address: e.target.value })}
              rows={3}
            />
            <Input
              placeholder="E-Mail"
              type="email"
              value={formData.recipient_email}
              onChange={(e) => setFormData({ ...formData, recipient_email: e.target.value })}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Rechnungspositionen</Label>
              <Button type="button" size="sm" onClick={addItem} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Position hinzufügen
              </Button>
            </div>

            {formData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  <Input
                    placeholder="Beschreibung"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, "description", e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    placeholder="Menge"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Preis"
                    value={item.unit_price}
                    onChange={(e) => handleItemChange(index, "unit_price", e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    value={item.total.toFixed(2) + " €"}
                    disabled
                    className="bg-slate-50"
                  />
                </div>
                <div className="col-span-1">
                  {formData.items.length > 1 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Zwischensumme:</span>
              <span className="font-semibold">{formData.subtotal.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">MwSt.:</span>
                <Input
                  type="number"
                  step="0.01"
                  className="w-20"
                  value={formData.tax_rate}
                  onChange={(e) => handleTaxRateChange(e.target.value)}
                />
                <span className="text-sm">%</span>
              </div>
              <span className="font-semibold">{formData.tax_amount.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Gesamtbetrag:</span>
              <span>{formData.total_amount.toFixed(2)} €</span>
            </div>
          </div>

          <div>
            <Label>Zahlungsart</Label>
            <Select
              value={formData.payment_method}
              onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="überweisung">Überweisung</SelectItem>
                <SelectItem value="lastschrift">Lastschrift</SelectItem>
                <SelectItem value="bar">Bar</SelectItem>
                <SelectItem value="sonstige">Sonstige</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Bankverbindung</Label>
            <Textarea
              placeholder="IBAN, BIC, Bank..."
              value={formData.bank_details}
              onChange={(e) => setFormData({ ...formData, bank_details: e.target.value })}
              rows={2}
            />
          </div>

          <div>
            <Label>Zahlungshinweise / Notizen</Label>
            <Textarea
              placeholder="z.B. Zahlungsziel, Verwendungszweck..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Speichern..." : "Speichern"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}