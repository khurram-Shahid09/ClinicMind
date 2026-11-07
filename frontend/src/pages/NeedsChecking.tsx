import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, post, prettyDate } from '../api';
import { Loading } from '../components';

function Crop({ item }: { item: any }) {
  const WIDTH = 420;
  const b = item.box;
  if (!b) return <img src={item.image_url} alt="The original file" style={{ width: '100%', height: 300, objectFit: 'cover', objectPosition: 'top', borderRadius: 10 }} />;
  const scale = (WIDTH / (Math.max(1, b[3] - b[1]) / 1000)) * 0.92;
  const height = (scale * 4) / 3;
  const left = -(b[1] / 1000) * scale + 12;
  const top = -((b[0] + b[2]) / 2000) * height + 85;
  return <div className="crop" data-testid="crop"><img src={item.image_url} alt="The unclear part of the original file" style={{ width: scale, height, left, top }} /></div>;
}

export default function NeedsChecking() {
  const [items, setItems] = useState<any[] | null>(null);
  const [custom, setCustom] = useState<Record<number, string>>({});
  const [done, setDone] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const load = () => api('/review-items').then(setItems);
  useEffect(() => { load(); }, []);
  const resolve = async (item: any, action: string, value?: string, patient_id?: number) => {
    setBusy(true);
    const r = await post(`/review-items/${item.id}/resolve`, { action, value, patient_id });
    setDone((d) => [...d, r.summary]);
    await load();
    setBusy(false);
  };
  if (!items) return <Loading />;
  return (
    <main className="page">
      <div className="page-head">
        <div><h1>Needs checking</h1><p className="sub">When the AI is unsure, it asks instead of guessing. You make the final call.</p></div>
        <Link className="btn" to="/activity" data-testid="see-activity">See activity log</Link>
      </div>
      <div className="stack">
        {done.map((d) => <div key={d} className="notice green" data-testid="resolved">✓ {d}. The record is updated.</div>)}
        {items.map((item) => (
          <section key={item.id} className="card review" data-testid={`review-${item.item_type}`}>
            <Crop item={item} />
            <div>
              <div className="row" style={{ marginBottom: 8 }}><span className="tag">{item.item_type === 'value' ? 'Unclear value' : item.item_type === 'patient_match' ? 'Patient does not match' : 'Too blurry to read'}</span><span className="small muted">{item.doc_date && prettyDate(item.doc_date)}</span></div>
              {item.label && <h2 style={{ marginBottom: 4 }}>{item.label} {item.frequency ? `(${item.frequency})` : ''}</h2>}
              <p style={{ marginBottom: 14 }}>{item.reason}</p>
              {item.item_type === 'value' && (
                <>
                  <div className="row" style={{ marginBottom: 12 }}>
                    {(item.options?.length ? item.options : [item.suggested_value]).filter(Boolean).map((o: string) => (
                      <button key={o} className="btn primary" disabled={busy} data-testid={`option-${o}`} onClick={() => resolve(item, 'correct', o)}>It says {o}</button>
                    ))}
                  </div>
                  <div className="row" style={{ flexWrap: 'nowrap' }}>
                    <input placeholder="Or type the correct value" value={custom[item.id] || ''} onChange={(e) => setCustom({ ...custom, [item.id]: e.target.value })} aria-label="Correct value" />
                    <button className="btn" disabled={busy || !custom[item.id]} onClick={() => resolve(item, 'correct', custom[item.id])}>Save</button>
                    <button className="btn" disabled={busy} onClick={() => resolve(item, 'reject')} style={{ whiteSpace: 'nowrap' }}>Remove it</button>
                  </div>
                </>
              )}
              {item.item_type === 'patient_match' && (
                <div className="row">
                  <button className="btn primary" disabled={busy} data-testid="keep-out" onClick={() => resolve(item, 'reject')}>Different patient. Keep it out.</button>
                  {item.options?.map((c: any) => <button key={c.id} className="btn" disabled={busy} onClick={() => resolve(item, 'attach', undefined, c.id)}>Attach to {c.name} ({c.mrn})</button>)}
                </div>
              )}
              {item.item_type === 'unreadable' && <button className="btn primary" disabled={busy} data-testid="clearer-photo" onClick={() => resolve(item, 'reject')}>Ask for a clearer photo</button>}
            </div>
          </section>
        ))}
        {!items.length && <div className="card" style={{ textAlign: 'center' }} data-testid="all-checked"><h2 style={{ margin: 0 }}>All checked</h2><p className="muted">Nothing is waiting for you.</p></div>}
      </div>
    </main>
  );
}
