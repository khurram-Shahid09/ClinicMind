import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, BASE_URL, patch, post } from '../api';
import { Loading, SourceChip, SourceProvider } from '../components';

export default function Visit() {
  const { patientId, visitId } = useParams();
  const [patient, setPatient] = useState<any>(null);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<any>({});
  const [override, setOverride] = useState('');
  const [showOverride, setShowOverride] = useState(false);
  const [recording, setRecording] = useState(false);
  const [docs, setDocs] = useState<any[]>([]);
  const recorder = useRef<MediaRecorder | null>(null);
  const audioEl = useRef<HTMLAudioElement>(null);

  const load = () => api(`/visits/${visitId}/drafts`).then((r: any[]) => { setDrafts(r); setDocs(r.filter((d) => ['patient_instructions', 'referral_letter', 'medical_certificate'].includes(d.draft_type))); });
  useEffect(() => { api(`/patients/${patientId}`).then(setPatient); load(); }, [patientId, visitId]);

  const act = async (name: string, fn: () => Promise<unknown>) => {
    setBusy(name); setError('');
    try { await fn(); } catch (e: any) { setError(e.message); }
    setBusy('');
  };
  const dictate = (file?: Blob) => act('dictate', async () => {
    const body = new FormData();
    if (file) body.append('audio', file, 'dictation.webm');
    const res = await fetch(`${BASE_URL}/visits/${visitId}/dictation`, { method: 'POST', body });
    if (!res.ok) throw new Error((await res.json()).detail);
    await load();
  });
  const record = async () => {
    if (recording) { recorder.current?.stop(); setRecording(false); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const r = new MediaRecorder(stream);
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = () => { stream.getTracks().forEach((t) => t.stop()); dictate(new Blob(chunks, { type: 'audio/webm' })); };
      r.start();
      recorder.current = r;
      setRecording(true);
    } catch { setError('The microphone is not available. Please use the sample dictation.'); }
  };

  const note = drafts.find((d) => d.draft_type === 'visit_note');
  const rx = drafts.find((d) => d.draft_type === 'prescription');
  const meds: any[] = rx?.content?.medicines || [];
  const blocking = (rx?.alerts || []).filter((a: any) => a.blocking);

  const saveMed = () => act('save', async () => {
    const list = meds.map((m, i) => (i === editing ? { ...form, edited_by_doctor: true } : m));
    await patch(`/drafts/${rx.id}`, { content: { ...rx.content, medicines: list } });
    setEditing(null);
    await load();
  });
  const approve = () => act('approve', async () => {
    await post(`/drafts/${note.id}/approve`);
    await post(`/drafts/${rx.id}/approve`, { override_reason: override || null });
    setShowOverride(false);
    await load();
  });
  const makeDoc = (path: string, body?: unknown) => act('doc', async () => {
    await post(path, body);
    await load();
  });

  if (!patient) return <Loading />;
  const approved = rx?.status === 'approved';

  return (
    <SourceProvider>
      <main className="page steps" style={{ maxWidth: 940 }}>
        <div className="page-head" style={{ marginBottom: 4 }}>
          <div><h1>Today's visit: {patient.name}</h1><p className="sub">{patient.visit?.reason}. AI drafts it, and you approve it.</p></div>
          <Link className="btn no-print" to={`/patients/${patientId}`}>Back to patient</Link>
        </div>
        {error && <div className="notice red">{error}</div>}

        <section className="card no-print">
          <h2><span className="step-num">1</span>Speak your notes</h2>
          <div className="row">
            <button className="btn" onClick={record} disabled={!!busy}>{recording ? '■ Stop recording' : '● Record my voice'}</button>
            <button className="btn primary" data-testid="sample-dictation" disabled={!!busy || recording} onClick={() => { audioEl.current?.play().catch(() => {}); dictate(); }}>▶ Use sample dictation</button>
            {busy === 'dictate' && <span className="muted">Listening and writing the drafts...</span>}
          </div>
          <audio ref={audioEl} src={`${BASE_URL}/demo/sample-audio`} preload="auto" />
        </section>

        {note && <>
          <section className="card">
            <h2><span className="step-num">2</span>Check the drafts</h2>
            <p className="small muted" style={{ marginBottom: 6 }}>What the AI heard:</p>
            <p className="transcript" style={{ marginBottom: 16 }} data-testid="transcript">{note.transcript}</p>
            <h3>Visit note</h3>
            <table style={{ marginBottom: 18 }}><tbody>
              <tr><td style={{ width: 130, fontWeight: 600 }}>Complaint</td><td>{note.content.complaint || '-'}</td></tr>
              <tr><td style={{ fontWeight: 600 }}>Findings</td><td>{note.content.findings || '-'}</td></tr>
              <tr><td style={{ fontWeight: 600 }}>Plan</td><td>{note.content.plan || '-'}</td></tr>
            </tbody></table>

            <h3>Prescription</h3>
            {(rx.alerts || []).map((a: any, i: number) => (
              <div key={i} className={`notice ${a.blocking ? 'red' : 'amber'}`} style={{ margin: '10px 0' }} data-testid={`alert-${a.type}`}>
                <div className="between"><strong>{a.blocking ? '⚠ Allergy alert' : 'Please confirm'}</strong><SourceChip ids={[a.fact_id]} label="See record" /></div>
                <p>{a.text}</p>
              </div>
            ))}
            {rx.not_dictated?.length > 0 && <div className="notice red">Not dictated by the doctor: {rx.not_dictated.join(', ')}.</div>}
            <table><thead><tr><th>Medicine</th><th>Dose</th><th>How often</th><th>For how long</th><th /></tr></thead><tbody>
              {meds.map((m, i) => editing === i ? null : (
                <tr key={i} data-testid="rx-row"><td><strong>{m.name}</strong></td><td>{m.dose}</td><td>{m.frequency}</td><td>{m.duration || '-'}</td>
                  <td>{!approved && <button className="btn small" data-testid={`change-${m.name}`} onClick={() => { setEditing(i); setForm(m); }}>Change</button>}</td></tr>
              ))}
            </tbody></table>
            {editing !== null && (
              <div className="med-edit" style={{ marginTop: 12 }} data-testid="med-edit">
                <div><label htmlFor="n">Medicine</label><input id="n" data-testid="med-name" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><label htmlFor="d">Dose</label><input id="d" data-testid="med-dose" value={form.dose || ''} onChange={(e) => setForm({ ...form, dose: e.target.value })} /></div>
                <div><label htmlFor="f">How often</label><input id="f" data-testid="med-frequency" value={form.frequency || ''} onChange={(e) => setForm({ ...form, frequency: e.target.value })} /></div>
                <div><label htmlFor="t">How long</label><input id="t" data-testid="med-duration" value={form.duration || ''} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></div>
                <button className="btn primary" data-testid="med-save" onClick={saveMed}>Save</button>
              </div>
            )}
            <p className="small muted" style={{ margin: '12px 0' }}>No alert does not mean a prescription is safe. This only checks the patient's recorded allergies and medicines.</p>
            {approved ? <div className="notice green" data-testid="approved">✓ Approved by {patient && 'the doctor'}.</div> : (
              <div className="row">
                <button className="btn primary big" data-testid="approve" disabled={!!busy || blocking.length > 0 && !showOverride || showOverride && !override.trim()} onClick={approve}>Approve note and prescription</button>
                {blocking.length > 0 && !showOverride && <button className="btn" onClick={() => setShowOverride(true)}>Continue with a reason</button>}
                {showOverride && <input placeholder="Why are you continuing despite the alert?" value={override} onChange={(e) => setOverride(e.target.value)} style={{ maxWidth: 360 }} />}
              </div>
            )}
          </section>

          {approved && (
            <section className="card">
              <h2><span className="step-num">3</span>Create documents</h2>
              <div className="row no-print" style={{ marginBottom: 14 }}>
                <button className="btn primary" data-testid="make-urdu" disabled={!!busy} onClick={() => makeDoc(`/drafts/${rx.id}/patient-instructions`)}>Urdu instructions for the patient</button>
                <button className="btn" data-testid="make-referral" disabled={!!busy} onClick={() => makeDoc(`/patients/${patientId}/documents`, { kind: 'referral_letter', to: 'Consultant Physician', reason: 'Please review the slow fall in hemoglobin shown in the attached record.', visit_id: Number(visitId) })}>Referral letter</button>
                <button className="btn" data-testid="make-certificate" disabled={!!busy} onClick={() => makeDoc(`/patients/${patientId}/documents`, { kind: 'medical_certificate', days: 2, reason: 'Seen for a sore throat', visit_id: Number(visitId) })}>Medical certificate</button>
                {busy === 'doc' && <span className="muted">Writing the draft...</span>}
              </div>
              <div className="stack">
                {docs.map((d) => (
                  <div key={d.id} data-testid={`doc-${d.draft_type}`}>
                    <div className="between" style={{ marginBottom: 7 }}><h3 style={{ margin: 0 }}>{d.draft_type === 'patient_instructions' ? 'Patient instructions' : d.content.subject}</h3><div className="row no-print">{d.status === 'approved' ? <span className="tag green" data-testid={`doc-approved-${d.draft_type}`}>✓ Approved</span> : <button className="btn small primary" data-testid={`approve-${d.draft_type}`} onClick={() => act('doc', async () => { await post(`/drafts/${d.id}/approve`); await load(); })}>Approve</button>}<button className="btn small" onClick={() => window.print()}>Print</button></div></div>
                    {d.draft_type === 'patient_instructions' ? (
                      <div className="letter urdu">
                        <p style={{ fontWeight: 600 }}>{d.content.title}</p>
                        {d.content.medicines?.map((m: any) => <p key={m.name}><span dir="ltr" style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 16 }}>{m.name}</span>: {m.urdu}</p>)}
                        {d.content.advice?.map((a: string) => <p key={a}>{a}</p>)}
                      </div>
                    ) : <div className="letter">{d.content.body}</div>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>}
      </main>
    </SourceProvider>
  );
}
