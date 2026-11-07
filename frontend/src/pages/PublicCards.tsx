import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, prettyDate } from '../api';
import { Sparkline } from '../components';

export function EmergencyCard() {
  const { token } = useParams();
  const [c, setC] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => { api(`/emergency/${token}`).then(setC).catch((e) => setError(e.message)); }, [token]);
  if (error) return <main className="page"><div className="notice red">{error}</div></main>;
  if (!c) return null;
  return (
    <div className="pt-stage">
      <main className="pt-phone" data-testid="emergency-card">
        <div className="em-head">EMERGENCY CARD<small>Demo with made-up patients</small></div>
        <div className="pt-scroll pt-pad stack">
          <div><h1 style={{ fontSize: 28 }}>{c.name}</h1><p className="muted">{c.age} years, {c.sex}</p></div>
          <section className="em-allergy" data-testid="em-allergy">
            <h3>⚠ ALLERGIES</h3>
            {c.allergies.map((a: any) => <div key={a.label} style={{ fontSize: 23, fontWeight: 700 }}>{a.label}{a.reaction ? <span style={{ fontSize: 15, fontWeight: 500 }}> ({a.reaction})</span> : ''}</div>)}
            {!c.allergies.length && <div>None on record. This does not mean there are none.</div>}
          </section>
          <section className="pt-card"><h3>Conditions</h3>{c.conditions.map((x: string) => <div key={x}>{x}</div>)}</section>
          <section className="pt-card"><h3>Medicines on record</h3>{c.medicines.map((x: string) => <div key={x}>{x}</div>)}</section>
          <section className="pt-card"><h3>Emergency contact</h3><div>{c.family_name || 'None on record'}</div><div className="muted">{c.family_phone}</div><div className="small muted" style={{ marginTop: 6 }}>Clinic doctor: {c.clinic_doctor}</div></section>
          <p className="small muted">From clinic records. Latest record: {prettyDate(c.last_record)}. May not be complete, so please confirm when you can. This view is logged.</p>
        </div>
      </main>
    </div>
  );
}

export function SharedRecord() {
  const { token } = useParams();
  const [c, setC] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => { api(`/shared/${token}`).then(setC).catch((e) => setError(e.message)); }, [token]);
  if (error) return <main className="page" style={{ maxWidth: 560, textAlign: 'center', paddingTop: 100 }}><h1>This link has ended</h1><p className="sub" data-testid="share-ended">{error}</p></main>;
  if (!c) return null;
  return (
    <main className="page" style={{ maxWidth: 900 }} data-testid="shared-record">
      <div className="notice amber between" style={{ marginBottom: 16 }}>
        <span><strong>Shared by the patient.</strong> This private link ends on {new Date(c.expires_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}. Each view is shown to the patient.</span>
        <span className="tag">Demo data</span>
      </div>
      <section className="card">
        <h1>{c.name}</h1><p className="sub">{c.age} years, {c.sex}. Clinic doctor: {c.clinic_doctor}.</p>
        <div className="facts-strip">
          <div><h3>Conditions</h3>{c.conditions.map((x: string) => <div key={x}>{x}</div>)}</div>
          <div><h3>Allergies</h3>{c.allergies.map((a: any) => <strong key={a.label} style={{ color: 'var(--red)' }}>{a.label}</strong>)}</div>
          <div><h3>Medicines on record</h3>{c.medicines.map((x: string) => <div key={x}>{x}</div>)}</div>
        </div>
      </section>
      <section className="card" style={{ marginTop: 16 }}>
        <h2>Test results over time</h2>
        <div className="lab-grid">
          {c.labs.map((l: any) => <div key={l.code} className="lab-card"><strong>{l.name}</strong><div className="big-value">{l.value} <span className="small muted">{l.unit}</span></div><Sparkline points={l.history} /><p className="small muted">Normal: {l.range}. Latest: {prettyDate(l.date)}</p></div>)}
        </div>
      </section>
    </main>
  );
}
