import { useEffect, useState } from 'react';
import { api } from '../api';
import { Loading } from '../components';

export default function Activity() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => { api('/activity').then(setRows); }, []);
  if (!rows) return <Loading />;
  return (
    <main className="page">
      <div className="page-head"><div><h1>Activity</h1><p className="sub">A record of what each AI helper and person did.</p></div></div>
      <section className="card" style={{ padding: 8 }}>
        <table data-testid="activity">
          <thead><tr><th style={{ width: 150 }}>Who</th><th style={{ width: 150 }}>Step</th><th>What happened</th><th style={{ width: 150 }}>Patient</th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const person = r.actor !== 'AI helper';
              return (
                <tr key={r.id} style={person ? { background: 'var(--green-soft)' } : undefined}>
                  <td><strong>{person ? r.actor : 'AI helper'}</strong></td><td>{r.agent}</td><td>{r.summary}{r.status === 'needs_review' && <span className="tag" style={{ marginLeft: 8 }}>Asked a person</span>}</td><td className="muted">{r.name || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </main>
  );
}
