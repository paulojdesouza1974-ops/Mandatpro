import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { base44 } from "@/api/apiClient";

export default function ElementProperties({ element, setElements, onDelete }) {
  if (!element) {
    return (
      <div className="p-4 text-sm text-slate-400 text-center pt-12">
        <p>Element auswählen</p>
        <p className="text-xs mt-1">um Eigenschaften zu bearbeiten</p>
      </div>
    );
  }

  const update = (field, value) => {
    setElements(prev => prev.map(el => el.id === element.id ? { ...el, [field]: value } : el));
  };

  const handleImageUpload = async (file) => {
    const { file_url } = await base44.files.upload(file);
    update('src', file_url);
  };

  return (
    <div className="p-4 space-y-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700 capitalize">{element.type}-Element</span>
        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={onDelete} data-testid="template-element-delete">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Position & Size */}
      <div>
        <Label className="text-xs text-slate-500">Position & Größe</Label>
        <div className="grid grid-cols-2 gap-2 mt-1">
          <div>
            <Label className="text-[10px]">X</Label>
            <Input type="number" value={Math.round(element.x)} onChange={e => update('x', +e.target.value)} className="h-7 text-xs" data-testid="template-element-x-input" />
          </div>
          <div>
            <Label className="text-[10px]">Y</Label>
            <Input type="number" value={Math.round(element.y)} onChange={e => update('y', +e.target.value)} className="h-7 text-xs" data-testid="template-element-y-input" />
          </div>
          <div>
            <Label className="text-[10px]">Breite</Label>
            <Input type="number" value={Math.round(element.w)} onChange={e => update('w', +e.target.value)} className="h-7 text-xs" data-testid="template-element-width-input" />
          </div>
          <div>
            <Label className="text-[10px]">Höhe</Label>
            <Input type="number" value={Math.round(element.h)} onChange={e => update('h', +e.target.value)} className="h-7 text-xs" data-testid="template-element-height-input" />
          </div>
        </div>
      </div>

      {/* Text content */}
      {(element.type === 'text' || element.type === 'recipient') && (
        <>
          <div>
            <Label className="text-xs">Text</Label>
            <Textarea
              value={element.content || ''}
              onChange={e => update('content', e.target.value)}
              rows={4}
              className="mt-1 text-sm"
              data-testid="template-element-content-textarea"
            />
          </div>

          {/* Font */}
          <div>
            <Label className="text-xs">Schriftart</Label>
            <Select value={element.fontFamily || 'Arial'} onValueChange={v => update('fontFamily', v)}>
              <SelectTrigger className="h-8 mt-1 text-xs" data-testid="template-element-font-family">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Arial" data-testid="template-element-font-arial">Arial</SelectItem>
                <SelectItem value="Times New Roman" data-testid="template-element-font-times">Times New Roman</SelectItem>
                <SelectItem value="Georgia" data-testid="template-element-font-georgia">Georgia</SelectItem>
                <SelectItem value="Calibri" data-testid="template-element-font-calibri">Calibri</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label className="text-xs">Größe (pt)</Label>
              <Input type="number" value={element.fontSize || 12} onChange={e => update('fontSize', +e.target.value)} className="h-8 mt-1 text-xs" data-testid="template-element-font-size" />
            </div>
            <div>
              <Label className="text-xs">Farbe</Label>
              <Input type="color" value={element.color || '#000000'} onChange={e => update('color', e.target.value)} className="h-8 mt-1 w-14 p-1" data-testid="template-element-color" />
            </div>
          </div>

          {/* Format buttons */}
          <div>
            <Label className="text-xs">Formatierung</Label>
            <div className="flex gap-1 mt-1">
              <Button size="sm" variant={element.bold ? 'default' : 'outline'} className="w-8 h-8 p-0" onClick={() => update('bold', !element.bold)} data-testid="template-element-bold">
                <Bold className="w-3 h-3" />
              </Button>
              <Button size="sm" variant={element.italic ? 'default' : 'outline'} className="w-8 h-8 p-0" onClick={() => update('italic', !element.italic)} data-testid="template-element-italic">                <Italic className="w-3 h-3" />
              </Button>
              <Button size="sm" variant={element.underline ? 'default' : 'outline'} className="w-8 h-8 p-0" onClick={() => update('underline', !element.underline)} data-testid="template-element-underline">                <Underline className="w-3 h-3" />
              </Button>
              <div className="w-px bg-slate-200 mx-1" />
              <Button size="sm" variant={element.align === 'left' || !element.align ? 'default' : 'outline'} className="w-8 h-8 p-0" onClick={() => update('align', 'left')} data-testid="template-element-align-left">
                <AlignLeft className="w-3 h-3" />
              </Button>
              <Button size="sm" variant={element.align === 'center' ? 'default' : 'outline'} className="w-8 h-8 p-0" onClick={() => update('align', 'center')} data-testid="template-element-align-center">
                <AlignCenter className="w-3 h-3" />
              </Button>
              <Button size="sm" variant={element.align === 'right' ? 'default' : 'outline'} className="w-8 h-8 p-0" onClick={() => update('align', 'right')} data-testid="template-element-align-right">
                <AlignRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Image */}
      {element.type === 'image' && (
        <>
          <div>
            <Label className="text-xs">Bild hochladen</Label>
            <Input type="file" accept="image/*" className="mt-1 text-xs" onChange={e => {
              if (e.target.files[0]) handleImageUpload(e.target.files[0]);
            }} />
          </div>
          <div>
            <Label className="text-xs">oder Bild-URL</Label>
            <Input value={element.src || ''} onChange={e => update('src', e.target.value)} placeholder="https://..." className="mt-1 text-xs" />
          </div>
        </>
      )}

      {/* Line */}
      {element.type === 'line' && (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label className="text-xs">Stärke (px)</Label>
            <Input type="number" value={element.lineWidth || 1} onChange={e => update('lineWidth', +e.target.value)} className="h-8 mt-1 text-xs" min={1} max={10} />
          </div>
          <div>
            <Label className="text-xs">Farbe</Label>
            <Input type="color" value={element.color || '#000000'} onChange={e => update('color', e.target.value)} className="h-8 mt-1 w-14 p-1" />
          </div>
        </div>
      )}

      {/* Docbox */}
      {element.type === 'docbox' && (
        <div>
          <Label className="text-xs">Schriftgröße</Label>
          <Input type="number" value={element.fontSize || 10} onChange={e => update('fontSize', +e.target.value)} className="h-8 mt-1 text-xs" />
        </div>
      )}
    </div>
  );
}