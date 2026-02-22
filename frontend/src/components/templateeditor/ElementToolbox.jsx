import React from "react";
import { Type, Image, Minus, Table2, MapPin } from "lucide-react";

const TOOLS = [
  { type: 'text', label: 'Text', icon: Type, desc: 'Textfeld' },
  { type: 'image', label: 'Bild', icon: Image, desc: 'Logo / Bild' },
  { type: 'line', label: 'Linie', icon: Minus, desc: 'Trennlinie' },
  { type: 'docbox', label: 'Antragsbox', icon: Table2, desc: 'Antragstyp-Box' },
  { type: 'recipient', label: 'Empfänger', icon: MapPin, desc: 'Empfängeradresse' },
];

const DEFAULTS = {
  text: { w: 300, h: 60, content: 'Text hier eingeben', fontSize: 12, color: '#000000', fontFamily: 'Arial' },
  image: { w: 120, h: 80, src: '' },
  line: { w: 300, h: 20, lineWidth: 1, color: '#000000' },
  docbox: { w: 200, h: 130, fontSize: 10 },
  recipient: { w: 220, h: 100, content: 'Herrn Bürgermeister\nMax Mustermann\nRathaus\n12345 Musterstadt', fontSize: 12, color: '#000000', fontFamily: 'Arial' },
};

let idCounter = Date.now();

export default function ElementToolbox({ onAdd }) {
  const handleDragStart = (e, type) => {
    e.dataTransfer.setData('elementType', type);
  };

  const addElement = (type) => {
    const def = DEFAULTS[type];
    onAdd({
      id: `el_${idCounter++}`,
      type,
      x: 100,
      y: 100,
      ...def,
    });
  };

  return (
    <div className="p-4 border-b" data-testid="template-toolbox">
      <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Elemente</p>
      <div className="grid grid-cols-2 gap-2">
        {TOOLS.map(tool => (
          <button
            key={tool.type}
            onClick={() => addElement(tool.type)}
            draggable
            onDragStart={(e) => handleDragStart(e, tool.type)}
            className="flex flex-col items-center gap-1 p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-grab active:cursor-grabbing"
            data-testid={`template-tool-${tool.type}`}
          >
            <tool.icon className="w-5 h-5 text-slate-600" />
            <span className="text-xs text-slate-600">{tool.label}</span>
          </button>
        ))}
      </div>
      <p className="text-[10px] text-slate-400 mt-3 text-center">Klicken oder per Drag & Drop auf die Seite ziehen</p>
    </div>
  );
}