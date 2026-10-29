import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import Shell from '../components/Shell';
import { api } from '../api';
import { useAuth } from '../auth';
import { WEEKDAY_OPTIONS } from '../lib/schedule';

type Client = {
  id: string;
  name: string;
  slug: string;
  postTimes: string[];
  timezone: string;
  postWeekdays: number[];
  generateLeadDays: number;
  maxGenerationsPerDay: number;
};

export default function ClientSchedulePage() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [time1, setTime1] = useState('10:00');
  const [time2, setTime2] = useState('18:00');
  const [timezone, setTimezone] = useState('Asia/Karachi');
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [generateLeadDays, setGenerateLeadDays] = useState(2);
  const [maxGenerationsPerDay, setMaxGenerationsPerDay] = useState(2);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role !== 'admin' || !token || !id) return;
    api<Client>(`/clients/${id}`, { token })
      .then((c) => {
        setClient(c);
        setTime1(c.postTimes?.[0] || '10:00');
        setTime2(c.postTimes?.[1] || '18:00');
        setTimezone(c.timezone || 'Asia/Karachi');
        setWeekdays(c.postWeekdays?.length ? c.postWeekdays : [1, 2, 3, 4, 5]);
        setGenerateLeadDays(c.generateLeadDays ?? 2);
        setMaxGenerationsPerDay(c.maxGenerationsPerDay ?? 2);
      })
      .catch((e) => setError(String(e.message || e)));
  }, [id, token, user?.role]);

  if (user?.role !== 'admin') return <Navigate to="/" replace />;

  function toggleDay(day: number) {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const times = [time1, time2].filter(Boolean);
      const next = await api<Client>(`/clients/${id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          postTimes: times,
          timezone,
          postWeekdays: weekdays,
          generateLeadDays,
          maxGenerationsPerDay,
        }),
      });
      setClient(next);
      setMsg('Posting schedule saved for this client.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  if (!client && !error) {
    return (
      <Shell>
        <p className="muted">Loading schedule…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <form className="card stack" onSubmit={save} style={{ maxWidth: 640 }}>
        <div className="row">
          <Link to="/clients" className="text-link">
            ← Clients
          </Link>
          <Link className="text-link" to={`/?clientId=${id}`}>
            Schedule a post
          </Link>
        </div>
        <h2>Posting schedule</h2>
        <p className="lede">
          {client?.name || 'Client'}: set the usual times posts should go live.
          New posts on Home will default to these times.
        </p>

        <h3>Twice a day</h3>
        <div className="grid-2">
          <label>
            First post time
            <input
              type="time"
              value={time1}
              onChange={(e) => setTime1(e.target.value)}
              required
            />
          </label>
          <label>
            Second post time
            <input
              type="time"
              value={time2}
              onChange={(e) => setTime2(e.target.value)}
              required
            />
          </label>
        </div>

        <label>
          Timezone
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            <option value="Asia/Karachi">Asia/Karachi (PKT)</option>
            <option value="Asia/Dubai">Asia/Dubai</option>
            <option value="Europe/London">Europe/London</option>
            <option value="America/New_York">America/New_York</option>
            <option value="UTC">UTC</option>
          </select>
        </label>

        <div>
          <p className="muted small" style={{ marginBottom: 8 }}>
            Posting days
          </p>
          <div className="row">
            {WEEKDAY_OPTIONS.map((d) => (
              <label key={d.value} className="check-row" style={{ gap: 6 }}>
                <input
                  type="checkbox"
                  checked={weekdays.includes(d.value)}
                  onChange={() => toggleDay(d.value)}
                />
                <span>{d.label}</span>
              </label>
            ))}
          </div>
        </div>

        <h3>Preparation</h3>
        <label>
          Prepare content this many days before posting
          <input
            type="number"
            min={0}
            max={14}
            value={generateLeadDays}
            onChange={(e) => setGenerateLeadDays(Number(e.target.value) || 2)}
          />
        </label>
        <label>
          Max AI content packs per day
          <input
            type="number"
            min={1}
            max={10}
            value={maxGenerationsPerDay}
            onChange={(e) =>
              setMaxGenerationsPerDay(Number(e.target.value) || 2)
            }
          />
        </label>
        <p className="muted small">
          Matches “twice a day”: content is created early for review; the global
          schedule check (Settings) still runs only twice daily so the server
          stays quiet.
        </p>

        {error ? <p className="error">{error}</p> : null}
        {msg ? <p className="success">{msg}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save schedule'}
        </button>
      </form>
    </Shell>
  );
}
