'use client';
// app/annual/page.tsx
import { useState, useEffect } from 'react';
import { createClient, CORE_GOALS, GOAL_COLORS, getWeekDates } from '../../lib/supabase';
import { useAuth } from '../AppShell';

const GOAL_SUBCATS: Record<string, string[]> = {
  '創新驅動': ['政策與服務研發', '國際新知與服務模組'],
  '雙福文化': ['雙福事工推動', '海外雙福合作'],
  '組織動能': ['服務策略轉型協作', '政策與服務建議', '推展實務研究'],
  '人才培育': ['人才培訓架構'],
  '行政作業': ['共同項目-行政管理', '共同項目-個人行政庶務'],
};

export default function AnnualPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [year, setYear]           = useState('2025');
  const [weeklyData, setWeeklyData] = useState<Record<string,any>>({});
  const [plan, setPlan]           = useState<Record<string, { jobPct: string; planPct: string; note: string }>>({});
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);

  useEffect(() => {
    try { const d = localStorage.getItem('sf_weekly'); if (d) setWeeklyData(JSON.parse(d)); } catch {}
    // Load plan from localStorage
    try {
      const p = localStorage.getItem(`sf_annual_${year}`);
      if (p) setPlan(JSON.parse(p));
      else setPlan(Object.fromEntries(CORE_GOALS.map(g => [g, { jobPct:'', planPct:'', note:'' }])));
    } catch {
      setPlan(Object.fromEntries(CORE_GOALS.map(g => [g, { jobPct:'', planPct:'', note:'' }])));
    }
  }, [year]);

  // Compute actual hours per goal and per subcat
  const goalActual: Record<string,number> = {};
  const subcatActual: Record<string,number> = {};
  CORE_GOALS.forEach(g => goalActual[g] = 0);
  Object.keys(weeklyData).forEach(wk => {
    if (!wk.startsWith(year)) return;
    (weeklyData[wk].items || []).forEach((item: any) => {
      if (item.goal && goalActual[item.goal] !== undefined) goalActual[item.goal] += item.hours || 0;
      const parts = (item.key || '').split('|');
      const sc = parts[1] || '';
      if (sc) subcatActual[`${item.goal}|${sc}`] = (subcatActual[`${item.goal}|${sc}`] || 0) + (item.hours || 0);
    });
  });
  const totalActualHrs = Object.values(goalActual).reduce((a,b) => a+b, 0) || 1;

  // Monthly hours for trend chart
  const monthHours = Array.from({length:12},(_,i)=>i+1).map(m => {
    let h = 0;
    Object.keys(weeklyData).forEach(wk => {
      if (!wk.startsWith(year)) return;
      const { mon } = getWeekDates(wk);
      if (mon.getMonth()+1 === m) h += weeklyData[wk].actual || 0;
    });
    return h;
  });
  const maxMH = Math.max(...monthHours, 1);

  const updatePlan = (goal: string, field: string, val: string) => {
    setPlan(p => ({ ...p, [goal]: { ...p[goal], [field]: val } }));
  };

  const savePlan = async () => {
    setSaving(true);
    localStorage.setItem(`sf_annual_${year}`, JSON.stringify(plan));
    if (user) {
      try {
        const now = new Date().toISOString();
        const rows = CORE_GOALS.map(g => ({
          user_name: user.email, year, goal: g,
          job_pct: parseFloat(plan[g]?.jobPct) || null,
          plan_pct: parseFloat(plan[g]?.planPct) || null,
          note: plan[g]?.note || '',
          updated_at: now,
        }));
        await supabase.from('annual_plan').upsert(rows, { onConflict: 'user_name,year,goal' });
      } catch {}
    }
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px', flexWrap:'wrap', gap:'8px' }}>
        <div style={{ fontSize:'15px', fontWeight:700, color:'var(--primary)' }}>年度計畫核對</div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
          <label style={{ fontSize:'13px', fontWeight:600, color:'var(--primary)' }}>年度</label>
          <select value={year} onChange={e => setYear(e.target.value)}
            style={{ padding:'5px 10px', border:'1px solid var(--border)', borderRadius:'6px', fontSize:'13px', fontFamily:'inherit' }}>
            {['2024','2025','2026','2027'].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={savePlan} disabled={saving}
            style={{ padding:'6px 16px', background:'var(--primary)', color:'white', border:'none', borderRadius:'6px', cursor:saving?'default':'pointer', fontSize:'13px', fontWeight:600, fontFamily:'inherit', opacity:saving?0.7:1 }}>
            {saving ? '儲存中…' : saved ? '✅ 已儲存' : '💾 儲存計畫'}
          </button>
        </div>
      </div>

      {/* Plan vs actual table */}
      <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:'var(--radius)', marginBottom:'14px', boxShadow:'var(--shadow)', overflow:'hidden' }}>
        <div style={{ padding:'10px 16px', background:'var(--surface2)', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:'13px', color:'var(--primary)' }}>
          職務說明占比 vs 實際工時占比
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
            <thead>
              <tr>
                {['核心目標 / 中分類','職務說明預計%','年度計畫目標%','實際累計 h','實際占比%','差異','說明'].map(h => (
                  <th key={h} style={{ background:'var(--primary)', color:'white', padding:'8px 10px', textAlign: h.includes('目標')||h.includes('說明')||h.includes('占')||h.includes('累')||h.includes('差') ? 'center' : 'left', fontSize:'11px', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CORE_GOALS.flatMap(g => {
                const color = GOAL_COLORS[g];
                const actPct = (goalActual[g] / totalActualHrs * 100).toFixed(1);
                const planPct = parseFloat(plan[g]?.planPct || '0') || 0;
                const diff = parseFloat(actPct) - planPct;
                const rows = [];

                // Goal header row
                rows.push(
                  <tr key={g} style={{ background: color + '10' }}>
                    <td style={{ padding:'8px 10px', borderLeft:`4px solid ${color}`, fontWeight:700, fontSize:'13px' }}>{g}</td>
                    <td style={{ padding:'8px 10px', textAlign:'center' }}>
                      <input type="number" min={0} max={100} step={1} value={plan[g]?.jobPct || ''} placeholder="%" onChange={e => updatePlan(g,'jobPct',e.target.value)}
                        style={{ width:'58px', textAlign:'center', padding:'4px', border:'1px solid var(--border)', borderRadius:'5px', fontSize:'12px', fontFamily:'DM Mono' }} />
                    </td>
                    <td style={{ padding:'8px 10px', textAlign:'center' }}>
                      <input type="number" min={0} max={100} step={1} value={plan[g]?.planPct || ''} placeholder="%" onChange={e => updatePlan(g,'planPct',e.target.value)}
                        style={{ width:'58px', textAlign:'center', padding:'4px', border:'1px solid var(--border)', borderRadius:'5px', fontSize:'12px', fontFamily:'DM Mono' }} />
                    </td>
                    <td style={{ padding:'8px 10px', textAlign:'center', fontFamily:'DM Mono', fontWeight:700 }}>{goalActual[g].toFixed(1)}</td>
                    <td style={{ padding:'8px 10px', textAlign:'center', fontFamily:'DM Mono', fontWeight:700 }}>{actPct}%</td>
                    <td style={{ padding:'8px 10px', textAlign:'center', fontFamily:'DM Mono', fontWeight:700, color: diff>=0?'var(--success)':'var(--danger)' }}>{diff>=0?'+':''}{diff.toFixed(1)}%</td>
                    <td style={{ padding:'8px 10px' }}>
                      <input type="text" value={plan[g]?.note || ''} placeholder="說明" onChange={e => updatePlan(g,'note',e.target.value)}
                        style={{ width:'100%', padding:'4px 6px', border:'1px solid var(--border)', borderRadius:'5px', fontSize:'12px', fontFamily:'inherit' }} />
                    </td>
                  </tr>
                );

                // Subcat rows
                (GOAL_SUBCATS[g] || []).forEach(sc => {
                  const h = subcatActual[`${g}|${sc}`] || 0;
                  const pct = (h / totalActualHrs * 100).toFixed(1);
                  rows.push(
                    <tr key={`${g}|${sc}`} style={{ background:'var(--surface2)' }}>
                      <td style={{ padding:'6px 10px 6px 22px', fontSize:'12px', color:'var(--text2)' }}>▸ {sc}</td>
                      <td colSpan={2} style={{ padding:'6px 10px', textAlign:'center', fontSize:'11px', color:'var(--text3)' }}>－</td>
                      <td style={{ padding:'6px 10px', textAlign:'center', fontFamily:'DM Mono', fontSize:'12px' }}>{h.toFixed(1)}</td>
                      <td style={{ padding:'6px 10px', textAlign:'center', fontFamily:'DM Mono', fontSize:'12px' }}>{pct}%</td>
                      <td colSpan={2} />
                    </tr>
                  );
                });

                return rows;
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly trend */}
      <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:'var(--radius)', boxShadow:'var(--shadow)', overflow:'hidden' }}>
        <div style={{ padding:'10px 16px', background:'var(--surface2)', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:'13px', color:'var(--primary)' }}>各月工時趨勢</div>
        <div style={{ padding:'16px' }}>
          {monthHours.every(h => h === 0)
            ? <div style={{ textAlign:'center', color:'var(--text3)', fontSize:'13px', padding:'20px 0' }}>請先填寫各週週報資料</div>
            : (
              <div style={{ display:'flex', alignItems:'flex-end', gap:'6px', height:'120px' }}>
                {monthHours.map((h,i) => (
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'3px' }}>
                    <div style={{ fontSize:'10px', color:'var(--text3)', fontFamily:'DM Mono' }}>{h>0?h.toFixed(0):''}</div>
                    <div style={{ width:'100%', background: h>0?'var(--primary)':'var(--border)', borderRadius:'3px 3px 0 0', height:`${Math.round(h/maxMH*80)+4}px`, transition:'height 0.4s' }} />
                    <div style={{ fontSize:'10px', color:'var(--text3)' }}>{i+1}月</div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
}
