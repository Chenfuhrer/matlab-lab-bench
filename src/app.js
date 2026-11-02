/* MATLAB 实验台 · 页面逻辑：代码单元、图窗渲染、命令行窗口、测验与进度 */
(function () {
'use strict';
const ML = window.MLite;
if (window.MLDATA && window.MLDATA.docs) ML.setDocs(window.MLDATA.docs);
const DATA = window.MLDATA || { docs: {}, quiz: {}, checks: {} };

// ---------- 小工具 ----------
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
const store = {
  get(k, d) { try { const v = localStorage.getItem('mlab:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('mlab:' + k, JSON.stringify(v)); } catch (e) { /* 存储不可用时忽略 */ } },
};

// ---------- 语法高亮（配色取自 MATLAB 编辑器默认方案） ----------
const KW = new Set(['if', 'elseif', 'else', 'end', 'for', 'parfor', 'while', 'switch', 'case', 'otherwise', 'break', 'continue', 'return', 'function', 'try', 'catch', 'global', 'persistent']);
function highlight(code) {
  let out = '', i = 0;
  const n = code.length;
  let prevVal = false, depth = 0;
  while (i < n) {
    const c = code[i];
    if (c === '%') {
      let j = code.indexOf('\n', i); if (j < 0) j = n;
      const txt = code.slice(i, j);
      out += `<span class="hl-com${txt.startsWith('%%') ? ' hl-sec' : ''}">${esc(txt)}</span>`;
      i = j; prevVal = false; continue;
    }
    if (c === '.' && code.startsWith('...', i)) {
      let j = code.indexOf('\n', i); if (j < 0) j = n;
      out += `<span class="hl-com">${esc(code.slice(i, j))}</span>`; i = j; continue;
    }
    if (c === "'" && !(prevVal && code[i - 1] !== ' ')) {
      let j = i + 1;
      while (j < n && code[j] !== '\n') { if (code[j] === "'") { if (code[j + 1] === "'") { j += 2; continue; } j++; break; } j++; }
      out += `<span class="hl-str">${esc(code.slice(i, j))}</span>`; i = j; prevVal = true; continue;
    }
    if (c === '"') {
      let j = i + 1;
      while (j < n && code[j] !== '\n') { if (code[j] === '"') { if (code[j + 1] === '"') { j += 2; continue; } j++; break; } j++; }
      out += `<span class="hl-str">${esc(code.slice(i, j))}</span>`; i = j; prevVal = true; continue;
    }
    if (/[A-Za-z]/.test(c)) {
      let j = i; while (j < n && /[A-Za-z0-9_]/.test(code[j])) j++;
      const w = code.slice(i, j);
      if (KW.has(w) && !(w === 'end' && depth > 0)) out += `<span class="hl-kw">${w}</span>`;
      else out += esc(w);
      i = j; prevVal = true; continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(code[i + 1] || ''))) {
      let j = i; while (j < n && /[0-9.eE]/.test(code[j])) { if ((code[j] === 'e' || code[j] === 'E') && /[+-]/.test(code[j + 1] || '')) j++; j++; }
      if (code[j] === 'i' || code[j] === 'j') j++;
      out += `<span class="hl-num">${esc(code.slice(i, j))}</span>`; i = j; prevVal = true; continue;
    }
    if ('([{'.includes(c)) depth++;
    if (')]}'.includes(c)) depth = Math.max(0, depth - 1);
    prevVal = /[)\]}']/.test(c);
    if (c === ' ' || c === '\t') { out += c; i++; continue; }
    out += esc(c); i++;
  }
  return out;
}

// ---------- TeX 文本（标题、坐标轴标签） ----------
const TEXSYM = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω', Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω', infty: '∞', leq: '≤', geq: '≥', neq: '≠', ne: '≠', pm: '±', times: '×', cdot: '·', circ: '°', approx: '≈', rightarrow: '→', leftarrow: '←', Rightarrow: '⇒', partial: '∂', nabla: '∇', int: '∫', sum: '∑', prod: '∏', sqrt: '√', surd: '√', ldots: '…', in: '∈', propto: '∝', bullet: '•', div: '÷', langle: '⟨', rangle: '⟩', deg: '°', prime: '′', equiv: '≡', sim: '∼', forall: '∀', exists: '∃' };
function texParts(s) {
  const parts = [];
  let i = 0, buf = '';
  const flush = () => { if (buf) { parts.push({ t: buf, m: 0 }); buf = ''; } };
  const readGroup = () => {
    if (s[i] === '{') { let d = 1, j = i + 1, g = ''; while (j < s.length && d) { if (s[j] === '{') d++; else if (s[j] === '}') { d--; if (!d) break; } g += s[j]; j++; } i = j + 1; return texPlain(g); }
    if (s[i] === '\\') { const m = /^\\([A-Za-z]+)/.exec(s.slice(i)); if (m) { i += m[0].length; return TEXSYM[m[1]] || m[1]; } }
    return s[i++] || '';
  };
  while (i < s.length) {
    const c = s[i];
    if (c === '\\') {
      const m = /^\\([A-Za-z]+)/.exec(s.slice(i));
      if (m) { const nm = m[1]; i += m[0].length; if (['bf', 'it', 'rm', 'fontsize', 'color'].includes(nm)) { if ((nm === 'fontsize' || nm === 'color') && s[i] === '{') readGroup(); continue; } buf += TEXSYM[nm] || nm; continue; }
      if ('{}_^\\'.includes(s[i + 1] || '')) { buf += s[i + 1]; i += 2; continue; }
      buf += c; i++; continue;
    }
    if (c === '^' || c === '_') { flush(); i++; parts.push({ t: readGroup(), m: c === '^' ? 1 : -1 }); continue; }
    if (c === '{' || c === '}') { i++; continue; }
    buf += c; i++;
  }
  flush();
  return parts;
}
function texPlain(s) { return texParts(s).map(p => p.t).join(''); }
function textW(s, fs) { let w = 0; for (const ch of s) w += (ch.charCodeAt(0) > 0x2E80 ? 1.0 : /[A-Z0-9mwMW]/.test(ch) ? 0.62 : 0.52) * fs; return w; }
function texW(s, fs) { return texParts(s).reduce((w, p) => w + textW(p.t, p.m ? fs * 0.72 : fs), 0); }
function texSvg(s, x, y, fs, attrs) {
  const parts = texParts(s);
  let inner = '', cur = 0;
  for (const p of parts) {
    const target = p.m === 1 ? -0.42 * fs : p.m === -1 ? 0.22 * fs : 0;
    const dy = target - cur; cur = target;
    inner += `<tspan${dy ? ` dy="${dy.toFixed(1)}"` : ''}${p.m ? ` font-size="${(fs * 0.72).toFixed(1)}"` : ''}>${esc(p.t)}</tspan>`;
  }
  return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${fs}" ${attrs || ''}>${inner}</text>`;
}

// ---------- 图窗渲染 ----------
function colorCss(c) {
  if (!c) return 'var(--c1)';
  if (c.auto !== undefined) return `var(--c${c.auto + 1})`;
  if (c === 'fg') return 'var(--fig-fg)';
  if (c === 'bg') return 'var(--fig-bg)';
  if (c === 'none') return 'none';
  if (c === 'muted' || c.name === 'muted') return 'var(--fig-muted)';
  if (Array.isArray(c)) {
    if (c[0] === 0 && c[1] === 0 && c[2] === 0) return 'var(--fig-fg)';
    return `rgb(${c.map(v => Math.round(Math.max(0, Math.min(1, v)) * 255)).join(',')})`;
  }
  return 'var(--c1)';
}
function niceStep(raw) {
  const e = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / e;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e;
}
function linTicks(lo, hi, target) {
  const step = niceStep((hi - lo) / Math.max(2, target));
  const out = [];
  const t0 = Math.ceil(lo / step - 1e-9);
  for (let k = t0; k * step <= hi + step * 1e-9 && out.length < 60; k++) { const v = k * step; out.push(Math.abs(v) < step * 1e-9 ? 0 : v); }
  return { ticks: out, step };
}
function fmtTick(v, step) {
  if (v === 0) return '0';
  const d = Math.max(0, Math.min(10, -Math.floor(Math.log10(step) + 1e-9)));
  let s = v.toFixed(d);
  if (s.indexOf('.') >= 0) s = s.replace(/\.?0+$/, '');
  return s === '-0' ? '0' : s;
}
function dataRange(ax) {
  let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
  const upd = (x, y) => {
    if (isFinite(x) && (ax.xscale !== 'log' || x > 0)) { if (x < xmin) xmin = x; if (x > xmax) xmax = x; }
    if (isFinite(y) && (ax.yscale !== 'log' || y > 0)) { if (y < ymin) ymin = y; if (y > ymax) ymax = y; }
  };
  for (const s of ax.series) {
    if (s.type === 'bar') { for (let i = 0; i < s.x.length; i++) { upd(s.x[i] - s.w / 2, s.y[i]); upd(s.x[i] + s.w / 2, 0); } continue; }
    if (s.type === 'hist') { for (let i = 0; i < s.y.length; i++) { upd(s.edges[i], s.y[i]); upd(s.edges[i + 1], 0); } continue; }
    for (let i = 0; i < s.x.length; i++) {
      upd(s.x[i], s.y[i]);
      if (s.err) { upd(s.x[i], s.y[i] + s.err[i]); upd(s.x[i], s.y[i] - s.err[i]); }
    }
    if (s.type === 'stem' || s.type === 'area') upd(NaN, 0);
  }
  for (const r of ax.refLines || []) { if (r.axis === 'x') upd(r.v, NaN); else upd(NaN, r.v); }
  for (const t of ax.texts || []) upd(t.x, t.y);
  return { xmin, xmax, ymin, ymax };
}
function limitsFor(dmin, dmax, user, tight, px, log, padBars) {
  if (user) return user.slice();
  if (!isFinite(dmin) || !isFinite(dmax)) { dmin = log ? 1 : 0; dmax = log ? 10 : 1; }
  if (log) {
    let lo = Math.pow(10, Math.floor(Math.log10(dmin))), hi = Math.pow(10, Math.ceil(Math.log10(dmax)));
    if (lo === hi) { lo /= 10; hi *= 10; }
    return tight ? [dmin, dmax] : [lo, hi];
  }
  if (dmin === dmax) { dmin -= 1; dmax += 1; }
  if (tight) return [dmin, dmax];
  const { step } = linTicks(dmin, dmax, Math.max(4, Math.min(9, px / 70)));
  return [Math.floor(dmin / step + 1e-9) * step, Math.ceil(dmax / step - 1e-9) * step];
}
function logTicks(lo, hi) {
  const a = Math.ceil(Math.log10(lo) - 1e-9), b = Math.floor(Math.log10(hi) + 1e-9);
  const every = Math.max(1, Math.ceil((b - a + 1) / 8));
  const out = []; for (let k = a; k <= b; k += every) out.push(k);
  return out;
}
function dashFor(ls, lw) {
  const u = Math.max(1, lw);
  if (ls === '--') return `${6 * u} ${4 * u}`;
  if (ls === ':') return `${1.2 * u} ${2.6 * u}`;
  if (ls === '-.') return `${6 * u} ${3 * u} ${1.2 * u} ${3 * u}`;
  return '';
}
function markerSvg(m, x, y, ms, stroke, fill, lw) {
  const r = Math.max(2, ms * 0.62);
  const f = fill || 'none';
  const sw = `stroke="${stroke}" stroke-width="${lw}" fill="${f}"`;
  switch (m) {
    case 'o': return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" ${sw}/>`;
    case '.': return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${Math.max(1.4, ms * 0.24).toFixed(1)}" fill="${stroke}"/>`;
    case 's': return `<rect x="${(x - r * 0.9).toFixed(1)}" y="${(y - r * 0.9).toFixed(1)}" width="${(r * 1.8).toFixed(1)}" height="${(r * 1.8).toFixed(1)}" ${sw}/>`;
    case 'd': return `<path d="M${x} ${y - r * 1.15}L${x + r * 0.9} ${y}L${x} ${y + r * 1.15}L${x - r * 0.9} ${y}Z" ${sw}/>`;
    case '^': return `<path d="M${x} ${y - r}L${x + r} ${y + r * 0.8}L${x - r} ${y + r * 0.8}Z" ${sw}/>`;
    case 'v': return `<path d="M${x} ${y + r}L${x + r} ${y - r * 0.8}L${x - r} ${y - r * 0.8}Z" ${sw}/>`;
    case '>': return `<path d="M${x + r} ${y}L${x - r * 0.8} ${y - r}L${x - r * 0.8} ${y + r}Z" ${sw}/>`;
    case '<': return `<path d="M${x - r} ${y}L${x + r * 0.8} ${y - r}L${x + r * 0.8} ${y + r}Z" ${sw}/>`;
    case 'x': return `<path d="M${x - r * 0.8} ${y - r * 0.8}L${x + r * 0.8} ${y + r * 0.8}M${x - r * 0.8} ${y + r * 0.8}L${x + r * 0.8} ${y - r * 0.8}" stroke="${stroke}" stroke-width="${lw}"/>`;
    case '+': return `<path d="M${x - r} ${y}L${x + r} ${y}M${x} ${y - r}L${x} ${y + r}" stroke="${stroke}" stroke-width="${lw}"/>`;
    case '*': return `<path d="M${x - r} ${y}L${x + r} ${y}M${x} ${y - r}L${x} ${y + r}M${x - r * 0.7} ${y - r * 0.7}L${x + r * 0.7} ${y + r * 0.7}M${x - r * 0.7} ${y + r * 0.7}L${x + r * 0.7} ${y - r * 0.7}" stroke="${stroke}" stroke-width="${lw}"/>`;
    case 'p': case 'h': {
      const k = m === 'p' ? 5 : 6, pts = [];
      for (let i = 0; i < 2 * k; i++) { const rr = i % 2 ? r * 0.45 : r * 1.1, a = -Math.PI / 2 + i * Math.PI / k; pts.push(`${(x + rr * Math.cos(a)).toFixed(1)} ${(y + rr * Math.sin(a)).toFixed(1)}`); }
      return `<path d="M${pts.join('L')}Z" ${sw}/>`;
    }
  }
  return '';
}
function axesRect(ax, fig, W, H, top) {
  const g = ax.grid;
  if (!g) return { x: 0, y: top, w: W, h: H - top };
  const rows = g.ps.map(p => Math.floor((p - 1) / g.n)), cols = g.ps.map(p => (p - 1) % g.n);
  const r0 = Math.min(...rows), r1 = Math.max(...rows), c0 = Math.min(...cols), c1 = Math.max(...cols);
  const cw = W / g.n, ch = (H - top) / g.m;
  return { x: c0 * cw, y: top + r0 * ch, w: (c1 - c0 + 1) * cw, h: (r1 - r0 + 1) * ch };
}
function renderAxes(ax, cell, W) {
  const FS = W < 420 ? 10 : 11, LFS = FS + 1, TFS = FS + 2;
  const parts = [];
  const hasTitle = !!ax.title, hasSub = !!ax.subtitle;
  const titleLines = hasTitle ? ax.title.split('\n') : [];
  const xlLines = ax.xlabel ? ax.xlabel.split('\n') : [];
  const ylLines = ax.ylabel ? ax.ylabel.split('\n') : [];
  const swap = !!ax.swap;
  const dr = dataRange(ax);
  // 先估一个绘图区，用于决定刻度密度
  let mt = 10 + (hasTitle ? titleLines.length * (TFS + 5) : 0) + (hasSub ? LFS + 4 : 0), mb = 8 + FS + 6 + (xlLines.length ? xlLines.length * (LFS + 4) : 0), mr = 14;
  const estW = cell.w - 60 - mr, estH = cell.h - mt - mb;
  let xr = dr, yr = dr;
  let xl = limitsFor(swap ? dr.ymin : dr.xmin, swap ? dr.ymax : dr.xmax, ax.xlim, ax.tight || ax.series.some(s => s.type === 'hist') && !ax.xlim, estW, ax.xscale === 'log');
  let yl = limitsFor(swap ? dr.xmin : dr.ymin, swap ? dr.xmax : dr.ymax, ax.ylim, ax.tight, estH * 1.35, ax.yscale === 'log');
  // y 刻度标签与乘数
  const mkTicks = (lim, px, log, user) => {
    if (user) return { ticks: user.map(v => ({ v, s: fmtTick(v, Math.abs(user[1] - user[0]) || 1) })), mult: 0 };
    if (log) return { ticks: logTicks(lim[0], lim[1]).map(k => ({ v: Math.pow(10, k), s: '10^{' + k + '}' })), mult: 0 };
    const { ticks, step } = linTicks(lim[0], lim[1], Math.max(4, Math.min(9, px / 70)));
    const maxA = Math.max(...ticks.map(Math.abs));
    let mult = 0;
    if (maxA >= 1e4 || (maxA > 0 && maxA < 1e-3)) mult = Math.floor(Math.log10(maxA));
    const f = Math.pow(10, mult);
    return { ticks: ticks.map(v => ({ v, s: fmtTick(v / f, step / f) })), mult };
  };
  let yt = mkTicks(yl, estH * 1.35, ax.yscale === 'log', ax.yticks);
  if (ax.yticklabels) yt.ticks.forEach((t, i) => { if (ax.yticklabels[i] !== undefined) t.s = ax.yticklabels[i]; });
  const ytw = Math.max(...yt.ticks.map(t => texW(t.s, FS)), 8);
  const ml = 10 + ytw + 6 + (ylLines.length ? ylLines.length * (LFS + 4) : 0);
  const px = cell.x + ml, py = cell.y + mt, pw = Math.max(40, cell.w - ml - mr), ph = Math.max(40, cell.h - mt - mb);
  // 等比例坐标轴
  if (ax.equal && ax.xscale !== 'log' && ax.yscale !== 'log') {
    const ux = (xl[1] - xl[0]) / pw, uy = (yl[1] - yl[0]) / ph;
    if (ux > uy) { const c = (yl[0] + yl[1]) / 2, half = ux * ph / 2; yl = [c - half, c + half]; }
    else { const c = (xl[0] + xl[1]) / 2, half = uy * pw / 2; xl = [c - half, c + half]; }
    yt = mkTicks(yl, ph * 1.35, false, ax.yticks);
  }
  let xt = mkTicks(xl, pw, ax.xscale === 'log', ax.xticks);
  if (ax.xticklabels) xt.ticks.forEach((t, i) => { if (ax.xticklabels[i] !== undefined) t.s = ax.xticklabels[i]; });
  const lx = v => ax.xscale === 'log' ? Math.log10(v) : v, ly = v => ax.yscale === 'log' ? Math.log10(v) : v;
  const X = v => px + (lx(v) - lx(xl[0])) / (lx(xl[1]) - lx(xl[0])) * pw;
  const Y = v => py + ph - (ly(v) - ly(yl[0])) / (ly(yl[1]) - ly(yl[0])) * ph;
  const cl = v => Math.max(-1e5, Math.min(1e5, v));
  const MX = swap ? (x, y) => X(y) : (x, y) => X(x), MY = swap ? (x, y) => Y(x) : (x, y) => Y(y);
  const clipId = 'c' + Math.random().toString(36).slice(2, 9);
  if (!ax.off) parts.push(`<rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="var(--ax-bg)"/>`);
  parts.push(`<clipPath id="${clipId}"><rect x="${px - 1}" y="${py - 1}" width="${pw + 2}" height="${ph + 2}"/></clipPath>`);
  // 网格
  if (ax.gridOn && !ax.off) {
    let g = '';
    for (const t of xt.ticks) { const x = X(t.v); if (x > px + 0.5 && x < px + pw - 0.5) g += `M${x.toFixed(1)} ${py}V${py + ph}`; }
    for (const t of yt.ticks) { const y = Y(t.v); if (y > py + 0.5 && y < py + ph - 0.5) g += `M${px} ${y.toFixed(1)}H${px + pw}`; }
    if (ax.minorGrid || ax.xscale === 'log' || ax.yscale === 'log') {
      let mg = '';
      if (ax.xscale === 'log') { for (let k = Math.floor(Math.log10(xl[0])); k < Math.ceil(Math.log10(xl[1])); k++) for (let m = 2; m < 10; m++) { const v = m * Math.pow(10, k); if (v > xl[0] && v < xl[1]) mg += `M${X(v).toFixed(1)} ${py}V${py + ph}`; } }
      if (ax.yscale === 'log') { for (let k = Math.floor(Math.log10(yl[0])); k < Math.ceil(Math.log10(yl[1])); k++) for (let m = 2; m < 10; m++) { const v = m * Math.pow(10, k); if (v > yl[0] && v < yl[1]) mg += `M${px} ${Y(v).toFixed(1)}H${px + pw}`; } }
      if (mg) parts.push(`<path d="${mg}" stroke="var(--fig-grid)" stroke-width="0.6" opacity="0.6"/>`);
    }
    parts.push(`<path d="${g}" stroke="var(--fig-grid)" stroke-width="0.8"/>`);
  }
  // 数据
  const data = [];
  const legendItems = [];
  ax.series.forEach((s, si) => {
    const col = colorCss(s.color);
    const lw = 1.1 + Math.max(0, (s.lw || 0.5) - 0.5) * 1.35;
    if (s.type === 'bar') {
      let d = '';
      const base = ax.yscale === 'log' ? yl[0] : (s.base || 0);
      for (let i = 0; i < s.x.length; i++) {
        if (!isFinite(s.y[i])) continue;
        const x0 = s.x[i] - s.w / 2, x1 = s.x[i] + s.w / 2;
        const ax0 = MX(x0, base), ax1 = MX(x1, s.y[i]), ay0 = MY(x0, base), ay1 = MY(x1, s.y[i]);
        d += `<rect x="${Math.min(ax0, ax1).toFixed(1)}" y="${Math.min(ay0, ay1).toFixed(1)}" width="${Math.abs(ax1 - ax0).toFixed(1)}" height="${Math.abs(ay1 - ay0).toFixed(1)}"/>`;
      }
      data.push(`<g fill="${col}" fill-opacity="${s.alpha !== undefined ? s.alpha : 1}" stroke="${s.edge ? colorCss(s.edge) : 'var(--fig-fg)'}" stroke-width="0.6" stroke-opacity="0.75">${d}</g>`);
      legendItems.push({ kind: 'patch', col, s });
      return;
    }
    if (s.type === 'hist') {
      let d = '';
      for (let i = 0; i < s.y.length; i++) {
        const x0 = X(s.edges[i]), x1 = X(s.edges[i + 1]), y0 = Y(ax.yscale === 'log' ? yl[0] : 0), y1 = Y(s.y[i]);
        d += `<rect x="${x0.toFixed(1)}" y="${Math.min(y0, y1).toFixed(1)}" width="${(x1 - x0).toFixed(1)}" height="${Math.abs(y0 - y1).toFixed(1)}"/>`;
      }
      data.push(`<g fill="${col}" fill-opacity="${s.alpha}" stroke="var(--fig-fg)" stroke-width="0.6" stroke-opacity="0.8">${d}</g>`);
      legendItems.push({ kind: 'patch', col, s });
      return;
    }
    // 折线类
    let xs = s.x, ys = s.y;
    const n = xs.length;
    let d = '', pen = false;
    const pts = [];
    const decimate = n > 4 * pw && !s.marker && s.type === 'line';
    if (decimate) {
      // 每像素列保留最小/最大值
      let curCol = null, mn = null, mx = null, first = null, last = null;
      const flushCol = () => { if (curCol === null) return; [first, mn, mx, last].forEach(p => { if (p) pts.push(p); }); };
      for (let i = 0; i < n; i++) {
        const x = MX(xs[i], ys[i]), y = MY(xs[i], ys[i]);
        if (!isFinite(x) || !isFinite(y)) { flushCol(); curCol = null; pts.push(null); continue; }
        const c = Math.round(x);
        if (c !== curCol) { flushCol(); curCol = c; first = [x, y]; mn = [x, y]; mx = [x, y]; last = [x, y]; }
        else { if (y < mn[1]) mn = [x, y]; if (y > mx[1]) mx = [x, y]; last = [x, y]; }
      }
      flushCol();
    } else for (let i = 0; i < n; i++) { const x = MX(xs[i], ys[i]), y = MY(xs[i], ys[i]); pts.push(isFinite(x) && isFinite(y) ? [x, y] : null); }
    for (const p of pts) { if (!p) { pen = false; continue; } d += (pen ? 'L' : 'M') + cl(p[0]).toFixed(1) + ' ' + cl(p[1]).toFixed(1); pen = true; }
    if (s.type === 'area') {
      const by = Y(ax.yscale === 'log' ? yl[0] : 0);
      const valid = pts.filter(Boolean);
      if (valid.length) data.push(`<path d="M${valid[0][0].toFixed(1)} ${by.toFixed(1)}${valid.map(p => 'L' + p[0].toFixed(1) + ' ' + cl(p[1]).toFixed(1)).join('')}L${valid[valid.length - 1][0].toFixed(1)} ${by.toFixed(1)}Z" fill="${col}" fill-opacity="0.85" stroke="var(--fig-fg)" stroke-width="0.6"/>`);
      legendItems.push({ kind: 'patch', col, s });
      return;
    }
    if (s.type === 'stem') {
      const by = MY(0, 0), bx = MX(0, 0);
      let st = '';
      for (const p of pts) if (p) st += swap ? `M${bx.toFixed(1)} ${p[1].toFixed(1)}H${p[0].toFixed(1)}` : `M${p[0].toFixed(1)} ${by.toFixed(1)}V${cl(p[1]).toFixed(1)}`;
      data.push(`<path d="${st}" stroke="${col}" stroke-width="${lw}" ${s.ls && s.ls !== '-' ? `stroke-dasharray="${dashFor(s.ls, lw)}"` : ''}/>`);
      let mk = '';
      for (const p of pts) if (p) mk += markerSvg(s.marker || 'o', p[0], p[1], s.ms || 6, col, s.mfc === 'same' ? col : (s.mfc ? colorCss(s.mfc) : 'none'), lw);
      data.push(mk);
      legendItems.push({ kind: 'line', col, lw, s });
      return;
    }
    if (s.ls !== 'none' && d) data.push(`<path d="${d}" fill="none" stroke="${col}" stroke-width="${lw.toFixed(2)}" stroke-linejoin="round" stroke-linecap="round" ${s.ls && s.ls !== '-' ? `stroke-dasharray="${dashFor(s.ls, lw)}"` : ''}/>`);
    if (s.err) {
      let e = '';
      for (let i = 0; i < n; i++) { const x = MX(xs[i], ys[i]), y0 = MY(xs[i], ys[i] - s.err[i]), y1 = MY(xs[i], ys[i] + s.err[i]); if (isFinite(x) && isFinite(y0) && isFinite(y1)) e += `M${x.toFixed(1)} ${y0.toFixed(1)}V${y1.toFixed(1)}M${(x - 3).toFixed(1)} ${y0.toFixed(1)}H${(x + 3).toFixed(1)}M${(x - 3).toFixed(1)} ${y1.toFixed(1)}H${(x + 3).toFixed(1)}`; }
      data.push(`<path d="${e}" stroke="${col}" stroke-width="${lw}"/>`);
    }
    if (s.marker) {
      let mk = '';
      const step = pts.length > 1500 ? Math.ceil(pts.length / 1500) : 1;
      for (let i = 0; i < pts.length; i += step) { const p = pts[i]; if (p && p[0] >= px - 6 && p[0] <= px + pw + 6 && p[1] >= py - 6 && p[1] <= py + ph + 6) mk += markerSvg(s.marker, p[0], p[1], s.ms || 6, s.mec ? colorCss(s.mec) : col, s.mfc === 'same' ? col : (s.mfc ? colorCss(s.mfc) : 'none'), Math.max(1, lw * 0.85)); }
      data.push(mk);
    }
    legendItems.push({ kind: 'line', col, lw, s });
  });
  // stem 基线
  if (ax.series.some(s => s.type === 'stem') && yl[0] <= 0 && yl[1] >= 0) {
    const by = Y(0);
    data.unshift(`<path d="M${px} ${by.toFixed(1)}H${px + pw}" stroke="var(--fig-fg)" stroke-width="0.8" opacity="0.7"/>`);
  }
  for (const r of ax.refLines || []) {
    const col = colorCss(r.color), lw = 1 + Math.max(0, (r.lw || 0.5) - 0.5) * 1.35;
    if (r.axis === 'x') { const x = X(r.v); if (isFinite(x)) { data.push(`<path d="M${x.toFixed(1)} ${py}V${py + ph}" stroke="${col}" stroke-width="${lw}" ${r.ls !== '-' ? `stroke-dasharray="${dashFor(r.ls, lw)}"` : ''}/>`); if (r.label) data.push(texSvg(r.label, x + 4, py + 14, FS, 'fill="var(--fig-fg)"')); } }
    else { const y = Y(r.v); if (isFinite(y)) { data.push(`<path d="M${px} ${y.toFixed(1)}H${px + pw}" stroke="${col}" stroke-width="${lw}" ${r.ls !== '-' ? `stroke-dasharray="${dashFor(r.ls, lw)}"` : ''}/>`); if (r.label) data.push(texSvg(r.label, px + pw - 4 - texW(r.label, FS), y - 5, FS, 'fill="var(--fig-fg)"')); } }
  }
  for (const t of ax.texts || []) { const x = MX(t.x, t.y), y = MY(t.x, t.y); if (isFinite(x) && isFinite(y)) t.s.split('\n').forEach((ln, k) => data.push(texSvg(ln, x, y + 4 + k * (FS + 3), FS, 'fill="var(--fig-fg)"'))); }
  parts.push(`<g clip-path="url(#${clipId})">${data.join('')}</g>`);
  // 坐标轴与刻度
  if (!ax.off) {
    const tl = Math.max(3, Math.min(pw, ph) * 0.012);
    let tk = '', lab = '';
    for (const t of xt.ticks) {
      const x = X(t.v); if (x < px - 0.5 || x > px + pw + 0.5) continue;
      tk += `M${x.toFixed(1)} ${py + ph}v${-tl}`; if (ax.box) tk += `M${x.toFixed(1)} ${py}v${tl}`;
      lab += texSvg(t.s, x - texW(t.s, FS) / 2, py + ph + FS + 5, FS, 'fill="var(--fig-axis)"');
    }
    for (const t of yt.ticks) {
      const y = Y(t.v); if (y < py - 0.5 || y > py + ph + 0.5) continue;
      tk += `M${px} ${y.toFixed(1)}h${tl}`; if (ax.box) tk += `M${px + pw} ${y.toFixed(1)}h${-tl}`;
      lab += texSvg(t.s, px - 6 - texW(t.s, FS), y + FS * 0.36, FS, 'fill="var(--fig-axis)"');
    }
    const frame = ax.box ? `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="none" stroke="var(--fig-axis)" stroke-width="0.8"/>` : `<path d="M${px} ${py}V${py + ph}H${px + pw}" fill="none" stroke="var(--fig-axis)" stroke-width="0.8"/>`;
    parts.push(frame, `<path d="${tk}" stroke="var(--fig-axis)" stroke-width="0.8"/>`, lab);
    if (yt.mult) parts.push(texSvg(`\\times10^{${yt.mult}}`, px, py - 5, FS, 'fill="var(--fig-axis)"'));
    if (xt.mult) parts.push(texSvg(`\\times10^{${xt.mult}}`, px + pw - texW(`x10^{${xt.mult}}`, FS), py + ph + FS * 2 + 10 + (xlLines.length ? LFS + 4 : 0), FS, 'fill="var(--fig-axis)"'));
    xlLines.forEach((ln, k) => parts.push(texSvg(ln, px + pw / 2 - texW(ln, LFS) / 2, py + ph + FS + 8 + (k + 1) * (LFS + 4) - 2, LFS, 'fill="var(--fig-fg)"')));
    ylLines.forEach((ln, k) => { const cx = cell.x + 10 + LFS * 0.8 + k * (LFS + 4), cy = py + ph / 2; parts.push(`<g transform="rotate(-90 ${cx.toFixed(1)} ${cy.toFixed(1)})">${texSvg(ln, cx - texW(ln, LFS) / 2, cy, LFS, 'fill="var(--fig-fg)"')}</g>`); });
  }
  titleLines.forEach((ln, k) => parts.push(texSvg(ln, px + pw / 2 - texW(ln, TFS) / 2, cell.y + 8 + (k + 1) * (TFS + 4) - 3, TFS, 'fill="var(--fig-fg)" font-weight="600"')));
  if (hasSub) parts.push(texSvg(ax.subtitle, px + pw / 2 - texW(ax.subtitle, LFS) / 2, cell.y + 8 + titleLines.length * (TFS + 4) + LFS + 2, LFS, 'fill="var(--fig-muted)"'));
  // 图例
  if (ax.legend && legendItems.length) {
    const labels = ax.legend.labels.slice(0, legendItems.length);
    const rowH = FS + 7, lwid = Math.max(...labels.map(l => texW(l, FS))) + 44, lh = labels.length * rowH + 8;
    const loc = ax.legend.loc || 'northeast';
    let lx0 = px + pw - lwid - 8, ly0 = py + 8;
    if (loc.includes('west')) lx0 = px + 8;
    if (loc.startsWith('south')) ly0 = py + ph - lh - 8;
    if (loc === 'north' || loc === 'south') lx0 = px + pw / 2 - lwid / 2;
    if (loc === 'east' || loc === 'west' || loc === 'eastoutside' || loc === 'westoutside') ly0 = py + ph / 2 - lh / 2;
    let lg = `<rect x="${lx0.toFixed(1)}" y="${ly0.toFixed(1)}" width="${lwid.toFixed(1)}" height="${lh}" fill="var(--ax-bg)" ${ax.legend.box ? 'stroke="var(--fig-axis)" stroke-width="0.6"' : ''}/>`;
    labels.forEach((lab, k) => {
      const it = legendItems[k], cy = ly0 + 4 + k * rowH + rowH / 2, x0 = lx0 + 6;
      if (it.kind === 'patch') lg += `<rect x="${x0 + 4}" y="${(cy - 5).toFixed(1)}" width="18" height="10" fill="${it.col}" fill-opacity="${it.s.alpha !== undefined ? it.s.alpha : 1}" stroke="var(--fig-fg)" stroke-width="0.5"/>`;
      else {
        if (it.s.ls !== 'none') lg += `<path d="M${x0} ${cy.toFixed(1)}h26" stroke="${it.col}" stroke-width="${it.lw}" ${it.s.ls && it.s.ls !== '-' ? `stroke-dasharray="${dashFor(it.s.ls, it.lw)}"` : ''}/>`;
        if (it.s.marker || it.s.type === 'stem') lg += markerSvg(it.s.marker || 'o', x0 + 13, cy, it.s.ms || 6, it.col, it.s.mfc === 'same' ? it.col : 'none', Math.max(1, it.lw * 0.85));
      }
      lg += texSvg(lab, x0 + 32, cy + FS * 0.36, FS, 'fill="var(--fig-fg)"');
    });
    parts.push(lg);
  }
  return parts.join('');
}
function renderFigure(fig, W) {
  W = Math.max(260, Math.min(W, 760));
  const hasSub = fig.axes.some(a => a.grid);
  const rowsN = hasSub ? Math.max(...fig.axes.filter(a => a.grid).map(a => a.grid.m)) : 1;
  const H = Math.round(W * (rowsN >= 3 ? 0.95 : rowsN === 2 ? 0.82 : 0.68));
  const top = fig.sgtitle ? 28 : 0;
  let body = '';
  if (fig.sgtitle) body += texSvg(fig.sgtitle, W / 2 - texW(fig.sgtitle, 14) / 2, 20, 14, 'fill="var(--fig-fg)" font-weight="600"');
  const list = fig.axes.length ? fig.axes : [];
  for (const ax of list) body += renderAxes(ax, axesRect(ax, fig, W, H, top), W);
  if (!list.length) body += `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-size="12" fill="var(--fig-muted)">空白图窗</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="图窗 ${fig.id}" font-family="var(--font-fig)" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="${H}" fill="var(--fig-bg)"/>${body}</svg>`;
}
function figTitle(fig) {
  const t = fig.sgtitle || (fig.axes.find(a => a.title) || {}).title || '';
  return texParts(t.split('\n')[0]).map(p => p.m === 1 ? `<sup>${esc(p.t)}</sup>` : p.m === -1 ? `<sub>${esc(p.t)}</sub>` : esc(p.t)).join('');
}
function mountFigure(host, fig) {
  const snap = typeof structuredClone === 'function' ? structuredClone(fig) : fig;
  const box = el('figure', 'mfig');
  const cap = el('figcaption', 'mfig-cap');
  const ft = figTitle(snap);
  cap.innerHTML = `<span class="mfig-id">Figure ${snap.id}</span>${ft ? `<span class="mfig-t">${ft}</span>` : ''}`;
  const canvas = el('div', 'mfig-svg');
  box.append(cap, canvas);
  host.append(box);
  let lastW = 0;
  const draw = () => { const w = Math.round(canvas.clientWidth || host.clientWidth || 560); if (w && Math.abs(w - lastW) > 4) { lastW = w; canvas.innerHTML = renderFigure(snap, w); } };
  draw();
  if (typeof ResizeObserver !== 'undefined') { const ro = new ResizeObserver(() => draw()); ro.observe(canvas); }
  return box;
}

// ---------- 输出区域 ----------
function renderItems(host, res, opts) {
  opts = opts || {};
  host.innerHTML = '';
  let pre = null;
  const items = res.items;
  for (const it of items) {
    if (it.kind === 'clc') { host.innerHTML = ''; pre = null; continue; }
    if (it.kind === 'text' || it.kind === 'stderr') {
      if (!pre) { pre = el('pre', 'out-text'); host.append(pre); }
      const span = el('span', it.kind === 'stderr' ? 'out-stderr' : '', it.text);
      pre.append(span);
      continue;
    }
    pre = null;
    if (it.kind === 'warn') { host.append(el('div', 'out-warn', it.text.trim())); continue; }
    if (it.kind === 'error') {
      const box = el('div', 'out-err');
      const head = el('div', 'out-err-msg');
      head.textContent = it.text;
      box.append(head);
      if (it.line && opts.showLine !== false) box.append(el('div', 'out-err-line', `出错位置：第 ${it.line} 行`));
      if (it.hint) { const h = el('div', 'out-err-hint'); h.innerHTML = '<b>怎么改</b>'; h.append(document.createTextNode(it.hint)); box.append(h); }
      host.append(box); continue;
    }
    if (it.kind === 'fig' && !opts.noFigures) mountFigure(host, it.fig);
  }
  if (!host.childNodes.length && opts.emptyNote) host.append(el('div', 'out-empty', opts.emptyNote));
}

// ---------- 代码单元 ----------
const allCells = [];
function makeEditor(initial, onRun) {
  const wrap = el('div', 'ed');
  const pre = el('pre', 'ed-hl'); pre.setAttribute('aria-hidden', 'true');
  const ta = el('textarea', 'ed-ta');
  ta.spellcheck = false; ta.autocapitalize = 'off'; ta.autocomplete = 'off'; ta.setAttribute('autocorrect', 'off');
  ta.value = initial;
  const sync = () => { pre.innerHTML = highlight(ta.value) + '\n'; };
  ta.addEventListener('input', sync);
  ta.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); onRun(); return; }
    if (e.key === 'Escape') { ta.blur(); return; }
    if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const s = ta.selectionStart, en = ta.selectionEnd, v = ta.value;
      if (e.shiftKey) {
        const ls = v.lastIndexOf('\n', s - 1) + 1;
        const m = /^ {1,4}/.exec(v.slice(ls));
        if (m) { ta.value = v.slice(0, ls) + v.slice(ls + m[0].length); ta.selectionStart = ta.selectionEnd = Math.max(ls, s - m[0].length); }
      } else { ta.value = v.slice(0, s) + '    ' + v.slice(en); ta.selectionStart = ta.selectionEnd = s + 4; }
      sync();
    }
  });
  sync();
  wrap.append(pre, ta);
  return { wrap, ta, sync };
}
let cellSeq = 0;
class Cell {
  constructor(root) {
    this.root = root;
    const src = root.querySelector('textarea');
    this.initial = (src ? src.value : '').replace(/^\n+/, '').replace(/\s+$/, '');
    this.isStatic = root.classList.contains('static');
    const refOut = root.querySelector('.ref-out');
    const label = root.dataset.label || '';
    root.innerHTML = '';
    const head = el('div', 'cell-head');
    const lab = el('span', 'cell-label', label);
    head.append(lab);
    this.id = 'cell-' + (++cellSeq);
    const ed = makeEditor(this.initial, () => this.run());
    ed.ta.id = this.id + '-code';
    ed.ta.setAttribute('aria-label', (label || '代码') + '（可编辑）');
    this.ta = ed.ta; this.sync = ed.sync;
    const tools = el('div', 'cell-tools');
    if (this.isStatic) {
      tools.append(el('span', 'badge badge-local', '需本地 MATLAB'));
    } else {
      const reset = el('button', 'btn btn-ghost btn-sm', '重置');
      reset.type = 'button'; reset.title = '恢复成原始代码';
      reset.addEventListener('click', () => { this.ta.value = this.initial; this.sync(); this.run(); });
      const run = el('button', 'btn btn-run btn-sm');
      run.type = 'button';
      run.innerHTML = '<svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M2 1.2v9.6L10.4 6z" fill="currentColor"/></svg>运行';
      run.title = '运行（Ctrl / ⌘ + Enter）';
      run.addEventListener('click', () => this.run());
      tools.append(reset, run);
    }
    head.append(tools);
    this.out = el('div', 'cell-out');
    this.out.setAttribute('aria-live', 'polite');
    root.append(head, ed.wrap, this.out);
    if (this.isStatic && refOut) {
      const box = el('div', 'ref-box');
      box.append(el('div', 'ref-cap', '参考结果'));
      refOut.classList.add('out-text');
      box.append(refOut);
      this.out.append(box);
    } else if (!this.isStatic) {
      this.out.append(el('div', 'out-empty', '按「运行」或 Ctrl / ⌘ + Enter 执行这段代码。'));
    }
    this.ran = false;
    allCells.push(this);
  }
  run() {
    if (this.isStatic) return;
    const sess = new ML.Session();
    const t0 = performance.now();
    const res = sess.run(this.ta.value, { freshFigures: true, timeLimit: 4000 });
    const ms = performance.now() - t0;
    renderItems(this.out, res, { emptyNote: '运行完成，没有输出。（语句末尾的分号 ; 会隐藏结果）' });
    this.root.classList.toggle('is-error', !!res.error);
    this.root.dataset.ms = ms.toFixed(0);
    this.ran = true;
    return { sess, res };
  }
}

