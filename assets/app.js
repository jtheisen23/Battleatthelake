(() => {
  "use strict";

  // ---------- Match setup ----------

  // Photos: drop a file named images/<id>.jpg (or .jpeg/.png/.webp) into the repo.
  const PLAYERS = [
    { id: "g", name: "G", index: 3.8, team: "a" },
    { id: "taytay", name: "Tay Tay", index: 21.2, team: "a" },
    { id: "luke", name: "Luke", index: 0.1, team: "b" },
    { id: "bob", name: "Bob", index: 10.2, team: "b" },
  ];

  const TEAMS = {
    a: { name: "G & Tay Tay", players: ["g", "taytay"] },
    b: { name: "Luke & Bob", players: ["luke", "bob"] },
  };

  // Geneva National, Player Course, Gold tees
  const COURSE = {
    par: [4, 5, 4, 3, 4, 3, 4, 5, 4, 5, 4, 4, 3, 5, 3, 5, 3, 4],
    si: [15, 1, 7, 17, 13, 11, 9, 3, 5, 2, 8, 4, 10, 18, 12, 14, 16, 6],
    yards: [360, 536, 387, 132, 322, 175, 402, 517, 451, 504, 356, 431, 146, 469, 159, 536, 186, 340],
  };
  const PAR_TOTAL = COURSE.par.reduce((a, b) => a + b, 0);
  const YARDS_TOTAL = COURSE.yards.reduce((a, b) => a + b, 0);

  const DEFAULTS = {
    rating: 71.3,
    slope: 133,
    allowance: 100,
    mode: "low", // "low" = strokes off the low man, "full" = full course handicaps
    birdies: "net", // "net" = net birdies count, "gross" = natural birdies only
    ties: "push", // "push" = nobody gets the point, "split" = ½ each
    override: { g: null, taytay: null, luke: null, bob: null },
  };

  const STORAGE_KEY = "batl-v1";
  const HOLE_KEY = "batl-hole";
  const PHOTO_EXTS = ["jpg", "jpeg", "png", "webp"];
  const MAX_SCORE = 15;

  const byId = Object.fromEntries(PLAYERS.map((p) => [p.id, p]));
  const $ = (sel, root = document) => root.querySelector(sel);

  // ---------- State ----------

  const blankScores = () => Object.fromEntries(PLAYERS.map((p) => [p.id, Array(18).fill(null)]));
  const cloneDefaults = () => ({ ...DEFAULTS, override: { ...DEFAULTS.override } });

  let state = { scores: blankScores(), settings: cloneDefaults() };
  let hole = 0;

  function sanitizeSettings(raw) {
    const s = cloneDefaults();
    if (!raw || typeof raw !== "object") return s;
    const num = (v, lo, hi) => (typeof v === "number" && isFinite(v) && v >= lo && v <= hi ? v : null);
    s.rating = num(raw.rating, 50, 85) ?? s.rating;
    s.slope = num(raw.slope, 55, 155) ?? s.slope;
    s.allowance = num(raw.allowance, 0, 100) ?? s.allowance;
    if (raw.mode === "low" || raw.mode === "full") s.mode = raw.mode;
    if (raw.birdies === "gross" || raw.birdies === "net") s.birdies = raw.birdies;
    if (raw.ties === "push" || raw.ties === "split") s.ties = raw.ties;
    if (raw.override && typeof raw.override === "object") {
      for (const p of PLAYERS) {
        const v = raw.override[p.id];
        s.override[p.id] = Number.isInteger(v) && v >= -10 && v <= 54 ? v : null;
      }
    }
    return s;
  }

  function sanitizeScores(raw) {
    const out = blankScores();
    if (!raw || typeof raw !== "object") return out;
    for (const p of PLAYERS) {
      const arr = raw[p.id];
      if (!Array.isArray(arr)) continue;
      for (let i = 0; i < 18; i++) {
        const v = arr[i];
        out[p.id][i] = Number.isInteger(v) && v >= 1 && v <= MAX_SCORE ? v : null;
      }
    }
    return out;
  }

  const countScores = (scores) =>
    PLAYERS.reduce((n, p) => n + scores[p.id].filter((v) => v != null).length, 0);

  // Share links carry the whole match in the URL hash: "#v1.<base64url json>"
  function encodeState() {
    const s = PLAYERS.map((p) =>
      state.scores[p.id].map((v) => (v == null ? "-" : v.toString(16))).join("")
    ).join("");
    const json = JSON.stringify({ s, c: state.settings });
    return "v1." + btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function decodeState(hash) {
    const m = /^#?v1\.([A-Za-z0-9_-]+)$/.exec(hash || "");
    if (!m) return null;
    try {
      const b64 = m[1].replace(/-/g, "+").replace(/_/g, "/");
      const obj = JSON.parse(atob(b64 + "===".slice((b64.length + 3) % 4)));
      if (typeof obj.s !== "string" || obj.s.length !== PLAYERS.length * 18) return null;
      const scores = {};
      PLAYERS.forEach((p, pi) => {
        scores[p.id] = [...obj.s.slice(pi * 18, pi * 18 + 18)].map((ch) =>
          ch === "-" ? null : parseInt(ch, 16)
        );
      });
      return { scores: sanitizeScores(scores), settings: sanitizeSettings(obj.c) };
    } catch {
      return null;
    }
  }

  function readLocal() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!raw) return null;
      return { scores: sanitizeScores(raw.scores), settings: sanitizeSettings(raw.settings) };
    } catch {
      return null;
    }
  }

  function isPristine() {
    return countScores(state.scores) === 0 &&
      JSON.stringify(state.settings) === JSON.stringify(cloneDefaults());
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* storage unavailable: page still works for this visit */ }
    const url = location.pathname + location.search + (isPristine() ? "" : "#" + encodeState());
    history.replaceState(null, "", url);
  }

  function load() {
    const local = readLocal();
    const shared = decodeState(location.hash);
    if (shared) {
      // Don't let an older link silently wipe out scores entered on this device.
      const keepLocal = local && countScores(local.scores) > countScores(shared.scores) &&
        !confirm("This link has fewer scores than this device. Load the link's scores anyway?");
      state = keepLocal ? local : shared;
    } else if (local) {
      state = local;
    }
    try {
      const h = parseInt(localStorage.getItem(HOLE_KEY), 10);
      hole = h >= 0 && h < 18 ? h : firstOpenHole();
    } catch {
      hole = firstOpenHole();
    }
    save();
  }

  // ---------- Handicaps ----------

  function courseHandicap(p) {
    const o = state.settings.override[p.id];
    if (o != null) return o;
    const { slope, rating } = state.settings;
    return Math.round(p.index * (slope / 113) + (rating - PAR_TOTAL));
  }

  // Strokes each player receives for the round (negative = plus handicap gives strokes back).
  function roundStrokes() {
    const { allowance, mode } = state.settings;
    const ph = Object.fromEntries(
      PLAYERS.map((p) => [p.id, Math.round((courseHandicap(p) * allowance) / 100)])
    );
    if (mode === "low") {
      const low = Math.min(...Object.values(ph));
      for (const id in ph) ph[id] -= low;
    }
    return ph;
  }

  function strokesOnHole(total, si) {
    if (total >= 0) return Math.floor(total / 18) + (si <= total % 18 ? 1 : 0);
    const k = -total; // plus handicaps give strokes back starting on stroke index 18
    return -(Math.floor(k / 18) + (si > 18 - (k % 18) ? 1 : 0));
  }

  // ---------- Scoring ----------

  function holeResult(h, strokes) {
    const par = COURSE.par[h];
    const si = COURSE.si[h];
    const players = {};
    for (const p of PLAYERS) {
      const gross = state.scores[p.id][h];
      const given = strokesOnHole(strokes[p.id], si);
      players[p.id] = { gross, given, net: gross == null ? null : gross - given };
    }

    const res = { pts: { a: 0, b: 0 }, low: null, total: null, bonus: [], complete: false, players };
    const tiePts = state.settings.ties === "split" ? 0.5 : 0;
    const award = (va, vb) => {
      if (va < vb) { res.pts.a += 1; return "a"; }
      if (vb < va) { res.pts.b += 1; return "b"; }
      res.pts.a += tiePts;
      res.pts.b += tiePts;
      return "tie";
    };

    res.complete = PLAYERS.every((p) => players[p.id].gross != null);
    if (res.complete) {
      const nets = (t) => TEAMS[t].players.map((id) => players[id].net);
      const lowA = Math.min(...nets("a"));
      const lowB = Math.min(...nets("b"));
      const totA = nets("a").reduce((x, y) => x + y, 0);
      const totB = nets("b").reduce((x, y) => x + y, 0);
      res.low = { a: lowA, b: lowB, winner: award(lowA, lowB) };
      res.total = { a: totA, b: totB, winner: award(totA, totB) };
    }

    for (const p of PLAYERS) {
      const pl = players[p.id];
      if (pl.gross == null) continue;
      const score = state.settings.birdies === "net" ? pl.net : pl.gross;
      const under = par - score;
      if (under >= 2) res.bonus.push({ id: p.id, team: p.team, kind: under >= 3 ? "albatross" : "eagle", pts: 2 });
      else if (under === 1) res.bonus.push({ id: p.id, team: p.team, kind: "birdie", pts: 1 });
    }
    for (const b of res.bonus) res.pts[b.team] += b.pts;
    return res;
  }

  function matchTotals() {
    const strokes = roundStrokes();
    const t = {
      pts: { a: 0, b: 0 },
      low: { a: 0, b: 0 },
      total: { a: 0, b: 0 },
      bonus: { a: 0, b: 0 },
      holes: [],
      completed: 0,
    };
    const tiePts = state.settings.ties === "split" ? 0.5 : 0;
    for (let h = 0; h < 18; h++) {
      const r = holeResult(h, strokes);
      t.holes.push(r);
      t.pts.a += r.pts.a;
      t.pts.b += r.pts.b;
      for (const k of ["low", "total"]) {
        if (!r[k]) continue;
        if (r[k].winner === "tie") { t[k].a += tiePts; t[k].b += tiePts; }
        else t[k][r[k].winner] += 1;
      }
      for (const b of r.bonus) t.bonus[b.team] += b.pts;
      if (r.complete) t.completed++;
    }
    return t;
  }

  function firstOpenHole() {
    for (let h = 0; h < 18; h++) {
      if (PLAYERS.some((p) => state.scores[p.id][h] == null)) return h;
    }
    return 17;
  }

  // ---------- Formatting ----------

  const fmtPts = (n) => {
    const whole = Math.floor(n);
    const half = n - whole >= 0.5;
    return half ? (whole ? whole + "½" : "½") : String(whole);
  };
  const fmtHcp = (n) => (n < 0 ? "+" + -n : String(n));
  const initials = (name) => name.split(/\s+/).map((w) => w[0]).join("").toUpperCase();
  const teamTag = (t) => `<span class="tag-${t}">${TEAMS[t].name}</span>`;
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

  // ---------- Photos ----------

  const photoCache = {};
  function resolvePhoto(id) {
    if (!photoCache[id]) {
      photoCache[id] = new Promise((resolve) => {
        const tryExt = (i) => {
          if (i >= PHOTO_EXTS.length) return resolve(null);
          const url = `images/${id}.${PHOTO_EXTS[i]}`;
          const img = new Image();
          img.onload = () => resolve(url);
          img.onerror = () => tryExt(i + 1);
          img.src = url;
        };
        tryExt(0);
      });
    }
    return photoCache[id];
  }

  function avatar(p, extra = "") {
    return `<span class="avatar ${p.team} ${extra}" data-photo="${p.id}" aria-hidden="true">${initials(p.name)}</span>`;
  }

  function hydratePhotos(root = document) {
    root.querySelectorAll("[data-photo]").forEach((el) => {
      const p = byId[el.dataset.photo];
      resolvePhoto(p.id).then((url) => {
        if (!url || el.querySelector("img")) return;
        const img = document.createElement("img");
        img.src = url;
        img.alt = "";
        el.appendChild(img);
      });
    });
  }

  // ---------- Rendering ----------

  function renderBoardStatic() {
    for (const t of ["a", "b"]) {
      $(`[data-team-name="${t}"]`).textContent = TEAMS[t].name;
      $(`[data-faces="${t}"]`).innerHTML = TEAMS[t].players.map((id) => avatar(byId[id])).join("");
    }
  }

  function renderBoard(t) {
    $('[data-points="a"]').textContent = fmtPts(t.pts.a);
    $('[data-points="b"]').textContent = fmtPts(t.pts.b);

    const diff = t.pts.a - t.pts.b;
    const status = $("#board-status");
    if (diff === 0) status.textContent = t.completed === 18 ? "Halved" : "All square";
    else {
      const leader = diff > 0 ? "a" : "b";
      const verb = t.completed === 18 ? "win by" : "up";
      status.innerHTML = `${TEAMS[leader].name} ${verb} ${fmtPts(Math.abs(diff))}`;
    }

    let thru = "Not started";
    if (t.completed === 18) thru = "Final";
    else if (t.completed > 0) {
      const contiguous = t.holes.slice(0, t.completed).every((r) => r.complete);
      thru = contiguous ? `Thru ${t.completed}` : `${plural(t.completed, "hole")} in`;
    }
    $("#board-thru").textContent = thru;

    const tile = (label, v) =>
      `<div class="bd">${label}<strong><span class="a">${fmtPts(v.a)}</span> – <span class="b">${fmtPts(v.b)}</span></strong></div>`;
    $("#board-breakdown").innerHTML =
      tile("Low man", t.low) + tile("Team total", t.total) + tile("Birdies &amp; eagles", t.bonus);
  }

  function renderTeamCards() {
    const strokes = roundStrokes();
    const s = state.settings;
    const card = (t) => `
      <div class="team ${t}">
        <p class="team-label">${TEAMS[t].name}</p>
        <div class="team-players">
          ${TEAMS[t].players.map((id) => {
            const p = byId[id];
            const ch = courseHandicap(p);
            const st = strokes[id];
            const [strokeLabel, strokeText] =
              st > 0 ? ["Gets", plural(st, "stroke")] : st < 0 ? ["Gives back", plural(-st, "stroke")] : ["Plays", "scratch"];
            return `
              <div class="player">
                ${avatar(p)}
                <div>
                  <p class="player-name">${p.name}</p>
                  <div class="player-stats">
                    <span>Index <b>${p.index.toFixed(1)}</b></span>
                    <span>Course hcp <b>${fmtHcp(ch)}</b>${s.override[id] != null ? " (set)" : ""}</span>
                    <span>${strokeLabel} <b>${strokeText}</b></span>
                  </div>
                </div>
              </div>`;
          }).join("")}
        </div>
      </div>`;
    $("#team-cards").innerHTML = card("a") + `<div class="vs">vs</div>` + card("b");
    hydratePhotos($("#team-cards"));

    const chs = PLAYERS.map((p) => ({ p, ch: courseHandicap(p) }));
    const low = chs.reduce((m, x) => (x.ch < m.ch ? x : m));
    const allowance = s.allowance === 100 ? "" : ` at ${s.allowance}% allowance`;
    $("#hcp-note").innerHTML = s.mode === "low"
      ? `Course handicaps use the Gold tees (${s.rating.toFixed(1)} / ${s.slope}). Strokes come off the low man${allowance}: ${low.p.name} (${fmtHcp(low.ch)}) plays at scratch and everyone else gets the difference.`
      : `Course handicaps use the Gold tees (${s.rating.toFixed(1)} / ${s.slope}). Everyone plays off their full course handicap${allowance}.`;
  }

  function renderPills(t) {
    $("#hole-pills").innerHTML = t.holes.map((r, h) => {
      let cls = "pill";
      if (r.complete) {
        cls += r.pts.a > r.pts.b ? " won-a" : r.pts.b > r.pts.a ? " won-b" : " done";
      }
      if (h === hole) cls += " current";
      const label = `Hole ${h + 1}` + (r.complete ? `, ${fmtPts(r.pts.a)} to ${fmtPts(r.pts.b)}` : "");
      return `<button type="button" class="${cls}" data-hole="${h}" aria-label="${label}"${h === hole ? ' aria-current="true"' : ""}>${h + 1}</button>`;
    }).join("");
  }

  function renderHoleCard() {
    const h = hole;
    $("#hole-num").textContent = `Hole ${h + 1}`;
    $("#hole-meta").textContent = `Par ${COURSE.par[h]} · ${COURSE.yards[h]} yds · Stroke index ${COURSE.si[h]}`;
    $("#prev-hole").disabled = h === 0;
    $("#next-hole").disabled = h === 17;

    const order = [...TEAMS.a.players, ...TEAMS.b.players];
    $("#hole-rows").innerHTML = order.map((id, i) => {
      const p = byId[id];
      const v = state.scores[id][h];
      return `
        <div class="prow ${p.team}${i === 2 ? " team-break" : ""}">
          ${avatar(p)}
          <div class="prow-info">
            <p class="prow-name">${p.name}<span class="dots" data-dots="${id}"></span></p>
            <p class="prow-sub" data-sub="${id}"></p>
          </div>
          <div class="stepper">
            <button type="button" data-step="-1" data-id="${id}" aria-label="${p.name} minus one">−</button>
            <input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" data-id="${id}"
              value="${v ?? ""}" placeholder="–" aria-label="${p.name} score on hole ${h + 1}">
            <button type="button" data-step="1" data-id="${id}" aria-label="${p.name} plus one">+</button>
          </div>
        </div>`;
    }).join("");
    hydratePhotos($("#hole-rows"));
  }

  function updateHoleCard(t) {
    const h = hole;
    const r = t.holes[h];
    const par = COURSE.par[h];

    for (const p of PLAYERS) {
      const pl = r.players[p.id];
      $(`[data-dots="${p.id}"]`).textContent = pl.given > 0 ? " " + "•".repeat(pl.given) : "";
      let sub = pl.given > 0 ? plural(pl.given, "stroke") : pl.given < 0 ? `Gives ${plural(-pl.given, "stroke")}` : "No strokes";
      if (pl.gross != null && pl.given !== 0) sub += ` · net ${pl.net}`;
      $(`[data-sub="${p.id}"]`).textContent = sub;
      const input = $(`input[data-id="${p.id}"]`);
      if (document.activeElement !== input) input.value = pl.gross ?? "";
      input.classList.toggle("under", pl.gross != null && pl.gross < par);
    }

    const tieText = state.settings.ties === "split" ? "Split ½ – ½" : "Push";
    const line = (label, x) => {
      if (!x) return "";
      const who = x.winner === "tie" ? tieText : teamTag(x.winner);
      return `<div class="hr-line"><span>${label}</span><span>${who} · ${x.a} v ${x.b}</span></div>`;
    };
    const bonus = r.bonus.length
      ? r.bonus.map((b) => `<span class="tag-${b.team}">${byId[b.id].name} ${state.settings.birdies === "net" ? "net " : ""}${b.kind} +${b.pts}</span>`).join(", ")
      : "None";

    $("#hole-result").innerHTML = r.complete
      ? line("Low man (net)", r.low) +
        line("Team total (net)", r.total) +
        `<div class="hr-line"><span>Birdies &amp; eagles</span><span>${bonus}</span></div>` +
        `<div class="hr-line hr-total"><span>Hole ${h + 1}</span><span><span class="tag-a">${fmtPts(r.pts.a)}</span> – <span class="tag-b">${fmtPts(r.pts.b)}</span></span></div>`
      : `<p class="hr-pending">Enter all four scores to settle low man and team total.</p>` +
        (r.bonus.length ? `<div class="hr-line"><span>Birdies &amp; eagles</span><span>${bonus}</span></div>` : "");
  }

  function renderTables(t) {
    const order = [...TEAMS.a.players, ...TEAMS.b.players];
    const sum = (arr) => arr.reduce((a, b) => a + (b ?? 0), 0);
    const anyScore = (arr) => arr.some((v) => v != null);

    const mark = (gross, par, given) => {
      if (gross == null) return "";
      const d = gross - par;
      const cls = d <= -2 ? "eagle" : d === -1 ? "birdie" : d === 1 ? "bogey" : d >= 2 ? "double" : "";
      const sup = given > 0 ? `<sup>${"•".repeat(given)}</sup>` : "";
      return `<span class="mark ${cls}">${gross}${sup}</span>`;
    };

    const nine = (start, label, withTotal) => {
      const idx = [...Array(9)].map((_, i) => start + i);
      const head = `<tr><th scope="col">Hole</th>${idx.map((h) => `<th scope="col">${h + 1}</th>`).join("")}<th scope="col">${label}</th>${withTotal ? '<th scope="col">Tot</th>' : ""}</tr>`;
      const metaRow = (name, arr, total, grand, cls = "meta") =>
        `<tr class="${cls}"><td>${name}</td>${idx.map((h) => `<td>${arr[h]}</td>`).join("")}<td class="tot">${total}</td>${withTotal ? `<td class="tot">${grand}</td>` : ""}</tr>`;

      const nineSum = (arr) => sum(idx.map((h) => arr[h]));
      let rows = metaRow("Yds", COURSE.yards, nineSum(COURSE.yards), YARDS_TOTAL);
      rows += metaRow("Par", COURSE.par, nineSum(COURSE.par), PAR_TOTAL, "");
      rows += metaRow("SI", COURSE.si, "", "");

      const ptsRow = (team) => {
        const vals = idx.map((h) => (t.holes[h].complete || t.holes[h].bonus.length ? fmtPts(t.holes[h].pts[team]) : ""));
        const nineTot = idx.reduce((a, h) => a + t.holes[h].pts[team], 0);
        return `<tr class="pts-${team} row-${team}"><td>Pts</td>${vals.map((v) => `<td>${v}</td>`).join("")}<td class="tot">${fmtPts(nineTot)}</td>${withTotal ? `<td class="tot">${fmtPts(t.pts[team])}</td>` : ""}</tr>`;
      };

      order.forEach((id, i) => {
        const p = byId[id];
        const scores = state.scores[id];
        const nineScores = idx.map((h) => scores[h]);
        rows += `<tr class="row-${p.team}"><td>${p.name}</td>${idx.map((h) => `<td>${mark(scores[h], COURSE.par[h], t.holes[h].players[id].given)}</td>`).join("")}` +
          `<td class="tot">${anyScore(nineScores) ? sum(nineScores) : ""}</td>` +
          (withTotal ? `<td class="tot">${anyScore(scores) ? sum(scores) : ""}</td>` : "") + "</tr>";
        if (i === 1) rows += ptsRow("a");
        if (i === 3) rows += ptsRow("b");
      });

      return `<div class="table-wrap"><table class="sc"><caption class="sr-only">${label === "Out" ? "Front nine" : "Back nine"}</caption><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;
    };

    $("#card-tables").innerHTML = nine(0, "Out", false) + nine(9, "In", true);
  }

  function renderRuleNotes() {
    const s = state.settings;
    const notes = [
      s.mode === "low"
        ? `<b>Net scoring off the low man.</b> The lowest handicap plays at scratch; everyone else gets the difference, allocated by stroke index.`
        : `<b>Net scoring off full course handicaps</b>, allocated by stroke index.`,
      s.birdies === "gross"
        ? `<b>Birdies and eagles are natural</b> (gross) scores. A net birdie doesn't earn the bonus.`
        : `<b>Everything is net, birdies and eagles included.</b> A par on a hole where you get a stroke is a net birdie.`,
      s.ties === "push"
        ? `<b>Ties push.</b> If low man or team total is tied, nobody gets that point.`
        : `<b>Ties split.</b> A tied low man or team total gives each team ½ point.`,
      `<b>Most points after 18 wins.</b> A hole's low man and team total points are settled once all four players have a score.`,
    ];
    $("#rule-notes").innerHTML = notes.map((n) => `<li>${n}</li>`).join("");
  }

  function renderCourseFacts() {
    const s = state.settings;
    const fact = (k, v) => `<div class="fact"><p>${k}</p><p>${v}</p></div>`;
    $("#course-facts").innerHTML =
      fact("Par", PAR_TOTAL) +
      fact("Yards", YARDS_TOTAL.toLocaleString("en-US")) +
      fact("Rating", s.rating.toFixed(1)) +
      fact("Slope", s.slope);
  }

  function renderSettingsForm() {
    const f = $("#settings-form");
    const s = state.settings;
    for (const k of ["rating", "slope", "allowance", "mode", "birdies", "ties"]) {
      if (document.activeElement !== f.elements[k]) f.elements[k].value = s[k];
    }
    const grid = $("#override-grid");
    if (!grid.children.length) {
      grid.innerHTML = PLAYERS.map((p) =>
        `<label>${p.name}<input type="text" inputmode="text" maxlength="3" data-override="${p.id}"></label>`
      ).join("");
    }
    for (const p of PLAYERS) {
      const input = grid.querySelector(`[data-override="${p.id}"]`);
      const o = s.override[p.id];
      const calc = Math.round(p.index * (s.slope / 113) + (s.rating - PAR_TOTAL));
      input.placeholder = fmtHcp(calc);
      if (document.activeElement !== input) input.value = o == null ? "" : fmtHcp(o);
    }
  }

  function renderAll() {
    const t = matchTotals();
    renderBoard(t);
    renderTeamCards();
    renderPills(t);
    renderHoleCard();
    updateHoleCard(t);
    renderTables(t);
    renderRuleNotes();
    renderCourseFacts();
    renderSettingsForm();
  }

  function refreshScores() {
    const t = matchTotals();
    renderBoard(t);
    renderPills(t);
    updateHoleCard(t);
    renderTables(t);
  }

  // ---------- Events ----------

  function goTo(h) {
    hole = Math.max(0, Math.min(17, h));
    try { localStorage.setItem(HOLE_KEY, String(hole)); } catch { /* ignore */ }
    const t = matchTotals();
    renderPills(t);
    renderHoleCard();
    updateHoleCard(t);
  }

  function setScore(id, value) {
    state.scores[id][hole] = value;
    save();
    refreshScores();
  }

  $("#hole-pills").addEventListener("click", (e) => {
    const b = e.target.closest("[data-hole]");
    if (b) goTo(+b.dataset.hole);
  });
  $("#prev-hole").addEventListener("click", () => goTo(hole - 1));
  $("#next-hole").addEventListener("click", () => goTo(hole + 1));

  $("#hole-rows").addEventListener("click", (e) => {
    const b = e.target.closest("[data-step]");
    if (!b) return;
    const id = b.dataset.id;
    const cur = state.scores[id][hole];
    const next = cur == null ? COURSE.par[hole] : Math.max(1, Math.min(MAX_SCORE, cur + +b.dataset.step));
    setScore(id, next);
  });

  $("#hole-rows").addEventListener("input", (e) => {
    const input = e.target.closest("input[data-id]");
    if (!input) return;
    const digits = input.value.replace(/\D/g, "");
    if (digits !== input.value) input.value = digits;
    const n = parseInt(digits, 10);
    setScore(input.dataset.id, n >= 1 ? Math.min(MAX_SCORE, n) : null);
  });

  $("#hole-rows").addEventListener("focusout", (e) => {
    const input = e.target.closest("input[data-id]");
    if (input) input.value = state.scores[input.dataset.id][hole] ?? "";
  });

  $("#settings-form").addEventListener("input", (e) => {
    const el = e.target;
    const s = state.settings;
    if (el.dataset.override) {
      const raw = el.value.trim();
      const m = /^([+-]?)(\d{1,2})$/.exec(raw);
      // Golfers write plus handicaps as "+1"; store them as negatives.
      s.override[el.dataset.override] = m ? (m[1] ? -m[2] : +m[2]) : null;
    } else if (el.name === "rating" || el.name === "slope" || el.name === "allowance") {
      const v = parseFloat(el.value);
      const clean = sanitizeSettings({ ...s, [el.name]: v });
      s[el.name] = clean[el.name];
    } else if (el.name) {
      s[el.name] = el.value;
    }
    state.settings = sanitizeSettings(s);
    save();
    const t = matchTotals();
    renderBoard(t);
    renderTeamCards();
    renderPills(t);
    updateHoleCard(t);
    renderTables(t);
    renderRuleNotes();
    renderCourseFacts();
    renderSettingsForm();
  });
  $("#settings-form").addEventListener("submit", (e) => e.preventDefault());

  $("#reset-btn").addEventListener("click", () => {
    if (!confirm("Clear every score for all four players? This can't be undone.")) return;
    state.scores = blankScores();
    save();
    goTo(0);
    refreshScores();
    toast("Scores cleared");
  });

  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
  }

  $("#share-btn").addEventListener("click", async () => {
    save();
    const url = location.href;
    const t = matchTotals();
    const text = `Battle at the Lake: ${TEAMS.a.name} ${fmtPts(t.pts.a)}, ${TEAMS.b.name} ${fmtPts(t.pts.b)} (${$("#board-thru").textContent.toLowerCase()})`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Battle at the Lake", text, url });
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied");
    } catch {
      window.prompt("Copy this link:", url);
    }
  });

  window.addEventListener("hashchange", () => {
    const shared = decodeState(location.hash);
    if (shared && JSON.stringify(shared) !== JSON.stringify(state)) {
      state = shared;
      save();
      renderAll();
    }
  });

  // ---------- Go ----------

  load();
  renderBoardStatic();
  hydratePhotos($(".hero"));
  renderAll();
})();
