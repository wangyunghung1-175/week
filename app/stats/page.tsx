'use client';
// app/stats/page.tsx
import { useState, useEffect } from 'react';
import { CORE_GOALS, GOAL_COLORS, getWeekDates, formatDate } from '../../lib/supabase';
import * as XLSX from 'xlsx';

export default function StatsPage() {
  const [weeklyData, setWeeklyData] = useState<Record<string,any>>({});

  useEffect(() => {
    try { const d = localStorage.getItem('sf_weekly'); if (d) setWeeklyData(JSON.parse(d)); } catch {}
  }, []);

  const weeks = Object.keys(weeklyData).sort();

  // Aggregate stats
  let totalHrs = 0, totalLeave = 0, totalOT = 0;
  const actualArr: number[] = [];
  weeks.forEach(wk => {
    const d = weeklyData[wk];
    totalHrs   += d.actual || 0;
    totalLeave += d['休假'] || 0;
    totalOT    += d['加班'] || 0;
    actualArr.push(d.actual || 0);
  });
  const avg  = weeks.length ? totalHrs / weeks.length : 0;
  const maxH = Math.max(...actualArr, 1);
  const minH = Math.min(...actualArr.filter(h => h > 0), 0);

  // Goal totals
  const goalHours: Record<string,number> = {};
  CORE_GOALS.forEach(g => goalHours[g] = 0);
  weeks.forEach(wk => {
    (weeklyData[wk].items || []).forEach((i: any) => {
      if (i.goal && goalHours[i.goal] !== undefined) goalHours[i.goal] += i.hours || 0;
    });
  });
  const totalGoal = Object.values(goalHours).reduce((a,b)=>a+b,0)||1;

  // Monthly bars (current year)
  const curYear = new Date().getFullYear().toString();
  const monthHours = Array.from({length:12},(_,i)=>i+1).map(m => {
    let h = 0;
    weeks.forEach(wk => {
      if (!wk.startsWith(curYear)) return;
      const { mon } = getWeekDates(wk);
      if (mon.getMonth()+1 === m) h += weeklyData[wk].actual || 0;
    });
    return h;
  });
  const maxMH = Math.max(...monthHours, 1);

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    // Weekly summary
    const s1 = [['週別','日期範圍','應工時','實際工時','休假','加班','差異'],
      ...weeks.map(wk => {
        const d = weeklyData[wk];
        const { mon, sun } = getWeekDates(wk);
        return [wk, `${formatDate(mon)}–${formatDate(sun)}`, d.expected||0, d.actual||0, d['休假']||0, d['加班']||0, d.diff||0];
      })];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s1), '週報摘要');
    // Goal pivot
    const s2 = [['核心目標','時數','占比%'], ...CORE_GOALS.map(g => [g, goalHours[g].toFixed(1), (goalHours[g]/totalGoal*100).toFixed(1)])];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s2), '核心目標分布');
    XLSX.writeFile(wb, `雙福週報統計_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  if (weeks.length === 0) {
    return <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'40px', textAlign:'center', color:'var(--text3)', fontSize:'13px', boxShadow:'var(--shadow)' }}>尚無資料，請先填寫週報</div>;
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
        <div style={{ fontSize:'15px', fontWeight:700, color:'var(--primary)' }}>統計分析 · 樞紐總覽</div>
        <button onClick={exportExcel}
          style={{ padding:'6px 14px', background:'rgba(46,139,87,0.1)', color:'var(--success)', border:'1px solid rgba(46,139,87,0.25)', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:600, fontFamily:'inherit' }}>⬇ 匯出Excel</button>
      </div>

      {/* KPI */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))', gap:'8px', marginBottom:'14px' }}>
        {[
          ['年度累計工時', totalHrs.toFixed(1), 'accent'],
          ['已填報週數',  weeks.length, ''],
          ['平均週工時',  avg.toFixed(1), 'success'],
          ['最高週工時',  maxH.toFixed(1), ''],
          ['最低週工時',  minH.toFixed(1), ''],
          ['累計休假時數', totalLeave.toFixed(1), ''],
        ].map(([l,v,c]) => (
          <div key={l as string} className="kpi-card">
            <div className={`kpi-val ${c}`}>{v}</div>
            <div className="kpi-label">{l}</div>
          </div>
        ))}
      </div>

      {/* Monthly bars */}
      <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:'var(--radius)', marginBottom:'14px', boxShadow:'var(--shadow)', overflow:'hidden' }}>
        <div style={{ padding:'10px 16px', background:'var(--surface2)', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:'13px', color:'var(--primary)' }}>月度工時 ({curYear})</div>
        <div style={{ padding:'16px' }}>
          <div style={{ display:'flex', alignItems:'flex-end', gap:'8px', height:'150px' }}>
            {monthHours.map((h,i) => (
              <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
                <div style={{ fontSize:'10px', color:'var(--text3)', fontFamily:'DM Mono' }}>{h>0?h.toFixed(0):''}</div>
                <div style={{ width:'100%', background: h>0?'linear-gradient(180deg,var(--accent),var(--primary))':'var(--border)', borderRadius:'4px 4px 0 0', height:`${Math.round(h/maxMH*110)+4}px`, transition:'height 0.4s' }} />
                <div style={{ fontSize:'10px', color:'var(--text3)' }}>{i+1}月</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Goal distribution */}
      <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:'var(--radius)', marginBottom:'14px', boxShadow:'var(--shadow)', overflow:'hidden' }}>
        <div style={{ padding:'10px 16px', background:'var(--surface2)', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:'13px', color:'var(--primary)' }}>核心目標累計時數分布</div>
        <div style={{ padding:'14px 16px' }}>
          {CORE_GOALS.map(g => {
            const h = goalHours[g], pct = (h/totalGoal*100).toFixed(1);
            return (
              <div key={g} style={{ marginBottom:'10px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'3px' }}>
                  <span style={{ fontWeight:600 }}>{g}</span>
                  <span style={{ fontFamily:'DM Mono', color:'var(--text2)' }}>{h.toFixed(1)}h ({pct}%)</span>
                </div>
                <div className="progress-bar" style={{ height:'10px' }}>
                  <div style={{ width:`${pct}%`, height:'100%', background: GOAL_COLORS[g], borderRadius:'3px', transition:'width 0.4s' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly detail table */}
      <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:'var(--radius)', boxShadow:'var(--shadow)', overflow:'hidden' }}>
        <div style={{ padding:'10px 16px', background:'var(--surface2)', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:'13px', color:'var(--primary)' }}>各週詳細紀錄</div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
            <thead><tr style={{ background:'var(--primary)', color:'white' }}>
              {['週別','日期範圍','應工時','實際工時','休假','加班','差異'].map(h => (
                <th key={h} style={{ padding:'8px 12px', textAlign: h==='週別'||h==='日期範圍'?'left':'center', fontSize:'12px' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {weeks.map((wk,i) => {
                const d = weeklyData[wk];
                const { mon, sun } = getWeekDates(wk);
                const diff = d.diff || 0;
                return (
                  <tr key={wk} style={{ borderBottom:'1px solid var(--border)', background: i%2?'var(--surface2)':'white' }}>
                    <td style={{ padding:'7px 12px', fontFamily:'DM Mono', fontSize:'12px' }}>{wk}</td>
                    <td style={{ padding:'7px 12px', fontSize:'12px', color:'var(--text2)' }}>{formatDate(mon)}–{formatDate(sun)}</td>
                    <td style={{ padding:'7px 12px', textAlign:'center', fontFamily:'DM Mono' }}>{d.expected||0}</td>
                    <td style={{ padding:'7px 12px', textAlign:'center', fontFamily:'DM Mono' }}>{(d.actual||0).toFixed(1)}</td>
                    <td style={{ padding:'7px 12px', textAlign:'center', fontFamily:'DM Mono' }}>{(d['休假']||0).toFixed(1)}</td>
                    <td style={{ padding:'7px 12px', textAlign:'center', fontFamily:'DM Mono' }}>{(d['加班']||0).toFixed(1)}</td>
                    <td style={{ padding:'7px 12px', textAlign:'center', fontFamily:'DM Mono', color: diff>=0?'var(--success)':'var(--danger)' }}>{diff>=0?'+':''}{diff.toFixed(1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
