import { useEffect, useState } from 'react';
import { api } from '../api';

export default function WaitingRoom() {
  const [q, setQ] = useState<any>(null);
  useEffect(() => {
    const load = () => api('/queue').then(setQ).catch(() => {});
    load();
    const t = setInterval(load, 1500);
    return () => clearInterval(t);
  }, []);
  if (!q) return null;
  return (
    <main className="tv" data-testid="waiting-room">
      <header><div className="logo" style={{ color: 'white', fontSize: 28 }}><span className="logo-mark">+</span>ClinicMind</div><div>{q.doctor}</div></header>
      <section className="tv-main">
        <div className="tv-now">
          <p>Now with the doctor</p>
          <div className="tv-token" data-testid="tv-now">{q.now ? q.now.token_no : '-'}</div>
          <p className="tv-name">{q.now?.name || ''}</p>
        </div>
        <div className="tv-next">
          <p>Next</p>
          {q.waiting.slice(0, 4).map((w: any, i: number) => (
            <div key={w.token_no} className="tv-row"><strong>{w.token_no}</strong><span>{w.name}</span><small>about {(i + 1) * q.minutes_each} min</small></div>
          ))}
          {!q.waiting.length && <p className="tv-empty">No one is waiting.</p>}
        </div>
      </section>
      <footer>
        <div><strong>Just arrived?</strong> Open your clinic page on your phone and tap "Check me in".<br /><span className="urdu" style={{ fontSize: 17, lineHeight: 1.9 }}>ابھی پہنچے ہیں؟ فون پر کلینک کا صفحہ کھول کر چیک اِن کریں۔</span></div>
      </footer>
    </main>
  );
}
