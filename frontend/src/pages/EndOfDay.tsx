import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, prettyDate } from '../api';
import { Loading } from '../components';

const NAMES: Record<string, string> = { visit_note: 'Visit note', prescription: 'Prescription', patient_instructions: 'Patient instructions', referral_letter: 'Referral letter', medical_certificate: 'Medical certificate' };

function Group({ title, count, children, empty }: { title: string; count: number; children: React.ReactNode; empty: string }) {
  return (
    <section className="card">
      <div className="between" style={{ marginBottom: 8 }}><h2 style={{ margin: 0 }}>{title}</h2><span className={`tag ${count ? '' : 'green'}`}>{count || 'Done'}</span></div>
      {count ? children : <p className="muted">{empty}</p>}
    </section>
  );
}

export default function EndOfDay() {
  const [w, setW] = useState<any>(null);
  useEffect(() => { api('/wrap-up/today').then(setW); }, []);
  if (!w) return <Loading />;
  const total = w.unsigned.length + w.abnormal.length + w.checks.length;
  return (
    <main className="page" style={{ maxWidth: 900 }} data-testid="end-of-day">
      <div className="page-head">
        <div><h1>End of day</h1><p className="sub">{total ? `${total} items still need you before you close the day.` : 'Everything is finished for today.'}</p></div>
      </div>
      <div className="stack">
        <Group title="Drafts to sign" count={w.unsigned.length} empty="All notes and documents are signed.">
          {w.unsigned.map((d: any) => <div key={d.id} className="list-line between"><span>{NAMES[d.draft_type] || d.draft_type}: {d.name}</span><Link className="chip" to={`/patients/${d.patient_id}`}>Open</Link></div>)}
        </Group>
        <Group title="Recent results outside the normal range" count={w.abnormal.length} empty="None in the last two weeks.">
          {w.abnormal.map((l: any) => <div key={l.id} className="list-line between"><span><strong>{l.name}:</strong> {l.label} {l.value_num} {l.unit} (normal {l.normal_range}), {prettyDate(l.date)}</span><Link className="chip" to={`/patients/${l.patient_id}`}>Open</Link></div>)}
        </Group>
        <Group title="Files waiting to be checked" count={w.checks.length} empty="All files are checked.">
          {w.checks.map((c: any) => <div key={c.id} className="list-line between"><span>{c.reason}</span><Link className="chip" to="/needs-checking">Check</Link></div>)}
        </Group>
        <Group title="Follow-ups" count={w.follow_ups.length} empty="No follow-ups are due.">
          {w.follow_ups.map((f: any) => <div key={f.id} className="list-line between"><span><strong>{f.name}:</strong> {f.reason}</span><span className={`tag ${f.status === 'approved' ? 'green' : ''}`}>{f.status === 'approved' ? 'Approved' : 'Waiting for you'}</span></div>)}
        </Group>
      </div>
    </main>
  );
}
