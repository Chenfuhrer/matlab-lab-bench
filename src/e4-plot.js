// ============================================================
//  绘图：图窗模型（渲染由页面完成）
// ============================================================

class FigureManager {
  constructor(sess) { this.sess = sess; this.list = []; this.cur = null; this.touched = []; this.nextId = 1; }
  beginRun(fresh) { this.touched = []; if (fresh) { this.list = []; this.cur = null; this.nextId = 1; } }
  endRun() {}
  touch(f) {
    if (!this.touched.includes(f)) { this.touched.push(f); this.sess.out.push({ kind: 'fig', fig: f }); }
    f.version++;
  }
  newFig(id) {
    const f = { id: id || this.nextId, axes: [], cur: null, version: 0, sgtitle: '' };
    this.nextId = Math.max(this.nextId, f.id + 1);
    this.list.push(f); this.cur = f; this.touch(f);
    return f;
  }
  gcf() { if (!this.cur) return this.newFig(); this.touch(this.cur); return this.cur; }
  gca() {
    const f = this.gcf();
    if (!f.cur) { f.cur = newAxes(null); f.axes.push(f.cur); }
    return f.cur;
  }
  closeAll() { this.list = []; this.cur = null; this.nextId = 1; }
}
function newAxes(grid) {
  return { grid, series: [], title: '', xlabel: '', ylabel: '', legend: null, gridOn: false, minorGrid: false, box: true,
    hold: false, xlim: null, ylim: null, equal: false, tight: false, off: false, xscale: 'linear', yscale: 'linear', ci: 0,
    texts: [], refLines: [] };
}
function resetAxes(ax) { const g = ax.grid, h = ax.hold; Object.assign(ax, newAxes(g)); ax.hold = h; }
function plotPrep(env) {
  const ax = env.sess.figs.gca();
  if (!ax.hold) resetAxes(ax);
  return ax;
}
function subplotSel(env, m, n, ps) {
  const f = env.sess.figs.gcf();
  const key = `${m},${n},${ps.join('-')}`;
  f.axes = f.axes.filter(a => a.grid);
  let ax = f.axes.find(a => a.grid.key === key);
  if (!ax) {
    // 删除与新位置重叠的旧坐标区
    f.axes = f.axes.filter(a => !(a.grid.m === m && a.grid.n === n && a.grid.ps.some(p => ps.includes(p))));
    ax = newAxes({ m, n, ps, key });
    f.axes.push(ax);
  }
  f.cur = ax;
  return ax;
}

const LINE_COLORS = { r: [1, 0, 0], g: [0, 1, 0], b: [0, 0, 1], c: [0, 1, 1], m: [1, 0, 1], y: [1, 1, 0], k: 'fg', w: 'bg',
  red: [1, 0, 0], green: [0, 1, 0], blue: [0, 0, 1], cyan: [0, 1, 1], magenta: [1, 0, 1], yellow: [1, 1, 0], black: 'fg', white: 'bg' };