// ---------- 自动运行：单元接近视口时依次执行 ----------
const runQueue = [];
let queueBusy = false;
function pumpQueue() {
  if (queueBusy) return;
  const c = runQueue.shift();
  if (!c) return;
  queueBusy = true;
  const go = () => { try { if (!c.ran) c.run(); } finally { queueBusy = false; pumpQueue(); } };
  if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 300 }); else setTimeout(go, 16);
}
function setupAutoRun() {
  const auto = allCells.filter(c => !c.isStatic && c.root.dataset.run !== 'manual');
  if (!('IntersectionObserver' in window)) { auto.forEach(c => runQueue.push(c)); pumpQueue(); return; }
  const io = new IntersectionObserver(ents => {
    for (const e of ents) if (e.isIntersecting) { const c = auto.find(x => x.root === e.target); if (c && !c.ran && !runQueue.includes(c)) runQueue.push(c); io.unobserve(e.target); }
    pumpQueue();
  }, { rootMargin: '700px 0px' });
  auto.forEach(c => io.observe(c.root));
}

// ---------- 命令行窗口 ----------
const con = { sess: new ML.Session(), hist: store.get('hist', []), hi: -1, open: false };
function setupConsole() {
  const panel = $('#console'), log = $('#cmd-log'), input = $('#cmd-input'), wsBody = $('#ws-body'), figHost = $('#cmd-fig');
  if (!panel) return;
  con.hi = con.hist.length;
  const hlPre = $('#cmd-hl');
  const syncIn = () => { hlPre.innerHTML = highlight(input.value) + '\n'; };
  input.addEventListener('input', syncIn);
  const echo = code => { const d = el('div', 'cmd-echo'); d.innerHTML = '<span class="prompt">&gt;&gt;</span> ' + highlight(code); log.append(d); };
  const updateWs = () => {
    wsBody.innerHTML = '';
    const ks = [...con.sess.vars.keys()].sort((a, b) => a.localeCompare(b));
    if (!ks.length) { const tr = el('tr'); const td = el('td', 'ws-empty', '工作区是空的。试试输入 x = 1:5'); td.colSpan = 3; tr.append(td); wsBody.append(tr); return; }
    for (const k of ks) {
      const v = con.sess.vars.get(k);
      const tr = el('tr');
      const r = v.k === 't' || v.k === 'c' ? v.r : 1, c = v.k === 't' || v.k === 'c' ? v.c : 1;
      let val;
      try { val = ML.shortRepr(v, 'short'); } catch (e) { val = '…'; }
      if (val.length > 28) val = `${r}×${c} ${ML.className(v)}`;
      tr.append(el('td', 'ws-name', k), el('td', 'ws-val', val), el('td', 'ws-cls', `${r}×${c} ${ML.className(v)}`));
      wsBody.append(tr);
    }
  };
  const showFig = fig => {
    figHost.innerHTML = '';
    if (!fig) { figHost.append(el('div', 'out-empty', '还没有图窗。输入 plot(1:10) 试试。')); return; }
    mountFigure(figHost, fig);
    panel.dataset.hasFig = '1';
  };
  con.exec = code => {
    if (!code.trim()) return;
    echo(code);
    con.hist = con.hist.filter(h => h !== code); con.hist.push(code);
    if (con.hist.length > 60) con.hist = con.hist.slice(-60);
    store.set('hist', con.hist); con.hi = con.hist.length;
    const res = con.sess.run(code, { timeLimit: 6000 });
    if (res.items.some(i => i.kind === 'clc')) { log.innerHTML = ''; }
    const outBox = el('div', 'cmd-out');
    renderItems(outBox, res, { noFigures: true, showLine: code.includes('\n') });
    if (outBox.childNodes.length) log.append(outBox);
    const figs = res.items.filter(i => i.kind === 'fig').map(i => i.fig);
    if (figs.length) { showFig(figs[figs.length - 1]); const n = el('div', 'cmd-note', `图窗 ${figs.map(f => f.id).join('、')} 已更新 →`); log.append(n); if (window.matchMedia('(max-width: 900px)').matches) setTab('fig'); }
    else if (!con.sess.figs.list.length) showFig(null);
    updateWs();
    log.scrollTop = log.scrollHeight;
  };
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const code = input.value; input.value = ''; syncIn(); con.exec(code); return; }
    if (e.key === 'ArrowUp' && !input.value.slice(0, input.selectionStart).includes('\n')) { if (con.hi > 0) { con.hi--; input.value = con.hist[con.hi]; syncIn(); e.preventDefault(); } return; }
    if (e.key === 'ArrowDown' && !input.value.slice(input.selectionEnd).includes('\n')) { if (con.hi < con.hist.length) { con.hi++; input.value = con.hist[con.hi] || ''; syncIn(); e.preventDefault(); } return; }
    if (e.key === 'Escape') { toggleConsole(false); }
  });
  const setTab = t => { panel.dataset.tab = t; if (t === 'cmd') setTimeout(() => { log.scrollTop = log.scrollHeight; }, 0); $$('.con-tab', panel).forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t))); };
  $$('.con-tab', panel).forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
  setTab('cmd');
  $('#con-clear').addEventListener('click', () => { con.sess.vars.clear(); con.sess.figs.closeAll(); log.innerHTML = ''; updateWs(); showFig(null); logIntro(); });
  $('#con-close').addEventListener('click', () => toggleConsole(false));
  $$('[data-open-console]').forEach(b => b.addEventListener('click', () => toggleConsole()));
  const logIntro = () => { log.append(el('div', 'cmd-intro', '这里像 MATLAB 的命令行窗口：输入一行代码按 Enter 执行，Shift + Enter 换行，↑ ↓ 翻历史命令。变量会一直保留在工作区里，画的图显示在图窗面板。')); };
  logIntro();
  updateWs(); showFig(null);
  syncIn();
  con.paste = code => { toggleConsole(true); input.value = code; syncIn(); input.focus(); input.selectionStart = input.selectionEnd = input.value.length; };
}
function toggleConsole(force) {
  const panel = $('#console');
  const open = force === undefined ? panel.hidden : force;
  panel.hidden = !open;
  document.body.classList.toggle('console-open', open);
  $$('[data-open-console]').forEach(b => b.setAttribute('aria-expanded', String(open)));
  if (open) setTimeout(() => $('#cmd-input').focus(), 30);
}
window.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === '`') { e.preventDefault(); toggleConsole(); } });

