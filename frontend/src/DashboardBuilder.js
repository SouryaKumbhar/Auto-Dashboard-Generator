import { useState, useCallback, useRef } from "react";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const WidthGrid = GridLayout.WidthProvider(GridLayout);

export default function DashboardBuilder({
  widgets, onWidgetsChange, isEditMode, pageId, accent
}) {
  const storageKey = `rgl_layout_${pageId}`;

  function makeLayout(widgets) {
    return widgets.map((w, i) => ({
      i: w.id,
      x: (i % 3) * 4,
      y: Math.floor(i / 3) * 4,
      w: w.w || 4,
      h: w.h || 4,
      minW: 2, minH: 2
    }));
  }

  const [layout, setLayout] = useState(() => {
    try {
      const s = localStorage.getItem(storageKey);
      const parsed = s ? JSON.parse(s) : null;
      if (parsed && parsed.length === widgets.length) return parsed;
    } catch {}
    return makeLayout(widgets);
  });

  function onLayoutChange(newLayout) {
    setLayout(newLayout);
    localStorage.setItem(storageKey, JSON.stringify(newLayout));
    const updated = widgets.map(w => {
      const l = newLayout.find(n => n.i === w.id);
      return l ? { ...w, w: l.w, h: l.h } : w;
    });
    onWidgetsChange(updated);
  }

  const safeLayout = layout.length === widgets.length
    ? layout : makeLayout(widgets);

  return (
    <WidthGrid
      layout={safeLayout}
      cols={12}
      rowHeight={60}
      isDraggable={isEditMode}
      isResizable={isEditMode}
      onLayoutChange={onLayoutChange}
      draggableHandle=".widget-drag-handle"
      margin={[10, 10]}
      containerPadding={[10, 10]}
    >
      {widgets.map((widget, i) => (
        <div key={widget.id} style={{
          background: "#fff",
          borderRadius: 12,
          border: "0.5px solid #eee",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: isEditMode ? `0 0 0 2px ${accent}40` : "none",
          transition: "box-shadow 0.2s"
        }}>
          {/* Widget Header */}
          <div className="widget-drag-handle" style={{
            padding: "8px 12px",
            background: isEditMode ? `${accent}12` : "#fafafa",
            borderBottom: "0.5px solid #f0f0f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: isEditMode ? "grab" : "default",
            flexShrink: 0,
            userSelect: "none"
          }}>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#374151",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}>
              {isEditMode && "⠿ "}{widget.title}
            </span>
            {isEditMode && (
              <button
                onClick={() => onWidgetsChange(widgets.filter((_, j) => j !== i))}
                style={{
                  background: "none",
                  border: "none",
                  color: "#ef4444",
                  cursor: "pointer",
                  fontSize: 14,
                  padding: "0 2px",
                  flexShrink: 0
                }}>✕</button>
            )}
          </div>

          {/* Widget Content */}
          <div style={{ flex: 1, overflow: "hidden", padding: "6px" }}>
            {widget.render && widget.render()}
          </div>
        </div>
      ))}
    </WidthGrid>
  );
}