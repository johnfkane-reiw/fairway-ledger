import { useState, useEffect, useMemo, Fragment } from "react";
import { api } from "./lib/api.js";
import {
  computeGolferRecord, courseHandicap, adjustedGrossFromHoles,
  scoreDifferential, fmtIndex,
} from "./lib/whs.js";

const CSS = `
:root{
  --green-900:#10301f; --green-800:#163d28; --green-700:#1d5638;
  --green-500:#2f8a59; --paper:#f4efe3; --card:#fffdf8; --ink:#1a201c;
  --ink-soft:#6a6f66; --brass:#a9762a; --brass-2:#c5933f; --line:#e3dcca;
  --red:#9b3722; --blue:#345b7a;
}
*{box-sizing:border-box}
body{margin:0}
.fl{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--ink);
  background:var(--paper);min-height:100vh;-webkit-font-smoothing:antialiased}
.fl .num{font-variant-numeric:tabular-nums;font-feature-settings:"tnum"}
.top{background:var(--green-900);color:#f4efe3;padding:14px 22px;
  display:flex;align-items:center;gap:14px;position:sticky;top:0;z-index:10;
  border-bottom:3px solid var(--brass)}
.mark{width:34px;height:34px;border:2px solid var(--brass-2);border-radius:50%;
  display:grid;place-items:center;font-weight:700;color:var(--brass-2);font-family:Georgia,serif}
.brand{font-family:Georgia,serif;font-size:21px;letter-spacing:.3px}
.brand b{color:var(--brass-2)}
.tag{font-size:11px;color:#b9c4ba;letter-spacing:1.5px;text-transform:uppercase}
.nav{display:flex;gap:2px;background:var(--green-800);padding:0 14px;position:sticky;top:64px;z-index:9}
.nav button{background:none;border:none;color:#bcc8bd;padding:13px 18px;font-size:14px;
  cursor:pointer;border-bottom:3px solid transparent;font-weight:500}
.nav button:hover{color:#fff}
.nav button.on{color:#fff;border-bottom-color:var(--brass-2)}
.wrap{max-width:1040px;margin:0 auto;padding:26px 22px 80px}
.h2{font-family:Georgia,serif;font-size:24px;margin:0 0 4px}
.sub{color:var(--ink-soft);font-size:13px;margin:0 0 20px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:18px;margin-bottom:16px}
.row{display:flex;gap:14px;flex-wrap:wrap}
.grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(230px,1fr))}
.idxcard{background:linear-gradient(160deg,var(--green-800),var(--green-900));color:#f4efe3;
  border-radius:12px;padding:20px 22px;position:relative;overflow:hidden;border:1px solid #0c2417}
.idxcard:before{content:"";position:absolute;right:-30px;top:-30px;width:120px;height:120px;
  border:1px solid rgba(197,147,63,.25);border-radius:50%}
.idxname{font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:#b9c4ba}
.idxbig{font-family:Georgia,serif;font-size:54px;line-height:1;margin:6px 0 2px;color:#fff}
.idxbig .pt{color:var(--brass-2)}
.idxmeta{font-size:12px;color:#cdd6cd}
.idxmeta b{color:var(--brass-2)}
.btn{background:var(--green-700);color:#fff;border:none;border-radius:8px;padding:10px 16px;
  font-size:14px;cursor:pointer;font-weight:600}
.btn:hover{background:var(--green-800)}
.btn.ghost{background:none;color:var(--green-700);border:1px solid var(--line)}
.btn.ghost:hover{background:#efe9da}
.btn.brass{background:var(--brass)}
.btn.brass:hover{background:#8f6322}
.btn.sm{padding:6px 11px;font-size:13px}
.btn.danger{background:none;color:var(--red);border:1px solid #e6cfc7}
label{display:block;font-size:12px;color:var(--ink-soft);margin:0 0 4px;font-weight:600;
  letter-spacing:.3px;text-transform:uppercase}
input,select{font:inherit;padding:9px 11px;border:1px solid var(--line);border-radius:7px;
  background:#fff;width:100%;color:var(--ink)}
input:focus,select:focus{outline:2px solid var(--green-500);outline-offset:-1px}
.field{flex:1;min-width:130px;margin-bottom:12px}
table{width:100%;border-collapse:collapse;font-size:14px}
th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--line)}
th{font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:var(--ink-soft)}
tr:last-child td{border-bottom:none}
.r{text-align:right}
.empty{text-align:center;padding:48px 20px;color:var(--ink-soft)}
.empty .serif{font-size:20px;color:var(--ink);margin-bottom:6px;font-family:Georgia,serif}
.serif{font-family:Georgia,serif}
.pill{display:inline-block;font-size:11px;padding:3px 9px;border-radius:20px;background:#ede6d4;color:var(--ink-soft);font-weight:600}
.scorecard{overflow-x:auto;border:1px solid var(--line);border-radius:8px}
.scorecard table{font-size:13px;min-width:560px}
.scorecard th,.scorecard td{padding:6px 7px;text-align:center;border:1px solid var(--line)}
.scorecard .lab{text-align:left;background:#f0ead9;font-weight:600;white-space:nowrap;position:sticky;left:0}
.scorecard input{padding:5px;text-align:center;width:42px;border-radius:4px}
.scorecard .par{color:var(--ink-soft)}
.tot{background:var(--green-900);color:#fff !important;font-weight:700}
.modal{position:fixed;inset:0;background:rgba(16,24,18,.5);display:grid;place-items:center;z-index:30;padding:20px}
.modal .box{background:var(--card);border-radius:12px;max-width:680px;width:100%;max-height:88vh;
  overflow:auto;padding:24px;border-top:4px solid var(--brass)}
.x{float:right;background:none;border:none;font-size:22px;cursor:pointer;color:var(--ink-soft)}
.note{background:#f0ead9;border-left:3px solid var(--brass);padding:12px 14px;border-radius:0 8px 8px 0;
  font-size:13px;color:#5a5039;margin-bottom:16px}
.linkbtn{background:none;border:none;color:var(--green-700);cursor:pointer;font-weight:600;font-size:14px;padding:0;text-decoration:underline}
.hr{height:1px;background:var(--line);border:none;margin:18px 0}
.flex-between{display:flex;justify-content:space-between;align-items:center;gap:12px}
.defs-btn{margin-left:auto;background:rgba(255,255,255,.08);color:#f4efe3;
  border:1px solid rgba(197,147,63,.5);border-radius:8px;padding:7px 13px;font-size:13px;
  cursor:pointer;font-weight:600;white-space:nowrap}
.defs-btn:hover{background:rgba(255,255,255,.16)}
.dscrim{position:fixed;inset:0;background:rgba(16,24,18,.4);z-index:39;animation:dfade .18s ease}
.drawer{position:fixed;top:0;right:0;height:100vh;width:420px;max-width:100%;background:var(--card);
  z-index:40;box-shadow:-8px 0 30px rgba(16,24,18,.18);border-left:4px solid var(--brass);
  display:flex;flex-direction:column;animation:dslide .22s ease}
@keyframes dfade{from{opacity:0}to{opacity:1}}
@keyframes dslide{from{transform:translateX(100%)}to{transform:translateX(0)}}
.dhead{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;
  border-bottom:1px solid var(--line)}
.dhead h2{font-family:Georgia,serif;font-size:20px;margin:0}
.dbody{flex:1;overflow-y:auto;padding:4px 20px 28px}
.def{padding:14px 0;border-bottom:1px solid var(--line)}
.def:last-child{border-bottom:none}
.def .term{font-weight:700;font-size:15px;margin:0 0 4px}
.def .desc{font-size:13px;color:var(--ink-soft);line-height:1.55;margin:0}
.def .formula{font-size:12.5px;color:var(--ink);background:#f0ead9;border-radius:6px;
  padding:7px 10px;margin-top:8px;line-height:1.5;white-space:pre-line}
@media(max-width:600px){.drawer{width:100%;border-left:none}}
`;

