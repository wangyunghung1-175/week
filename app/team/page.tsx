'use client';
// app/team/page.tsx — TypeScript-safe version
import { useState } from 'react';
import { createClient, CORE_GOALS, GOAL_COLORS, getWeekDates } from '../../lib/supabase';
import { useAuth } from '../AppShell';
import * as XLSX from 'xlsx';

interface MemberStat {
  actual: number; expected: number; leave: number; ot: number; weeks: number;
}

export default function TeamPage() {
  const { user } = useAuth();

  const [periodType, setPeriodType] = useState<'month'|'week'|'year'>('month');
  const [monthVal,   setMonthVal]   = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;
  });
  const [weekVal,  setWeekVal]  = useState('');
  const [yearVal,  setYearVal]  = useState('2025');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [summary,  setSummary]  = useState<any[]>([]);
  const [items,    setItems]    = useState<any[]>([]);
  const [search,   setSearch]   = useState('');

  const buildFilter = (): string => {
    if (periodType === 'week' && weekVal) return `week_key=eq.${weekVal}`;
    if (periodType === 'year')            return `week_key=like.${yearVal}-W%`;
    const [yr, mo] = monthVal.split('-');
    const wks: string[] = [];
    for (let w = 1; w <= 53; w++) {
      const wk = `${yr}-W${String(w).padStart(2,'0')}`;
      try {
        const { mon, fri } = getWeekDates(wk);
        if ((mon.getFullYear()===+yr&&mon.getMonth()+1===+mo)||(fri.getFullYear()===+yr&&fri.getMonth()+1===+mo))
          wks.push(wk);
      } catch { break; }
    }
    return `week_key=in.(${wks.map(w=>`"${w}"`).join(',')})`;
  };

  const load = async () => {
    setLoading(true); setError('');
    try {
      const f       = buildFilter();
      const baseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '') + '/rest/v1';
      const key     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
      const headers = { apikey:key, Authorization:`Bearer ${key}`, 'Content-Type':'application/json' };
      const [sResp, iResp] = await Promise.all([
        fetch(`${baseUrl}/weekly_summary?${f}&order=user_name,week_key`, { headers }),
        fetch(`${baseUrl}/work_items?${f}&order=user_name,week_key`,     { headers }),
      ]);
      if (!sResp.ok) throw new Error(await sResp.text());
      if (!iResp.ok) throw new Error(await iResp.text());
      setSummary(await sResp.json());
      setItems(await iResp.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setLoading(false);
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['成員','週別','應工時','實際工時','休假','加班','交通','差異'],
      ...summary.map(r=>[r.user_name,r.week_key,r.expected_hours,r.actual_hours,r.leave_hours,r.ot_hours,r.traffic_hours,r.diff_hours]),
    ]), '週報摘要');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['成員','週別','核心目標','中分類','項目分類','工作事項','時數','備註'],
      ...items.map(r=>[r.user_name,r.week_key,r.goal,r.subcat,r.category,r.item_name,r.hours,r.note]),
    ]), '工作項目明細');
    XLSX.writeFile(wb, `雙福團隊週報_${monthVal||weekVal||yearVal}.xlsx`);
  };

  // Aggregates
  const members: Record<string,MemberStat> = {};
  summary.forEach(r => {
    if (!members[r.user_name]) members[r.user_name] = {actual:0,expected:0,leave:0,ot:0,weeks:0};
    const m = members[r.user_name];
    m.actual   += Number(r.actual_hours)   || 0;
    m.expected += Number(r.expected_hours) || 0;
    m.leave    += Number(r.leave_hours)    || 0;
    m.ot       += Number(r.ot_hours)       || 0;
    m.weeks++;
  });
  const memberNames = Object.keys(members).sort();
  const totalActual = Object.values(members).reduce((s,m)=>s+m.actual, 0);
  const weekCount   = Array.from(new Set<string>(summary.map(r => String(r.week_key)))).length;
  const goalTotals: Record<string,number> = {};
  CORE_GOALS.forEach(g => { goalTotals[g] = 0; });
  items.forEach(r => { if (r.goal && goalTotals[r.goal]!==undefined) goalTotals[r.goal] += Number(r.hours)||0; });
  const totalGoal = Object.values(goalTotals).reduce((a,b)=>a+b,0)||1;
  const colors = ['#1a3a5c','#e8872a','#2e8b57','#7b68ee','#c0392b','#16a085','#8e44ad'];

  const kpiItems: [string, string|number, string][] = [
    ['填報人數',   memberNames.length, ''],
    ['涵蓋週數',   weekCount, ''],
    ['團隊總工時', totalActual.toFixed(0), 'accent'],
    ['人均工時',   memberNames.length ? (totalActual/memberNames.length).toFixed(1) : 0, ''],
    ['累計休假h',  Object.values(members).reduce((s,m)=>s+m.leave,0).toFixed(1), ''],
    ['累計加班h',  Object.values(members).reduce((s,m)=>s+m.ot,0).toFixed(1), ''],
  ];

  return (
    <div>
      {/* Toolbar */}
      <div style={{background:'white',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'12px 16px',marginBottom:'14px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap',boxShadow:'var(--shadow)'}}>
        <select value={periodType} onChange={e=>setPeriodType(e.target.value as 'month'|'week'|'year')}
          style={{padding:'6px 10px',border:'1px solid var(--border)',borderRadius:'6px',fontSize:'13px',fontFamily:'inherit'}}>
          <option value="month">月</option><option value="week">週</option><option value="year">年</option>
        </select>
        {periodType==='month'&&<input type="month" value={monthVal} onChange={e=>setMonthVal(e.target.value)} style={{padding:'6px 10px',border:'1px solid var(--border)',borderRadius:'6px',fontSize:'13px',fontFamily:'inherit'}}/>}
        {periodType==='week'&&<input type="week" value={weekVal} onChange={e=>setWeekVal(e.target.value)} style={{padding:'6px 10px',border:'1px solid var(--border)',borderRadius:'6px',fontSize:'13px',fontFamily:'inherit'}}/>}
        {periodType==='year'&&<select value={yearVal} onChange={e=>setYearVal(e.target.value)} style={{padding:'6px 10px',border:'1px solid var(--border)',borderRadius:'6px',fontSize:'13px',fontFamily:'inherit'}}>
          <option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option>
        </select>}
        <button onClick={load} disabled={loading} style={{padding:'6px 16px',background:'var(--primary)',color:'white',border:'none',borderRadius:'6px',cursor:loading?'default':'pointer',fontSize:'13px',fontWeight:600,fontFamily:'inherit',opacity:loading?0.7:1}}>
          {loading?'載入中…':'🔄 載入資料'}
        </button>
        <button onClick={exportExcel} disabled={!summary.length} style={{padding:'6px 14px',background:'rgba(46,139,87,0.1)',color:'var(--success)',border:'1px solid rgba(46,139,87,0.25)',borderRadius:'6px',cursor:summary.length?'pointer':'default',fontSize:'12px',fontWeight:600,fontFamily:'inherit',opacity:summary.length?1:0.5}}>
          ⬇ 匯出Excel
        </button>
      </div>

      {error&&<div style={{background:'rgba(192,57,43,0.08)',border:'1px solid rgba(192,57,43,0.2)',color:'var(--danger)',borderRadius:'8px',padding:'12px 16px',marginBottom:'14px',fontSize:'13px'}}>⚠ {error}</div>}
      {loading&&<div style={{textAlign:'center',padding:'40px',color:'var(--text3)'}}>載入中…</div>}
      {!loading&&summary.length===0&&!error&&(
        <div style={{background:'white',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'40px',textAlign:'center',color:'var(--text3)',fontSize:'13px'}}>
          請選擇期間後點「載入資料」
        </div>
      )}

      {summary.length>0&&(
        <>
          {/* KPI */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:'8px',marginBottom:'14px'}}>
            {kpiItems.map(([l,v,c])=>(
              <div key={l} className="kpi-card">
                <div className={`kpi-val ${c}`}>{v}</div>
                <div className="kpi-label">{l}</div>
              </div>
            ))}
          </div>

          {/* Member bars */}
          <div style={{background:'white',border:'1px solid var(--border)',borderRadius:'var(--radius)',marginBottom:'14px',boxShadow:'var(--shadow)',overflow:'hidden'}}>
            <div style={{padding:'10px 16px',background:'var(--surface2)',borderBottom:'1px solid var(--border)',fontWeight:700,fontSize:'13px',color:'var(--primary)'}}>成員工時總覽</div>
            <div style={{padding:'14px 16px'}}>
              {memberNames.map((name,i)=>{
                const m=members[name];
                const maxA=Math.max(...Object.values(members).map(x=>x.actual),1);
                const pct=(m.actual/maxA*100).toFixed(1);
                const expPct=(m.expected/maxA*100).toFixed(1);
                const diff=m.actual-m.expected;
                return(
                  <div key={name} style={{marginBottom:'12px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',fontWeight:600,marginBottom:'4px'}}>
                      <span><span style={{display:'inline-block',width:'9px',height:'9px',borderRadius:'50%',background:colors[i%colors.length],marginRight:'6px',verticalAlign:'middle'}}/>{name}</span>
                      <span style={{fontFamily:'DM Mono',fontSize:'11px'}}>{m.actual.toFixed(1)}h <span style={{color:diff>=0?'var(--success)':'var(--danger)',marginLeft:'6px'}}>{diff>=0?'+':''}{diff.toFixed(1)}h</span></span>
                    </div>
                    <div style={{height:'22px',background:'var(--border)',borderRadius:'4px',overflow:'hidden',position:'relative'}}>
                      <div style={{height:'100%',width:`${pct}%`,background:colors[i%colors.length],borderRadius:'4px',display:'flex',alignItems:'center',paddingLeft:'8px',fontSize:'11px',fontWeight:700,color:'white',transition:'width 0.5s',minWidth:'2px'}}>
                        {m.actual>=10?m.actual.toFixed(1)+'h':''}
                      </div>
                      <div style={{position:'absolute',top:0,bottom:0,left:`${expPct}%`,width:'2px',background:'rgba(0,0,0,0.3)'}} title={`應工時 ${m.expected}h`}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Two-col */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',marginBottom:'14px'}}>
            <div style={{background:'white',border:'1px solid var(--border)',borderRadius:'var(--radius)',boxShadow:'var(--shadow)',overflow:'hidden'}}>
              <div style={{padding:'10px 16px',background:'var(--surface2)',borderBottom:'1px solid var(--border)',fontWeight:700,fontSize:'13px',color:'var(--primary)'}}>核心目標時數分布</div>
              <div style={{padding:'14px 16px'}}>
                {CORE_GOALS.map(g=>{
                  const h=goalTotals[g]??0,pct=(h/totalGoal*100).toFixed(1);
                  return(<div key={g} style={{marginBottom:'9px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',marginBottom:'3px'}}>
                      <span style={{fontWeight:600}}>{g}</span>
                      <span style={{fontFamily:'DM Mono',color:'var(--text2)'}}>{h.toFixed(1)}h · {pct}%</span>
                    </div>
                    <div className="progress-bar" style={{height:'8px'}}><div style={{width:`${pct}%`,height:'100%',background:GOAL_COLORS[g],borderRadius:'3px',transition:'width 0.5s'}}/></div>
                  </div>);
                })}
              </div>
            </div>
            <div style={{background:'white',border:'1px solid var(--border)',borderRadius:'var(--radius)',boxShadow:'var(--shadow)',overflow:'hidden'}}>
              <div style={{padding:'10px 16px',background:'var(--surface2)',borderBottom:'1px solid var(--border)',fontWeight:700,fontSize:'13px',color:'var(--primary)'}}>出缺勤統計</div>
              <div style={{padding:'4px 0'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'12px'}}>
                  <thead><tr style={{background:'var(--primary)',color:'white'}}>
                    {['成員','填週數','休假h','加班h'].map(h=><th key={h} style={{padding:'6px 10px',textAlign:h==='成員'?'left':'center'}}>{h}</th>)}
                  </tr></thead>
                  <tbody>{memberNames.map((n,i)=>{const m=members[n];return(
                    <tr key={n} style={{background:i%2?'var(--surface2)':'white'}}>
                      <td style={{padding:'6px 10px',fontWeight:600}}>{n}</td>
                      <td style={{padding:'6px 10px',textAlign:'center',fontFamily:'DM Mono'}}>{m.weeks}</td>
                      <td style={{padding:'6px 10px',textAlign:'center',fontFamily:'DM Mono'}}>{m.leave.toFixed(1)}</td>
                      <td style={{padding:'6px 10px',textAlign:'center',fontFamily:'DM Mono',color:m.ot>0?'var(--accent)':'inherit'}}>{m.ot.toFixed(1)}</td>
                    </tr>);})}</tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Detail */}
          <div style={{background:'white',border:'1px solid var(--border)',borderRadius:'var(--radius)',boxShadow:'var(--shadow)',overflow:'hidden'}}>
            <div style={{padding:'10px 16px',background:'var(--surface2)',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{fontWeight:700,fontSize:'13px',color:'var(--primary)'}}>成員週報明細</div>
              <input type="text" placeholder="搜尋成員…" value={search} onChange={e=>setSearch(e.target.value)}
                style={{padding:'5px 10px',border:'1px solid var(--border)',borderRadius:'6px',fontSize:'12px',width:'130px',fontFamily:'inherit'}}/>
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
                <thead><tr style={{background:'var(--primary)',color:'white'}}>
                  {['成員','週別','應工時','實際工時','休假','加班','差異','狀態'].map(h=>(
                    <th key={h} style={{padding:'8px 12px',textAlign:h==='成員'||h==='週別'?'left':'center',fontSize:'12px'}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {summary.filter(r=>!search||String(r.user_name).toLowerCase().includes(search.toLowerCase())).map((r,i)=>{
                    const diff=Number(r.diff_hours)||0;
                    const filed=(Number(r.actual_hours)||0)>0;
                    return(
                      <tr key={String(r.id??i)} style={{borderBottom:'1px solid var(--border)',background:i%2?'var(--surface2)':'white'}}>
                        <td style={{padding:'7px 12px',fontWeight:600}}>{r.user_name}</td>
                        <td style={{padding:'7px 12px',fontFamily:'DM Mono',fontSize:'12px'}}>{r.week_key}</td>
                        <td style={{padding:'7px 12px',textAlign:'center',fontFamily:'DM Mono'}}>{r.expected_hours??0}</td>
                        <td style={{padding:'7px 12px',textAlign:'center',fontFamily:'DM Mono'}}>{(Number(r.actual_hours)||0).toFixed(1)}</td>
                        <td style={{padding:'7px 12px',textAlign:'center',fontFamily:'DM Mono'}}>{(Number(r.leave_hours)||0).toFixed(1)}</td>
                        <td style={{padding:'7px 12px',textAlign:'center',fontFamily:'DM Mono'}}>{(Number(r.ot_hours)||0).toFixed(1)}</td>
                        <td style={{padding:'7px 12px',textAlign:'center',fontFamily:'DM Mono',color:diff>=0?'var(--success)':'var(--danger)'}}>{diff>=0?'+':''}{diff.toFixed(1)}</td>
                        <td style={{padding:'7px 12px',textAlign:'center'}}>
                          <span style={{display:'inline-block',padding:'2px 8px',borderRadius:'20px',fontSize:'11px',fontWeight:600,background:filed?'rgba(46,139,87,0.1)':'rgba(192,57,43,0.1)',color:filed?'var(--success)':'var(--danger)'}}>
                            {filed?'已填報':'未填時數'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Goal × Member matrix */}
          <div style={{background:'white',border:'1px solid var(--border)',borderRadius:'var(--radius)',boxShadow:'var(--shadow)',overflow:'hidden',marginTop:'14px'}}>
            <div style={{padding:'10px 16px',background:'var(--surface2)',borderBottom:'1px solid var(--border)',fontWeight:700,fontSize:'13px',color:'var(--primary)'}}>核心目標 × 成員 時數對照</div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'12px'}}>
                <thead><tr style={{background:'var(--primary)',color:'white'}}>
                  <th style={{padding:'8px 12px',textAlign:'left',minWidth:'100px'}}>核心目標</th>
                  {memberNames.map(n=><th key={n} style={{padding:'8px 10px',textAlign:'center',minWidth:'70px'}}>{n}</th>)}
                  <th style={{padding:'8px 10px',textAlign:'center'}}>合計</th>
                </tr></thead>
                <tbody>
                  {CORE_GOALS.map(g=>{
                    const mHours: Record<string,number> = {};
                    memberNames.forEach(n=>{ mHours[n]=0; });
                    items.forEach(r=>{ if(r.goal===g&&mHours[r.user_name]!==undefined) mHours[r.user_name]+=Number(r.hours)||0; });
                    const rowTotal=Object.values(mHours).reduce((a,b)=>a+b,0);
                    const color=GOAL_COLORS[g];
                    return(
                      <tr key={g}>
                        <td style={{padding:'7px 12px',fontWeight:600,borderLeft:`3px solid ${color}`,paddingLeft:'8px'}}>{g}</td>
                        {memberNames.map(n=>{const h=mHours[n]??0;return(
                          <td key={n} style={{padding:'7px 10px',textAlign:'center',fontFamily:'DM Mono',color:h>0?'var(--primary)':'var(--text3)',fontWeight:h>0?700:400}}>
                            {h>0?h.toFixed(1):'–'}
                          </td>
                        );})}
                        <td style={{padding:'7px 10px',textAlign:'center',fontFamily:'DM Mono',fontWeight:700,color}}>{rowTotal.toFixed(1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
