import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, GripVertical, Upload, Sparkles, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { base44 } from "@/api/apiClient";

// Items are split into: fixed_start | custom/motion | fixed_end
// The user can only add/remove/reorder items in the middle section.

export default function AgendaEditor({ items = [], onChange }) {
  const { toast } = useToast();
  const [newTitle, setNewTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState(null); // index within middle items

  // Support legacy "fixed" type as fixed_start
  const fixedStart = items.filter(i => i.type === "fixed_start" || i.type === "fixed");
  const fixedEnd   = items.filter(i => i.type === "fixed_end");
  const middle     = items.filter(i => i.type !== "fixed_start" && i.type !== "fixed_end" && i.type !== "fixed");

  const rebuild = (newMiddle) => {
    onChange([...fixedStart, ...newMiddle, ...fixedEnd]);
  };

  const addItem = () => {
    if (!newTitle.trim()) return;
    rebuild([...middle, { title: newTitle.trim(), type: "custom" }]);
    setNewTitle("");
  };

  const removeItem = (idx) => {
    rebuild(middle.filter((_, i) => i !== idx));
  };

  const updateTitle = (idx, title) => {
    const updated = [...middle];
    updated[idx] = { ...updated[idx], title };
    rebuild(updated);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.files.upload(file);
      rebuild([...middle, { title: `Dokument: ${file.name}`, type: "motion", file_url }]);
      toast({
        title: "Dokument hinzugefügt",
        description: "Dokumentanalyse ist aktuell MOCKED.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Upload fehlgeschlagen",
        description: err.message || "Dokument konnte nicht hochgeladen werden.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // Drag & drop within middle
  const handleDragStart = (idx) => setDragIndex(idx);
  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === idx) return;
    const updated = [...middle];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(idx, 0, moved);
    setDragIndex(idx);
    rebuild(updated);
  };
  const handleDragEnd = () => setDragIndex(null);

  // Global top number counter
  let topCounter = 0;
  const nextTop = () => { topCounter++; return topCounter; };

  const renderFixed = (item, label) => (
    <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
      <GripVertical className="w-4 h-4 text-slate-200 shrink-0" />
      <span className="text-xs font-bold text-slate-400 w-12 shrink-0">TOP {label}</span>
      <span className="text-sm text-slate-400 italic flex-1">{item.title}</span>
    </div>
  );

  return (
    <div className="space-y-3" data-testid="agenda-editor">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">Tagesordnungspunkte (TOPs)</p>
        <label className="cursor-pointer">
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={handleFileUpload}
            data-testid="agenda-upload-input"
          />
          <Button type="button" size="sm" variant="outline" disabled={uploading} asChild>
            <span data-testid="agenda-upload-button">
              {uploading
                ? <><Sparkles className="w-3 h-3 mr-1 animate-spin" /> Analysiere...</>
                : <><Upload className="w-3 h-3 mr-1" /> PDF/Antrag</>
              }
            </span>
          </Button>
        </label>
      </div>

      <div className="space-y-1.5">
        {/* Fixed start TOPs */}
        {fixedStart.map((item) => (
          <div key={item.title}>{renderFixed(item, nextTop())}</div>
        ))}

        {/* Divider */}
        {fixedStart.length > 0 && (
          <div className="flex items-center gap-2 py-1">
            <div className="flex-1 border-t border-dashed border-slate-300" />
            <span className="text-xs text-slate-400">Beratungspunkte</span>
            <div className="flex-1 border-t border-dashed border-slate-300" />
          </div>
        )}

        {/* Middle (editable) TOPs – first item is TOP 7, rest are sub-TOPs 7.1, 7.2, … */}
        {middle.map((item, idx) => {
          // consume the counter so fixedEnd numbers remain correct
          const topNum = nextTop();
          const isFirst = idx === 0;
          const label = isFirst ? `TOP ${topNum}` : `${fixedStart.length + 1}.${idx}`;
          return (
            <div
              key={idx}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-2 bg-white border rounded-lg px-3 py-2 group transition-all ${
                isFirst ? "border-slate-300 bg-slate-50/60" : "ml-4 border-slate-200"
              } ${dragIndex === idx ? "opacity-50 border-blue-400" : "hover:border-slate-300"}`}
            >
              <GripVertical className="w-4 h-4 text-slate-300 cursor-grab shrink-0" />
              <span className={`text-xs font-bold shrink-0 w-14 ${isFirst ? "text-slate-600" : "text-slate-400"}`}>
                {label}
              </span>
              {item.type === "motion" && <FileText className="w-3 h-3 text-blue-500 shrink-0" />}
              <Input
                value={item.title}
                onChange={(e) => updateTitle(idx, e.target.value)}
                className="border-0 shadow-none h-7 px-0 text-sm focus-visible:ring-0"
              />
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}

        {/* Add new middle TOP */}
        <div className="flex gap-2">
          <Input
            placeholder="Neuer Beratungspunkt..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem())}
            className="text-sm"
          />
          <Button type="button" size="sm" variant="outline" onClick={addItem} disabled={!newTitle.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Divider */}
        {fixedEnd.length > 0 && (
          <div className="flex items-center gap-2 py-1">
            <div className="flex-1 border-t border-dashed border-slate-300" />
            <span className="text-xs text-slate-400">Abschluss</span>
            <div className="flex-1 border-t border-dashed border-slate-300" />
          </div>
        )}

        {/* Fixed end TOPs */}
        {fixedEnd.map((item) => (
          <div key={item.title}>{renderFixed(item, nextTop())}</div>
        ))}
      </div>

      <p className="text-xs text-slate-400">
        Beratungspunkte per Drag & Drop verschieben. PDF-Dokumente werden automatisch erkannt.
      </p>
    </div>
  );
}