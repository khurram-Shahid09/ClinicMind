import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, patch, post } from '../api';
import { Loading } from '../components';

const CHANNEL: Record<string, string> = { whatsapp: 'WhatsApp', sms: 'SMS', none: 'Not sent' };
const STATUS: Record<string, { label: string; cls: string }> = {
  sent: { label: 'Delivered (simulated)', cls: 'green' },
  waiting: { label: 'Waiting for you', cls: '' },
  skipped: { label: 'Skipped', cls: 'grey' },
  dismissed: { label: 'Dismissed', cls: 'grey' },
  failed: { label: 'Failed', cls: 'red' },
};

export default function Alerts() {
  const [data, setData] = useState<any>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [created, setCreated] = useState<number | null>(null);
  useEffect(() => { api('/automation').then(setData); }, []);
  if (!data) return <Loading />;
  const editRule = async (code: string, body: object) => setData(await patch(`/automation/rules/${code}`, body));
  const runNow = async () => { const r = await post('/automation/run'); setCreated(r.created); setData(r); };
  const act = async (id: number, action: string) => setData(await post(`/automation/messages/${id}/${action}`));
  const preview = data.messages.find((m: any) => m.id === selected) || data.messages.find((m: any) => m.channel !== 'none');

  return (
    <main className="page" style={{ maxWidth: 1320 }}>
      <div className="page-head">
        <div><h1>Auto Alerts</h1><p className="sub">ClinicMind checks every patient and sends reminders by WhatsApp or SMS, so nobody slips through.</p></div>
        <button className="btn primary big" onClick={runNow} data-testid="run-alerts">Check all patients now</button>
      </div>
      <div className="notice brand" style={{ marginBottom: 16 }}>
        <strong>Simulated delivery:</strong> no real message leaves this demo. {data.hook_on ? 'The message hook is connected.' : 'A real WhatsApp or SMS service can connect through the message hook.'} Checks also run automatically every 15 minutes.
      </div>
      {created !== null && <div className="notice green" style={{ marginBottom: 16 }} data-testid="alerts-created">✓ Checked all patients. {created} new {created === 1 ? 'alert' : 'alerts'} created.</div>}

      {data.doctor_alerts.length > 0 && (
        <section className="card" style={{ marginBottom: 16, borderColor: '#f2c0bd' }} data-testid="doctor-alerts">
          <h2>For you, doctor ({data.doctor_alerts.length})</h2>
          {data.doctor_alerts.map((a: any) => (
            <div key={a.id} className="list-line between" data-testid={a.rule_code === 'doctor_reading' ? 'reading-alert' : undefined}>
              <span>{a.rule_code === 'doctor_reading' && <span className="tag red" style={{ marginRight: 8 }}>Home reading</span>}{a.body_en}</span>
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <Link className="chip" to={`/patients/${a.patient_id}`}>Open</Link>
                <button className="chip" style={{ background: 'white' }} onClick={() => act(a.id, 'dismiss')}>Done</button>
              </div>
            </div>
          ))}
        </section>
      )}

      <div className="alerts-grid">
        <div className="stack">
          <section className="card">
            <h2>Rules</h2>
            <table>
              <thead><tr><th>When this happens</th><th style={{ width: 90 }}>On</th><th style={{ width: 170 }}>How it goes out</th></tr></thead>
              <tbody>
                {data.rules.map((r: any) => (
                  <tr key={r.code}>
                    <td><strong>{r.name}</strong><div className="small muted">{r.description}</div></td>
                    <td><label className="switch"><input type="checkbox" aria-label={`Turn ${r.name} on or off`} checked={r.enabled} onChange={(e) => editRule(r.code, { enabled: e.target.checked })} /><span /></label></td>
                    <td>{r.audience === 'doctor' ? <span className="tag brand">Straight to you</span> : (
                      <select aria-label={`How ${r.name} goes out`} value={r.auto_send ? 'auto' : 'ask'} onChange={(e) => editRule(r.code, { auto_send: e.target.value === 'auto' })} style={{ padding: '5px 8px', fontSize: 14 }}>
                        <option value="auto">Send automatically</option>
                        <option value="ask">Ask me first</option>
                      </select>
                    )}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="card" data-testid="message-list">
            <h2>Messages</h2>
            {data.messages.map((m: any) => (
              <div key={m.id} className={`list-line ${preview?.id === m.id ? 'chosen' : ''}`} onClick={() => setSelected(m.id)} style={{ cursor: 'pointer' }} data-testid={`message-${m.rule_code}`}>
                <div className="between">
                  <div className="row"><strong>{m.audience === 'family' ? `Family of ${m.name}` : m.name}</strong><span className={`tag ${m.channel === 'whatsapp' ? 'green' : 'grey'}`}>{CHANNEL[m.channel]}</span><span className="small muted">{m.rule_name}</span></div>
                  <span className={`tag ${STATUS[m.status]?.cls ?? ''}`}>{STATUS[m.status]?.label ?? m.status}</span>
                </div>
                {m.reason && <p className="small muted" style={{ marginTop: 4 }}>{m.reason}.</p>}
                {m.reply && <p className="small" style={{ marginTop: 4 }}><strong>Patient replied:</strong> {m.reply}</p>}
                {m.status === 'waiting' && (
                  <div className="row" style={{ marginTop: 8 }}>
                    <button className="btn small primary" data-testid={`approve-${m.rule_code}`} onClick={(e) => { e.stopPropagation(); act(m.id, 'approve'); }}>Approve and send</button>
                    <button className="btn small" onClick={(e) => { e.stopPropagation(); act(m.id, 'dismiss'); }}>Dismiss</button>
                  </div>
                )}
              </div>
            ))}
            {!data.messages.length && <p className="muted">No messages yet. Press "Check all patients now".</p>}
          </section>
        </div>
        <aside className="preview-phone" data-testid="phone-preview">
          <div className="wa-head">{preview ? (preview.channel === 'sms' ? 'SMS' : 'WhatsApp') : 'Message preview'}<small>{preview?.recipient || ''}</small></div>
          <div className="wa-body">
            {preview ? <>
              <div className="wa-bubble urdu-bubble" dir="rtl">{preview.body_ur}</div>
              <div className="wa-bubble" style={{ marginTop: 8 }}>{preview.body_en}</div>
              {preview.reply && <div className="wa-bubble mine">{preview.reply}</div>}
            </> : <p className="small" style={{ color: '#55696d', textAlign: 'center', marginTop: 90 }}>Select a message to preview it.</p>}
          </div>
        </aside>
      </div>
    </main>
  );
}