export default function App() {
  const [data, setData] = useState(null);
  const [view, setView] = useState("players");
  const [err, setErr] = useState(null);
  const [showDefs, setShowDefs] = useState(false);
  const [pendingPlayer, setPendingPlayer] = useState(null);
  const openPlayer = (id) => { setPendingPlayer(id); setView("players"); };

  const refresh = () =>
    api.getState().then(setData).catch((e) => setErr(String(e)));
  useEffect(() => { refresh(); }, []);

  if (err)
    return (
      <div className="fl"><style>{CSS}</style>
        <div className="wrap"><div className="card">
          <h2 className="serif">Couldn't reach the API</h2>
          <p className="sub">{err}</p>
          <p>If you're running locally, use <code>npx wrangler pages dev dist</code> so the Functions and D1 binding are available — <code>vite dev</code> alone serves the frontend without the API.</p>
        </div></div>
      </div>
    );
  if (!data) return <div className="fl"><style>{CSS}</style><div className="wrap"><p className="sub">Loading…</p></div></div>;

  return (
    <div className="fl">
      <style>{CSS}</style>
      <header className="top">
        <div className="mark serif">FL</div>
        <div>
          <div className="brand">Fairway <b>Ledger</b></div>
          <div className="tag">Unofficial WHS Handicap Tracking</div>
        </div>
        <button className="defs-btn" onClick={() => setShowDefs(true)}>Definitions</button>
      </header>
      <nav className="nav">
        {[["players", "Players"], ["courses", "Courses"], ["post", "Post Score"], ["league", "Leagues"]].map(([k, l]) => (
          <button key={k} className={view === k ? "on" : ""} onClick={() => setView(k)}>{l}</button>
        ))}
      </nav>
      <main className="wrap">
        {view === "players" && <Players data={data} refresh={refresh} openId={pendingPlayer} clearOpen={() => setPendingPlayer(null)} />}
        {view === "courses" && <Courses data={data} refresh={refresh} />}
        {view === "post" && <PostScore data={data} refresh={refresh} go={setView} />}
        {view === "league" && <Leagues data={data} refresh={refresh} openPlayer={openPlayer} />}
      </main>
      <footer className="num" style={{ textAlign: "center", padding: "8px 20px 40px", color: "var(--ink-soft)", fontSize: 12 }}>
        Fairway Ledger · build <b>{__BUILD_SHA__}</b> · {__BUILD_TIME__} UTC
      </footer>
      {showDefs && <DefinitionsDrawer onClose={() => setShowDefs(false)} />}
    </div>
  );
}

/* ---------------- DEFINITIONS ---------------- */
const DEFINITIONS = [
  {
    term: "Handicap Index",
    desc: "Your portable measure of demonstrated ability, built from your best recent rounds. With 20 scores posted it's the average of your best 8 Score Differentials; with fewer, a reduced set is used. Capped at 54.0.",
    formula: "Index = average of best 8 of last 20 Differentials\n(fewer than 20 → reduced set, e.g. 3 scores = lowest 1 − 2.0)",
  },
  {
    term: "Score Differential",
    desc: "What a single round is worth as a handicap number, after adjusting for how hard the tees played. The building block of your Index.",
    formula: "Differential = (113 ÷ Slope) × (Adjusted Gross − Course Rating − PCC)",
  },
  {
    term: "Adjusted Gross Score (AGS)",
    desc: "Your total strokes for the round after each hole is capped at Net Double Bogey. Equals your gross score when no hole needed capping.",
    formula: "AGS = sum of each hole's min(actual score, Net Double Bogey)",
  },
  {
    term: "Net Double Bogey",
    desc: "The most a single hole can count for handicap purposes — so one blow-up hole can't distort your Index.",
    formula: "Net Double Bogey = par + 2 + handicap strokes received on the hole\n(before you have an Index: par + 5)",
  },
  {
    term: "Course Rating",
    desc: "The score a scratch (0-handicap) golfer is expected to shoot from a set of tees. A published value set by the course's rating authority — not calculated here.",
  },
  {
    term: "Slope Rating",
    desc: "How much harder a set of tees plays for a bogey golfer than for a scratch golfer. 113 is the standard (average) slope; higher numbers mean relatively harder for higher handicaps.",
  },
  {
    term: "Course Handicap",
    desc: "How many strokes your Index converts to on one specific set of tees — the strokes you'd receive playing those tees.",
    formula: "Course Handicap = Index × (Slope ÷ 113) + (Course Rating − Par)",
  },
  {
    term: "Playing Handicap",
    desc: "Your Course Handicap after a format allowance is applied (100% for most stroke play; some competitions use less).",
    formula: "Playing Handicap = Course Handicap × allowance %",
  },
  {
    term: "Stroke Index",
    desc: "The 1–18 ranking of hole difficulty printed on the scorecard, which decides the order in which your handicap strokes fall (1 = hardest hole).",
  },
  {
    term: "PCC — Playing Conditions Calculation",
    desc: "A daily −1 to +3 adjustment for how much weather and course setup affected scoring. Entered manually here; in official WHS it's computed automatically from the whole field's scores that day. It feeds the Score Differential formula above.",
  },
];

