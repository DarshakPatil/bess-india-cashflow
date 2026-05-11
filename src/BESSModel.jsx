import { useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from "recharts";

// ── Palette: Deep Forest ─────────────────────────────────────────────────────
// Rich dark green base, gold accents, cream text — premium energy finance feel
const C = {
  bg:          "#0B1A14",
  surface:     "#122019",
  surfaceHigh: "#1A2E24",
  border:      "#243D2F",
  borderStrong:"#3A6B4F",
  text:        "#E8F0EB",
  textMid:     "#9AB8A4",
  textLight:   "#5A8068",
  gold:        "#E2A925",
  goldLight:   "rgba(226,169,37,0.12)",
  green:       "#3DD68C",
  greenDim:    "rgba(61,214,140,0.12)",
  red:         "#FF6B6B",
  redDim:      "rgba(255,107,107,0.12)",
  blue:        "#5BA4E6",
  blueDim:     "rgba(91,164,230,0.12)",
  purple:      "#C084FC",
  purpleDim:   "rgba(192,132,252,0.12)",
  teal:        "#34D1BF",
  tealDim:     "rgba(52,209,191,0.12)",
  amber:       "#FB923C",
  amberDim:    "rgba(251,146,60,0.12)",
  divider:     "#1C3226",
};

const MONTHS          = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"];
const PEAK_PRICES     = [5.26, 6.80, 7.20, 5.80, 4.60, 3.58, 4.20, 3.52, 3.92, 4.40, 3.58, 4.20];
const OFF_PEAK_PRICES = [2.80, 3.10, 3.40, 2.90, 2.50, 2.20, 2.60, 2.30, 2.70, 2.90, 2.50, 2.60];
const OPEX_PER_KWH_YR = 1.0; // ₹1/kWh/year = ₹0.0833/kWh/month

function dodDegFactor(dod) {
  return 0.4 + 0.6 * Math.pow(dod, 1.5);
}

function buildSoHCurve(totalMonths, augMonth, augTarget, dod) {
  const df    = dodDegFactor(dod);
  const curve = new Array(totalMonths + 1);
  curve[0]    = 1.0;
  for (let m = 1; m <= totalMonths; m++) {
    let soh = curve[m - 1];
    if (m === augMonth) soh = augTarget;
    const base = m <= 60 ? 0.0015 : m <= 84 ? 0.0025 : 0.0035;
    curve[m]   = soh * (1 - base * df);
  }
  return curve;
}

// ₹ in Lakhs (1L = 100,000) — good granularity for monthly
const toLakh = (v) => +(v / 1e5).toFixed(2);
// ₹ in Crores (1Cr = 10,000,000) — for yearly
const toCr   = (v) => +(v / 1e7).toFixed(2);
const fmtCr  = (v) => `₹${toCr(v)} Cr`;
const fmtL   = (v) => `₹${toLakh(v)}L`;

// ── UI Primitives ─────────────────────────────────────────────────────────────
const Pill = ({ children, color }) => (
  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
    background: `${color}22`, color, border: `1px solid ${color}44`,
    padding: "2px 9px", borderRadius: 20 }}>{children}</span>
);

