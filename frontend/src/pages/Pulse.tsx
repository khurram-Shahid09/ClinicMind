import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Loading } from '../components';

function Tile({ value, label, note }: { value: string | number; label: string; note?: string }) {
  return <div className="card tile-stat"><div className="stat">{value}</div><strong>{label}</strong>{note && <p className="small muted">{note}</p>}</div>;
}

export default function Pulse() {
  const [d, setD] = useState<any>(null);
  useEffect(() => { api('/pulse').then(setD); }, []);
  if (!d) return <Loading />;
  return (
    <main className="page" data-testid="pulse">
      <div className="page-head"><div><h1>Clinic Pulse</h1><p className="sub">Your whole clinic at a glance, today.</p></div><Link className="btn" to="/waiting-room" target="_blank">Open waiting room screen</Link></div>
      <div className="stat-grid">
        <Tile value={d.visits} label="Patients booked today" />
        <Tile value={d.arrived} label="Checked in by QR" note={`${d.waiting} waiting, about ${d.wait_minutes} minutes`} />
        <Tile value={d.messages.sent} label="Reminders delivered" note={`${d.messages.replied} replied. ${d.messages.waiting} waiting for you.`} />
        <Tile value={d.doctor_alerts} label="Alerts for you" />
      </div>
      <div className="two" style={{ marginTop: 16 }}>
        <section className="card">
          <h2>Tests overdue</h2>
          {d.overdue.map((o: any, i: number) => <div key={i} className="list-line between"><span><strong>{o.name}:</strong> {o.text}</span><Link className="chip" to={`/patients/${o.id}`}>Open</Link></div>)}
          {!d.overdue.length && <p className="muted">Nothing is overdue.</p>}
          <h2 style={{ marginTop: 20 }}>Flagged home readings</h2>
          {d.flagged.map((f: any, i: number) => <div key={i} className="list-line between"><span><strong>{f.name}:</strong> {f.text}</span><Link className="chip" to={`/patients/${f.id}`}>Open</Link></div>)}
          {!d.flagged.length && <p className="muted">None.</p>}
        </section>
        <section className="card">
          <h2>Medicine ticks</h2>
          <p className="small muted" style={{ marginBottom: 10 }}>Share of doses ticked by patients. {d.follow_up_rule} This is self-reported.</p>
          {d.adherence.map((a: any) => (
            <div key={a.id} style={{ marginBottom: 10 }}>
              <div className="between small"><span>{a.name}</span><strong>{a.value}%</strong></div>
              <div className="bar"><span style={{ width: `${a.value}%` }} /></div>
            </div>
          ))}
          {!d.adherence.length && <p className="muted">No ticks yet.</p>}
        </section>
      </div>
    </main>
  );
}