// ---------- 测验 ----------
function setupQuizzes() {
  const saved = store.get('quiz', {});
  $$('.quiz').forEach(box => {
    const key = box.dataset.quiz, qs = DATA.quiz[key];
    if (!qs) return;
    box.innerHTML = '';
    const head = el('div', 'quiz-head');
    head.append(el('h3', 'quiz-title', '小测验'), el('span', 'quiz-score'));
    box.append(head);
    const score = () => { const st = saved[key] || {}; const ok = qs.filter((q, i) => st[i] === q.a).length; $('.quiz-score', box).textContent = `${ok} / ${qs.length} 题答对`; box.classList.toggle('quiz-done', ok === qs.length); refreshProgress(); };
    qs.forEach((q, qi) => {
      const item = el('div', 'quiz-q');
      const qt = el('p', 'quiz-text'); qt.innerHTML = `<span class="quiz-n">${qi + 1}</span>${q.q}`;
      item.append(qt);
      if (q.code) { const pre = el('pre', 'quiz-code'); pre.innerHTML = highlight(q.code); item.append(pre); }
      const opts = el('div', 'quiz-opts'); opts.setAttribute('role', 'radiogroup');
      const fb = el('div', 'quiz-fb'); fb.setAttribute('aria-live', 'polite');
      const show = (choice) => {
        $$('.quiz-opt', opts).forEach((b, k) => {
          b.classList.toggle('is-picked', k === choice);
          b.classList.toggle('is-right', choice !== undefined && k === q.a && choice === q.a);
          b.classList.toggle('is-wrong', k === choice && choice !== q.a);
          b.setAttribute('aria-checked', String(k === choice));
        });
        if (choice === undefined) { fb.textContent = ''; fb.className = 'quiz-fb'; return; }
        fb.className = 'quiz-fb ' + (choice === q.a ? 'fb-ok' : 'fb-no');
        fb.innerHTML = `<b>${choice === q.a ? '答对了。' : '再想想。'}</b>${choice === q.a ? q.why : (q.hint || '提示：回到上面的示例里跑一跑。')}`;
      };
      q.o.forEach((o, k) => {
        const b = el('button', 'quiz-opt'); b.type = 'button'; b.setAttribute('role', 'radio');
        b.innerHTML = `<span class="quiz-key">${'ABCD'[k]}</span><span>${o}</span>`;
        b.addEventListener('click', () => { saved[key] = saved[key] || {}; saved[key][qi] = k; store.set('quiz', saved); show(k); score(); });
        opts.append(b);
      });
      item.append(opts, fb);
      box.append(item);
      const st = saved[key] || {};
      if (st[qi] !== undefined) show(st[qi]);
    });
    score();
  });
}