function DefinitionsDrawer({ onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="dscrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label="Definitions">
        <div className="dhead">
          <h2>Definitions</h2>
          <button className="x" onClick={onClose} aria-label="Close" style={{ float: "none" }}>×</button>
        </div>
        <div className="dbody">
          <p className="sub" style={{ margin: "10px 0 2px" }}>The WHS terms used in Fairway Ledger.</p>
          {DEFINITIONS.map((d) => (
            <div className="def" key={d.term}>
              <p className="term">{d.term}</p>
              <p className="desc">{d.desc}</p>
              {d.formula && <div className="formula num">{d.formula}</div>}
            </div>
          ))}
          <div className="note" style={{ margin: "16px 0 0" }}>
            <b>Not modeled in Fairway Ledger:</b> 9-hole rounds, automatic PCC, Exceptional Score Reduction, and Low Handicap Index soft/hard caps. Indexes here are unofficial.
          </div>
        </div>
      </aside>
    </>
  );
}

/* ---------------- PLAYERS ---------------- */
// Describes which rounds build the current Index, for the scoring-record caption.
function selectionLabel(sel) {
  if (!sel) return null;
  if (sel.of >= 20) return `best ${sel.used} of 20 counting`;
  const adj = sel.adj ? ` · ${sel.adj < 0 ? "−" : "+"}${Math.abs(sel.adj).toFixed(1)}` : "";
  return `lowest ${sel.used} of ${sel.of}${adj}`;
}

