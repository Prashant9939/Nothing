import { useEffect, useRef, useState } from 'react';
import {
  BadgeCheck,
  Briefcase,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  MessageCircle,
  Megaphone,
  QrCode,
  Rocket,
  ShieldCheck,
  X,
} from 'lucide-react';

const CHANNEL_URL = 'https://www.whatsapp.com/channel/0029VbDhT1UKWEL0Yx5dKV0i';
const FLAG_KEY = 'iq:channel-banner';

const FEATURES = [
  { icon: Rocket, tint: 'bg-blue-50 text-blue-600', title: 'Internship Opportunities', desc: 'Get updates about new internship programs.' },
  { icon: Megaphone, tint: 'bg-red-50 text-red-500', title: 'Important Updates', desc: 'Stay informed about deadlines and announcements.' },
  { icon: GraduationCap, tint: 'bg-purple-50 text-purple-600', title: 'Learning Resources', desc: 'Discover useful courses, projects and career resources.' },
  { icon: Briefcase, tint: 'bg-amber-50 text-amber-600', title: 'Career Opportunities', desc: 'Get notified about opportunities that can help you grow.' },
];

const AVATARS = [
  { initials: 'AK', tint: 'bg-amber-100 text-amber-700' },
  { initials: 'PS', tint: 'bg-blue-100 text-blue-700' },
  { initials: 'NK', tint: 'bg-purple-100 text-purple-700' },
  { initials: 'VM', tint: 'bg-rose-100 text-rose-700' },
];

function QrBox({ className = '' }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      {/* soft emerald glow that breathes behind the card */}
      <span className="pointer-events-none absolute -inset-2 animate-qr-glow rounded-3xl bg-emerald-400/30 blur-lg" />
      <div className="relative rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        {/* rounded/gradient QR with iQ logo center — sheen sweeps across */}
        <div className="relative mx-auto h-40 w-40 overflow-hidden rounded-lg sm:h-44 sm:w-44">
          <img
            src="/channel-qr.svg"
            alt="QR code to join the IQIntern WhatsApp channel"
            className="h-full w-full"
          />
          <span className="pointer-events-none absolute inset-y-0 -left-16 w-16 animate-qr-sheen bg-gradient-to-r from-transparent via-white/55 to-transparent" />
        </div>
        {/* breathing corner brackets */}
        <span className="absolute -left-2 -top-2 h-7 w-7 animate-qr-bracket rounded-tl-lg border-[3px] border-b-0 border-r-0 border-emerald-500 [transform-origin:100%_100%]" />
        <span className="absolute -right-2 -top-2 h-7 w-7 animate-qr-bracket rounded-tr-lg border-[3px] border-b-0 border-l-0 border-emerald-500 [animation-delay:0.15s] [transform-origin:0_100%]" />
        <span className="absolute -bottom-2 -left-2 h-7 w-7 animate-qr-bracket rounded-bl-lg border-[3px] border-r-0 border-t-0 border-emerald-500 [animation-delay:0.3s] [transform-origin:100%_0]" />
        <span className="absolute -bottom-2 -right-2 h-7 w-7 animate-qr-bracket rounded-br-lg border-[3px] border-l-0 border-t-0 border-emerald-500 [animation-delay:0.45s] [transform-origin:0_0]" />
      </div>
    </div>
  );
}