// ---------- 编程练习（自动判题） ----------
function setupChallenges() {
  const solved = store.get('solved', {});
  $$('.challenge').forEach(box => {
    const key = box.dataset.check, chk = DATA.checks[key];
    const task = box.querySelector('.task');
    const src = box.querySelector('textarea');
    const initial = src.value.replace(/^\n+/, '').replace(/\s+$/, '');
    const saved = store.get('draft:' + key, null);
    box.innerHTML = '';
    const head = el('div', 'ch-head');
    head.append(el('span', 'ch-tag', '编程练习'), el('span', 'ch-state', solved[key] ? '已通过' : '未完成'));
    box.append(head);
    if (task) box.append(task);
    const out = el('div', 'cell-out'); out.setAttribute('aria-live', 'polite');
    const result = el('div', 'ch-result'); result.setAttribute('aria-live', 'polite');
    const check = () => {
      const sess = new ML.Session();
      const res = sess.run(ed.ta.value, { freshFigures: true, timeLimit: 4000 });
      renderItems(out, res, {});
      store.set('draft:' + key, ed.ta.value);
      let verdict;
      if (res.error) verdict = { ok: false, msg: '代码报错了，先把上面的错误改掉。' };
      else { try { verdict = chk ? chk(sess, ML) : { ok: false, msg: '没有找到判题规则。' }; } catch (e) { verdict = { ok: false, msg: '判题时出错：' + e.message }; } }
      result.className = 'ch-result ' + (verdict.ok ? 'fb-ok' : 'fb-no');
      result.innerHTML = `<b>${verdict.ok ? '通过。' : '还差一点。'}</b>${esc(verdict.msg || '')}`;
      if (verdict.ok) { solved[key] = true; store.set('solved', solved); $('.ch-state', box).textContent = '已通过'; box.classList.add('ch-solved'); refreshProgress(); }
    };
    const ed = makeEditor(saved || initial, check);
    ed.ta.setAttribute('aria-label', '练习代码（可编辑）');
    ed.ta.id = 'chal-' + key;
    const bar = el('div', 'ch-bar');
    const reset = el('button', 'btn btn-ghost btn-sm', '恢复初始代码'); reset.type = 'button';
    reset.addEventListener('click', () => { ed.ta.value = initial; ed.sync(); out.innerHTML = ''; result.className = 'ch-result'; result.innerHTML = ''; });
    const go = el('button', 'btn btn-run btn-sm', '检查答案'); go.type = 'button';
    go.addEventListener('click', check);
    const hintTxt = box.dataset.hint;
    bar.append(reset);
    if (hintTxt) {
      const hb = el('button', 'btn btn-ghost btn-sm', '看提示'); hb.type = 'button';
      const hp = el('div', 'ch-hint', hintTxt); hp.hidden = true;
      hb.addEventListener('click', () => { hp.hidden = !hp.hidden; hb.textContent = hp.hidden ? '看提示' : '收起提示'; });
      bar.append(hb); box.append(ed.wrap, bar, hp, result, out);
    } else box.append(ed.wrap, bar, result, out);
    bar.append(go);
    if (solved[key]) box.classList.add('ch-solved');
  });
}

