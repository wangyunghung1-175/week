'use client';
// app/monthly/page.tsx
import { useState, useEffect } from 'react';
import { getWeekDates, formatDate, CORE_GOALS, GOAL_COLORS } from '../../lib/supabase';

export default function MonthlyPage() {
  const [month, setMonth] = useState(() => {
    const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;
  });
  const [weeklyData, setWeeklyData] = useState<Record<string,any>>({});

  useEffect(() => {
    try { const d = localStorage.getItem('sf_weekly'); if (d) setWeeklyData(JSON.parse(d)); } catch {}
  }, []);

  const [yr, mo] = month.split('-');
  const weeksInMonth: string[] = [];
  for (let w = 1; w <= 53; w++) {
    const wk = `${yr}-W${String(w).padStart(2,'0')}`;
    try {
      const { mon, fri } = getWeekDates(wk);
      if ((mon.getFullYear()==+yr && mon.getMonth()+1==+mo) || (fri.getFullYear()==+yr && fri.getMonth()+1==+mo)) weeksInMonth.push(wk);
    } catch { break; }
  }

  let total=0, expected=0, leave=0, ot=0;
  const goalHours: Record<string,number> = {};
  CORE_GOALS.forEach(g => goalHours[g]=0);
  weeksInMonth.forEach(wk => {
    const d = weeklyData[wk];
    if (!d) return;
    total    += d.actual    || 0;
    expected += d.expected  || 0;
    leave    += d['休假']   || 0;
    ot       += d['加班']   || 0;
    (d.items||[]).forEach((i: any) => { if (i.goal && goalHours[i.goal]!==undefined) goalHours[i.goal] += i.hours||0; });
  });
  const diff = total - expected;
  const totalGoal = Object.values(goalHours).reduce((a,b)=>a+b,0)||1;

  const exportCSV = () => {
    const rows = [['週別','應工時','實際工時','休假','加班','差異']];
    weeksInMonth.forEach(wk => {
      const d = weeklyData[wk];
      if (d) rows.push([wk, d.expected||0, d.actual||0, d['休假']||0, d['加班']||0, d.diff||0]);
    });
    const csv = rows.map(r=>r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'}));
    a.download = `月報_${month}.csv`;
    a.click();
  };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px', flexWrap:'wrap', gap:'8px' }}>
        <div style={{ fontSize:'15px', fontWeight:700, color:'var(--primary)' }}>月報彙整</div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
          <label style={{ fontSize:'13px', fontWeight:600, color:'var(--primary)' }}>月份</label>
          <input type="month" value={month} onChange={e=>setMonth(e.target.value)}
            style={{ padding:'5px 10px', border:'1px solid var(--border)', borderRadius:'6px', fontSize:'13px', fontFamily:'inherit' }} />
          <button onClick={exportCSV} style={{ padding:'6px 14px', background:'rgba(46,139,87,0.1)', color:'var(--success)', border:'1px solid rgba(46,139,87,0.25)', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:600, fontFamily:'inherit' }}>⬇ 匯出CSV</button>
        </div>
      </div>

      {/* KPI */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'8px', marginBottom:'14px' }}>
        {[['總工作時數',total.toFixed(1),'accent'],['應工作時數',expected,''],['休假時數',leave.toFixed(1),''],['加班時數',ot.toFixed(1),''],['時數差異',(diff>=0?'+':'')+diff.toFixed(1),diff>=0?'success':'danger']].map(([l,v,c])=>(
          <div key={l} className="kpi-card"><div className={`kpi-val ${c}`}>{v}</div><div className="kpi-label">{l}</div></div>
        ))}
      </div>

      {/* Goal ratio */}
      <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:'var(--radius)', marginBottom:'14px', boxShadow:'var(--shadow)', overflow:'hidden' }}>
        <div style={{ padding:'10px 16px', background:'var(--surface2)', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:'13px', color:'var(--primary)' }}>核心目標時數佔比</div>
        <div style={{ padding:'14px 16px' }}>
          {CORE_GOALS.map(g => {
            const h = goalHours[g], pct = (h/totalGoal*100).toFixed(1);
            return (
              <div key={g} style={{ marginBottom:'10px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'3px' }}>
                  <span style={{ fontWeight:600 }}>{g}</span>
                  <span style={{ fontFamily:'DM Mono', color:'var(--text2)' }}>{h.toFixed(1)}h · {pct}%</span>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{ width:`${pct}%`, background: GOAL_COLORS[g] }} /></div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly breakdown */}
      <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:'var(--radius)', boxShadow:'var(--shadow)', overflow:'hidden' }}>
        <div style={{ padding:'10px 16px', background:'var(--surface2)', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:'13px', color:'var(--primary)' }}>各週明細</div>
        <div style={{ padding:'14px', display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:'10px' }}>
          {weeksInMonth.length === 0
            ? <div style={{ color:'var(--text3)', fontSize:'13px', textAlign:'center', padding:'20px', gridColumn:'1/-1' }}>此月份尚無資料，請先填寫週報</div>
            : weeksInMonth.map(wk => {
                const d = weeklyData[wk];
                const { mon, sun } = getWeekDates(wk);
                if (!d) return (
                  <div key={wk} style={{ border:'1px solid var(--border)', borderRadius:'8px', padding:'14px', background:'var(--surface2)' }}>
                    <div style={{ fontSize:'12px', fontWeight:700, color:'var(--primary)', marginBottom:'8px' }}>{wk} <span style={{ fontSize:'11px', color:'var(--text3)' }}>{formatDate(mon)}–{formatDate(sun)}</span></div>
                    <div style={{ fontSize:'12px', color:'var(--text3)' }}>尚未填報</div>
                  </div>
                );
                const diff = (d.actual||0)-(d.expected||0);
                return (
                  <div key={wk} style={{ border:'1px solid var(--border)', borderRadius:'8px', padding:'14px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', fontWeight:700, color:'var(--primary)', marginBottom:'8px' }}>
                      <span>{wk.replace('-W','年第')}週</span>
                      <span style={{ fontSize:'11px', color:'var(--text3)', fontWeight:400 }}>{formatDate(mon)}–{formatDate(sun)}</span>
                    </div>
                    <div style={{ fontFamily:'DM Mono', fontSize:'22px', fontWeight:700, color:'var(--accent)' }}>{(d.actual||0).toFixed(1)}<span style={{ fontSize:'13px', color:'var(--text3)' }}> h</span></div>
                    <div style={{ marginTop:'6px', fontSize:'11px', color:'var(--text3)' }}>
                      應：{d.expected||0}h　差：<span style={{ color:diff>=0?'var(--success)':'var(--danger)' }}>{diff>=0?'+':''}{diff.toFixed(1)}</span>h
                    </div>
                    <div style={{ marginTop:'4px', fontSize:'11px', color:'var(--text3)' }}>休假：{(d['休假']||0).toFixed(1)}h　加班：{(d['加班']||0).toFixed(1)}h</div>
                  </div>
                );
              })
          }
        </div>
      </div>
    </div>
  );
}
