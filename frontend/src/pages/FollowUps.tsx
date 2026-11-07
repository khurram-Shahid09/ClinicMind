import { useEffect, useState } from 'react';
import { api, post } from '../api';
import { Loading, SourceChip, SourceProvider } from '../components';

export default function FollowUps() {
  const [items, setItems] = useState<any[] | null>(null);
  const load = () => api('/follow-ups').then(setItems);
  useEffect(() => { load(); }, []);
  if (!items) return <Loading />;
  return (
    <SourceProvider>
      <main className="page" style={{ maxWidth: 900 }}>
        <div className="page-head">
          <div><h1>Follow-ups</h1><p className="sub">AI finds overdue tests and writes a reminder. Nothing goes out without your approval.</p></div>
          <span className="tag grey">This demo does not send messages</span>
        </div>
        <div className="stack">
          {items.map((d) => (
            <section key={d.id} className="card" data-testid="follow-up">
              <div className="between" style={{ marginBottom: 8 }}>
                <div><h2 style={{ margin: 0 }}>{d.name}</h2><p className="muted">{d.content.reason}</p></div>
                {d.content.fact_id && <SourceChip ids={[d.content.fact_id]} label="Last result" />}
              </div>
              <p className="urdu notice brand" style={{ marginBottom: 8 }}>{d.content.urdu}</p>
              <p className="small muted" style={{ marginBottom: 12 }}>{d.content.english}</p>
              {d.status === 'approved' ? <div className="notice green" data-testid="follow-up-approved">✓ Approved. Ready for the clinic to send.</div> : (
                <div className="row">
                  <button className="btn primary" data-testid="follow-up-approve" onClick={async () => { await post(`/drafts/${d.id}/approve`); load(); }}>Approve reminder</button>
                </div>
              )}
            </section>
          ))}
          {!items.length && <div className="card muted">No follow-ups are overdue.</div>}
        </div>
      </main>
    </SourceProvider>
  );
}