// ---------- 进度、目录 ----------
function chapterList() { return $$('section.chapter[data-ch]'); }
function refreshProgress() {
  const done = store.get('done', {});
  const chs = chapterList().filter(s => s.dataset.count !== 'no');
  const n = chs.filter(s => done[s.id]).length;
  const meter = $('#prog-meter');
  if (meter) { meter.style.setProperty('--p', (chs.length ? n / chs.length : 0).toFixed(3)); }
  const txt = $('#prog-text'); if (txt) txt.innerHTML = `<span class="pt-long">已学完 </span>${n} / ${chs.length}<span class="pt-long"> 章</span>`;
  $$('.toc a[data-target]').forEach(a => a.classList.toggle('is-done', !!done[a.dataset.target]));
  $$('.done-btn').forEach(b => {
    const on = !!done[b.dataset.ch];
    b.setAttribute('aria-pressed', String(on));
    b.querySelector('.done-label').textContent = on ? '本章已学完' : '标记本章为已学完';
  });
}
function setupProgress() {
  $$('.done-btn').forEach(b => b.addEventListener('click', () => {
    const done = store.get('done', {});
    done[b.dataset.ch] = !done[b.dataset.ch];
    store.set('done', done);
    refreshProgress();
  }));
  refreshProgress();
}
function setupToc() {
  const toc = $('#toc-list');
  chapterList().forEach(s => {
    const li = el('li');
    const a = el('a');
    a.href = '#' + s.id; a.dataset.target = s.id;
    a.innerHTML = `<span class="toc-n">${esc(s.dataset.num || '')}</span><span class="toc-t">${esc(s.dataset.title || '')}</span><span class="toc-check" aria-hidden="true"></span>`;
    a.addEventListener('click', () => document.body.classList.remove('toc-open'));
    li.append(a); toc.append(li);
  });
  const links = $$('a[data-target]', toc);
  const secs = chapterList();
  let ticking = false;
  const mark = () => {
    ticking = false;
    let cur = null;
    for (const sct of secs) { if (sct.getBoundingClientRect().top <= 140) cur = sct.id; else break; }
    links.forEach(a => a.classList.toggle('is-active', a.dataset.target === cur));
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(mark); } }, { passive: true });
  mark();
  $('#toc-btn').addEventListener('click', () => { const open = !document.body.classList.contains('toc-open'); document.body.classList.toggle('toc-open', open); $('#toc-btn').setAttribute('aria-expanded', String(open)); });
  $('#toc-scrim').addEventListener('click', () => { document.body.classList.remove('toc-open'); $('#toc-btn').setAttribute('aria-expanded', 'false'); });
}

