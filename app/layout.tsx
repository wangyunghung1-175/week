'use client';
// app/layout.tsx  — Root layout with nav + auth guard
import '../styles/globals.css';
import { useEffect, useState, createContext, useContext } from 'react';
import { createClient } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

// ── Auth context ──────────────────────────────────────────────────
export const AuthCtx = createContext<{ user: User | null; loading: boolean }>({ user: null, loading: true });
export function useAuth() { return useContext(AuthCtx); }

const TABS = [
  { id: 'weekly',  label: '📋 週報',   href: '/weekly'  },
  { id: 'monthly', label: '📅 月報',   href: '/monthly' },
  { id: 'annual',  label: '🎯 年度',   href: '/annual'  },
  { id: 'stats',   label: '📊 統計',   href: '/stats'   },
  { id: 'team',    label: '👥 團隊',   href: '/team'    },
] as const;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('weekly');
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    // Set active tab from URL
    const path = window.location.pathname.replace('/', '') || 'weekly';
    setTab(path);
    return () => subscription.unsubscribe();
  }, []);

  const handleNav = (id: string, href: string) => {
    setTab(id);
    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  // Show login if not authed
  if (!loading && !user) {
    return (
      <html lang="zh-TW">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>雙福輔導團 週報系統</title>
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#1a3a5c" />
        </head>
        <body>
          <AuthCtx.Provider value={{ user, loading }}>
            <LoginPage onLogin={setUser} />
          </AuthCtx.Provider>
        </body>
      </html>
    );
  }

  return (
    <html lang="zh-TW">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>雙福輔導團 週報系統</title>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1a3a5c" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        <AuthCtx.Provider value={{ user, loading }}>
          {/* ── Top bar ── */}
          <header style={{ background:'var(--primary)', color:'white', padding:'0 16px', height:'52px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100, boxShadow:'0 2px 8px rgba(0,0,0,0.2)' }}>
            <div>
              <div style={{ fontSize:'14px', fontWeight:700, letterSpacing:'0.04em' }}>雙福輔導團 · 工作週報</div>
              <div style={{ fontSize:'10px', opacity:0.6 }}>
                {user?.user_metadata?.display_name ?? user?.email ?? ''}
              </div>
            </div>
            <button
              onClick={signOut}
              style={{ background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.25)', color:'white', borderRadius:'6px', padding:'5px 12px', fontSize:'12px', cursor:'pointer' }}
            >登出</button>
          </header>

          {/* ── Nav tabs ── */}
          <nav style={{ background:'var(--primary)', borderTop:'1px solid rgba(255,255,255,0.1)', display:'flex', overflowX:'auto' }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => handleNav(t.id, t.href)}
                style={{
                  padding:'9px 18px', background:'none', border:'none', cursor:'pointer',
                  color: tab === t.id ? 'white' : 'rgba(255,255,255,0.55)',
                  borderBottom: tab === t.id ? '3px solid var(--accent)' : '3px solid transparent',
                  fontSize:'13px', fontWeight:500, whiteSpace:'nowrap', fontFamily:'inherit',
                  transition:'all 0.15s',
                }}
              >{t.label}</button>
            ))}
          </nav>

          {/* ── Page content ── */}
          <main style={{ maxWidth:'1200px', margin:'0 auto', padding:'18px 14px' }}>
            {children}
          </main>
        </AuthCtx.Provider>
      </body>
    </html>
  );
}

// ── Login Page ────────────────────────────────────────────────────
function LoginPage({ onLogin }: { onLogin: (u: User) => void }) {
  const [email, setEmail]   = useState('');
  const [pass,  setPass]    = useState('');
  const [mode,  setMode]    = useState<'login'|'signup'>('login');
  const [err,   setErr]     = useState('');
  const [ok,    setOk]      = useState('');
  const [busy,  setBusy]    = useState(false);
  const supabase = createClient();

  const submit = async () => {
    setBusy(true); setErr(''); setOk('');
    if (mode === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) setErr(error.message);
      else onLogin(data.user);
    } else {
      const { error } = await supabase.auth.signUp({ email, password: pass });
      if (error) setErr(error.message);
      else setOk('請確認您的 Email 後再登入');
    }
    setBusy(false);
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ background:'white', borderRadius:'14px', padding:'32px 28px', width:'100%', maxWidth:'380px', boxShadow:'0 12px 40px rgba(26,58,92,0.13)', border:'1px solid var(--border)' }}>
        <div style={{ textAlign:'center', marginBottom:'28px' }}>
          <div style={{ fontSize:'28px', marginBottom:'8px' }}>🏢</div>
          <div style={{ fontSize:'18px', fontWeight:700, color:'var(--primary)' }}>雙福輔導團</div>
          <div style={{ fontSize:'13px', color:'var(--text3)', marginTop:'4px' }}>工作週報系統</div>
        </div>

        {err && <div style={{ background:'rgba(192,57,43,0.08)', border:'1px solid rgba(192,57,43,0.2)', color:'var(--danger)', borderRadius:'6px', padding:'10px 12px', fontSize:'13px', marginBottom:'14px' }}>{err}</div>}
        {ok  && <div style={{ background:'rgba(46,139,87,0.08)', border:'1px solid rgba(46,139,87,0.2)', color:'var(--success)', borderRadius:'6px', padding:'10px 12px', fontSize:'13px', marginBottom:'14px' }}>{ok}</div>}

        <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          <div>
            <label style={{ fontSize:'11px', fontWeight:600, color:'var(--text2)', display:'block', marginBottom:'4px' }}>電子郵件</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"
              style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--border)', borderRadius:'7px', fontSize:'14px', fontFamily:'inherit', outline:'none' }}
              onKeyDown={e => e.key === 'Enter' && submit()}
            />
          </div>
          <div>
            <label style={{ fontSize:'11px', fontWeight:600, color:'var(--text2)', display:'block', marginBottom:'4px' }}>密碼</label>
            <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••"
              style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--border)', borderRadius:'7px', fontSize:'14px', fontFamily:'inherit', outline:'none' }}
              onKeyDown={e => e.key === 'Enter' && submit()}
            />
          </div>
          <button onClick={submit} disabled={busy}
            style={{ background:'var(--primary)', color:'white', border:'none', borderRadius:'8px', padding:'11px', fontSize:'14px', fontWeight:600, cursor:busy?'default':'pointer', opacity:busy?0.7:1, fontFamily:'inherit', marginTop:'4px' }}
          >{busy ? '處理中…' : mode === 'login' ? '登入' : '註冊帳號'}</button>
        </div>

        <div style={{ textAlign:'center', marginTop:'18px', fontSize:'13px', color:'var(--text3)' }}>
          {mode === 'login' ? '還沒有帳號？' : '已有帳號？'}
          <button onClick={() => { setMode(mode==='login'?'signup':'login'); setErr(''); }}
            style={{ background:'none', border:'none', color:'var(--accent)', cursor:'pointer', fontWeight:600, fontSize:'13px', marginLeft:'4px', fontFamily:'inherit' }}
          >{mode === 'login' ? '立即註冊' : '返回登入'}</button>
        </div>
      </div>
    </div>
  );
}
