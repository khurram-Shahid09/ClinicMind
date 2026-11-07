import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { api, prettyDate } from './api';

const SourceCtx = createContext<(ids: number[]) => void>(() => {});

export function SourceChip({ ids, label = 'See source' }: { ids: number[]; label?: string }) {
  const open = useContext(SourceCtx);
  if (!ids.length) return null;
  return <button className="chip" data-testid="source-chip" onClick={() => open(ids)}>▣ {label}</button>;
}

export function SourceProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<number[] | null>(null);
  return (
    <SourceCtx.Provider value={setIds}>
      {children}
      {ids && <SourceViewer ids={ids} onClose={() => setIds(null)} />}
    </SourceCtx.Provider>
  );
}

export const useOpenSource = () => useContext(SourceCtx);

function SourceViewer({ ids, onClose }: { ids: number[]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [source, setSource] = useState<any>(null);
  useEffect(() => { setSource(null); api(`/sources/${ids[index]}`).then(setSource); }, [ids, index]);
  const box = source?.box;
  const pad = 0.006;
  return (
    <div className="modal" onClick={onClose}>
      <div className="source" onClick={(e) => e.stopPropagation()} data-testid="source-viewer">
        <div style={{ minHeight: 0 }}>
          <div className="source-page">
            {source && <img src={source.image_url} alt={`Original document: ${source.file_name}`} />}
            {box && <div className="highlight" style={{ left: `${(box.x - pad) * 100}%`, top: `${(box.y - pad) * 100}%`, width: `${(box.w + pad * 2) * 100}%`, height: `${(box.h + pad * 2) * 100}%` }} />}
          </div>
        </div>
        <div className="source-side">
          <div className="between"><span className="tag brand">Original document</span><button className="btn small" onClick={onClose} data-testid="source-close">Close</button></div>
          {source && <>
            <div><h3 className="muted">{source.label}</h3><div className="source-value">{source.value} {source.unit || ''}</div></div>
            <p className="muted small">From the report dated {prettyDate(source.date)}.</p>
            {source.status === 'corrected' && <div className="notice green small">Confirmed by the doctor. The AI's first reading was {source.original_value}.</div>}
          </>}
          {ids.length > 1 && <div style={{ marginTop: 'auto' }}>
            <p className="small muted" style={{ marginBottom: 8 }}>Report {index + 1} of {ids.length}</p>
            <div className="row">
              <button className="btn" disabled={index === 0} onClick={() => setIndex(index - 1)}>Previous</button>
              <button className="btn primary" disabled={index === ids.length - 1} onClick={() => setIndex(index + 1)} data-testid="source-next">Next</button>
            </div>
          </div>}
        </div>
      </div>
    </div>
  );
}

export function Sparkline({ points, height = 80, color = '#0d7a78', progress = 1 }: { points: { value: number; date?: string }[]; height?: number; color?: string; progress?: number }) {
  if (!points.length) return null;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const W = 300;
  const x = (i: number) => (points.length === 1 ? W / 2 : 8 + (i * (W - 16)) / (points.length - 1));
  const y = (v: number) => height - 12 - ((v - min) / span) * (height - 24);
  const shown = points.slice(0, Math.max(1, Math.ceil(points.length * progress)));
  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} role="img" aria-label="Trend chart">
      <polyline fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={shown.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')} />
      {shown.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.value)} r="4" fill={color} />)}
    </svg>
  );
}

export function Loading() {
  return <div className="page muted">Loading...</div>;
}
