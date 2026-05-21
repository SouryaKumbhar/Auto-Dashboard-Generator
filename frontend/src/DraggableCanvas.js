import GridLayout from "react-grid-layout";
import { useState, useCallback } from "react";
import ChartCard from "./ChartCard";

const ResponsiveGrid = GridLayout.WidthProvider(GridLayout.Responsive);

const DEFAULT_COLS = { lg:12, md:10, sm:6, xs:4, xxs:2 };

export default function DraggableCanvas({
  charts, data, accent, numCols, catCols,
  onRemoveChart, onUpdateChart, isEditMode, pageId
}) {
  const storageKey = `layout_${pageId}`;

  const [layouts, setLayouts] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const buildDefaultLayout = useCallback(() => {
    return charts.map((chart, i) => ({
      i: chart.id || `chart_${i}`,
      x: (i % 2) * 6,
      y: Math.floor(i / 2) * 4,
      w: chart.size === "large" ? 12 : chart.size === "small" ? 4 : 6,
      h: chart.size === "large" ? 5 : chart.size === "small" ? 3 : 4,
      minW: 3, minH: 3
    }));
  }, [charts]);

  function handleLayoutChange(layout, allLayouts) {
    setLayouts(allLayouts);
    localStorage.setItem(storageKey, JSON.stringify(allLayouts));
  }

  const lgLayout = (layouts.lg?.length === charts.length)
    ? layouts.lg
    : buildDefaultLayout();

  return (
    <ResponsiveGrid
      className="layout"
      layouts={{ ...layouts, lg: lgLayout }}
      breakpoints={{ lg:1200, md:996, sm:768, xs:480, xxs:0 }}
      cols={DEFAULT_COLS}
      rowHeight={80}
      isDraggable={isEditMode}
      isResizable={isEditMode}
      onLayoutChange={handleLayoutChange}
      draggableHandle=".drag-handle"
      margin={[12, 12]}
    >
      {charts.map((chart, i) => (
        <div key={chart.id || `chart_${i}`}
          style={{ background:"#fff", borderRadius:12, border:"0.5px solid #eee", overflow:"hidden", display:"flex", flexDirection:"column" }}>

          {/* Drag handle bar */}
          {isEditMode && (
            <div className="drag-handle" style={{
              height:24, background:`${accent}15`, display:"flex", alignItems:"center",
              justifyContent:"space-between", padding:"0 10px", cursor:"grab", flexShrink:0
            }}>
              <span style={{ fontSize:10, color:accent, fontWeight:600 }}>⠿ drag to move · ↘ resize corner</span>
              <button onClick={() => onRemoveChart(i)} style={{ background:"none", border:"none", color:"#ef4444", cursor:"pointer", fontSize:13, padding:0 }}>✕</button>
            </div>
          )}

          <div style={{ flex:1, padding:"10px 14px", overflow:"hidden" }}>
            <ChartCard
              chart={chart}
              data={data}
              accent={accent}
              numCols={numCols}
              catCols={catCols}
              onRemove={isEditMode ? () => onRemoveChart(i) : null}
              onUpdate={updated => onUpdateChart(i, updated)}
            />
          </div>
        </div>
      ))}
    </ResponsiveGrid>
  );
}