import React, { useState, useCallback } from "react";
import { base44 } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Plus, Trash2, FileText, ZoomIn, ZoomOut, Star, Code2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import TemplateCanvas from "@/components/templateeditor/TemplateCanvas";
import ElementToolbox from "@/components/templateeditor/ElementToolbox";
import ElementProperties from "@/components/templateeditor/ElementProperties";

let idCounter = Date.now() + 1000;

export default function TemplateEditor() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [elements, setElements] = useState([]);
  const [templateName, setTemplateName] = useState("Neue Vorlage");
  const [selectedTemplateId, setSelectedTemplateId] = useState("new");
  const [zoom, setZoom] = useState(75);
  const [customCss, setCustomCss] = useState("");

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    refetchOnWindowFocus: false,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['printTemplates', user?.organization],
    queryFn: () => base44.entities.PrintTemplate.filter({ organization: user?.organization }),
    enabled: !!user?.organization,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        name: templateName,
        organization: user?.organization,
        custom_css: JSON.stringify({ elements, css: customCss }),
      };
      if (selectedTemplateId && selectedTemplateId !== 'new') {
        return base44.entities.PrintTemplate.update(selectedTemplateId, data);
      }
      return base44.entities.PrintTemplate.create(data);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['printTemplates', user?.organization] });
      setSelectedTemplateId(saved.id);
      alert('Vorlage gespeichert!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PrintTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printTemplates', user?.organization] });
      setSelectedTemplateId('new');
      setElements([]);
      setTemplateName('Neue Vorlage');
      setSelectedId(null);
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (templateId) => {
      await Promise.all(
        templates.map(t =>
          base44.entities.PrintTemplate.update(t.id, { is_default: t.id === templateId })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printTemplates', user?.organization] });
    },
  });

  const loadTemplate = (id) => {
    if (id === 'new') {
      setElements([]);
      setTemplateName('Neue Vorlage');
      setSelectedId(null);
      setSelectedTemplateId('new');
      return;
    }
    const t = templates.find(t => t.id === id);
    if (!t) return;
    setSelectedTemplateId(id);
    setTemplateName(t.name);
    try {
      const parsed = JSON.parse(t.custom_css || '[]');
      if (Array.isArray(parsed)) {
        setElements(parsed);
        setCustomCss("");
      } else {
        setElements(Array.isArray(parsed.elements) ? parsed.elements : []);
        setCustomCss(parsed.css || "");
      }
    } catch {
      setElements([]);
      setCustomCss("");
    }
    setSelectedId(null);
  };

  const addElement = (el) => {
    setElements(prev => [...prev, el]);
    setSelectedId(el.id);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setElements(prev => prev.filter(el => el.id !== selectedId));
    setSelectedId(null);
  };

  const selectedElement = elements.find(el => el.id === selectedId) || null;
  const currentTemplate = templates.find(t => t.id === selectedTemplateId);

  // Handle drop onto canvas from toolbox
  const handleCanvasDrop = useCallback((type) => {
    const DEFAULTS = {
      text: { w: 300, h: 60, content: 'Text hier eingeben', fontSize: 12, color: '#000000', fontFamily: 'Arial' },
      image: { w: 120, h: 80, src: '' },
      line: { w: 300, h: 20, lineWidth: 1, color: '#000000' },
      docbox: { w: 200, h: 130, fontSize: 10 },
    };
    const def = DEFAULTS[type] || {};
    addElement({ id: `el_${idCounter++}`, type, x: 100, y: 100, ...def });
  }, []);

  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden" style={{ marginLeft: '-1rem', marginTop: '-1rem', marginRight: '-1rem' }} data-testid="template-editor-page">
      {/* Top Bar */}
      <div className="bg-white border-b px-4 py-2 flex items-center gap-3 flex-shrink-0 shadow-sm">
        <FileText className="w-5 h-5 text-slate-600" />
        <span className="font-bold text-slate-800 text-sm">Druckvorlage Editor</span>
        <div className="w-px h-5 bg-slate-200" />

        {/* Template selector */}
        <Select value={selectedTemplateId} onValueChange={loadTemplate}>
          <SelectTrigger className="w-52 h-8 text-sm">
            <SelectValue placeholder="Vorlage wählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">+ Neue Vorlage</SelectItem>
            {templates.map(t => (
              <SelectItem key={t.id} value={t.id}>
                {t.name} {t.is_default ? '⭐' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Template name */}
        <Input
          value={templateName}
          onChange={e => setTemplateName(e.target.value)}
          className="h-8 w-48 text-sm"
          placeholder="Vorlagenname"
        />

        <div className="flex-1" />

        {/* Zoom */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-md px-2 py-1">
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setZoom(z => Math.max(30, z - 10))}>
            <ZoomOut className="w-3 h-3" />
          </Button>
          <span className="text-xs w-10 text-center">{zoom}%</span>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setZoom(z => Math.min(150, z + 10))}>
            <ZoomIn className="w-3 h-3" />
          </Button>
        </div>

        {selectedTemplateId !== 'new' && currentTemplate && (
          <Button size="sm" variant="outline" onClick={() => setDefaultMutation.mutate(selectedTemplateId)} disabled={currentTemplate?.is_default}>
            <Star className={`w-3 h-3 mr-1 ${currentTemplate?.is_default ? 'fill-yellow-400 text-yellow-400' : ''}`} />
            {currentTemplate?.is_default ? 'Standard' : 'Als Standard'}
          </Button>
        )}

        {selectedTemplateId !== 'new' && (
          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => {
            if (confirm('Vorlage wirklich löschen?')) deleteMutation.mutate(selectedTemplateId);
          }}>
            <Trash2 className="w-4 h-4" />
          </Button>
        )}

        <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
          <Save className="w-3 h-3 mr-1" />
          {saveMutation.isPending ? 'Speichern...' : 'Speichern'}
        </Button>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Toolbox */}
        <div className="w-40 bg-white border-r flex-shrink-0 overflow-y-auto">
          <ElementToolbox onAdd={addElement} />
        </div>

        {/* Center: Canvas */}
        <TemplateCanvas
          elements={elements}
          setElements={setElements}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          zoom={zoom}
        />

        {/* Right: Properties */}
        <div className="w-64 bg-white border-l flex-shrink-0 overflow-y-auto flex flex-col">
          <div className="p-3 border-b bg-slate-50">
            <p className="text-xs font-semibold text-slate-600">Eigenschaften</p>
          </div>
          <ElementProperties
            element={selectedElement}
            setElements={setElements}
            onDelete={deleteSelected}
          />

          {/* CSS Editor */}
          <div className="border-t mt-auto">
            <div className="p-3 bg-slate-50 flex items-center gap-2">
              <Code2 className="w-3.5 h-3.5 text-slate-500" />
              <p className="text-xs font-semibold text-slate-600">Eigenes CSS</p>
            </div>
            <div className="p-3">
              <Textarea
                value={customCss}
                onChange={e => setCustomCss(e.target.value)}
                rows={10}
                className="font-mono text-xs resize-none"
                placeholder={`.print-header {\n  background: #f0f4ff;\n}\n\n.print-title {\n  font-size: 16pt;\n  font-weight: bold;\n}`}
              />
              <p className="text-[10px] text-slate-400 mt-1">Wird beim Drucken angewendet</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}