// ---------- 函数速查 ----------
function setupReference() {
  const host = $('#ref-table-body'), q = $('#ref-q'), chips = $('#ref-chips'), cnt = $('#ref-count');
  if (!host) return;
  const docs = DATA.docs;
  const names = Object.keys(docs);
  const cats = [...new Set(names.map(n => docs[n].cat))];
  let cat = '全部';
  ['全部', ...cats].forEach(c => {
    const b = el('button', 'chip', c); b.type = 'button';
    b.setAttribute('aria-pressed', String(c === cat));
    b.addEventListener('click', () => { cat = c; $$('.chip', chips).forEach(x => x.setAttribute('aria-pressed', String(x.textContent === c))); draw(); });
    chips.append(b);
  });
  const draw = () => {
    const term = q.value.trim().toLowerCase();
    host.innerHTML = '';
    let n = 0;
    for (const nm of names) {
      const d = docs[nm];
      if (cat !== '全部' && d.cat !== cat) continue;
      if (term && !(nm.toLowerCase().includes(term) || d.desc.toLowerCase().includes(term) || (d.usage || '').toLowerCase().includes(term))) continue;
      n++;
      const tr = el('tr');
      const tdN = el('td', 'ref-name'); tdN.append(el('code', '', nm));
      const tdD = el('td', 'ref-desc'); tdD.append(el('div', '', d.desc)); if (d.usage) { const u = el('code', 'ref-usage', d.usage); tdD.append(u); }
      const tdE = el('td', 'ref-ex');
      if (d.example) {
        const b = el('button', 'btn btn-ghost btn-xs', '试一试'); b.type = 'button';
        b.title = '放进命令行窗口：' + d.example;
        b.addEventListener('click', () => con.paste(d.example));
        tdE.append(b);
      }
      tr.append(tdN, tdD, tdE);
      host.append(tr);
    }
    cnt.textContent = `${n} 个函数`;
    if (!n) { const tr = el('tr'); const td = el('td', 'ws-empty', '没有匹配的函数。换个关键词，比如「求和」或 sum。'); td.colSpan = 3; tr.append(td); host.append(tr); }
  };
  q.addEventListener('input', draw);
  draw();
}

// ---------- 其他 ----------
function setupTryButtons() {
  $$('[data-try]').forEach(b => b.addEventListener('click', () => con.paste(b.dataset.try.replace(/\\n/g, '\n'))));
}
function setupStats() {
  const nb = Object.keys(ML.B).filter(k => /^[a-z]/i.test(k)).length;
  const s1 = $('#stat-funcs'); if (s1) s1.textContent = String(nb);
  const s2 = $('#stat-cells'); if (s2) s2.textContent = String(allCells.filter(c => !c.isStatic).length);
}

function init() {
  $$('.cell').forEach(r => new Cell(r));
  setupConsole();
  setupToc();
  setupProgress();
  setupQuizzes();
  setupChallenges();
  setupReference();
  setupTryButtons();
  setupStats();
  // 首屏示例立即运行，其余按需
  allCells.filter(c => c.root.dataset.run === 'now').forEach(c => c.run());
  setupAutoRun();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
window.MLApp = { renderFigure, highlight, toggleConsole };
})();
