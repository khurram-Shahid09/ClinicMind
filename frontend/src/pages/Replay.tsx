import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { SourceChip, SourceProvider, Sparkline } from '../components';

const Body3D = lazy(() => import('../Body3D'));
// The app plays over 30 seconds. A demo recording can set a shorter time.
const DURATION = (window as unknown as { __demoReplaySeconds?: number }).__demoReplaySeconds || 30;
const LABS = [
  { code: 'hb', name: 'Hemoglobin', unit: 'g/dL' },
  { code: 'hba1c', name: 'HbA1c (blood sugar)', unit: '%' },
  { code: 'creatinine', name: 'Creatinine (kidneys)', unit: 'mg/dL' },
];

export default function Replay() {
  const { id } = useParams();
  const nav = useNavigate();
  const [script, setScript] = useState<any>(null);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const last = useRef(0);

  useEffect(() => { api(`/patients/${id}/replay`).then(setScript); }, [id]);
  useEffect(() => {
    if (!playing || !script) return;
    let raf = 0;
    last.current = performance.now();
    const tick = (now: number) => {
      const dt = (now - last.current) / 1000;
      last.current = now;
      setT((v) => {
        const next = Math.min(1, v + dt / DURATION);
        if (next >= 1) setPlaying(false);
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, script]);

  const view = useMemo(() => {
    if (!script?.events?.length) return null;
    const start = +new Date(script.start);
    const end = +new Date(script.end);
    const nowDate = start + (end - start) * t;
    const shown = script.events.filter((e: any) => +new Date(e.date) <= nowDate);
    const current = shown[shown.length - 1];
    const meds = [...new Set(shown.filter((e: any) => e.kind === 'medicine').map((e: any) => e.name))] as string[];
    const series = (code: string) => shown.filter((e: any) => e.code === code).map((e: any) => ({ value: e.value }));
    return { year: new Date(nowDate).getFullYear(), current, meds, series };
  }, [script, t]);

  const finished = t >= 1;
  const trend = script?.trend;
  const restart = () => { setT(0); setPlaying(true); };

  return (
    <SourceProvider>
      <div className="replay" data-testid="replay">
        <div className="replay-head">
          <div><h1 style={{ fontSize: 23 }}>Patient story</h1><p className="small" style={{ color: '#a9cdcf' }}>Built only from checked records.</p></div>
          <button className="btn" onClick={() => nav(`/patients/${id}`)} data-testid="replay-close">Close</button>
        </div>
        <div className="replay-main">
          <div className="replay-stage">
            <Suspense fallback={null}><Body3D region={finished && trend ? trend.region : view?.current?.region} /></Suspense>
            <div className="replay-year" data-testid="replay-year">{view?.year}</div>
            {!finished && view?.current && <div className="replay-caption">{view.current.text}</div>}
            {finished && trend && (
              <div className="trend-card" data-testid="trend-card">
                <span className="tag">Slow change found</span>
                <div className="trend-values"><span>{trend.first}</span><span className="arrow">→</span><span>{trend.last}</span><span className="small muted" style={{ fontWeight: 500 }}>{trend.unit}</span></div>
                <p style={{ fontWeight: 600, marginBottom: 6 }}>{trend.summary}</p>
                <p className="muted" style={{ marginBottom: 14 }}>{trend.detail} ClinicMind flags this for the doctor and does not say why it happened.</p>
                <SourceChip ids={trend.fact_ids} label={`See all ${trend.count} original reports`} />
              </div>
            )}
          </div>
          <div className="replay-side">
            {LABS.map((lab) => {
              const points = view?.series(lab.code) || [];
              const value = points[points.length - 1]?.value;
              return (
                <div key={lab.code} className={`replay-panel ${finished && trend?.code === lab.code ? 'watch' : ''}`}>
                  <div className="name"><span>{lab.name}</span><span className="val">{value !== undefined ? `${value} ${lab.unit}` : ''}</span></div>
                  <Sparkline points={points} height={62} color={lab.code === trend?.code ? '#f5b647' : '#5ad1c8'} />
                </div>
              );
            })}
            <div className="replay-panel">
              <div className="name" style={{ marginBottom: 6 }}>Medicines on record</div>
              {view?.meds.map((m: string) => <span key={m} className="med-chip">{m}</span>)}
            </div>
          </div>
        </div>
        <div className="replay-foot">
          <button className="btn" onClick={() => (finished ? restart() : setPlaying(!playing))}>{finished ? 'Play again' : playing ? 'Pause' : 'Play'}</button>
          <input type="range" min={0} max={1} step={0.001} value={t} onChange={(e) => { setPlaying(false); setT(+e.target.value); }} aria-label="Story timeline" />
          <p className="small" style={{ color: '#a9cdcf', maxWidth: 350 }}>Highlighted areas show where a test relates to the body. They do not show disease.</p>
        </div>
      </div>
    </SourceProvider>
  );
}
