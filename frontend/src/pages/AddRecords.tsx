import { DragEvent, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BASE_URL, post } from '../api';

const LANES = [
  { key: 'sort', title: '1. Sort files', sub: 'What kind of file is this?' },
  { key: 'match', title: '2. Find patient', sub: 'Whose file is this?' },
  { key: 'read', title: '3. Read details', sub: 'Tests, medicines, allergies' },
  { key: 'check', title: '4. Double-check', sub: 'Read it again and compare' },
  { key: 'save', title: '5. Added to record', sub: 'Checked and saved' },
];

type Tile = { name: string; lane: string; status: string; message: string };

export default function AddRecords() {
  const [tiles, setTiles] = useState<Record<string, Tile>>({});
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'failed'>('idle');
  const [saved, setSaved] = useState(false);
  const [headline, setHeadline] = useState('');
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const watch = (batch: number) => {
    setTiles({}); setState('running'); setHeadline('');
    const es = new EventSource(`${BASE_URL}/uploads/${batch}/events`);
    es.onmessage = (m) => {
      const e = JSON.parse(m.data);
      if (e.agent === 'summary') { if (e.status === 'done') setHeadline(e.message); return; }
      const person = e.status === 'needs_review' || e.status === 'failed';
      setTiles((all) => ({ ...all, [e.file_name]: { name: e.file_name, lane: person ? 'person' : e.agent, status: e.status, message: e.message } }));
    };
    es.addEventListener('end', (m: any) => {
      const b = JSON.parse(m.data);
      setSaved(!!b?.saved_run);
      setState(b?.status === 'done' ? 'done' : 'failed');
      es.close();
    });
  };

  const send = async (files: FileList | null) => {
    if (!files?.length) return;
    const form = new FormData();
    Array.from(files).forEach((f) => form.append('files', f));
    const res = await fetch(`${BASE_URL}/uploads`, { method: 'POST', body: form });
    watch((await res.json()).batch_id);
  };

  const drop = (e: DragEvent) => { e.preventDefault(); setOver(false); send(e.dataTransfer.files); };
  const all = Object.values(tiles);
  const inLane = (key: string) => all.filter((t) => t.lane === key);
  const person = inLane('person');

  return (
    <main className="page" style={{ maxWidth: 1320 }}>
      <div className="page-head">
        <div><h1>Add records</h1><p className="sub">Add old reports and prescriptions. AI helpers sort, read and double-check every file.</p></div>
        {state === 'done' && saved && <span className="tag brand" data-testid="saved-run">Saved run: results from an earlier real AI run</span>}
      </div>

      {state === 'idle' && (
        <div className={`drop ${over ? 'over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}>
          <h2 style={{ margin: 0 }}>Drop patient files here</h2>
          <p className="muted">Photos or PDFs. Use made-up files only in this demo.</p>
          <div className="row">
            <button className="btn" onClick={() => input.current?.click()}>Choose files</button>
            <button className="btn primary" data-testid="use-sample" onClick={async () => watch((await post('/uploads/sample')).batch_id)}>Use 20 sample files</button>
          </div>
          <input ref={input} type="file" multiple hidden accept="image/*,.pdf" onChange={(e) => send(e.target.files)} data-testid="file-input" />
        </div>
      )}

      {state !== 'idle' && (
        <>
          <div className="board" data-testid="board">
            {LANES.map((l) => (
              <div key={l.key} className={`lane ${l.key === 'save' ? 'finished' : ''}`}>
                <div className="lane-title">{l.title}</div>
                <div className="lane-sub">{l.sub}</div>
                <div className="lane-count">{l.key === 'save' ? inLane('save').length : inLane(l.key).length}</div>
                {inLane(l.key).slice(-9).map((t) => <div key={t.name} className={`tile ${t.status === 'running' ? 'active' : ''}`}>{t.name.replace(/\.(jpg|pdf)/, '')}</div>)}
              </div>
            ))}
            <div className="lane person">
              <div className="lane-title">Needs a person</div>
              <div className="lane-sub">The AI won't guess. It asks.</div>
              <div className="lane-count" data-testid="person-count">{person.length}</div>
              {person.map((t) => <div key={t.name} className="tile warn"><strong>{t.name.replace(/\.(jpg|pdf)/, '')}</strong><br />{t.message}</div>)}
            </div>
          </div>
          {state === 'done' && (
            <div className="notice green between" style={{ marginTop: 16 }} data-testid="board-done">
              <div><strong>Finished.</strong> {inLane('save').length} files added. {person.length} need a person to check.{headline && <> Brief updated: {headline}</>}</div>
              <Link className="btn primary" to="/needs-checking" data-testid="go-checking" style={{ whiteSpace: 'nowrap' }}>Check {person.length} files</Link>
            </div>
          )}
          {state === 'failed' && <div className="notice red" style={{ marginTop: 16 }}>Processing stopped. Please try again in a minute.</div>}
        </>
      )}
    </main>
  );
}