function Players({ data, refresh, openId, clearOpen }) {
  const [name, setName] = useState("");
  const [sel, setSel] = useState(openId ?? null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (openId != null) clearOpen?.(); }, []);
  const courseMap = useMemo(() => Object.fromEntries(data.courses.map((c) => [c.id, c])), [data.courses]);
  const records = useMemo(
    () => Object.fromEntries(data.golfers.map((g) => [g.id, computeGolferRecord(g.id, data.scores, courseMap)])),
    [data.golfers, data.scores, courseMap]
  );

  const addGolfer = async () => {
    if (!name.trim()) return;
    await api.addGolfer(name.trim());
    setName(""); refresh();
  };

  const seedDemo = async () => {
    setBusy(true);
    const pars = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 3, 4, 4, 5, 4, 3, 4, 4];
    const sis = [7, 3, 15, 1, 11, 5, 17, 9, 13, 8, 16, 2, 12, 4, 10, 18, 6, 14];
    const holes = pars.map((par, i) => ({ par, si: sis[i] }));
    await api.saveCourse({
      name: "Carolina National",
      tees: [
        { name: "Blue", rating: 71.8, slope: 132, par: 72, holes },
        { name: "White", rating: 69.4, slope: 124, par: 72, holes },
      ],
    });
    for (const n of ["John Kane", "Pat Rivera", "Sam Doyle"]) await api.addGolfer(n);
    const st = await api.getState();
    const course = st.courses.find((c) => c.name === "Carolina National");
    const tee = course.tees.find((t) => t.name === "Blue");
    const totals = { "John Kane": [88, 91, 85, 90, 87], "Pat Rivera": [95, 98, 93, 99, 96], "Sam Doyle": [82, 84, 80, 86, 83] };
    for (const g of st.golfers) {
      const arr = totals[g.name];
      if (!arr) continue;
      for (let i = 0; i < arr.length; i++) {
        await api.addScore({
          golferId: g.id, courseId: course.id, teeId: tee.id,
          date: new Date(Date.now() - (arr.length - i) * 7 * 86400000).toISOString().slice(0, 10),
          pcc: 0, adjustedGross: arr[i],
        });
      }
    }
    setBusy(false); refresh();
  };

  if (sel) {
    const g = data.golfers.find((x) => x.id === sel);
    if (g) return <PlayerDetail golfer={g} record={records[sel]} data={data} back={() => setSel(null)} />;
  }

  return (
    <div>
      <h1 className="h2">Players</h1>
      <p className="sub">Each player's Handicap Index is the average of their best 8 of the last 20 score differentials.</p>

      {data.golfers.length === 0 && data.courses.length === 0 && (
        <div className="note">
          Empty ledger.{" "}
          <button className="linkbtn" onClick={seedDemo} disabled={busy}>
            {busy ? "Seeding…" : "Load demo data"}
          </button>{" "}
          for a worked example, or add your own below.
        </div>
      )}

      <div className="card">
        <div className="row" style={{ alignItems: "flex-end" }}>
          <div className="field" style={{ flex: 2 }}>
            <label>Add a player</label>
            <input value={name} placeholder="Full name" onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addGolfer()} />
          </div>
          <button className="btn" onClick={addGolfer}>Add player</button>
        </div>
      </div>

      {data.golfers.length > 0 && (
        <div className="grid">
          {data.golfers.map((g) => {
            const r = records[g.id];
            const txt = r.current == null ? null : Math.abs(r.current).toFixed(1).split(".");
            return (
              <div key={g.id} className="idxcard" style={{ cursor: "pointer" }} onClick={() => setSel(g.id)}>
                <div className="idxname">{g.name}</div>
                <div className="idxbig serif num">
                  {r.current == null ? <span style={{ fontSize: 26 }}>No Index yet</span> :
                    <>{r.current < 0 ? "+" : ""}{txt[0]}<span className="pt">.{txt[1]}</span></>}
                </div>
                <div className="idxmeta num">
                  {r.scoreCount} score{r.scoreCount !== 1 ? "s" : ""}
                  {r.current == null && r.scoreCount < 3 && <> · need {3 - r.scoreCount} more</>}
                  {r.lowHI != null && <> · Low <b>{fmtIndex(r.lowHI)}</b></>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlayerDetail({ golfer, record, data, back }) {
  const courseMap = Object.fromEntries(data.courses.map((c) => [c.id, c]));
  const [teeId, setTeeId] = useState(record.rows[0]?.teeId ?? data.courses[0]?.tees[0]?.id ?? null);
  const allowance = data.settings.allowance;
  let tee = null;
  for (const c of data.courses) { const t = c.tees.find((x) => x.id === Number(teeId)); if (t) tee = t; }
  const ch = record.current != null && tee ? courseHandicap(record.current, tee) : null;
  const ph = ch != null ? Math.round(ch * (allowance / 100)) : null;

  const removeScore = async (id) => { await api.delScore(id); back(); };
  const [openRow, setOpenRow] = useState(null);

  return (
    <div>
      <button className="linkbtn" onClick={back}>← All players</button>
      <h1 className="h2" style={{ marginTop: 10 }}>{golfer.name}</h1>

      <div className="row">
        <div className="idxcard" style={{ flex: 1, minWidth: 240 }}>
          <div className="idxname">Handicap Index</div>
          <div className="idxbig serif num">{fmtIndex(record.current)}</div>
          <div className="idxmeta num">
            {record.scoreCount} scores
            {record.lowHI != null && <> · Low Index <b>{fmtIndex(record.lowHI)}</b></>}
          </div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 240, marginBottom: 16 }}>
          <label>Course &amp; Playing Handicap</label>
          <p className="sub" style={{ margin: "0 0 10px", fontSize: 12 }}>
            How many strokes this player gets on a chosen set of tees, converted from their Handicap Index.
          </p>
          <select value={teeId ?? ""} onChange={(e) => setTeeId(e.target.value)}>
            {data.courses.map((c) => c.tees.map((t) => (
              <option key={t.id} value={t.id}>{c.name} — {t.name} ({t.rating}/{t.slope})</option>
            )))}
          </select>
          {record.current == null ? (
            <p className="sub" style={{ marginTop: 12 }}>
              {record.scoreCount < 3
                ? <>Appears once an Index is established — {3 - record.scoreCount} more score{3 - record.scoreCount !== 1 ? "s" : ""} to go.</>
                : <>Appears once an Index is established.</>}
            </p>
          ) : tee ? (
            <div style={{ marginTop: 14 }} className="num">
              <div style={{ fontSize: 34, fontFamily: "Georgia,serif" }}>{ch}</div>
              <div className="sub" style={{ margin: 0 }}>
                Course Handicap on {tee.name} · Playing Handicap <b>{ph}</b> at {allowance}%
              </div>
            </div>
          ) : <p className="sub" style={{ marginTop: 12 }}>Add a course to see strokes.</p>}
        </div>
      </div>

      <div className="card">
        <div className="flex-between">
          <h3 className="serif" style={{ margin: 0, fontSize: 18 }}>Scoring record</h3>
          {record.selection && <span className="pill">{selectionLabel(record.selection)}</span>}
        </div>
        {record.countingIds?.size > 0 && (
          <p className="sub" style={{ margin: "6px 0 0", fontSize: 12 }}>
            Highlighted rounds are the ones counting toward the current Index.
          </p>
        )}
        <hr className="hr" />
        {record.rows.length === 0 ? <p className="sub" style={{ margin: 0 }}>No scores posted yet.</p> : (
          <table className="num">
            <thead><tr><th>Date</th><th>Course / Tee</th><th className="r">AGS</th><th className="r">Rtg/Slope</th><th className="r">Diff</th><th className="r">Index after</th><th></th></tr></thead>
            <tbody>
              {record.rows.map((row) => {
                const counts = record.countingIds?.has(row.id);
                return (
                <Fragment key={row.id}>
                  <tr onClick={() => setOpenRow(openRow === row.id ? null : row.id)} style={{ cursor: "pointer", background: counts ? "rgba(169,118,42,.10)" : undefined }}>
                    <td><span style={{ color: "var(--ink-soft)", marginRight: 6 }}>{openRow === row.id ? "▾" : "▸"}</span>{row.date}</td>
                    <td>{courseMap[row.courseId]?.name} · {row.tee.name}</td>
                    <td className="r">{row.ags}</td>
                    <td className="r">{row.tee.rating}/{row.tee.slope}</td>
                    <td className="r">{counts ? <b><span style={{ color: "var(--brass)" }}>✓</span> {row.diff.toFixed(1)}</b> : row.diff.toFixed(1)}</td>
                    <td className="r">{fmtIndex(row.indexAfter)}</td>
                    <td className="r"><button className="btn danger sm" onClick={(e) => { e.stopPropagation(); removeScore(row.id); }}>Delete</button></td>
                  </tr>
                  {openRow === row.id && (
                    <tr>
                      <td colSpan={7} style={{ background: "#faf6ec", padding: 0 }}><ScoreDetail row={row} courseName={courseMap[row.courseId]?.name} /></td>
                    </tr>
                  )}
                </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ---------------- COURSES ---------------- */
function ScoreDetail({ row, courseName }) {
  const toPar = (n) => (n === 0 ? "E" : n > 0 ? `+${n}` : `${n}`);
  const capped = row.holeDetail && row.holeDetail.some((d) => d.adj != null && d.adj < d.raw);
  return (
    <div>
      <div style={{ padding: "12px 14px 2px", fontWeight: 600, fontSize: 14 }}>
        {courseName} — {row.tee.name}
        <span className="sub" style={{ fontWeight: 400 }}> · {row.tee.rating}/{row.tee.slope} · par {row.par}</span>
      </div>
      <div className="num" style={{ padding: "4px 14px 0", display: "flex", gap: 20, flexWrap: "wrap", fontSize: 13 }}>
        <span>Gross <b>{row.grossTotal}</b></span>
        <span>Adjusted gross <b>{row.ags}</b></span>
        <span>To par <b>{toPar(row.toPar)}</b></span>
        <span>Differential <b>{row.diff.toFixed(1)}</b></span>
        {row.pcc ? <span>PCC <b>{row.pcc > 0 ? `+${row.pcc}` : row.pcc}</b></span> : null}
      </div>
      {row.holeDetail ? (
        <>
          <div className="scorecard" style={{ margin: 12 }}>
            <table className="num">
              <thead><tr><th className="lab">Hole</th>{row.holeDetail.map((d) => <th key={d.hole}>{d.hole}</th>)}<th>Tot</th></tr></thead>
              <tbody>
                <tr><td className="lab par">Par</td>{row.holeDetail.map((d) => <td key={d.hole} className="par">{d.par}</td>)}<td className="tot">{row.par}</td></tr>
                {row.holeDetail.some((d) => d.yd != null) && (
                  <tr><td className="lab par">Yards</td>{row.holeDetail.map((d) => <td key={d.hole} className="par">{d.yd ?? "—"}</td>)}<td className="tot">{row.holeDetail.reduce((s, d) => s + (Number(d.yd) || 0), 0).toLocaleString()}</td></tr>
                )}
                <tr><td className="lab">Score</td>{row.holeDetail.map((d) => (
                  <td key={d.hole}>
                    {d.raw == null ? "—" : d.adj < d.raw
                      ? <span>{d.raw}<span style={{ color: "var(--brass)", fontWeight: 700 }}>→{d.adj}</span></span>
                      : d.raw}
                  </td>
                ))}<td className="tot">{row.ags}</td></tr>
              </tbody>
            </table>
          </div>
          {capped && (
            <p className="sub" style={{ padding: "0 14px 12px", margin: 0, fontSize: 12 }}>
              Holes shown as <b>entered→counted</b> were capped to Net Double Bogey for handicap purposes.
            </p>
          )}
        </>
      ) : (
        <p className="sub" style={{ padding: "8px 14px 12px", margin: 0 }}>Entered as a total adjusted gross — no hole-by-hole detail recorded for this round.</p>
      )}
    </div>
  );
}


function Courses({ data, refresh }) {
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(null);
  const [openTee, setOpenTee] = useState(null);
  const removeCourse = async (id) => { await api.delCourse(id); refresh(); };

  return (
    <div>
      <div className="flex-between">
        <div>
          <h1 className="h2">Courses</h1>
          <p className="sub">Define tees with Course Rating, Slope, and par. Add a scorecard to enable automatic Net Double Bogey.</p>
        </div>
        <button className="btn" onClick={() => setEditing("new")}>Add course</button>
      </div>

      {data.courses.length === 0 ? (
        <div className="card empty"><div className="serif">No courses yet</div><p>Add the courses your players play, including each set of tees.</p></div>
      ) : data.courses.map((c) => (
        <div key={c.id} className="card" style={{ padding: 0 }}>
          <div className="flex-between" style={{ padding: 16, cursor: "pointer" }} onClick={() => setOpen(open === c.id ? null : c.id)}>
            <h3 className="serif" style={{ margin: 0, fontSize: 18 }}>
              <span style={{ color: "var(--ink-soft)", marginRight: 8 }}>{open === c.id ? "▾" : "▸"}</span>
              {c.name}
              <span className="sub" style={{ margin: 0, fontWeight: 400, fontSize: 13 }}> · {c.tees.length} tee{c.tees.length !== 1 ? "s" : ""}</span>
            </h3>
            <div className="row" onClick={(e) => e.stopPropagation()}>
              <button className="btn ghost sm" onClick={() => setEditing(c.id)}>Edit</button>
              <button className="btn danger sm" onClick={() => removeCourse(c.id)}>Delete</button>
            </div>
          </div>
          {open === c.id && (
            <div style={{ padding: "0 16px 16px" }}>
              <hr className="hr" style={{ marginTop: 0 }} />
              <table className="num">
                <thead><tr><th>Tee</th><th className="r">Rating</th><th className="r">Slope</th><th className="r">Par</th><th className="r">Yards</th><th className="r">Scorecard</th></tr></thead>
                <tbody>{c.tees.map((t) => {
                  const yards = t.holes ? t.holes.reduce((s, h) => s + (Number(h.yd) || 0), 0) : 0;
                  const teeOpen = openTee === t.id;
                  return (
                  <Fragment key={t.id}>
                    <tr>
                      <td>{t.name}</td><td className="r">{t.rating}</td><td className="r">{t.slope}</td><td className="r">{t.par}</td>
                      <td className="r">{yards ? yards.toLocaleString() : "—"}</td>
                      <td className="r">{t.holes
                        ? <button className="btn ghost sm" onClick={() => setOpenTee(teeOpen ? null : t.id)}>{teeOpen ? "Hide ▴" : "Scorecard ▾"}</button>
                        : <span style={{ color: "var(--ink-soft)" }}>total only</span>}</td>
                    </tr>
                    {teeOpen && t.holes && (
                      <tr>
                        <td colSpan={6} style={{ padding: 0, border: "none", background: "transparent" }}>
                          <div className="scorecard" style={{ margin: "0 0 12px" }}>
                            <table className="num">
                              <thead><tr><th className="lab">Hole</th>{t.holes.map((_, h) => <th key={h}>{h + 1}</th>)}<th>Tot</th></tr></thead>
                              <tbody>
                                <tr><td className="lab par">Par</td>{t.holes.map((h, k) => <td key={k} className="par">{h.par}</td>)}<td className="tot">{t.par}</td></tr>
                                {yards > 0 && (
                                  <tr><td className="lab par">Yards</td>{t.holes.map((h, k) => <td key={k} className="par">{h.yd ?? "—"}</td>)}<td className="tot">{yards.toLocaleString()}</td></tr>
                                )}
                                <tr><td className="lab">Stroke index</td>{t.holes.map((h, k) => <td key={k}>{h.si}</td>)}<td className="tot">—</td></tr>
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                  );
                })}</tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      {editing && (
        <CourseEditor refresh={refresh}
          course={editing === "new" ? null : data.courses.find((c) => c.id === editing)}
          close={() => setEditing(null)} />
      )}
    </div>
  );
}

function CourseEditor({ course, close, refresh }) {
  const [name, setName] = useState(course?.name || "");
  const [tees, setTees] = useState(
    course?.tees.map((t) => ({ ...t })) || [{ name: "", rating: "", slope: "", par: 72, holes: null }]
  );
  const setTee = (i, patch) => setTees((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const addTee = () => setTees((ts) => [...ts, { name: "", rating: "", slope: "", par: 72, holes: null }]);
  const removeTee = (i) => setTees((ts) => ts.filter((_, j) => j !== i));
  const toggleScorecard = (i) =>
    setTee(i, { holes: tees[i].holes ? null : Array.from({ length: 18 }, (_, h) => ({ par: 4, si: h + 1 })) });
  const setHole = (i, h, patch) =>
    setTee(i, { holes: tees[i].holes.map((hole, k) => (k === h ? { ...hole, ...patch } : hole)) });

  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [lookupError, setLookupError] = useState("");

  const runSearch = async () => {
    if (q.trim().length < 2) return;
    setSearching(true); setLookupError(""); setResults(null);
    try {
      const r = await fetch("/api/course-search?q=" + encodeURIComponent(q.trim())).then((x) => x.json());
      if (r.error) setLookupError(r.error);
      else setResults(r.results || []);
    } catch { setLookupError("Search request failed."); }
    setSearching(false);
  };

  const pick = async (externalId) => {
    setSearching(true); setLookupError("");
    try {
      const r = await fetch("/api/course-search?id=" + encodeURIComponent(externalId)).then((x) => x.json());
      if (r.error || !r.course) { setLookupError(r.error || "Couldn't load that course."); }
      else if (!r.course.tees.length) { setLookupError("That course has no rated tees in the database — enter it manually below."); }
      else {
        setName(r.course.name);
        setTees(r.course.tees.map((t) => ({
          name: t.name, rating: String(t.rating), slope: String(t.slope), par: t.par, holes: t.holes,
        })));
        setResults(null); setQ("");
      }
    } catch { setLookupError("Couldn't load that course."); }
    setSearching(false);
  };

  const save = async () => {
    const cleanTees = tees.filter((t) => t.name.trim() && t.rating && t.slope).map((t) => ({
      name: t.name.trim(), rating: Number(t.rating), slope: Number(t.slope),
      par: t.holes ? t.holes.reduce((s, h) => s + Number(h.par), 0) : Number(t.par),
      holes: t.holes ? t.holes.map((h) => ({ par: Number(h.par), si: Number(h.si), yd: h.yd != null && h.yd !== "" ? Number(h.yd) : null })) : null,
    }));
    if (!name.trim() || cleanTees.length === 0) return;
    await api.saveCourse({ id: course?.id, name: name.trim(), tees: cleanTees });
    close(); refresh();
  };

  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="box">
        <button className="x" onClick={close}>×</button>
        <h2 className="serif" style={{ margin: "0 0 16px" }}>{course ? "Edit course" : "Add course"}</h2>

        <div className="card" style={{ background: "#eef3ee", borderColor: "#cfe0d2" }}>
          <label>Find a course to auto-fill</label>
          <div className="row" style={{ alignItems: "stretch" }}>
            <input style={{ flex: 1 }} value={q} placeholder="Type a course name, e.g. Pebble Beach"
              onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runSearch()} />
            <button className="btn sm" onClick={runSearch} disabled={searching}>{searching ? "…" : "Search"}</button>
          </div>
          {results && results.length === 0 && (
            <p className="sub" style={{ margin: "8px 0 0" }}>No matches — just enter the course manually below.</p>
          )}
          {results && results.length > 0 && (
            <div style={{ marginTop: 10, maxHeight: 220, overflow: "auto", border: "1px solid var(--line)", borderRadius: 8, background: "#fff" }}>
              {results.map((r) => (
                <div key={r.externalId} onClick={() => pick(r.externalId)}
                  style={{ padding: "9px 12px", cursor: "pointer", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ fontWeight: 600 }}>{r.name}</div>
                  <div className="sub" style={{ margin: 0 }}>{r.club}{r.location ? ` · ${r.location}` : ""}</div>
                </div>
              ))}
            </div>
          )}
          {lookupError && <p className="sub" style={{ margin: "8px 0 0", color: "var(--red)" }}>{lookupError}</p>}
          <p className="sub" style={{ margin: "10px 0 0", fontSize: 12 }}>
            Pick a result to fill in the tees, ratings, and scorecard below — then adjust anything before saving.
          </p>
        </div>

        <div className="field"><label>Course name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Carolina National" /></div>
        {tees.map((t, i) => (
          <div key={i} className="card" style={{ background: "#faf6ec" }}>
            <div className="row">
              <div className="field"><label>Tee name</label><input value={t.name} onChange={(e) => setTee(i, { name: e.target.value })} placeholder="Blue" /></div>
              <div className="field"><label>Course rating</label><input value={t.rating} onChange={(e) => setTee(i, { rating: e.target.value })} placeholder="71.8" /></div>
              <div className="field"><label>Slope</label><input value={t.slope} onChange={(e) => setTee(i, { slope: e.target.value })} placeholder="132" /></div>
              {!t.holes && <div className="field"><label>Par</label><input value={t.par} onChange={(e) => setTee(i, { par: e.target.value })} /></div>}
            </div>
            <div className="row">
              <button className="btn ghost sm" onClick={() => toggleScorecard(i)}>{t.holes ? "Remove scorecard" : "Add 18-hole scorecard"}</button>
              {tees.length > 1 && <button className="btn danger sm" onClick={() => removeTee(i)}>Remove tee</button>}
            </div>
            {t.holes && (
              <div className="scorecard" style={{ marginTop: 12 }}>
                <table className="num">
                  <thead><tr><th className="lab">Hole</th>{t.holes.map((_, h) => <th key={h}>{h + 1}</th>)}<th>Tot</th></tr></thead>
                  <tbody>
                    <tr><td className="lab">Par</td>{t.holes.map((h, k) => <td key={k}><input value={h.par} onChange={(e) => setHole(i, k, { par: e.target.value })} /></td>)}<td className="tot">{t.holes.reduce((s, h) => s + Number(h.par || 0), 0)}</td></tr>
                    <tr><td className="lab">Yards</td>{t.holes.map((h, k) => <td key={k}><input value={h.yd ?? ""} onChange={(e) => setHole(i, k, { yd: e.target.value.replace(/\D/g, "") })} /></td>)}<td className="tot">{t.holes.reduce((s, h) => s + (Number(h.yd) || 0), 0) || "—"}</td></tr>
                    <tr><td className="lab">Stroke index</td>{t.holes.map((h, k) => <td key={k}><input value={h.si} onChange={(e) => setHole(i, k, { si: e.target.value })} /></td>)}<td className="tot">—</td></tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
        <button className="btn ghost sm" onClick={addTee}>+ Add another tee</button>
        <hr className="hr" />
        <button className="btn" onClick={save}>Save course</button>
      </div>
    </div>
  );
}

/* ---------------- POST SCORE ---------------- */
function PostScore({ data, refresh, go }) {
  const [golferId, setGolferId] = useState(data.golfers[0]?.id ?? "");
  const [courseId, setCourseId] = useState(data.courses[0]?.id ?? "");
  const course = data.courses.find((c) => c.id === Number(courseId));
  const [teeId, setTeeId] = useState(course?.tees[0]?.id ?? "");
  const tee = course?.tees.find((t) => t.id === Number(teeId));
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [pcc, setPcc] = useState(0);
  const [mode, setMode] = useState("holes");
  const [holeScores, setHoleScores] = useState(Array(18).fill(""));
  const [total, setTotal] = useState("");

  const courseMap = Object.fromEntries(data.courses.map((c) => [c.id, c]));
  const record = golferId ? computeGolferRecord(Number(golferId), data.scores, courseMap) : null;
  const canHoles = tee?.holes;
  const effMode = canHoles ? mode : "total";

  if (data.golfers.length === 0 || data.courses.length === 0) {
    return (
      <div className="card empty"><div className="serif">Add a player and a course first</div>
        <p>You'll need at least one of each before posting a score.</p>
        <button className="btn" onClick={() => go("players")}>Go to Players</button></div>
    );
  }

  const liveAgs = effMode === "holes" && tee ? adjustedGrossFromHoles(holeScores, tee, record?.current ?? null) : Number(total) || 0;
  const liveDiff = tee && liveAgs ? scoreDifferential(liveAgs, tee.rating, tee.slope, Number(pcc)) : null;

  const post = async () => {
    if (!golferId || !tee) return;
    const score = { golferId: Number(golferId), courseId: Number(courseId), teeId: Number(teeId), date, pcc: Number(pcc) };
    if (effMode === "holes") {
      if (holeScores.every((h) => h === "")) return;
      score.holeScores = holeScores.map((h) => (h === "" ? null : Number(h)));
    } else {
      if (!total) return;
      score.adjustedGross = Number(total);
    }
    await api.addScore(score);
    setHoleScores(Array(18).fill("")); setTotal("");
    refresh(); go("players");
  };

  return (
    <div>
      <h1 className="h2">Post a score</h1>
      <p className="sub">Enter hole-by-hole and Net Double Bogey is applied automatically, or enter a single adjusted gross.</p>
      <div className="card">
        <div className="row">
          <div className="field"><label>Player</label>
            <select value={golferId} onChange={(e) => setGolferId(e.target.value)}>
              {data.golfers.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
          <div className="field"><label>Course</label>
            <select value={courseId} onChange={(e) => { setCourseId(e.target.value); const c = data.courses.find((x) => x.id === Number(e.target.value)); setTeeId(c?.tees[0]?.id ?? ""); }}>
              {data.courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div className="field"><label>Tee</label>
            <select value={teeId} onChange={(e) => setTeeId(e.target.value)}>
              {course?.tees.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.rating}/{t.slope})</option>)}</select></div>
          <div className="field" style={{ maxWidth: 150 }}><label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="field" style={{ maxWidth: 120 }}><label>PCC</label>
            <select value={pcc} onChange={(e) => setPcc(e.target.value)}>
              {[-1, 0, 1, 2, 3].map((v) => <option key={v} value={v}>{v > 0 ? "+" + v : v}</option>)}</select></div>
        </div>

        {canHoles && (
          <div className="row" style={{ marginBottom: 12 }}>
            <button className={"btn sm " + (mode === "holes" ? "" : "ghost")} onClick={() => setMode("holes")}>Hole-by-hole</button>
            <button className={"btn sm " + (mode === "total" ? "" : "ghost")} onClick={() => setMode("total")}>Adjusted gross total</button>
          </div>
        )}

        {effMode === "holes" && tee?.holes ? (
          <div className="scorecard">
            <table className="num">
              <thead><tr><th className="lab">Hole</th>{tee.holes.map((_, h) => <th key={h}>{h + 1}</th>)}<th>Tot</th></tr></thead>
              <tbody>
                <tr><td className="lab par">Par</td>{tee.holes.map((h, k) => <td key={k} className="par">{h.par}</td>)}<td className="tot">{tee.par}</td></tr>
                {tee.holes.some((h) => h.yd != null) && (
                  <tr><td className="lab par">Yards</td>{tee.holes.map((h, k) => <td key={k} className="par">{h.yd ?? "—"}</td>)}<td className="tot">{tee.holes.reduce((s, h) => s + (Number(h.yd) || 0), 0).toLocaleString()}</td></tr>
                )}
                <tr><td className="lab">Score</td>{tee.holes.map((_, k) => (
                  <td key={k}><input inputMode="numeric" value={holeScores[k]} onChange={(e) => setHoleScores((hs) => hs.map((v, j) => j === k ? e.target.value.replace(/\D/g, "") : v))} /></td>
                ))}<td className="tot">{holeScores.reduce((s, v) => s + (Number(v) || 0), 0) || "—"}</td></tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="field" style={{ maxWidth: 220 }}><label>Adjusted gross score</label>
            <input inputMode="numeric" value={total} onChange={(e) => setTotal(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 88" /></div>
        )}

        {liveDiff != null && (
          <div className="note" style={{ marginTop: 14 }}>
            Adjusted Gross <b>{liveAgs}</b> → Score Differential <b className="num">{liveDiff.toFixed(1)}</b>
            {effMode === "holes" && (record?.current == null ? " · hole caps at par + 5 (no Index yet)" : ` · caps at Net Double Bogey using Index ${fmtIndex(record.current)}`)}
          </div>
        )}
        <button className="btn brass" onClick={post}>Post score</button>
      </div>
    </div>
  );
}

/* ---------------- LEAGUES ---------------- */
function Leagues({ data, refresh, openPlayer }) {
  const [name, setName] = useState("");
  const [sel, setSel] = useState(null);
  const add = async () => { if (!name.trim()) return; await api.addLeague(name.trim()); setName(""); refresh(); };

  if (sel) {
    const lg = data.leagues.find((l) => l.id === sel);
    if (lg) return <LeagueDetail league={lg} data={data} refresh={refresh} back={() => setSel(null)} openPlayer={openPlayer} />;
  }

  return (
    <div>
      <h1 className="h2">Leagues</h1>
      <p className="sub">Group players to see standings and run a net-score night.</p>
      <div className="card">
        <div className="row" style={{ alignItems: "flex-end" }}>
          <div className="field" style={{ flex: 2 }}><label>New league</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Thursday Night League" onKeyDown={(e) => e.key === "Enter" && add()} /></div>
          <button className="btn" onClick={add}>Create</button>
        </div>
      </div>
      {data.leagues.map((l) => (
        <div key={l.id} className="card flex-between" style={{ cursor: "pointer" }} onClick={() => setSel(l.id)}>
          <div><h3 className="serif" style={{ margin: 0, fontSize: 18 }}>{l.name}</h3>
            <span className="sub" style={{ margin: 0 }}>{l.golferIds.length} members</span></div>
          <span className="btn ghost sm">Open →</span>
        </div>
      ))}
    </div>
  );
}

function LeagueDetail({ league, data, refresh, back, openPlayer }) {
  const courseMap = Object.fromEntries(data.courses.map((c) => [c.id, c]));
  const records = Object.fromEntries(data.golfers.map((g) => [g.id, computeGolferRecord(g.id, data.scores, courseMap)]));
  const members = league.golferIds.map((id) => data.golfers.find((g) => g.id === id)).filter(Boolean);
  const nonMembers = data.golfers.filter((g) => !league.golferIds.includes(g.id));
  const [addId, setAddId] = useState("");
  const addMember = async () => { if (!addId) return; await api.addMember(league.id, Number(addId)); setAddId(""); refresh(); };
  const removeMember = async (id) => { await api.delMember(league.id, id); refresh(); };
  const [openMember, setOpenMember] = useState(null);

  const [teeId, setTeeId] = useState(data.courses[0]?.tees[0]?.id ?? "");
  let tee = null;
  for (const c of data.courses) { const t = c.tees.find((x) => x.id === Number(teeId)); if (t) tee = t; }
  const [gross, setGross] = useState({});
  const results = members.map((m) => {
    const r = records[m.id];
    const ch = r.current != null && tee ? courseHandicap(r.current, tee) : null;
    const g = gross[m.id] ? Number(gross[m.id]) : null;
    return { m, index: r.current, ch, gross: g, net: g != null && ch != null ? g - ch : null };
  }).sort((a, b) => (a.net ?? 999) - (b.net ?? 999));

  return (
    <div>
      <button className="linkbtn" onClick={back}>← All leagues</button>
      <h1 className="h2" style={{ marginTop: 10 }}>{league.name}</h1>

      <div className="card">
        <div className="flex-between">
          <h3 className="serif" style={{ margin: 0, fontSize: 18 }}>Roster &amp; standings</h3>
          {nonMembers.length > 0 && (
            <div className="row">
              <select value={addId} onChange={(e) => setAddId(e.target.value)} style={{ width: "auto" }}>
                <option value="">Add member…</option>
                {nonMembers.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <button className="btn sm" onClick={addMember}>Add</button>
            </div>
          )}
        </div>
        <hr className="hr" />
        {members.length === 0 ? <p className="sub" style={{ margin: 0 }}>No members yet.</p> : (
          <table className="num">
            <thead><tr><th>Player</th><th className="r">Index</th><th className="r">Scores</th><th></th></tr></thead>
            <tbody>
              {members.map((m) => ({ m, r: records[m.id] })).sort((a, b) => (a.r.current ?? 999) - (b.r.current ?? 999)).map(({ m, r }) => {
                const mOpen = openMember === m.id;
                return (
                <Fragment key={m.id}>
                  <tr>
                    <td onClick={() => setOpenMember(mOpen ? null : m.id)} style={{ cursor: "pointer" }}>
                      <span style={{ color: "var(--ink-soft)", marginRight: 6 }}>{mOpen ? "▾" : "▸"}</span>{m.name}
                    </td>
                    <td className="r"><b>{fmtIndex(r.current)}</b></td>
                    <td className="r">{r.scoreCount}</td>
                    <td className="r"><button className="btn danger sm" onClick={() => removeMember(m.id)}>Remove</button></td>
                  </tr>
                  {mOpen && (
                    <tr>
                      <td colSpan={4} style={{ background: "#faf6ec", padding: "10px 12px" }}>
                        {r.rows.length === 0 ? (
                          <p className="sub" style={{ margin: 0 }}>No scores posted yet.</p>
                        ) : (
                          <>
                            <div className="flex-between" style={{ marginBottom: 6 }}>
                              <span className="sub" style={{ margin: 0 }}>
                                {r.selection ? <>Building this Index: <b>{selectionLabel(r.selection)}</b> (✓ = counts)</> : "No Index established yet."}
                              </span>
                              <button className="linkbtn" onClick={() => openPlayer(m.id)}>Full record →</button>
                            </div>
                            <table className="num" style={{ background: "var(--card)", borderRadius: 6 }}>
                              <thead><tr><th>Date</th><th>Course / Tee</th><th className="r">AGS</th><th className="r">Diff</th></tr></thead>
                              <tbody>
                                {r.rows.map((row) => {
                                  const counts = r.countingIds?.has(row.id);
                                  return (
                                    <tr key={row.id} style={{ background: counts ? "rgba(169,118,42,.10)" : undefined }}>
                                      <td>{row.date}</td>
                                      <td>{courseMap[row.courseId]?.name} · {row.tee.name}</td>
                                      <td className="r">{row.ags}</td>
                                      <td className="r">{counts ? <b><span style={{ color: "var(--brass)" }}>✓</span> {row.diff.toFixed(1)}</b> : row.diff.toFixed(1)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3 className="serif" style={{ margin: "0 0 6px", fontSize: 18 }}>Net-score night</h3>
        <p className="sub">Pick a tee, enter each member's gross, and see net results (gross − Course Handicap).</p>
        <div className="field" style={{ maxWidth: 360 }}><label>Tee</label>
          <select value={teeId} onChange={(e) => setTeeId(e.target.value)}>
            {data.courses.map((c) => c.tees.map((t) => <option key={t.id} value={t.id}>{c.name} — {t.name} ({t.rating}/{t.slope})</option>))}
          </select></div>
        {members.length > 0 && tee && (
          <table className="num">
            <thead><tr><th>Pos</th><th>Player</th><th className="r">Index</th><th className="r">Crse HC</th><th className="r">Gross</th><th className="r">Net</th></tr></thead>
            <tbody>
              {results.map((row, i) => (
                <tr key={row.m.id}>
                  <td>{row.net != null ? i + 1 : "—"}</td><td>{row.m.name}</td>
                  <td className="r">{fmtIndex(row.index)}</td><td className="r">{row.ch ?? "—"}</td>
                  <td className="r" style={{ width: 90 }}>
                    <input inputMode="numeric" value={gross[row.m.id] || ""} placeholder="—"
                      onChange={(e) => setGross((g) => ({ ...g, [row.m.id]: e.target.value.replace(/\D/g, "") }))}
                      style={{ width: 64, textAlign: "right", padding: "5px 7px" }} /></td>
                  <td className="r"><b>{row.net ?? "—"}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