const SliderRow = ({ label, min, max, step=1, val, set, display, color=C.gold }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
      <span style={{ fontSize:10, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</span>
      <span style={{ fontSize:12, fontWeight:700, color:C.text }}>{display}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={val}
      onChange={e => set(+e.target.value)}
      style={{ width:"100%", accentColor:color, height:4, cursor:"pointer" }}/>
  </div>
);

const KpiCard = ({ label, value, sub, color, icon }) => (
  <div style={{ background:C.surface, border:`1px solid ${C.border}`,
    borderRadius:8, padding:"16px 18px", borderLeft:`3px solid ${color}` }}>
    <div style={{ fontSize:10, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>{icon} {label}</div>
    <div style={{ fontSize:22, fontWeight:800, color, lineHeight:1.1, marginBottom:4 }}>{value}</div>
    <div style={{ fontSize:10, color:C.textMid, lineHeight:1.5 }}>{sub}</div>
  </div>
);

const Panel = ({ title, children, style={} }) => (
  <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"20px 22px", ...style }}>
    {title && <div style={{ fontSize:10, fontWeight:800, color:C.textLight, textTransform:"uppercase",
      letterSpacing:"0.12em", marginBottom:16, paddingBottom:10, borderBottom:`1px solid ${C.divider}` }}>{title}</div>}
    {children}
  </div>
);

const TH = ({ c, children, align="right" }) => (
  <th style={{ padding:"9px 10px", fontSize:10, fontWeight:700, color: c || C.textLight,
    textAlign:align, textTransform:"uppercase", letterSpacing:"0.07em",
    background:C.bg, borderBottom:`2px solid ${C.border}`, whiteSpace:"nowrap" }}>{children}</th>
);
const TD = ({ children, color=C.text, bold=false, align="right", bg="transparent", mono=false }) => (
  <td style={{ padding:"7px 10px", fontSize:12, color, textAlign:align,
    fontWeight:bold?700:400, background:bg,
    fontFamily: mono ? "'DM Mono','Fira Code',monospace" : "inherit" }}>{children}</td>
);

const TT_PROPS = {
  contentStyle:{ background:C.surfaceHigh, border:`1px solid ${C.border}`,
    borderRadius:6, fontSize:11, color:C.text, boxShadow:"0 8px 24px rgba(0,0,0,0.4)" },
  labelStyle:{ color:C.textMid, fontWeight:700, marginBottom:4 },
  itemStyle:{ color:C.text },
  cursor:{ stroke: C.borderStrong, strokeDasharray:"3 3" },
};

// ── Main ──────────────────────────────────────────────────────────────────────
export default function BESSModel() {
  const [capex,        setCapex]        = useState(225);
  const [capMWh,       setCapMWh]       = useState(100);
  const [dod,          setDod]          = useState(0.90);
  const [rte,          setRte]          = useState(0.90);
  const [avail,        setAvail]        = useState(0.95);
  const [strategy,     setStrategy]     = useState("solar");
  const [targetYrs,    setTargetYrs]    = useState(7);
  const [augOn,        setAugOn]        = useState(true);
  const [augYr,        setAugYr]        = useState(5);
  const [augCell,      setAugCell]      = useState(40);
  const [augSoH,       setAugSoH]       = useState(0.90);
  const FX = 83.5;

  const totalCapex = capMWh * 1000 * capex * FX;
  const augMonth   = augOn ? augYr * 12 : 99999;

  const sohCurve = useMemo(
    () => buildSoHCurve(121, augMonth, augSoH, dod),
    [augMonth, augSoH, dod]
  );

  const augCostTotal = useMemo(() => {
    if (!augOn) return 0;
    const sohBefore = sohCurve[Math.min(augMonth - 1, 120)];
    return capMWh * 1000 * (1 - sohBefore) * augCell * FX;
  }, [augOn, sohCurve, augMonth, capMWh, augCell]);

  // ── Monthly Year-1 ──────────────────────────────────────────────────────────
  const monthlyData = useMemo(() => MONTHS.map((month, i) => {
    const soh      = sohCurve[i];
    const effCap   = capMWh * soh * avail * dod;           // MWh usable
    const buy      = strategy === "solar"
      ? Math.max(0.5, OFF_PEAK_PRICES[i] - 0.8)
      : OFF_PEAK_PRICES[i];
    const sell     = PEAK_PRICES[i];
    const rev      = effCap * rte * 30 * 1000 * sell;      // ₹
    const chrgCost = effCap * 30 * 1000 * buy;             // ₹
    const opex     = effCap * 1000 * (OPEX_PER_KWH_YR/12); // ₹
    const net      = rev - chrgCost - opex;
    return {
      month,
      buy:      +buy.toFixed(2),
      sell:     +sell.toFixed(2),
      spread:   +(sell - buy).toFixed(2),
      revL:     toLakh(rev),
      chrgL:    toLakh(chrgCost),
      opexL:    toLakh(opex),
      netL:     toLakh(net),
      soh:      +(soh * 100).toFixed(1),
    };
  }), [capMWh, avail, strategy, rte, dod, sohCurve]);

  // ── 10-year yearly ─────────────────────────────────────────────────────────
  const yearlyData = useMemo(() => {
    let cum = -totalCapex;
    return Array.from({ length: 10 }, (_, y) => {
      let rev = 0, chrg = 0, opex = 0;
      for (let m = 0; m < 12; m++) {
        const soh    = sohCurve[y * 12 + m];
        const eff    = capMWh * soh * avail * dod;
        const buy    = strategy === "solar"
          ? Math.max(0.5, OFF_PEAK_PRICES[m] - 0.8)
          : OFF_PEAK_PRICES[m];
        rev  += eff * rte * 30 * 1000 * PEAK_PRICES[m];
        chrg += eff * 30 * 1000 * buy;
        opex += eff * 1000 * (OPEX_PER_KWH_YR / 12);
      }
      const isAug  = augOn && (y + 1) === augYr;
      const augAmt = isAug ? augCostTotal : 0;
      const net    = rev - chrg - opex - augAmt;
      cum         += net;
      const sohStart = sohCurve[y * 12];
      const sohEnd   = sohCurve[Math.min(y * 12 + 11, 120)];
      const sohLoss  = sohStart - sohEnd;
      return {
        year:      `Y${y + 1}`,
        revCr:     toCr(rev),
        chrgCr:    toCr(chrg),
        opexCr:    toCr(opex),
        augCr:     isAug ? toCr(augCostTotal) : 0,
        netCr:     toCr(net),
        cumCr:     toCr(cum),
        roi:       +((net / totalCapex) * 100).toFixed(2),
        sohStart:  +(sohStart * 100).toFixed(2),
        sohEnd:    +(sohEnd   * 100).toFixed(2),
        sohLossPct:+(sohLoss  * 100).toFixed(2),
        effCapEnd: +(capMWh * sohEnd * avail * dod).toFixed(1),
        // for chart
        rev:       toCr(rev),
        chrg:      toCr(chrg),
        opex:      toCr(opex),
        aug:       isAug ? toCr(augCostTotal) : 0,
        net:       toCr(net),
        cum:       toCr(cum),
      };
    });
  }, [totalCapex, capMWh, avail, strategy, rte, dod,
      sohCurve, augOn, augYr, augCostTotal]);

  const sohChart = useMemo(() =>
    Array.from({ length: 61 }, (_, i) => ({
      mo: i * 2,
      soh: +(sohCurve[i * 2] * 100).toFixed(2),
    })), [sohCurve]);

  const paybackYr   = yearlyData.find(y => y.cumCr >= 0)?.year ?? ">10Y";
  const onTrack     = paybackYr !== ">10Y" && +paybackYr.replace("Y","") <= targetYrs;
  const y1          = yearlyData[0];
  const avgBuy      = (monthlyData.reduce((s,m) => s + m.buy,  0) / 12).toFixed(2);
  const avgSell     = (monthlyData.reduce((s,m) => s + m.sell, 0) / 12).toFixed(2);
  const avgSpread   = (monthlyData.reduce((s,m) => s + m.spread, 0) / 12).toFixed(2);
  const totalEnergy = capMWh * dod * 1000 * rte * 365 * targetYrs * avail;
  const minSell     = ((totalCapex + augCostTotal) / totalEnergy
                       + monthlyData.reduce((s,m) => s + m.buy, 0) / 12).toFixed(2);

  // totals
  const tot = (key) => yearlyData.reduce((s, r) => +(s + +r[key]), 0).toFixed(2);

  return (
    <div style={{ fontFamily:"'Inter','Helvetica Neue',sans-serif", background:C.bg, minHeight:"100vh", color:C.text }}>

      {/* ── HEADER ── */}
      <div style={{ background:`linear-gradient(135deg, #0B1F16 0%, #112B1E 60%, #0D2318 100%)`,
        borderBottom:`1px solid ${C.border}`, padding:"28px 36px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:16 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
              <div style={{ width:36, height:36, background:`linear-gradient(135deg,${C.gold},#F0831A)`,
                borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow:`0 4px 12px ${C.gold}44` }}>
                <span style={{ color:"#0B1A14", fontSize:18, fontWeight:900 }}>⚡</span>
              </div>
              <div>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.2em", color:C.textLight, textTransform:"uppercase" }}>BESS Financial Model · India IEX</div>
                <h1 style={{ margin:0, fontSize:24, fontWeight:800, color:C.text, letterSpacing:"-0.02em" }}>Cash Flow Projector <span style={{ fontSize:13, color:C.gold, fontWeight:600 }}>v5</span></h1>
              </div>
            </div>
            <p style={{ margin:0, fontSize:12, color:C.textMid }}>Utility-scale · IEX DAM/TAM · LFP nonlinear degradation · DoD-adjusted · Capacity augmentation</p>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
            {[["Capacity market",C.green],["1 cycle/day",C.blue],["LFP",C.gold],["IEX FY2026",C.teal]].map(([t,c])=>(
              <Pill key={t} color={c}>{t}</Pill>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding:"28px 36px", maxWidth:1280 }}>

        {/* ── CONTROLS ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:20 }}>
          <Panel title="⚙ System">
            <SliderRow label="Capex (USD/kWh)" min={125} max={334} val={capex} set={setCapex}
              display={`$${capex} · ₹${(capex*FX).toFixed(0)}/kWh`}/>
            <SliderRow label="Nameplate Capacity" min={10} max={500} step={10} val={capMWh} set={setCapMWh}
              display={`${capMWh} MWh`}/>
            <SliderRow label="Depth of Discharge" min={0.70} max={1.00} step={0.01} val={dod} set={setDod}
              display={`${(dod*100).toFixed(0)}% → ${(capMWh*dod).toFixed(0)} MWh usable`} color={C.teal}/>
          </Panel>
          <Panel title="⚡ Operation">
            <SliderRow label="Round-trip Efficiency" min={0.80} max={0.95} step={0.01} val={rte} set={setRte}
              display={`${(rte*100).toFixed(0)}%`} color={C.blue}/>
            <SliderRow label="Availability" min={0.85} max={1.00} step={0.01} val={avail} set={setAvail}
              display={`${(avail*100).toFixed(0)}%`} color={C.blue}/>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Charge Strategy</div>
              <div style={{ display:"flex", gap:8 }}>
                {[["solar","☀ Solar surplus"],["offpeak","◑ Off-peak"]].map(([s,l])=>(
                  <button key={s} onClick={()=>setStrategy(s)} style={{
                    flex:1, padding:"9px 0", fontSize:11, fontWeight:700, borderRadius:6, cursor:"pointer",
                    border:`1.5px solid ${strategy===s ? C.green : C.border}`,
                    background:strategy===s ? C.greenDim : "transparent",
                    color:strategy===s ? C.green : C.textMid, transition:"all 0.15s",
                  }}>{l}</button>
                ))}
              </div>
            </div>
            <SliderRow label="Target Payback" min={4} max={10} val={targetYrs} set={setTargetYrs}
              display={`${targetYrs} years`} color={C.green}/>
          </Panel>
          <Panel title="🔋 Augmentation" style={{ borderLeft:`2px solid ${C.gold}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
              <button onClick={()=>setAugOn(!augOn)} style={{
                padding:"6px 14px", fontSize:11, fontWeight:700, borderRadius:6, cursor:"pointer",
                border:`1.5px solid ${augOn ? C.gold : C.border}`,
                background:augOn ? C.goldLight : "transparent",
                color:augOn ? C.gold : C.textMid,
              }}>{augOn ? "✓ Enabled" : "Disabled"}</button>
              {augOn && <span style={{ fontSize:11, color:C.textMid }}>Cost: <strong style={{ color:C.gold }}>{fmtCr(augCostTotal)}</strong></span>}
            </div>
            {augOn && <>
              <SliderRow label="Augment at Year End" min={3} max={8} val={augYr} set={setAugYr}
                display={`Y${augYr}`} color={C.gold}/>
              <SliderRow label="Cell Cost (USD/kWh)" min={20} max={100} step={5} val={augCell} set={setAugCell}
                display={`$${augCell}/kWh`} color={C.gold}/>
              <SliderRow label="Restore SoH to" min={0.80} max={0.95} step={0.01} val={augSoH} set={setAugSoH}
                display={`${(augSoH*100).toFixed(0)}%`} color={C.gold}/>
            </>}
          </Panel>
        </div>

        {/* ── KPI CARDS ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:12, marginBottom:24 }}>
          <KpiCard label="Total Capex"    color={C.red}    icon="💰" value={fmtCr(totalCapex)}    sub={`$${(totalCapex/1e7/FX*10).toFixed(1)}M USD · ${capMWh} MWh`}/>
          <KpiCard label="Aug Cost"       color={C.gold}   icon="⚡" value={augOn ? fmtCr(augCostTotal) : "—"} sub={augOn ? `Y${augYr} · $${augCell}/kWh cells` : "disabled"}/>
          <KpiCard label="Payback"        color={onTrack?C.green:C.red} icon="📅" value={paybackYr} sub={`Target ${targetYrs}Y · ${onTrack?"✓ On track":"⚠ Off track"}`}/>
          <KpiCard label="Year-1 Net"     color={C.blue}   icon="📈" value={`₹${y1?.netCr} Cr`}   sub="rev − charging − opex"/>
          <KpiCard label="Min Sell Price" color={C.purple} icon="💲" value={`₹${minSell}/kWh`}     sub={`${targetYrs}Y payback incl. aug`}/>
          <KpiCard label="Avg Spread Y1"  color={C.teal}   icon="↕"  value={`₹${avgSpread}/kWh`}   sub={`Buy ₹${avgBuy} → Sell ₹${avgSell}`}/>
        </div>

        {/* ── CHARTS ROW 1 ── */}
        <div style={{ display:"grid", gridTemplateColumns:"1.2fr 0.8fr", gap:16, marginBottom:16 }}>

          {/* Seasonal price spread */}
          <Panel title="📊 Seasonal IEX Price Spread — Year 1 (₹/kWh)">
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={monthlyData} margin={{ top:4, right:16, bottom:4, left:0 }}>
                <defs>
                  <linearGradient id="sellGr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={C.blue}  stopOpacity={0.35}/>
                    <stop offset="100%" stopColor={C.blue}  stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="buyGr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={C.red}   stopOpacity={0.25}/>
                    <stop offset="100%" stopColor={C.red}   stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke={C.divider} vertical={false}/>
                <XAxis dataKey="month" tick={{ fontSize:11, fill:C.textMid }} axisLine={{ stroke:C.border }} tickLine={false}/>
                <YAxis domain={[0, 9]} tick={{ fontSize:10, fill:C.textLight }} axisLine={false} tickLine={false}
                  tickFormatter={v=>`₹${v}`}/>
                <Tooltip {...TT_PROPS} formatter={(v,n)=>[`₹${v}/kWh`, n]}/>
                <Legend wrapperStyle={{ fontSize:11, color:C.textMid, paddingTop:8 }}/>
                <Area type="monotone" dataKey="sell" name="Sell (peak)"    stroke={C.blue} fill="url(#sellGr)" strokeWidth={2.5}/>
                <Area type="monotone" dataKey="buy"  name="Buy (off-peak)" stroke={C.red}  fill="url(#buyGr)"  strokeWidth={2.5}/>
                <Bar dataKey="spread" name="Spread" fill={C.green} opacity={0.25} radius={[3,3,0,0]}/>
              </ComposedChart>
            </ResponsiveContainer>
          </Panel>

          {/* SoH 10-year curve */}
          <Panel title="🔋 SoH Degradation Curve — 10 Year">
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={sohChart} margin={{ top:4, right:16, bottom:4, left:0 }}>
                <defs>
                  <linearGradient id="sohGr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={C.gold} stopOpacity={0.3}/>
                    <stop offset="100%" stopColor={C.gold} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke={C.divider} vertical={false}/>
                <XAxis dataKey="mo" tick={{ fontSize:10, fill:C.textLight }} axisLine={{ stroke:C.border }} tickLine={false}
                  label={{ value:"Month", position:"insideBottom", offset:-2, fontSize:9, fill:C.textLight }}/>
                <YAxis domain={[70,102]} unit="%" tick={{ fontSize:10, fill:C.textLight }} axisLine={false} tickLine={false}/>
                <Tooltip {...TT_PROPS} formatter={v=>[`${v}%`,"SoH"]} labelFormatter={l=>`Month ${l}`}/>
                <ReferenceLine y={80} stroke={C.red} strokeDasharray="4 3"
                  label={{ value:"80% knee", fill:C.red, fontSize:9, position:"insideTopRight" }}/>
                {augOn && <ReferenceLine x={augMonth} stroke={C.gold} strokeDasharray="4 3"
                  label={{ value:`Aug Y${augYr}`, fill:C.gold, fontSize:9 }}/>}
                <Area type="monotone" dataKey="soh" stroke={C.gold} fill="url(#sohGr)" strokeWidth={2.5} dot={false} name="SoH %"/>
              </ComposedChart>
            </ResponsiveContainer>
            <div style={{ fontSize:9, color:C.textLight, marginTop:8, lineHeight:2 }}>
              Phase 1 (0–60m) 0.15%/mo · Phase 2 (60–84m) 0.25%/mo · Phase 3 (84m+) 0.35%/mo · DoD factor {(dodDegFactor(dod)*100).toFixed(0)}%
            </div>
          </Panel>
        </div>

        {/* ── CHARTS ROW 2 ── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>

          {/* Cumulative cashflow */}
          <Panel title="📈 10-Year Cumulative Cashflow (₹ Cr)">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={yearlyData} margin={{ top:4, right:16, bottom:4, left:0 }}>
                <defs>
                  <linearGradient id="cumGr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={C.green} stopOpacity={0.3}/>
                    <stop offset="100%" stopColor={C.green} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke={C.divider} vertical={false}/>
                <XAxis dataKey="year" tick={{ fontSize:11, fill:C.textMid }} axisLine={{ stroke:C.border }} tickLine={false}/>
                <YAxis tick={{ fontSize:10, fill:C.textLight }} axisLine={false} tickLine={false} tickFormatter={v=>`₹${v}Cr`}/>
                <Tooltip {...TT_PROPS} formatter={(v,n)=>[`₹${v} Cr`,n]}/>
                <ReferenceLine y={0} stroke={C.gold} strokeDasharray="4 3"
                  label={{ value:"Breakeven", fill:C.gold, fontSize:10, position:"insideTopRight" }}/>
                <Area type="monotone" dataKey="cum" name="Cumulative" stroke={C.green} fill="url(#cumGr)" strokeWidth={2.5}/>
              </AreaChart>
            </ResponsiveContainer>
          </Panel>

          {/* Stacked cost breakdown */}
          <Panel title="💹 Annual Revenue vs Costs (₹ Cr)">
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={yearlyData} margin={{ top:4, right:16, bottom:4, left:0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke={C.divider} vertical={false}/>
                <XAxis dataKey="year" tick={{ fontSize:11, fill:C.textMid }} axisLine={{ stroke:C.border }} tickLine={false}/>
                <YAxis tick={{ fontSize:10, fill:C.textLight }} axisLine={false} tickLine={false} tickFormatter={v=>`₹${v}`}/>
                <Tooltip {...TT_PROPS} formatter={(v,n)=>[`₹${v} Cr`,n]}/>
                <Legend wrapperStyle={{ fontSize:10, color:C.textMid, paddingTop:6 }}/>
                <Bar dataKey="rev"  name="Revenue"       fill={C.blue}   opacity={0.85} radius={[2,2,0,0]}/>
                <Bar dataKey="chrg" name="Charging cost" fill={C.red}    opacity={0.85} radius={[2,2,0,0]}/>
                <Bar dataKey="opex" name="Opex"          fill={C.purple} opacity={0.85} radius={[2,2,0,0]}/>
                <Bar dataKey="aug"  name="Augmentation"  fill={C.gold}   opacity={0.9}  radius={[2,2,0,0]}/>
                <Line type="monotone" dataKey="net" name="Net CF" stroke={C.green} strokeWidth={2.5} dot={{ fill:C.green, r:3 }}/>
              </ComposedChart>
            </ResponsiveContainer>
          </Panel>
        </div>

        {/* ── SOH YEAR-ON-YEAR TABLE ── */}
        <Panel title="🔋 Battery SoH Degradation — Year on Year" style={{ marginBottom:16 }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr>
                  <TH align="left">Year</TH>
                  <TH c={C.gold}>SoH Start (%)</TH>
                  <TH c={C.gold}>SoH End (%)</TH>
                  <TH c={C.red}>SoH Loss (%)</TH>
                  <TH c={C.teal}>Usable Cap (MWh)</TH>
                  <TH c={C.textLight}>DoD Factor</TH>
                  <TH c={C.amber}>Augmentation</TH>
                </tr>
              </thead>
              <tbody>
                {yearlyData.map((row, i) => (
                  <tr key={row.year} style={{ borderBottom:`1px solid ${C.divider}`,
                    background: row.augCr > 0 ? C.goldLight : i%2===0 ? C.surface : C.bg }}>
                    <TD align="left" color={row.augCr>0?C.gold:C.text} bold>{row.year}{row.augCr>0?" ⚡":""}</TD>
                    <TD color={C.gold} mono>{row.sohStart}%</TD>
                    <TD color={row.sohEnd>=85?C.green:row.sohEnd>=80?C.gold:C.red} mono bold>{row.sohEnd}%</TD>
                    <TD color={C.red} mono>−{row.sohLossPct}%</TD>
                    <TD color={C.teal} mono>{row.effCapEnd} MWh</TD>
                    <TD color={C.textMid}>{(dodDegFactor(dod)*100).toFixed(0)}%</TD>
                    <TD color={row.augCr>0?C.gold:C.textLight}>
                      {row.augCr>0 ? `₹${row.augCr} Cr · SoH → ${(augSoH*100).toFixed(0)}%` : "—"}
                    </TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* ── FULL COST BREAKDOWN TABLE ── */}
        <Panel title="📋 Year-by-Year Full Cost Breakdown (₹ Cr)" style={{ marginBottom:16 }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr>
                  <TH align="left">Year</TH>
                  <TH c={C.blue}>Revenue</TH>
                  <TH c={C.red}>Charging Cost</TH>
                  <TH c={C.purple}>Opex</TH>
                  <TH c={C.gold}>Aug Cost</TH>
                  <TH c={C.green}>Net Cashflow</TH>
                  <TH c={C.green}>Cumulative</TH>
                  <TH c={C.textMid}>ROI %</TH>
                  <TH c={C.gold}>SoH End</TH>
                </tr>
              </thead>
              <tbody>
                {yearlyData.map((row, i) => (
                  <tr key={row.year} style={{ borderBottom:`1px solid ${C.divider}`,
                    background: row.augCr>0 ? C.goldLight : i%2===0 ? C.surface : C.bg }}>
                    <TD align="left" color={row.augCr>0?C.gold:C.text} bold>{row.year}{row.augCr>0?" ⚡":""}</TD>
                    <TD color={C.blue}  mono>₹{row.revCr}</TD>
                    <TD color={C.red}   mono>−₹{row.chrgCr}</TD>
                    <TD color={C.purple}mono>−₹{row.opexCr}</TD>
                    <TD color={row.augCr>0?C.gold:C.textLight} mono>{row.augCr>0?`−₹${row.augCr}`:"—"}</TD>
                    <TD color={row.netCr>=0?C.green:C.red} bold mono>₹{row.netCr}</TD>
                    <TD color={row.cumCr>=0?C.green:C.red} bold={row.cumCr>=0} mono>₹{row.cumCr}</TD>
                    <TD color={C.textMid}>{row.roi}%</TD>
                    <TD color={row.sohEnd>=85?C.green:row.sohEnd>=80?C.gold:C.red} mono>{row.sohEnd}%</TD>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop:`2px solid ${C.borderStrong}`, background:C.surfaceHigh }}>
                  <td style={{ padding:"9px 10px", fontSize:11, fontWeight:800, color:C.textMid }}>10-yr Total</td>
                  <td style={{ padding:"9px 10px", color:C.blue,   textAlign:"right", fontWeight:700, fontFamily:"monospace", fontSize:12 }}>₹{tot("revCr")}</td>
                  <td style={{ padding:"9px 10px", color:C.red,    textAlign:"right", fontWeight:700, fontFamily:"monospace", fontSize:12 }}>−₹{tot("chrgCr")}</td>
                  <td style={{ padding:"9px 10px", color:C.purple, textAlign:"right", fontWeight:700, fontFamily:"monospace", fontSize:12 }}>−₹{tot("opexCr")}</td>
                  <td style={{ padding:"9px 10px", color:C.gold,   textAlign:"right", fontWeight:700, fontFamily:"monospace", fontSize:12 }}>{augOn?`−₹${toCr(augCostTotal)}`:"—"}</td>
                  <td style={{ padding:"9px 10px", color:C.green,  textAlign:"right", fontWeight:700, fontFamily:"monospace", fontSize:12 }}>₹{tot("netCr")}</td>
                  <td colSpan={3} style={{ padding:"9px 10px", color:C.textLight, textAlign:"right", fontSize:10 }}>see cumulative column above</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Panel>

        {/* ── MONTHLY YEAR-1 TABLE ── */}
        <Panel title="📅 Monthly Detail — Year 1" style={{ marginBottom:28 }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr>
                  <TH align="left">Month</TH>
                  <TH c={C.red}>Buy ₹/kWh</TH>
                  <TH c={C.blue}>Sell ₹/kWh</TH>
                  <TH c={C.green}>Spread</TH>
                  <TH c={C.blue}>Revenue (₹L)</TH>
                  <TH c={C.red}>Chrg Cost (₹L)</TH>
                  <TH c={C.purple}>Opex (₹L)</TH>
                  <TH c={C.green}>Net (₹L)</TH>
                  <TH c={C.gold}>SoH %</TH>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((row, i) => (
                  <tr key={row.month} style={{ borderBottom:`1px solid ${C.divider}`,
                    background: i%2===0 ? C.surface : C.bg }}>
                    <TD align="left" color={C.text} bold>{row.month}</TD>
                    <TD color={C.red}    mono>₹{row.buy}</TD>
                    <TD color={C.blue}   mono>₹{row.sell}</TD>
                    <TD color={row.spread>=3?C.green:C.gold} bold mono>₹{row.spread}</TD>
                    <TD color={C.blue}   mono>₹{row.revL}L</TD>
                    <TD color={C.red}    mono>−₹{row.chrgL}L</TD>
                    <TD color={C.purple} mono>−₹{row.opexL}L</TD>
                    <TD color={C.green}  bold mono>₹{row.netL}L</TD>
                    <TD color={row.soh>=85?C.green:row.soh>=80?C.gold:C.red} mono>{row.soh}%</TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* footer */}
        <div style={{ fontSize:10, color:C.textLight, borderTop:`1px solid ${C.border}`, paddingTop:16, lineHeight:2.2 }}>
          <strong style={{ color:C.textMid }}>Assumptions</strong> · IEX DAM FY2026 seasonal actuals ·
          Solar surplus = off-peak − ₹0.8/kWh · O&M ₹{OPEX_PER_KWH_YR}/kWh/yr (scales with effective capacity) ·
          LFP nonlinear degradation scaled by DoD factor · Augmentation = lost capacity × cell cost ·
          1 cycle/day · 4-hour LFP · ₹{FX}/USD exchange rate ·
          <strong style={{ color:C.red }}> Indicative only — not investment advice.</strong>
        </div>
      </div>
    </div>
  );
}