function parseSpec(s) {
  const out = {};
  let i = 0;
  while (i < s.length) {
    const two = s.substr(i, 2);
    if (two === '--' || two === '-.') { if (out.ls) return null; out.ls = two; i += 2; continue; }
    const ch = s[i];
    if (ch === '-' || ch === ':') { if (out.ls) return null; out.ls = ch; i++; continue; }
    if ('rgbcmykw'.includes(ch)) { if (out.color) return null; out.color = LINE_COLORS[ch]; i++; continue; }
    if ('o+*.xsd^v<>ph'.includes(ch)) { if (out.marker) return null; out.marker = ch; i++; continue; }
    return null;
  }
  return out;
}
function parseColor(v) {
  if (isText(v)) {
    const s = textOf(v).toLowerCase();
    if (LINE_COLORS[s] !== undefined) return LINE_COLORS[s];
    if (/^#[0-9a-f]{6}$/.test(s)) return [parseInt(s.slice(1, 3), 16) / 255, parseInt(s.slice(3, 5), 16) / 255, parseInt(s.slice(5, 7), 16) / 255];
    if (s === 'none') return 'none';
    err(`无法识别的颜色 '${s}'。`, "颜色可以写成 'r'、'blue'、'#0072BD'，或 RGB 向量 [0 0.447 0.741]。");
  }
  const t = T_(v);
  if (nel(t) !== 3) err('RGB 颜色必须是 3 个 0~1 之间的数，例如 [0.85 0.33 0.1]。');
  return Array.from(t.re);
}
function applyNV(series, nv) {
  for (const [k, v] of Object.entries(nv)) {
    switch (k) {
      case 'linewidth': series.lw = sc(v); break;
      case 'color': series.color = parseColor(v); break;
      case 'linestyle': series.ls = textOf(v); break;
      case 'marker': { const m = textOf(v); series.marker = m === 'none' ? null : ({ square: 's', diamond: 'd', circle: 'o' }[m] || m); break; }
      case 'markersize': series.ms = sc(v); break;
      case 'markerfacecolor': series.mfc = txtIs(v, 'auto') ? 'same' : parseColor(v); break;
      case 'markeredgecolor': series.mec = parseColor(v); break;
      case 'displayname': series.name = textOf(v); break;
      case 'facecolor': series.color = parseColor(v); break;
      case 'facealpha': series.alpha = sc(v); break;
      case 'edgecolor': series.edge = parseColor(v); break;
      case 'basevalue': series.base = sc(v); break;
      case 'barwidth': series.barWidth = sc(v); break;
    }
  }
}
function splitPlotArgs(args) {
  const groups = [], nv = {};
  let i = 0;
  while (i < args.length) {
    const a = args[i];
    if (isText(a)) {
      const s = textOf(a);
      const sp = parseSpec(s);
      if (sp && groups.length && !groups[groups.length - 1].spec) { groups[groups.length - 1].spec = sp; i++; continue; }
      if (i + 1 >= args.length) { if (s === 'filled') { nv.__filled = true; i++; continue; } err(`无法识别的绘图参数 '${s}'。`, "线型写法如 'r--o'（红色虚线加圆点），属性写法如 'LineWidth', 2。"); }
      if (s === 'filled') { nv.__filled = true; i++; continue; }
      nv[s.toLowerCase()] = args[i + 1]; i += 2; continue;
    }
    if (a.k !== 't') err('绘图数据必须是数值数组。');
    const b = args[i + 1];
    if (b && b.k === 't' && b.type !== 'char') { groups.push({ x: a, y: b }); i += 2; }
    else { groups.push({ x: null, y: a }); i += 1; }
  }
  return { groups, nv };
}
function seriesPairs(g) {
  // 返回 [{x:[], y:[]}]
  let { x, y } = g;
  if (!x && y.im) { x = B.real([y]); y = B.imag([y]); }
  if (y.im) y = B.real([y]);
  if (x && x.im) x = B.real([x]);
  const pairs = [];
  const col = (t, j) => Array.from(t.re.subarray(j * t.r, (j + 1) * t.r));
  const rowA = (t, i) => seq(t.c).map(j => t.re[i + j * t.r]);
  if (!x) {
    if (isVec(y)) { const yy = Array.from(y.re); pairs.push({ x: yy.map((_, i) => i + 1), y: yy }); }
    else for (let j = 0; j < y.c; j++) pairs.push({ x: seq(y.r).map(i => i + 1), y: col(y, j) });
    return pairs;
  }
  if (isVec(x) && isVec(y)) {
    if (nel(x) !== nel(y)) err('Vectors must be the same length.', `x 有 ${nel(x)} 个元素，y 有 ${nel(y)} 个元素。plot(x, y) 要求两者长度相同。`);
    pairs.push({ x: Array.from(x.re), y: Array.from(y.re) });
    return pairs;
  }
  if (isVec(x)) {
    const xx = Array.from(x.re);
    if (y.r === xx.length) for (let j = 0; j < y.c; j++) pairs.push({ x: xx, y: col(y, j) });
    else if (y.c === xx.length) for (let i = 0; i < y.r; i++) pairs.push({ x: xx, y: rowA(y, i) });
    else err('Vectors must be the same length.', 'x 的长度必须等于 y 的行数或列数。');
    return pairs;
  }
  if (x.r === y.r && x.c === y.c) { for (let j = 0; j < y.c; j++) pairs.push({ x: col(x, j), y: col(y, j) }); return pairs; }
  err('Vectors must be the same length.', 'x 和 y 的尺寸不匹配。');
}
function nextColor(ax) { const c = { auto: ax.ci % 7 }; ax.ci++; return c; }
function addLine(ax, x, y, o) {
  const s = Object.assign({ type: 'line', x: Float64Array.from(x), y: Float64Array.from(y), ls: '-', marker: null, lw: 0.5, ms: 6, name: null, mfc: null }, o || {});
  if (!o || !o.color) s.color = nextColor(ax);
  if (o && o.ls === 'none') s.ls = 'none';
  ax.series.push(s);
  return s;
}
function addStairs(ax, x, y, o) {
  const sx = [], sy = [];
  for (let i = 0; i < x.length; i++) { if (i > 0) { sx.push(x[i]); sy.push(y[i - 1]); } sx.push(x[i]); sy.push(y[i]); }
  return addLine(ax, sx, sy, o);
}
function genericPlot(args, env, kind) {
  const ax = plotPrep(env);
  const { groups, nv } = splitPlotArgs(args);
  if (!groups.length) err('Not enough input arguments.', H.notEnough);
  if (kind === 'semilogx' || kind === 'loglog') ax.xscale = 'log';
  if (kind === 'semilogy' || kind === 'loglog') ax.yscale = 'log';
  const made = [];
  for (const g of groups) {
    for (const p of seriesPairs(g)) {
      const sp = g.spec || {};
      let s;
      const base = { ls: sp.ls || (sp.marker ? 'none' : '-'), marker: sp.marker || null };
      if (sp.color) base.color = sp.color;
      if (kind === 'stairs') s = addStairs(ax, p.x, p.y, base);
      else if (kind === 'stem') {
        s = addLine(ax, p.x, p.y, Object.assign(base, { type: 'stem', marker: sp.marker || 'o', ls: sp.ls || '-' }));
        if (nv.__filled) s.mfc = 'same';
      } else s = addLine(ax, p.x, p.y, base);
      applyNV(s, nv);
      made.push(s);
    }
  }
  return made;
}
def('plot semilogx semilogy loglog', (a, n, env, name) => { genericPlot(a, env, name === 'plot' ? 'line' : name); if (n > 0) return num(1); });
def('stem', (a, n, env) => { genericPlot(a, env, 'stem'); if (n > 0) return num(1); });
def('stairs', (a, n, env) => { genericPlot(a, env, 'stairs'); if (n > 0) return num(1); });
def('area', (a, n, env) => { const made = genericPlot(a, env, 'line'); made.forEach(s => { s.type = 'area'; s.alpha = s.alpha || 1; }); });
def('bar barh', (a, n, env, name) => {
  const ax = plotPrep(env);
  const nums = a.filter(v => v.k === 't' && v.type !== 'char');
  const rest = a.filter(v => !(v.k === 't' && v.type !== 'char'));
  let x, y, width = 0.8;
  if (nums.length >= 2 && nel(nums[1]) > 1) { x = Array.from(nums[0].re); y = nums[1]; if (nums[2]) width = sc(nums[2]); }
  else { y = nums[0]; x = null; if (nums[1]) width = sc(nums[1]); }
  const groups = isVec(y) ? [Array.from(y.re)] : seq(y.c).map(j => Array.from(y.re.subarray(j * y.r, (j + 1) * y.r)));
  const N = groups[0].length;
  if (!x) x = seq(N).map(i => i + 1);
  const ng = groups.length;
  const nv = {}; let spec = null;
  for (let i = 0; i < rest.length; i++) { const s = textOf(rest[i]); const p = parseSpec(s); if (p && p.color) { spec = p; continue; } if (s === 'stacked' || s === 'grouped') continue; nv[s.toLowerCase()] = rest[i + 1]; i++; }
  const dx = N > 1 ? Math.min(...x.slice(1).map((v, i) => v - x[i])) : 1;
  groups.forEach((g, k) => {
    const w = width * dx / ng;
    const off = ng > 1 ? (k - (ng - 1) / 2) * w : 0;
    const s = { type: 'bar', x: Float64Array.from(x.map(v => v + off)), y: Float64Array.from(g), w: ng > 1 ? w * 0.95 : width * dx, color: spec && spec.color ? spec.color : nextColor(ax), name: null, horiz: name === 'barh', base: 0 };
    applyNV(s, nv);
    ax.series.push(s);
  });
  if (name === 'barh') ax.swap = true;
});
def('histogram hist', (a, n, env, name) => {
  need(a, 1);
  const data = Array.from(T_(a[0]).re).filter(isFinite);
  let edges = null, nbins = null, binw = null, norm = 'count';
  const nv = {};
  for (let i = 1; i < a.length; i++) {
    if (isText(a[i])) { const k = textOf(a[i]).toLowerCase(); const v = a[i + 1]; i++; if (k === 'binwidth') binw = sc(v); else if (k === 'numbins') nbins = sc(v); else if (k === 'binedges') edges = Array.from(T_(v).re); else if (k === 'normalization') norm = textOf(v).toLowerCase(); else nv[k] = v; }
    else if (nel(a[i]) === 1) nbins = sc(a[i]); else edges = Array.from(T_(a[i]).re);
  }
  if (name === 'hist' && !nbins && !edges) nbins = 10;
  if (!edges) {
    if (binw) { const lo = Math.floor(Math.min(...data) / binw) * binw, hi = Math.max(...data); const k = Math.max(1, Math.ceil((hi - lo) / binw + 1e-12)); edges = seq(k + 1).map(i => lo + i * binw); if (edges[edges.length - 1] === hi) edges.push(hi + binw); }
    else edges = autoEdges(data, nbins);
  }
  const counts = new Array(edges.length - 1).fill(0);
  for (const v of data) for (let k = 0; k < counts.length; k++) if (v >= edges[k] && (v < edges[k + 1] || (k === counts.length - 1 && v <= edges[k + 1]))) { counts[k]++; break; }
  const tot = data.length;
  const vals = counts.map((c, k) => norm === 'probability' ? c / tot : norm === 'pdf' ? c / tot / (edges[k + 1] - edges[k]) : norm === 'cdf' ? counts.slice(0, k + 1).reduce((s, v) => s + v, 0) / tot : c);
  if (n > 0 && name === 'hist') return [rowv(counts), rowv(edges.slice(0, -1).map((e, k) => (e + edges[k + 1]) / 2))];
  const ax = plotPrep(env);
  const s = { type: 'hist', edges: Float64Array.from(edges), y: Float64Array.from(vals), color: nextColor(ax), alpha: 0.6, name: null };
  applyNV(s, nv);
  ax.series.push(s);
  if (n > 0) return { k: 'st', f: new Map([['Values', rowv(vals)], ['BinEdges', rowv(edges)], ['NumBins', num(counts.length)]]) };
});
def('scatter', (a, n, env) => {
  need(a, 2);
  const ax = plotPrep(env);
  const x = Array.from(T_(a[0]).re), y = Array.from(T_(a[1]).re);
  if (x.length !== y.length) err('X and Y must be the same length.');
  let sz = 36, color = null, filled = false, marker = 'o';
  const nv = {};
  let i = 2;
  if (a[i] && a[i].k === 't' && a[i].type !== 'char') { if (nel(a[i])) sz = a[i].re[0]; i++; }
  if (a[i] && ((a[i].k === 't' && a[i].type !== 'char' && nel(a[i]) === 3) || (isText(a[i]) && parseSpec(textOf(a[i])) && parseSpec(textOf(a[i])).color && textOf(a[i]) !== 'filled'))) { color = a[i].k === 't' && a[i].type !== 'char' ? Array.from(a[i].re) : parseSpec(textOf(a[i])).color; i++; }
  else if (a[i] && a[i].k === 't' && a[i].type !== 'char') i++;
  for (; i < a.length; i++) {
    const s = textOf(a[i]);
    if (s === 'filled') { filled = true; continue; }
    const p = parseSpec(s);
    if (p && p.marker && !p.ls) { marker = p.marker; if (p.color) color = p.color; continue; }
    nv[s.toLowerCase()] = a[i + 1]; i++;
  }
  const s = { type: 'line', x: Float64Array.from(x), y: Float64Array.from(y), ls: 'none', marker, ms: Math.sqrt(sz), lw: 0.5, color: color || nextColor(ax), mfc: filled ? 'same' : null, name: null };
  applyNV(s, nv);
  ax.series.push(s);
});
def('errorbar', (a, n, env) => {
  need(a, 2);
  const ax = plotPrep(env);
  let x, y, e;
  const nums = a.filter(v => v.k === 't' && v.type !== 'char');
  if (nums.length >= 3) { x = Array.from(nums[0].re); y = Array.from(nums[1].re); e = Array.from(nums[2].re); }
  else { y = Array.from(nums[0].re); x = y.map((_, i) => i + 1); e = Array.from(nums[1].re); }
  const spec = a.find(v => isText(v) && parseSpec(textOf(v)));
  const sp = spec ? parseSpec(textOf(spec)) : {};
  const s = addLine(ax, x, y, { ls: sp.ls || (sp.marker ? 'none' : '-'), marker: sp.marker || null, color: sp.color });
  if (!sp.color) { /* 已自动分配颜色 */ }
  s.err = Float64Array.from(e.length === 1 ? x.map(() => e[0]) : e);
});
def('fplot', (a, n, env) => {
  need(a, 1);
  const f = a[0];
  if (f.k !== 'f') err('fplot 的第一个参数必须是函数句柄，例如 fplot(@(x) sin(x), [0 2*pi])。', '符号表达式（syms）请在本地 MATLAB 中使用 fplot。');
  let lim = [-5, 5], rest = a.slice(1);
  if (rest[0] && rest[0].k === 't' && rest[0].type !== 'char') { lim = Array.from(rest[0].re); rest = rest.slice(1); }
  const N = 600, xs = seq(N).map(k => lim[0] + (lim[1] - lim[0]) * k / (N - 1));
  let ys;
  try { const r = T_(callF(f, [rowv(xs)], env)); if (nel(r) !== N) throw 0; ys = Array.from(r.re); }
  catch (e) { if (e && e.isM && !/incompatible|dimensions|Incorrect/.test(e.message)) throw e; ys = xs.map(x => sc(callF(f, [num(x)], env))); }
  const ax = plotPrep(env);
  const s = addLine(ax, xs, ys, {});
  for (let i = 0; i < rest.length; i++) { const t = textOf(rest[i]); const p = parseSpec(t); if (p) { if (p.color) s.color = p.color; if (p.ls) s.ls = p.ls; if (p.marker) s.marker = p.marker; } else { applyNV(s, { [t.toLowerCase()]: rest[i + 1] }); i++; } }
  if (!ax.xlim) ax.xlim = lim.slice();
});
def('figure', (a, n, env) => {
  const fm = env.sess.figs;
  const numArg = a.find(v => v.k === 't' && v.type !== 'char' && nel(v) === 1);
  if (numArg) {
    const id = sc(numArg);
    const ex = fm.list.find(f => f.id === id);
    if (ex) { fm.cur = ex; fm.touch(ex); }
    else fm.newFig(id);
  } else fm.newFig();
  if (n > 0) return num(fm.cur.id);
});
def('gcf', (a, n, env) => num(env.sess.figs.gcf().id));
def('gca', (a, n, env) => { env.sess.figs.gca(); return num(1); });
def('clf', (a, n, env) => { const f = env.sess.figs.gcf(); f.axes = []; f.cur = null; f.sgtitle = ''; });
def('close', (a, n, env) => {
  const fm = env.sess.figs;
  if (!a.length) { if (fm.cur) { fm.list = fm.list.filter(f => f !== fm.cur); fm.cur = fm.list[fm.list.length - 1] || null; } return; }
  if (txtIs(a[0], 'all')) { fm.closeAll(); return; }
  const id = sc(a[0]); fm.list = fm.list.filter(f => f.id !== id); if (fm.cur && fm.cur.id === id) fm.cur = fm.list[fm.list.length - 1] || null;
});
def('subplot', (a, n, env) => {
  need(a, 1);
  let m, nn, ps;
  if (a.length === 1) { const v = sc(a[0]); m = Math.floor(v / 100); nn = Math.floor(v / 10) % 10; ps = [v % 10]; }
  else { m = sc(a[0]); nn = sc(a[1]); ps = Array.from(T_(a[2]).re); }
  if (ps.some(p => p < 1 || p > m * nn)) err('Index exceeds number of subplots.', `subplot(${m},${nn},p) 里 p 只能取 1 到 ${m * nn}。`);
  subplotSel(env, m, nn, ps);
  if (n > 0) return num(1);
});
def('hold', (a, n, env) => {
  const ax = env.sess.figs.gca();
  if (!a.length) ax.hold = !ax.hold;
  else ax.hold = txtIs(a[0], 'on') || txtIs(a[0], 'all');
});
def('ishold', (a, n, env) => lgc(env.sess.figs.cur && env.sess.figs.cur.cur ? env.sess.figs.cur.cur.hold : false));
def('grid', (a, n, env) => {
  const ax = env.sess.figs.gca();
  if (!a.length) ax.gridOn = !ax.gridOn;
  else if (txtIs(a[0], 'minor')) { ax.minorGrid = !ax.minorGrid; ax.gridOn = true; }
  else ax.gridOn = txtIs(a[0], 'on');
});
def('box', (a, n, env) => { const ax = env.sess.figs.gca(); ax.box = !a.length ? !ax.box : txtIs(a[0], 'on'); });
def('title xlabel ylabel subtitle', (a, n, env, name) => {
  need(a, 1);
  const ax = env.sess.figs.gca();
  const v = a[0];
  const t = v.k === 'c' ? v.d.map(x => textOf(x)).join('\n') : isText(v) ? textOf(v) : textOf(B.num2str([v]));
  if (name === 'subtitle') ax.subtitle = t; else ax[name] = t;
});
def('sgtitle suptitle', (a, n, env) => { env.sess.figs.gcf().sgtitle = textOf(a[0]); });
def('legend', (a, n, env) => {
  const ax = env.sess.figs.gca();
  if (a.length && (txtIs(a[0], 'off') || txtIs(a[0], 'hide'))) { ax.legend = null; return; }
  let labels = [];
  const opts = {};
  for (let i = 0; i < a.length; i++) {
    const v = a[i];
    if (v.k === 'c') { labels.push(...v.d.map(x => textOf(x))); continue; }
    const s = textOf(v);
    if (['location', 'orientation', 'fontsize', 'box', 'interpreter', 'numcolumns', 'autoupdate', 'textcolor'].includes(s.toLowerCase()) && i + 1 < a.length) { opts[s.toLowerCase()] = isText(a[i + 1]) ? textOf(a[i + 1]) : sc(a[i + 1]); i++; continue; }
    if (s === 'show' || s === 'boxoff' || s === 'boxon') { if (s === 'boxoff') opts.box = 'off'; continue; }
    labels.push(s);
  }
  if (!labels.length) labels = ax.series.map((s, i) => s.name || `data${i + 1}`);
  ax.legend = { labels, loc: (opts.location || 'northeast').toLowerCase(), box: opts.box !== 'off' };
});
def('axis', (a, n, env) => {
  const ax = env.sess.figs.gca();
  for (const v of a) {
    if (isText(v)) {
      const s = textOf(v).toLowerCase();
      if (s === 'equal' || s === 'image') ax.equal = true;
      else if (s === 'tight') { ax.tight = true; ax.xlim = null; ax.ylim = null; }
      else if (s === 'off') ax.off = true;
      else if (s === 'on') ax.off = false;
      else if (s === 'square') ax.square = true;
      else if (s === 'normal' || s === 'auto') { ax.equal = false; ax.tight = false; ax.square = false; ax.xlim = null; ax.ylim = null; }
    } else {
      const t = Array.from(T_(v).re);
      if (t.length < 4) err('axis([xmin xmax ymin ymax]) 需要 4 个数。');
      if (!(t[0] < t[1]) || !(t[2] < t[3])) err('Limits must be a 2-element vector of increasing numeric values.', 'axis 的范围必须是从小到大，例如 axis([0 10 -1 1])。');
      ax.xlim = [t[0], t[1]]; ax.ylim = [t[2], t[3]];
    }
  }
});
def('xlim ylim', (a, n, env, name) => {
  const ax = env.sess.figs.gca();
  if (!a.length) return rowv(ax[name] || [0, 1]);
  if (isText(a[0])) { if (txtIs(a[0], 'auto')) ax[name] = null; return; }
  const t = Array.from(T_(a[0]).re);
  if (t.length !== 2 || !(t[0] < t[1])) err('Limits must be a 2-element vector of increasing numeric values.', `${name} 的参数应该是 [下限 上限]，并且下限小于上限。`);
  ax[name] = t;
});
def('xticks yticks', (a, n, env, name) => { const ax = env.sess.figs.gca(); if (a.length && !isText(a[0])) ax[name] = Array.from(T_(a[0]).re); });
def('xticklabels yticklabels', (a, n, env, name) => { const ax = env.sess.figs.gca(); if (a.length && a[0].k === 'c') ax[name] = a[0].d.map(x => textOf(x)); });
def('text', (a, n, env) => {
  need(a, 3);
  const ax = env.sess.figs.gca();
  const x = sc(a[0]), y = sc(a[1]);
  const s = a[2].k === 'c' ? a[2].d.map(v => textOf(v)).join('\n') : textOf(a[2]);
  ax.texts.push({ x, y, s });
});
def('xline yline', (a, n, env, name) => {
  need(a, 1);
  const ax = env.sess.figs.gca();
  const vals = Array.from(T_(a[0]).re);
  let ls = '-', color = null, label = '', lw = 0.5;
  let i = 1;
  if (a[i] && isText(a[i])) { const p = parseSpec(textOf(a[i])); if (p) { if (p.ls) ls = p.ls; if (p.color) color = p.color; i++; } }
  if (a[i] && isText(a[i])) { const s = textOf(a[i]); if (s.toLowerCase() !== 'linewidth' && s.toLowerCase() !== 'color' && s.toLowerCase() !== 'label') { label = s; i++; } }
  for (; i + 1 < a.length; i += 2) { const k = textOf(a[i]).toLowerCase(); if (k === 'linewidth') lw = sc(a[i + 1]); if (k === 'color') color = parseColor(a[i + 1]); if (k === 'label') label = textOf(a[i + 1]); if (k === 'linestyle') ls = textOf(a[i + 1]); }
  for (const v of vals) ax.refLines.push({ axis: name === 'xline' ? 'x' : 'y', v, ls, color: color || 'fg', label, lw });
});
def('set colormap colorbar view shading caxis lighting camlight daspect pbaspect linkaxes zoom rotate3d datacursormode tiledlayout', () => undefined);
def('nexttile', (a, n, env) => { const f = env.sess.figs.gcf(); const k = f.axes.length + 1; subplotSel(env, Math.ceil(k / 2) || 1, 2, [k]); });
def('exportgraphics saveas print savefig', (a, n, env, name) => { env.sess.printLine(`（实验台不保存文件，${name} 已忽略。在本地 MATLAB 中它会把图窗导出为图片。）`); });
def('get', () => num(0));
