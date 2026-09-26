import { useEffect, useState } from 'react';
import { adminApi } from '../../api';
import { usePopup } from '../../context/PopupContext';

interface SettingsData {
  attendanceDateMode: 'forward' | 'backward';
  companyName: string;
  companyAddress: string;
  companyCin: string;
  directorName: string;
  siteUrl: string;
}

const inputCls =
  'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-700/20 focus:border-slate-600 transition-all';

const saveBtnCls = (enabled: boolean) =>
  `px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-colors disabled:opacity-50 ${
    enabled ? 'bg-slate-800 text-white hover:bg-slate-900' : 'bg-gray-100 text-gray-400'
  }`;

export default function AdminSettings() {
  const popup = usePopup();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [initial, setInitial] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .getSettings()
      .then((res) => {
        setSettings(res.data.settings);
        setInitial(res.data.settings);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const setVal = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) =>
    setSettings((s) => (s ? { ...s, [key]: value } : s));

  const save = async (section: string, data: Partial<SettingsData>, message: string) => {
    setSaving(section);
    try {
      const res = await adminApi.updateSettings(data);
      setSettings(res.data.settings);
      setInitial(res.data.settings);
      popup.success(message, 'Settings Saved');
    } catch (err: any) {
      popup.error(err.response?.data?.error || 'Could not save the settings.', 'Save Failed');
    } finally {
      setSaving(null);
    }
  };

  if (loading || !settings || !initial) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  const attendanceDirty = settings.attendanceDateMode !== initial.attendanceDateMode;
  const brandingDirty =
    settings.companyName !== initial.companyName ||
    settings.companyAddress !== initial.companyAddress ||
    settings.companyCin !== initial.companyCin ||
    settings.directorName !== initial.directorName;
  const verifyDirty = settings.siteUrl !== initial.siteUrl;
  const verifyBase = (settings.siteUrl || window.location.origin).replace(/\/+$/, '');

  const dateOptions: { value: 'forward' | 'backward'; title: string; desc: string }[] = [
    {
      value: 'forward',
      title: 'Forward dating',
      desc: 'Rows start on the enrollment date and run forwards — ideal for active interns.',
    },
    {
      value: 'backward',
      title: 'Backward dating',
      desc: 'Rows end on the download date and count backwards from today — ideal for completed programs.',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure attendance sheets, document branding and QR verification</p>
      </div>

      {/* Attendance Sheet Dating */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Attendance Sheet Dating</h2>
            <p className="text-sm text-gray-500 mt-1">
              Controls the date column on every attendance sheet PDF, applied to all students.
            </p>
          </div>
          <button
            onClick={() => save('attendance', { attendanceDateMode: settings.attendanceDateMode }, 'Attendance sheet dating updated.')}
            disabled={!attendanceDirty || saving !== null}
            className={saveBtnCls(attendanceDirty && saving === null)}
          >
            {saving === 'attendance' ? 'Saving…' : 'Save'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
          {dateOptions.map((opt) => {
            const selected = settings.attendanceDateMode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setVal('attendanceDateMode', opt.value)}
                className={`text-left rounded-xl border p-4 transition-all ${
                  selected
                    ? 'border-slate-800 ring-2 ring-slate-800/20 bg-slate-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">{opt.title}</p>
                  <span
                    className={`w-4 h-4 rounded-full border-2 shrink-0 ${
                      selected ? 'border-slate-800 bg-slate-800' : 'border-gray-300'
                    }`}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Document Branding */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Document Branding</h2>
            <p className="text-sm text-gray-500 mt-1">
              Company name, registered address and CIN printed on offer letters, project reports, attendance sheets and certificates.
            </p>
          </div>
          <button
            onClick={() =>
              save(
                'branding',
                {
                  companyName: settings.companyName.trim(),
                  companyAddress: settings.companyAddress.trim(),
                  companyCin: settings.companyCin.trim(),
                  directorName: settings.directorName.trim(),
                },
                'Document branding updated — new downloads will use it.'
              )
            }
            disabled={!brandingDirty || saving !== null}
            className={saveBtnCls(brandingDirty && saving === null)}
          >
            {saving === 'branding' ? 'Saving…' : 'Save'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Company Name</label>
            <input
              type="text"
              value={settings.companyName}
              onChange={(e) => setVal('companyName', e.target.value)}
              className={inputCls}
              placeholder="Company name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Company Address</label>
            <input
              type="text"
              value={settings.companyAddress}
              onChange={(e) => setVal('companyAddress', e.target.value)}
              className={inputCls}
              placeholder="Registered address"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Company CIN (Registration No.)
            </label>
            <input
              type="text"
              value={settings.companyCin}
              onChange={(e) => setVal('companyCin', e.target.value)}
              className={inputCls}
              placeholder="U85500BR2025PTC076013"
            />
            <p className="text-xs text-gray-400 mt-2">Printed as “CIN - …” on every document footer. Leave blank to hide it.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Director Name</label>
            <input
              type="text"
              value={settings.directorName}
              onChange={(e) => setVal('directorName', e.target.value)}
              className={inputCls}
              placeholder="Prashant Kumar"
            />
            <p className="text-xs text-gray-400 mt-2">Shown on offer letters and above the CEO designation on certificates.</p>
          </div>
        </div>
      </section>

      {/* Verification QR Link */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Verification QR Link</h2>
            <p className="text-sm text-gray-500 mt-1">
              Base URL embedded in the QR codes on all documents. Scanning opens the verification page for that document.
            </p>
          </div>
          <button
            onClick={() => save('verify', { siteUrl: settings.siteUrl.trim() }, 'Verification link updated — new QR codes will use it.')}
            disabled={!verifyDirty || saving !== null}
            className={saveBtnCls(verifyDirty && saving === null)}
          >
            {saving === 'verify' ? 'Saving…' : 'Save'}
          </button>
        </div>

        <div className="mt-5">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Site URL</label>
          <input
            type="url"
            value={settings.siteUrl}
            onChange={(e) => setVal('siteUrl', e.target.value)}
            className={inputCls}
            placeholder="https://your-domain.example"
          />
          <p className="text-xs text-gray-400 mt-2">
            Leave blank to use the default from <span className="font-mono">SITE_URL</span> / localhost. QR preview:{' '}
            <span className="font-mono text-gray-600 break-all">{verifyBase}/certification?id=…</span>
          </p>
        </div>
      </section>
    </div>
  );
}
