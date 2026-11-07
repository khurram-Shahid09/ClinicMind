import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, prettyDate } from '../api';
import { Loading, SourceChip, SourceProvider } from '../components';

export default function Today() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  useEffect(() => {
    api('/today').then((r) => { setRows(r); if (r[0]) setOpenId(r[0].id); });
    api('/status').then(setStatus);
  }, []);
  if (!rows) return <Loading />;
  return (
    <SourceProvider>
      <main className="page">
        <div className="page-head">
          <div>
            <h1>Today's patients</h1>
            <p className="sub">{prettyDate(status?.today)}. Your AI helpers prepared these briefs before clinic started.</p>
          </div>
          <span className="tag green">{rows.length} briefs ready</span>
        </div>
        <div className="stack">
          {rows.map((p) => {
            const open = openId === p.id;
            return (
              <section key={p.id} className="card patient-row" data-testid={`today-${p.mrn}`}>
                <div className="patient-row-head" onClick={() => setOpenId(open ? null : p.id)} style={{ cursor: 'pointer' }}>
                  <span className="time">{p.visit_time}</span>
                  <div>
                    <h3 style={{ margin: 0 }}>{p.name}</h3>
                    <p className="small muted">{p.age} years. {p.reason}.</p>
                  </div>
                  <div className="row">
                    {p.has_trend && <span className="tag">Slow change found</span>}
                    {p.alerts.length > 0 && <span className="tag red">Test overdue</span>}
                  </div>
                </div>
                {open && p.brief && (
                  <div className="brief">
                    <strong>Your brief</strong>
                    <ul>
                      {p.brief.items.map((item: any, i: number) => (
                        <li key={i}>{item.text} <SourceChip ids={item.fact_ids} label={item.fact_ids.length > 1 ? `${item.fact_ids.length} sources` : 'Source'} /></li>
                      ))}
                    </ul>
                    <Link className="btn primary" to={`/patients/${p.id}`} data-testid={`open-${p.mrn}`}>Open patient</Link>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </main>
    </SourceProvider>
  );
}
