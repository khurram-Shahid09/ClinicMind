import { useEffect, useState } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { api, post } from './api';
import Today from './pages/Today';
import Patient from './pages/Patient';
import Replay from './pages/Replay';
import AddRecords from './pages/AddRecords';
import NeedsChecking from './pages/NeedsChecking';
import Visit from './pages/Visit';
import FollowUps from './pages/FollowUps';
import EndOfDay from './pages/EndOfDay';
import Activity from './pages/Activity';

export default function App() {
  const [status, setStatus] = useState<any>(null);
  const location = useLocation();

  useEffect(() => {
    let alive = true;
    const load = () => api('/status').then((s) => alive && setStatus(s)).catch(() => {});
    load();
    const t = setInterval(load, 2500);
    return () => { alive = false; clearInterval(t); };
  }, [location.pathname]);

  const reset = async () => {
    if (!confirm('Reset all demo data to the starting point?')) return;
    await post('/demo/reset');
    location.pathname === '/' ? window.location.reload() : window.location.assign('/');
  };

  if (status?.seeding) {
    return (
      <div className="page" style={{ textAlign: 'center', paddingTop: 120 }}>
        <h1>Preparing the demo</h1>
        <p className="sub">ClinicMind is reading the sample records. This takes a few minutes the first time.</p>
      </div>
    );
  }

  return (
    <>
      <header className="top">
        <NavLink to="/" className="logo"><span className="logo-mark">+</span>ClinicMind</NavLink>
        <nav className="nav">
          <NavLink to="/" end>Today</NavLink>
          <NavLink to="/add-records">Add Records</NavLink>
          <NavLink to="/needs-checking">Needs Checking {status?.open_checks > 0 && <span className="count">{status.open_checks}</span>}</NavLink>
          <NavLink to="/follow-ups">Follow-ups</NavLink>
          <NavLink to="/end-of-day">End of Day</NavLink>
          <NavLink to="/activity">Activity</NavLink>
        </nav>
        <div className="who">
          <span className="tag">Demo data</span>
          <span>{status?.doctor}</span>
          <button className="btn small no-print" style={{ padding: '4px 9px' }} onClick={reset} data-testid="reset">Reset</button>
        </div>
      </header>
      {status?.error && <div className="page" style={{ paddingBottom: 0 }}><div className="notice red">{status.error}</div></div>}
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/patients/:id" element={<Patient />} />
        <Route path="/patients/:id/story" element={<Replay />} />
        <Route path="/add-records" element={<AddRecords />} />
        <Route path="/needs-checking" element={<NeedsChecking />} />
        <Route path="/visits/:patientId/:visitId" element={<Visit />} />
        <Route path="/follow-ups" element={<FollowUps />} />
        <Route path="/end-of-day" element={<EndOfDay />} />
        <Route path="/activity" element={<Activity />} />
      </Routes>
    </>
  );
}