function JoinButton({ btnRef, className = '' }: { btnRef?: React.Ref<HTMLAnchorElement>; className?: string }) {
  return (
    <a
      ref={btnRef}
      href={CHANNEL_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#25D366] to-[#16a34a] px-4 py-3.5 text-[15px] font-bold text-white shadow-[0_10px_28px_rgba(22,163,74,0.35)] transition-all hover:-translate-y-0.5 hover:from-[#20c25c] hover:to-[#158f41] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${className}`}
    >
      <MessageCircle size={19} className="fill-white/20" />
      Join WhatsApp Channel
      <ChevronRight size={18} />
    </a>
  );
}

// One-shot promo shown right after a user logs in (or registers):
// login/register writes the flag, StudentLayout renders this component,
// and the flag is consumed here so it never repeats within the session.
// Desktop = two-panel modal (info + scan), mobile = stacked sheet with
// collapsible QR, mirroring the approved reference designs.
export default function ChannelPromoBanner() {
  const [open, setOpen] = useState(() => {
    try {
      return sessionStorage.getItem(FLAG_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [showMobileQr, setShowMobileQr] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    try {
      sessionStorage.removeItem(FLAG_KEY);
    } catch {
      // sessionStorage unavailable
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    cardRef.current?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  const close = () => setOpen(false);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Stay connected with IQIntern on WhatsApp"
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="animate-pop-in relative max-h-[92vh] w-full max-w-5xl overflow-x-hidden overflow-y-auto rounded-t-3xl bg-white text-slate-900 shadow-[0_30px_90px_rgba(0,0,0,0.45)] outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:max-h-[90vh] sm:rounded-3xl lg:grid lg:grid-cols-[1.4fr_1fr]"
      >
        <button
          onClick={close}
          aria-label="Close"
          className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg ring-1 ring-slate-200 transition-all hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
        >
          <X size={18} />
        </button>

        {/* ---------- Left / stacked: brand + pitch ---------- */}
        <div className="relative z-10 px-6 pb-7 pt-7 sm:px-8 sm:pt-8 lg:pb-8">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 pr-12">
            <img src="/logo/logo-trimmed.png" alt="IQIntern" className="h-9 w-auto" />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-inset ring-emerald-200/70">
              <BadgeCheck size={14} className="text-emerald-600" />
              Official IQIntern Channel
            </span>
          </div>

          <div className="mt-6 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-[30px] font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-4xl">
                Stay Connected
                <br className="hidden sm:block" /> with <span className="text-orange-500">IQIntern</span>
              </h2>
              <svg width="136" height="16" viewBox="0 0 136 16" fill="none" className="-mt-1 ml-1" aria-hidden="true">
                <path d="M4 11C36 4 74 13 132 5" stroke="#f97316" strokeWidth="5" strokeLinecap="round" />
              </svg>
            </div>

            {/* 3D-style WhatsApp tile + sticker (desktop) */}
            <div className="relative hidden shrink-0 rotate-[-6deg] lg:block">
              <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-emerald-400 via-[#25D366] to-emerald-600 shadow-[0_16px_34px_rgba(37,211,102,0.45)] ring-4 ring-white">
                <MessageCircle className="h-8 w-8 text-white" strokeWidth={2.4} />
              </div>
              <div className="absolute -right-14 -top-10 w-28 rotate-[7deg] rounded-xl bg-emerald-500 px-2 py-1.5 text-center text-[10px] font-bold leading-tight text-white shadow-lg">
                Don't Miss Your Next Opportunity!
              </div>
              <span className="absolute -left-7 top-2 h-4 w-1.5 rotate-[-35deg] rounded-full bg-emerald-400" />
              <span className="absolute -left-6 top-9 h-4 w-1.5 rotate-[-35deg] rounded-full bg-emerald-300" />
              <span className="absolute -bottom-4 right-0 h-1.5 w-5 rotate-45 rounded-full bg-amber-400" />
            </div>
          </div>

          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-600">
            Join our official WhatsApp Channel for internship updates, learning resources, career
            opportunities, important announcements and more.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-shadow hover:shadow-sm"
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${f.tint}`}>
                  <f.icon size={18} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-800">{f.title}</h3>
                  <p className="mt-0.5 text-xs leading-snug text-slate-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex -space-x-2.5">
              {AVATARS.map((a) => (
                <span
                  key={a.initials}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold ring-2 ring-white ${a.tint}`}
                >
                  {a.initials}
                </span>
              ))}
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500 ring-2 ring-white">
                +
              </span>
            </div>
            <p className="text-sm text-slate-600">
              Join other students staying updated with{' '}
              <span className="font-bold text-slate-800">IQIntern</span>.
            </p>
          </div>

          {/* ---------- Mobile-only actions ---------- */}
          <div className="mt-6 lg:hidden">
            <JoinButton />
            <button
              onClick={close}
              className="mt-3 w-full text-center text-sm font-semibold text-slate-500 transition-colors hover:text-slate-700"
            >
              Maybe Later
            </button>
            <button
              onClick={() => setShowMobileQr((v) => !v)}
              aria-expanded={showMobileQr}
              className="mt-4 flex w-full items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 transition-colors hover:text-emerald-800"
            >
              <QrCode size={14} />
              Or scan with laptop / another phone
              <ChevronDown size={14} className={`transition-transform ${showMobileQr ? 'rotate-180' : ''}`} />
            </button>
            {showMobileQr && (
              <div className="mt-4 flex justify-center pb-1">
                <QrBox />
              </div>
            )}
          </div>
        </div>

        {/* ---------- Right: scan-to-join (desktop) ---------- */}
        <aside className="relative z-0 hidden flex-col border-l border-emerald-100 bg-gradient-to-b from-emerald-50 via-emerald-50/60 to-white px-8 py-8 lg:flex">
          <div className="text-center">
            <h3 className="text-2xl font-extrabold tracking-tight text-slate-900">Scan to Join</h3>
            <p className="mx-auto mt-2 max-w-[17rem] text-sm leading-relaxed text-slate-600">
              Open WhatsApp and scan this QR code to join the official IQIntern Channel.
            </p>
          </div>

          <div className="mt-6 flex justify-center">
            <QrBox />
          </div>

          <div className="mx-auto mt-5 flex items-center gap-2 rounded-full bg-white px-3.5 py-2 shadow-sm ring-1 ring-slate-100">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#25D366]">
              <MessageCircle size={13} className="text-white" />
            </span>
            <BadgeCheck size={15} className="text-blue-500" />
            <span className="text-xs font-bold text-slate-800">Official IQIntern WhatsApp Channel</span>
          </div>

          <div className="mt-auto pt-7">
            <JoinButton />
            <button
              onClick={close}
              className="mt-3 w-full rounded-xl bg-white py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            >
              Maybe Later
            </button>
            <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-500">
              <ShieldCheck size={14} className="text-emerald-600" />
              Free to join&nbsp; •&nbsp; Official IQIntern updates&nbsp; •&nbsp; No spam
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
