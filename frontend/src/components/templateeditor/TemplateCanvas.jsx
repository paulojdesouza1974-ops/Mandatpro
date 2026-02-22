import React, { useRef, useState, useCallback } from "react";

const SNAP = 5; // px snap grid

function snapTo(val) {
  return Math.round(val / SNAP) * SNAP;
}

export default function TemplateCanvas({ elements, setElements, selectedId, setSelectedId, zoom }) {
  const canvasRef = useRef(null);
  const dragging = useRef(null);

  const scale = zoom / 100;

  const handleMouseDown = (e, id) => {
    e.stopPropagation();
    setSelectedId(id);
    const el = elements.find(el => el.id === id);
    dragging.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX: el.x,
      origY: el.y,
    };
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragging.current) return;
    const dx = (e.clientX - dragging.current.startX) / scale;
    const dy = (e.clientY - dragging.current.startY) / scale;
    setElements(prev => prev.map(el =>
      el.id === dragging.current.id
        ? { ...el, x: snapTo(dragging.current.origX + dx), y: snapTo(dragging.current.origY + dy) }
        : el
    ));
  }, [scale, setElements]);

  const handleMouseUp = useCallback(() => {
    dragging.current = null;
  }, []);

  const handleCanvasClick = (e) => {
    if (e.target === canvasRef.current) {
      setSelectedId(null);
    }
  };

  // A4 dimensions in px at 96dpi: 794 x 1123
  const pageW = 794;
  const pageH = 1123;

  return (
    <div
      className="overflow-auto flex-1 bg-slate-300 flex items-start justify-center p-10"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      data-testid="template-canvas-wrapper"
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          marginBottom: `${(pageH * scale) - pageH}px`,
        }}
      >
        <div
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="bg-white shadow-2xl relative select-none"
          style={{ width: pageW, height: pageH, position: 'relative', overflow: 'hidden' }}
          data-testid="template-canvas"
        >
          {/* Page margin guides */}
          <div style={{
            position: 'absolute', top: 75, left: 95, right: 75, bottom: 75,
            border: '1px dashed #c8d4e8', pointerEvents: 'none', zIndex: 0
          }} />

          {elements.map(el => (
            <CanvasElement
              key={el.id}
              element={el}
              isSelected={el.id === selectedId}
              onMouseDown={(e) => handleMouseDown(e, el.id)}
              setElements={setElements}
              scale={scale}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function CanvasElement({ element, isSelected, onMouseDown, setElements, scale }) {
  const resizing = useRef(null);

  const handleResizeDown = (e, dir) => {
    e.stopPropagation();
    resizing.current = {
      dir,
      startX: e.clientX,
      startY: e.clientY,
      origW: element.w,
      origH: element.h,
      origX: element.x,
      origY: element.y,
    };

    const onMove = (e2) => {
      if (!resizing.current) return;
      const dx = (e2.clientX - resizing.current.startX) / scale;
      const dy = (e2.clientY - resizing.current.startY) / scale;
      const r = resizing.current;
      let newW = r.origW, newH = r.origH, newX = r.origX, newY = r.origY;

      if (r.dir.includes('e')) newW = Math.max(40, snapTo(r.origW + dx));
      if (r.dir.includes('s')) newH = Math.max(20, snapTo(r.origH + dy));
      if (r.dir.includes('w')) { newW = Math.max(40, snapTo(r.origW - dx)); newX = snapTo(r.origX + dx); }
      if (r.dir.includes('n')) { newH = Math.max(20, snapTo(r.origH - dy)); newY = snapTo(r.origY + dy); }

      setElements(prev => prev.map(el =>
        el.id === element.id ? { ...el, w: newW, h: newH, x: newX, y: newY } : el
      ));
    };

    const onUp = () => {
      resizing.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const renderContent = () => {
    const style = {
      fontFamily: element.fontFamily || 'Arial',
      fontSize: element.fontSize || 12,
      fontWeight: element.bold ? 'bold' : 'normal',
      fontStyle: element.italic ? 'italic' : 'normal',
      textDecoration: element.underline ? 'underline' : 'none',
      color: element.color || '#000',
      textAlign: element.align || 'left',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
    };

    switch (element.type) {
      case 'text':
      case 'recipient':
        return <div style={style} className="whitespace-pre-wrap break-words leading-snug">{element.content}</div>;
      case 'image':
        return element.src
          ? <img src={element.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          : <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 text-xs">Bild</div>;
      case 'line':
        return (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
            <hr style={{ width: '100%', borderColor: element.color || '#000', borderTopWidth: element.lineWidth || 1 }} />
          </div>
        );
      case 'docbox':
        return (
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: element.fontSize || 10, fontFamily: element.fontFamily || 'Arial' }}>
            <tbody>
              {['Fraktionsantrag', 'Einzelantrag', 'Anfrage', 'Beschlusskontrolle'].map(row => (
                <tr key={row}>
                  <td style={{ border: '1px solid #888', padding: '3px 6px' }}>{row}</td>
                  <td style={{ border: '1px solid #888', padding: '3px 6px', width: 28, textAlign: 'center' }}></td>
                </tr>
              ))}
              <tr>
                <td colSpan={2} style={{ border: '1px solid #888', padding: '3px 6px' }}>Datum: __.__.____</td>
              </tr>
            </tbody>
          </table>
        );
      default:
        return null;
    }
  };

  const handles = ['n','s','e','w','ne','nw','se','sw'];
  const handlePos = {
    n: { top: -4, left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' },
    s: { bottom: -4, left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' },
    e: { right: -4, top: '50%', transform: 'translateY(-50%)', cursor: 'e-resize' },
    w: { left: -4, top: '50%', transform: 'translateY(-50%)', cursor: 'w-resize' },
    ne: { top: -4, right: -4, cursor: 'ne-resize' },
    nw: { top: -4, left: -4, cursor: 'nw-resize' },
    se: { bottom: -4, right: -4, cursor: 'se-resize' },
    sw: { bottom: -4, left: -4, cursor: 'sw-resize' },
  };

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: 'absolute',
        left: element.x,
        top: element.y,
        width: element.w,
        height: element.h,
        cursor: 'move',
        outline: isSelected ? '2px solid #2563eb' : '1px dashed transparent',
        outlineOffset: 2,
        zIndex: isSelected ? 10 : 1,
        boxSizing: 'border-box',
      }}
      data-testid={`template-element-${element.id}`}
    >
      {renderContent()}

      {isSelected && handles.map(dir => (
        <div
          key={dir}
          onMouseDown={(e) => handleResizeDown(e, dir)}
          style={{
            position: 'absolute',
            width: 8, height: 8,
            background: '#2563eb',
            borderRadius: 2,
            zIndex: 20,
            ...handlePos[dir],
          }}
        />
      ))}
    </div>
  );
}