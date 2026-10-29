import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import BrandMark from '../components/BrandMark';
import Shell from '../components/Shell';
import { api } from '../api';
import { useAuth } from '../auth';

type Settings = {
  dryRunPublish: boolean;
  cursorModel: string;
  googleFlowModel: string;
  videoProvider: 'auto' | 'heygen' | 'google_flow';
  cursorConfigured: boolean;
  heygenConfigured: boolean;
  googleFlowConfigured: boolean;
  dataforseoConfigured: boolean;
  cursorMasked: string;
  heygenMasked: string;
  googleFlowMasked: string;
  dataforseoLoginMasked: string;
  scheduleHours: number[];
  generateLeadDays: number;
};

export default function SettingsPage() {
  const { user, token } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [cursorApiKey, setCursorApiKey] = useState('');
  const [cursorModel, setCursorModel] = useState('composer-2.5');
  const [heygenApiKey, setHeygenApiKey] = useState('');
  const [googleFlowApiKey, setGoogleFlowApiKey] = useState('');
  const [googleFlowModel, setGoogleFlowModel] = useState(
    'gemini-omni-1.1-flash',
  );
  const [videoProvider, setVideoProvider] = useState<
    'auto' | 'heygen' | 'google_flow'
  >('auto');
  const [dataforseoLogin, setDataforseoLogin] = useState('');
  const [dataforseoPassword, setDataforseoPassword] = useState('');
  const [dryRunPublish, setDryRunPublish] = useState(true);
  const [scheduleHoursText, setScheduleHoursText] = useState('9,21');
  const [generateLeadDays, setGenerateLeadDays] = useState(2);
  const [msg, setMsg] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (user?.role !== 'admin' || !token) return;
    api<Settings>('/settings', { token }).then((s) => {
      setSettings(s);
      setDryRunPublish(s.dryRunPublish);
      setCursorModel(s.cursorModel || 'composer-2.5');
      setGoogleFlowModel(s.googleFlowModel || 'gemini-omni-1.1-flash');
      setVideoProvider(s.videoProvider || 'auto');
      setScheduleHoursText((s.scheduleHours || [9, 21]).join(','));
      setGenerateLeadDays(s.generateLeadDays || 2);
    });
  }, [token, user?.role]);

  if (user?.role !== 'admin') return <Navigate to="/" replace />;

  async function save(e: FormEvent) {
    e.preventDefault();
    const scheduleHours = scheduleHoursText
      .split(/[,\s]+/)
      .map((x) => Number(x.trim()))
      .filter((n) => !Number.isNaN(n) && n >= 0 && n <= 23);
    const next = await api<Settings>('/settings', {
      method: 'PUT',
      token,
      body: JSON.stringify({
        cursorApiKey: cursorApiKey || undefined,
        cursorModel: cursorModel || undefined,
        heygenApiKey: heygenApiKey || undefined,
        googleFlowApiKey: googleFlowApiKey || undefined,
        googleFlowModel: googleFlowModel || undefined,
        videoProvider,
        dataforseoLogin: dataforseoLogin || undefined,
        dataforseoPassword: dataforseoPassword || undefined,
        dryRunPublish,
        scheduleHours: scheduleHours.length ? scheduleHours : [9, 21],
        generateLeadDays,
      }),
    });
    setSettings(next);
    setCursorApiKey('');
    setHeygenApiKey('');
    setGoogleFlowApiKey('');
    setDataforseoLogin('');
    setDataforseoPassword('');
    setMsg('Settings saved.');
  }

  return (
    <Shell>
      <form className="settings-page" onSubmit={save}>
        <section className="card settings-hero">
          <div>
            <p className="eyebrow">Workspace</p>
            <h2>Settings</h2>
            <p className="lede">
              <BrandMark id="cursor" size="sm" /> power for posts and images.
              Schedule checks run twice a day so the server stays quiet
              otherwise.
            </p>
          </div>
          <div className="row">
            <span
              className={`badge ${settings?.cursorConfigured ? 'ok' : 'warn'}`}
            >
              <BrandMark
                id="cursor"
                size="sm"
                label={
                  settings?.cursorConfigured ? 'Cursor ready' : 'Cursor needed'
                }
              />
            </span>
            <span className={`badge ${dryRunPublish ? 'warn' : 'ok'}`}>
              {dryRunPublish ? 'Test mode' : 'Live posting'}
            </span>
          </div>
        </section>

        <div className="settings-grid">
          <section className="card stack">
            <h3>Schedule</h3>
            <label>
              Check times (hours 0 to 23, twice a day recommended)
              <input
                value={scheduleHoursText}
                onChange={(e) => setScheduleHoursText(e.target.value)}
                placeholder="9,21"
              />
            </label>
            <p className="muted small">
              Example <code>9,21</code> means 9:00 and 21:00. Drafts are prepared
              a few days early, then approved posts go out when due.
            </p>
            <label>
              Days before posting to prepare content
              <input
                type="number"
                min={0}
                max={14}
                value={generateLeadDays}
                onChange={(e) =>
                  setGenerateLeadDays(Number(e.target.value) || 2)
                }
              />
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={dryRunPublish}
                onChange={(e) => setDryRunPublish(e.target.checked)}
              />
              <span className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                Test mode. Do not post live to{' '}
                <BrandMark id="facebook" size="sm" /> or{' '}
                <BrandMark id="instagram" size="sm" /> yet
              </span>
            </label>
          </section>

          <section className="card stack">
            <h3>
              <BrandMark id="cursor" label="Cursor AI" />
            </h3>
            <label>
              API key{' '}
              {settings?.cursorMasked ? `(${settings.cursorMasked})` : ''}
              <input
                type="password"
                value={cursorApiKey}
                onChange={(e) => setCursorApiKey(e.target.value)}
                placeholder="Leave blank to keep current"
              />
            </label>
            <p className="muted small">
              Powers the <Link to="/agent">AI Agent</Link> and scheduled content
              packs.
            </p>
            <label>
              Model
              <input
                value={cursorModel}
                onChange={(e) => setCursorModel(e.target.value)}
              />
            </label>
          </section>
        </div>

        <section className="card stack">
          <div className="row spread">
            <h3>Advanced keys</h3>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowAdvanced((v) => !v)}
            >
              {showAdvanced ? 'Hide' : 'Show video and SEO keys'}
            </button>
          </div>

          {showAdvanced ? (
            <div className="settings-grid">
              <div className="stack">
                <label>
                  Video provider
                  <select
                    value={videoProvider}
                    onChange={(e) =>
                      setVideoProvider(
                        e.target.value as 'auto' | 'heygen' | 'google_flow',
                      )
                    }
                  >
                    <option value="auto">Auto</option>
                    <option value="google_flow">Google Flow</option>
                    <option value="heygen">HeyGen</option>
                  </select>
                </label>
                <label>
                  <span className="row" style={{ gap: 8 }}>
                    <BrandMark id="google" size="sm" /> / Gemini key{' '}
                    {settings?.googleFlowMasked
                      ? `(${settings.googleFlowMasked})`
                      : ''}
                  </span>
                  <input
                    type="password"
                    value={googleFlowApiKey}
                    onChange={(e) => setGoogleFlowApiKey(e.target.value)}
                  />
                </label>
                <label>
                  Flow model
                  <input
                    value={googleFlowModel}
                    onChange={(e) => setGoogleFlowModel(e.target.value)}
                  />
                </label>
              </div>
              <div className="stack">
                <label>
                  <span className="row" style={{ gap: 8 }}>
                    <BrandMark id="heygen" size="sm" /> key{' '}
                    {settings?.heygenMasked ? `(${settings.heygenMasked})` : ''}
                  </span>
                  <input
                    type="password"
                    value={heygenApiKey}
                    onChange={(e) => setHeygenApiKey(e.target.value)}
                  />
                </label>
                <label>
                  <span className="row" style={{ gap: 8 }}>
                    <BrandMark id="dataforseo" size="sm" /> login{' '}
                    {settings?.dataforseoLoginMasked
                      ? `(${settings.dataforseoLoginMasked})`
                      : ''}
                  </span>
                  <input
                    value={dataforseoLogin}
                    onChange={(e) => setDataforseoLogin(e.target.value)}
                  />
                </label>
                <label>
                  <span className="row" style={{ gap: 8 }}>
                    <BrandMark id="dataforseo" size="sm" /> password
                  </span>
                  <input
                    type="password"
                    value={dataforseoPassword}
                    onChange={(e) => setDataforseoPassword(e.target.value)}
                  />
                </label>
              </div>
            </div>
          ) : (
            <p className="muted small">
              Optional video providers and keyword research stay tucked away
              until you need them.
            </p>
          )}
        </section>

        <div className="settings-actions">
          {msg ? <p className="success">{msg}</p> : null}
          <button className="btn btn-primary" type="submit">
            Save settings
          </button>
        </div>
      </form>
    </Shell>
  );
}
