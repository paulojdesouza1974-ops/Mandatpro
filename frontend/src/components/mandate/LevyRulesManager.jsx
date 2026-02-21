import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Trash2, Settings } from "lucide-react";

const mandateTypes = [
  { value: "stadtrat", label: "Stadtrat" },
  { value: "gemeinderat", label: "Gemeinderat" },
  { value: "kreistag", label: "Kreistag" },
  { value: "aufsichtsrat", label: "Aufsichtsrat" },
  { value: "verband", label: "Verbände" },
  { value: "sonstiges", label: "Sonstiges" },
];

const empty = { mandate_type: "stadtrat", mandate_body: "", levy_rate: 10, deduction_flat: 0, min_income_threshold: 0, description: "" };

export default function LevyRulesManager({ user }) {
  const [form, setForm] = useState(empty);
  const [adding, setAdding] = useState(false);
  const qc = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["levyRules", user?.organization],
    queryFn: () => base44.entities.LevyRule.filter({ organization: user.organization }),
    enabled: !!user?.organization,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LevyRule.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["levyRules"] }); setAdding(false); setForm(empty); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LevyRule.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["levyRules"] }),
  });

  const handleSave = () => {
    createMutation.mutate({ ...form, organization: user.organization });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">Abgabe-Regeln</h3>
          <p className="text-sm text-slate-500">Legen Sie Abgabesätze pro Mandatsart fest. Diese werden beim Scan automatisch angewendet.</p>
        </div>
        <Button size="sm" onClick={() => setAdding(true)} className="gap-2">
          <PlusCircle className="w-4 h-4" /> Neue Regel
        </Button>
      </div>

      {adding && (
        <Card className="border-indigo-200 bg-indigo-50/30">
          <CardContent className="p-4 space-y-3">
            <h4 className="font-medium text-slate-700">Neue Abgabe-Regel</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Mandatsart</Label>
                <Select value={form.mandate_type} onValueChange={v => setForm(f => ({ ...f, mandate_type: v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {mandateTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Gremium (optional)</Label>
                <Input className="h-8 text-sm" value={form.mandate_body} onChange={e => setForm(f => ({ ...f, mandate_body: e.target.value }))} placeholder="z.B. Kreistag Musterkreis" />
              </div>
              <div>
                <Label className="text-xs">Abgabesatz (%)</Label>
                <Input className="h-8 text-sm" type="number" value={form.levy_rate} onChange={e => setForm(f => ({ ...f, levy_rate: parseFloat(e.target.value) }))} />
              </div>
              <div>
                <Label className="text-xs">Freibetrag (€)</Label>
                <Input className="h-8 text-sm" type="number" value={form.deduction_flat} onChange={e => setForm(f => ({ ...f, deduction_flat: parseFloat(e.target.value) }))} />
              </div>
              <div>
                <Label className="text-xs">Mindestbetrag (€)</Label>
                <Input className="h-8 text-sm" type="number" value={form.min_income_threshold} onChange={e => setForm(f => ({ ...f, min_income_threshold: parseFloat(e.target.value) }))} />
              </div>
              <div>
                <Label className="text-xs">Beschreibung</Label>
                <Input className="h-8 text-sm" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setAdding(false)}>Abbrechen</Button>
              <Button size="sm" onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">Speichern</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && <p className="text-sm text-slate-400">Laden…</p>}
      {!isLoading && rules.length === 0 && !adding && (
        <div className="text-center py-12 text-slate-400">
          <Settings className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Noch keine Regeln definiert. Fügen Sie Abgabesätze hinzu.</p>
        </div>
      )}

      {rules.map(rule => (
        <Card key={rule.id}>
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-800">{mandateTypes.find(t => t.value === rule.mandate_type)?.label || rule.mandate_type}</span>
                {rule.mandate_body && <span className="text-sm text-slate-500">– {rule.mandate_body}</span>}
              </div>
              <div className="text-sm text-slate-500 flex gap-4 flex-wrap">
                <span>Abgabe: <strong className="text-indigo-700">{rule.levy_rate}%</strong></span>
                {rule.deduction_flat > 0 && <span>Freibetrag: <strong>{rule.deduction_flat} €</strong></span>}
                {rule.min_income_threshold > 0 && <span>Mindestbetrag: <strong>{rule.min_income_threshold} €</strong></span>}
                {rule.description && <span className="italic text-slate-400">{rule.description}</span>}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600" onClick={() => deleteMutation.mutate(rule.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}