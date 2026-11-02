// ============================================================
//  内置函数库
// ============================================================

function def(names, fn) { names.split(/\s+/).forEach(n => { if (n) B[n] = fn; }); }
function need(args, n) { if (args.length < n) err('Not enough input arguments.', H.notEnough); }
function txtIs(v, s) { return v && isText(v) && textOf(v).toLowerCase() === s; }
function makeRng(seed) {
  let a = seed >>> 0;
  const f = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  f.spare = null;
  return f;
}
function randn1(sess) {
  const g = sess.rng;
  if (g.spare !== null) { const s = g.spare; g.spare = null; return s; }
  let u, v, s;
  do { u = g() * 2 - 1; v = g() * 2 - 1; s = u * u + v * v; } while (s >= 1 || s === 0);
  const m = Math.sqrt(-2 * Math.log(s) / s);
  g.spare = v * m; return u * m;
}
function dimsArgs(args, fname) {
  const a = args.filter(v => !isText(v));
  let r, c;
  if (a.length === 0) { r = 1; c = 1; }
  else if (a.length === 1) {
    const t = T_(a[0], fname);
    if (t.r * t.c === 1) r = c = t.re[0];
    else { r = t.re[0]; c = t.re[1]; }
  } else { r = sc(a[0], fname); c = sc(a[1], fname); if (a.length > 2 && sc(a[2]) !== 1) err('实验台只支持二维数组。'); }
  r = Math.max(0, Math.floor(r)); c = Math.max(0, Math.floor(c));
  if (r * c > 2e7) err('Requested array exceeds the maximum possible variable size.', '数组太大了，浏览器放不下。');
  return [r, c];
}
function filled(r, c, x, type) { const o = mk(r, c, type); if (x !== 0) o.re.fill(x); return o; }

// ---------- 常量与构造 ----------
def('pi', a => filled(...dimsArgs(a, 'pi'), Math.PI));
def('Inf inf', a => filled(...dimsArgs(a, 'Inf'), Infinity));
def('NaN nan', a => filled(...dimsArgs(a, 'NaN'), NaN));
def('eps', a => { if (a.length && !isText(a[0])) { const t = T_(a[0]); const o = sameMap(t, x => { const ax = Math.abs(x); if (!isFinite(ax)) return NaN; if (ax < 2.2250738585072014e-308) return 4.9406564584124654e-324; return Math.pow(2, Math.floor(Math.log2(ax)) - 52); }); return o; } return num(2.220446049250313e-16); });
def('realmax', () => num(Number.MAX_VALUE));
def('realmin', () => num(2.2250738585072014e-308));
def('intmax', () => num(2147483647));
def('flintmax', () => num(9007199254740992));
def('i j 1i 1j', () => cnum(0, 1));
def('true', a => filled(...dimsArgs(a, 'true'), 1, 'logical'));
def('false', a => filled(...dimsArgs(a, 'false'), 0, 'logical'));
def('zeros', a => filled(...dimsArgs(a, 'zeros'), 0));
def('ones', a => filled(...dimsArgs(a, 'ones'), 1));
def('eye', a => { const [r, c] = dimsArgs(a, 'eye'); const o = mk(r, c); for (let k = 0; k < Math.min(r, c); k++) o.re[k + k * r] = 1; return o; });
def('rand', (a, n, env) => { const [r, c] = dimsArgs(a, 'rand'); const o = mk(r, c); for (let k = 0; k < r * c; k++) o.re[k] = env.sess.rng(); return o; });
def('randn', (a, n, env) => { const [r, c] = dimsArgs(a, 'randn'); const o = mk(r, c); for (let k = 0; k < r * c; k++) o.re[k] = randn1(env.sess); return o; });
def('randi', (a, n, env) => {
  need(a, 1);
  const lim = T_(a[0], 'randi');
  const lo = lim.r * lim.c >= 2 ? lim.re[0] : 1, hi = lim.r * lim.c >= 2 ? lim.re[1] : lim.re[0];
  const [r, c] = dimsArgs(a.slice(1), 'randi');
  const o = mk(r, c);
  for (let k = 0; k < r * c; k++) o.re[k] = lo + Math.floor(env.sess.rng() * (hi - lo + 1));
  return o;
});
def('randperm', (a, n, env) => {
  need(a, 1);
  const N = sc(a[0]), K = a.length > 1 ? sc(a[1]) : N;
  const p = seq(N).map(x => x + 1);
  for (let i = N - 1; i > 0; i--) { const j = Math.floor(env.sess.rng() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  return rowv(p.slice(0, K));
});
def('rng', (a, n, env) => {
  if (!a.length || txtIs(a[0], 'default')) env.sess.rng = makeRng(0);
  else if (txtIs(a[0], 'shuffle')) env.sess.rng = makeRng(Date.now() >>> 0);
  else env.sess.rng = makeRng(Math.floor(isText(a[0]) ? Number(textOf(a[0])) : sc(a[0])) >>> 0);
});
def('magic', a => {
  need(a, 1);
  const n = Math.floor(sc(a[0]));
  if (n < 1) return emptyD();
  if (n === 2) return fromRows([[4, 3], [1, 2]]);
  const M = magicArr(n);
  const o = mk(n, n);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) o.re[i + j * n] = M[i][j];
  return o;
});
function magicArr(n) {
  const M = Array.from({ length: n }, () => new Array(n).fill(0));
  if (n % 2 === 1) {
    for (let I = 1; I <= n; I++) for (let J = 1; J <= n; J++) {
      const A = ((I + J - (n + 3) / 2) % n + n) % n, Bv = ((I + 2 * J - 2) % n + n) % n;
      M[I - 1][J - 1] = n * A + Bv + 1;
    }
  } else if (n % 4 === 0) {
    for (let I = 1; I <= n; I++) for (let J = 1; J <= n; J++) {
      const v = (I - 1) * n + J;
      const K = Math.floor((I % 4) / 2) === Math.floor((J % 4) / 2);
      M[I - 1][J - 1] = K ? n * n + 1 - v : v;
    }
  } else {
    const p = n / 2, Mp = magicArr(p);
    for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) {
      const v = Mp[i][j];
      M[i][j] = v; M[i][j + p] = v + 2 * p * p; M[i + p][j] = v + 3 * p * p; M[i + p][j + p] = v + p * p;
    }
    const k = (n - 2) / 4;
    const cols = []; for (let j = 1; j <= k; j++) cols.push(j); for (let j = n - k + 2; j <= n; j++) cols.push(j);
    for (let i = 1; i <= p; i++) for (const j of cols) { const t = M[i - 1][j - 1]; M[i - 1][j - 1] = M[i + p - 1][j - 1]; M[i + p - 1][j - 1] = t; }
    for (const j of [1, k + 1]) { const i = k + 1; const t = M[i - 1][j - 1]; M[i - 1][j - 1] = M[i + p - 1][j - 1]; M[i + p - 1][j - 1] = t; }
  }
  return M;
}
def('linspace', a => {
  need(a, 2);
  const x1 = sc(a[0]), x2 = sc(a[1]), n = a.length > 2 ? Math.floor(sc(a[2])) : 100;
  if (n < 1) return mk(1, 0);
  const o = mk(1, n);
  for (let k = 0; k < n; k++) o.re[k] = n === 1 ? x2 : x1 + k * (x2 - x1) / (n - 1);
  if (n > 1) o.re[n - 1] = x2;
  return o;
});
def('logspace', a => {
  need(a, 2);
  const x1 = sc(a[0]), x2 = sc(a[1]), n = a.length > 2 ? Math.floor(sc(a[2])) : 50;
  const o = mk(1, n);
  for (let k = 0; k < n; k++) o.re[k] = Math.pow(10, n === 1 ? x2 : x1 + k * (x2 - x1) / (n - 1));
  return o;
});
def('colon', a => makeRange(a[0], a.length > 2 ? a[1] : null, a[a.length - 1]));
def('repmat', a => {
  need(a, 2);
  let m, n;
  const t1 = T_(a[1]);
  if (a.length > 2) { m = sc(a[1]); n = sc(a[2]); } else if (t1.r * t1.c >= 2) { m = t1.re[0]; n = t1.re[1]; } else m = n = t1.re[0];
  const v = a[0];
  if (v.k === 'c' || v.k === 't') {
    const rows = []; for (let i = 0; i < m; i++) { const r = []; for (let j = 0; j < n; j++) r.push(v); rows.push(r); }
    if (m * n === 0) return v.k === 'c' ? { k: 'c', r: v.r * m, c: v.c * n, d: [] } : mk(v.r * m, v.c * n, v.type);
    return vcat(rows.map(hcat));
  }
  err('repmat 只支持数组和元胞数组。');
});
def('reshape', a => {
  need(a, 2);
  const v = a[0], N = nel(v);
  let dims;
  if (a.length === 2) dims = toArr(a[1]);
  else dims = a.slice(1).map(x => (x.k === 't' && x.r * x.c === 0) ? null : sc(x));
  if (dims.length > 2) { if (dims.slice(2).some(x => x !== 1 && x !== null)) err('实验台只支持二维数组。'); dims = dims.slice(0, 2); }
  if (dims.length === 1) dims.push(1);
  const ni = dims.indexOf(null);
  if (ni >= 0) { const other = dims[1 - ni]; if (N % other) err(`Product of known dimensions, ${other}, not divisible into total number of elements, ${N}.`); dims[ni] = N / other; }
  if (dims[0] * dims[1] !== N) err('Number of elements must not change. Use [] as one of the size inputs to automatically calculate the appropriate size for that dimension.', `reshape 前后元素总数必须相同：原来有 ${N} 个元素，而 ${dims[0]}×${dims[1]} = ${dims[0] * dims[1]}。`);
  if (v.k === 'c') return { k: 'c', r: dims[0], c: dims[1], d: v.d.slice() };
  const o = copyT(T_(v, 'reshape')); o.r = dims[0]; o.c = dims[1]; return o;
});
def('diag', a => {
  need(a, 1);
  const t = T_(a[0], 'diag'), k = a.length > 1 ? sc(a[1]) : 0;
  if (t.r === 1 || t.c === 1) {
    const n = t.r * t.c, m = n + Math.abs(k), o = mk(m, m, 'double', !!t.im);
    for (let i = 0; i < n; i++) { const r = k >= 0 ? i : i - k, c = k >= 0 ? i + k : i; o.re[r + c * m] = t.re[i]; if (t.im) o.im[r + c * m] = t.im[i]; }
    return o;
  }
  const out = [];
  for (let i = 0; i < t.r; i++) { const j = i + k; if (j >= 0 && j < t.c) out.push(t.re[i + j * t.r]); }
  return colv(out);
});
def('meshgrid', a => {
  need(a, 1);
  const x = toArr(a[0]), y = a.length > 1 ? toArr(a[1]) : x;
  const X = mk(y.length, x.length), Y = mk(y.length, x.length);
  for (let i = 0; i < y.length; i++) for (let j = 0; j < x.length; j++) { X.re[i + j * y.length] = x[j]; Y.re[i + j * y.length] = y[i]; }
  return [X, Y];
});
def('fliplr', a => { const t = a[0]; return parenGet(t, [COLON, makeRange(num(t.c), num(-1), num(1))]); });
def('flipud', a => { const t = a[0]; return parenGet(t, [makeRange(num(t.r), num(-1), num(1)), COLON]); });
def('flip', a => { const t = a[0]; const d = a.length > 1 ? sc(a[1]) : (t.r !== 1 ? 1 : 2); return d === 1 ? B.flipud([t]) : B.fliplr([t]); });
def('rot90', a => { const t = a[0]; const k = (((a.length > 1 ? sc(a[1]) : 1) % 4) + 4) % 4; let r = t; for (let i = 0; i < k; i++) r = B.flipud([transpose(r, false)]); return r; });
def('circshift', a => {
  need(a, 2);
  const t = a[0], k = Math.round(sc(a[1]));
  const dim = a.length > 2 ? sc(a[2]) : (t.r !== 1 ? 1 : 2);
  const L = dim === 1 ? t.r : t.c;
  const idx = seq(L).map(i => ((i - k) % L + L) % L + 1);
  return dim === 1 ? parenGet(t, [rowv(idx), COLON]) : parenGet(t, [COLON, rowv(idx)]);
});
def('horzcat', a => buildMatrix([a]));
def('vertcat', a => buildMatrix(a.map(x => [x])));
def('cat', a => { const d = sc(a[0]); return d === 1 ? buildMatrix(a.slice(1).map(x => [x])) : buildMatrix([a.slice(1)]); });
def('kron', a => {
  const A = T_(a[0]), Bm = T_(a[1]);
  const o = mk(A.r * Bm.r, A.c * Bm.c);
  for (let i = 0; i < A.r; i++) for (let j = 0; j < A.c; j++) for (let p = 0; p < Bm.r; p++) for (let q = 0; q < Bm.c; q++)
    o.re[(i * Bm.r + p) + (j * Bm.c + q) * o.r] = A.re[i + j * A.r] * Bm.re[p + q * Bm.r];
  return o;
});
def('triu tril', (a, n, env, name) => {
  const t = T_(a[0]), k = a.length > 1 ? sc(a[1]) : 0, o = copyT(t);
  for (let i = 0; i < t.r; i++) for (let j = 0; j < t.c; j++) {
    const keep = name === 'triu' ? j - i >= k : j - i <= k;
    if (!keep) { o.re[i + j * t.r] = 0; if (o.im) o.im[i + j * t.r] = 0; }
  }
  return o;
});

// ---------- 尺寸与类型 ----------
def('size', (a, nargout) => {
  need(a, 1);
  const v = a[0], r = v.k === 't' || v.k === 'c' ? v.r : 1, c = v.k === 't' || v.k === 'c' ? v.c : 1;
  if (a.length > 1) { const d = sc(a[1]); return num(d === 1 ? r : d === 2 ? c : 1); }
  if (nargout <= 1) return rowv([r, c]);
  const out = [num(r), num(c)];
  for (let k = 2; k < nargout; k++) out.push(num(1));
  return out;
});
def('length', a => { need(a, 1); const v = a[0]; if (v.k !== 't' && v.k !== 'c') return num(1); return num(v.r * v.c === 0 ? 0 : Math.max(v.r, v.c)); });
def('numel', a => { need(a, 1); return num(nel(a[0])); });
def('ndims', () => num(2));
def('isempty', a => { need(a, 1); const v = a[0]; return lgc(v.k === 's' ? false : (v.k === 't' || v.k === 'c') && v.r * v.c === 0); });
def('isscalar', a => lgc(nel(a[0]) === 1));
def('isvector', a => { const v = a[0]; return lgc((v.k === 't' || v.k === 'c') && (v.r === 1 || v.c === 1) && v.r * v.c >= 1); });
def('isrow', a => lgc(a[0].r === 1 || a[0].k === 's'));
def('iscolumn', a => lgc(a[0].c === 1 || a[0].k === 's'));
def('ismatrix', () => lgc(true));
def('issquare', a => lgc(a[0].r === a[0].c));
def('class', a => { need(a, 1); return chr(className(a[0])); });
def('isnumeric', a => lgc(a[0].k === 't' && a[0].type === 'double'));
def('isfloat', a => lgc(a[0].k === 't' && a[0].type === 'double'));
def('ischar', a => lgc(a[0].k === 't' && a[0].type === 'char'));
def('isstring', a => lgc(a[0].k === 's'));
def('islogical', a => lgc(a[0].k === 't' && a[0].type === 'logical'));
def('iscell', a => lgc(a[0].k === 'c'));
def('isstruct', a => lgc(a[0].k === 'st'));
def('isreal', a => lgc(!(a[0].k === 't' && a[0].im)));
def('is_function_handle', a => lgc(a[0].k === 'f'));
def('isa', a => { const c = textOf(a[1]); const v = a[0]; return lgc(className(v) === c || (c === 'numeric' && v.k === 't' && v.type === 'double') || (c === 'float' && v.k === 't' && v.type === 'double')); });
def('isfield', a => { const s = a[0]; if (s.k !== 'st') return lgc(false); if (a[1].k === 'c') return rowv(a[1].d.map(x => s.f.has(textOf(x)) ? 1 : 0), 'logical'); return lgc(s.f.has(textOf(a[1]))); });
def('double', a => { need(a, 1); const v = a[0]; if (v.k === 's') { const x = Number(v.v); return num(v.v.trim() === '' || isNaN(x) ? NaN : x); } return copyT(T_(v, 'double'), 'double'); });
def('logical', a => { const t = T_(a[0], 'logical'); const o = mk(t.r, t.c, 'logical'); for (let i = 0; i < o.re.length; i++) { if (t.re[i] !== t.re[i]) err("NaN's cannot be converted to logicals."); o.re[i] = t.re[i] !== 0 ? 1 : 0; } return o; });
def('int8 int16 int32 int64 uint8 uint16 uint32 uint64 single', (a, n, env, name) => {
  const t = T_(a[0], name); const lim = { int8: [-128, 127], uint8: [0, 255], int16: [-32768, 32767], uint16: [0, 65535], int32: [-2147483648, 2147483647], uint32: [0, 4294967295], int64: [-9.2e18, 9.2e18], uint64: [0, 1.8e19] }[name];
  if (!lim) return copyT(t, 'double');
  if (!env.sess.warnedInt) { env.sess.warn(`实验台没有整数类型，${name} 只做了取整和截断，结果仍按 double 存储。`); env.sess.warnedInt = true; }
  return sameMap(t, x => Math.min(lim[1], Math.max(lim[0], roundHalfAway(x))));
});

// ---------- 逐元素数学函数 ----------
function sameMap(t, f, type) { const o = mk(t.r, t.c, type || 'double'); for (let i = 0; i < o.re.length; i++) o.re[i] = f(t.re[i]); return o; }
function ewMath(names, fr, fc, needsC) {
  def(names, (a, n, env, name) => {
    need(a, 1);
    const t = T_(a[0], name);
    let cx = !!t.im;
    if (!cx && needsC) { for (let i = 0; i < t.re.length; i++) if (needsC(t.re[i])) { cx = true; break; } }
    if (cx) {
      if (!fc) err(`实验台中的 ${name} 不支持复数输入。`, H.complex);
      const o = mk(t.r, t.c, 'double', true);
      for (let i = 0; i < o.re.length; i++) { const z = fc(t.re[i], t.im ? t.im[i] : 0); o.re[i] = z[0]; o.im[i] = z[1]; }
      return dropIm(o);
    }
    return sameMap(t, fr);
  });
}
const cexp = (a, b) => { const m = Math.exp(a); return [m * Math.cos(b), m * Math.sin(b)]; };
const clog = (a, b) => [Math.log(Math.hypot(a, b)), Math.atan2(b, a)];
const csqrt = (a, b) => { const r = Math.hypot(a, b); const re = Math.sqrt((r + a) / 2), im = Math.sqrt((r - a) / 2); return [re, b < 0 ? -im : im]; };
ewMath('sin', Math.sin, (a, b) => [Math.sin(a) * Math.cosh(b), Math.cos(a) * Math.sinh(b)]);
ewMath('cos', Math.cos, (a, b) => [Math.cos(a) * Math.cosh(b), -Math.sin(a) * Math.sinh(b)]);
ewMath('tan', Math.tan);
ewMath('asin', Math.asin);
ewMath('acos', Math.acos);
ewMath('atan', Math.atan);
ewMath('sinh', Math.sinh); ewMath('cosh', Math.cosh); ewMath('tanh', Math.tanh);
ewMath('asinh', Math.asinh); ewMath('acosh', Math.acosh); ewMath('atanh', Math.atanh);
ewMath('sec', x => 1 / Math.cos(x)); ewMath('csc', x => 1 / Math.sin(x)); ewMath('cot', x => 1 / Math.tan(x));
ewMath('sind', x => { const r = ((x % 360) + 360) % 360; if (r === 0 || r === 180) return 0; return Math.sin(x * Math.PI / 180); });
ewMath('cosd', x => { const r = ((x % 360) + 360) % 360; if (r === 90 || r === 270) return 0; return Math.cos(x * Math.PI / 180); });
ewMath('tand', x => Math.tan(x * Math.PI / 180));
ewMath('asind', x => Math.asin(x) * 180 / Math.PI); ewMath('acosd', x => Math.acos(x) * 180 / Math.PI); ewMath('atand', x => Math.atan(x) * 180 / Math.PI);
ewMath('exp', Math.exp, cexp);
ewMath('log', Math.log, clog, x => x < 0);
ewMath('log10', Math.log10, (a, b) => { const z = clog(a, b); return [z[0] / Math.LN10, z[1] / Math.LN10]; }, x => x < 0);
ewMath('log2', Math.log2);
ewMath('log1p', Math.log1p); ewMath('expm1', Math.expm1);
ewMath('sqrt', Math.sqrt, csqrt, x => x < 0);
ewMath('nthroot', Math.cbrt);
function roundHalfAway(x) { return x < 0 ? -Math.round(-x) : Math.round(x); }
ewMath('floor', Math.floor, (a, b) => [Math.floor(a), Math.floor(b)]);
ewMath('ceil', Math.ceil, (a, b) => [Math.ceil(a), Math.ceil(b)]);
ewMath('fix', Math.trunc, (a, b) => [Math.trunc(a), Math.trunc(b)]);
ewMath('sign', x => x > 0 ? 1 : x < 0 ? -1 : x === 0 ? 0 : NaN);
ewMath('gamma', gammaFn);
ewMath('deg2rad', x => x * Math.PI / 180); ewMath('rad2deg', x => x * 180 / Math.PI);
ewMath('mag2db', x => 20 * Math.log10(x)); ewMath('db2mag', x => Math.pow(10, x / 20));
ewMath('erf', erf); ewMath('erfc', x => 1 - erf(x));
ewMath('sinc', x => x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x));
ewMath('heaviside', x => x > 0 ? 1 : x < 0 ? 0 : x === 0 ? 0.5 : NaN);
ewMath('dirac', x => x === 0 ? Infinity : 0);
def('nthroot', a => { const t = T_(a[0]), nn = sc(a[1]); return sameMap(t, x => (x < 0 && nn % 2 === 1) ? -Math.pow(-x, 1 / nn) : Math.pow(x, 1 / nn)); });
def('round', a => {
  need(a, 1);
  const t = T_(a[0], 'round'), d = a.length > 1 ? sc(a[1]) : 0, f = Math.pow(10, d);
  const r = x => d === 0 ? roundHalfAway(x) : roundHalfAway(x * f) / f;
  if (t.im) { const o = mk(t.r, t.c, 'double', true); for (let i = 0; i < o.re.length; i++) { o.re[i] = r(t.re[i]); o.im[i] = r(t.im[i]); } return dropIm(o); }
  return sameMap(t, r);
});
def('abs', a => {
  need(a, 1); const t = T_(a[0], 'abs');
  const o = mk(t.r, t.c);
  for (let i = 0; i < o.re.length; i++) o.re[i] = t.im ? Math.hypot(t.re[i], t.im[i]) : Math.abs(t.re[i]);
  return o;
});
def('angle', a => { const t = T_(a[0], 'angle'); const o = mk(t.r, t.c); for (let i = 0; i < o.re.length; i++) o.re[i] = Math.atan2(t.im ? t.im[i] : 0, t.re[i]); return o; });
def('real', a => { const t = T_(a[0], 'real'); const o = mk(t.r, t.c); o.re.set(t.re); return o; });
def('imag', a => { const t = T_(a[0], 'imag'); const o = mk(t.r, t.c); if (t.im) o.re.set(t.im); return o; });
def('conj', a => { const t = T_(a[0], 'conj'); const o = copyT(t, 'double'); if (o.im) for (let i = 0; i < o.im.length; i++) o.im[i] = -o.im[i]; return o; });
def('complex', a => { const re = T_(a[0]), im = a.length > 1 ? T_(a[1]) : num(0); const o = ewiseC(re, im, (x, xi, y) => [x, y]); if (!o.im) o.im = new Float64Array(o.re.length); return o; });
def('isnan', a => sameMap(T_(a[0], 'isnan'), x => x !== x ? 1 : 0, 'logical'));
def('isinf', a => sameMap(T_(a[0], 'isinf'), x => x === Infinity || x === -Infinity ? 1 : 0, 'logical'));
def('isfinite', a => sameMap(T_(a[0], 'isfinite'), x => isFinite(x) ? 1 : 0, 'logical'));
def('mod', a => { need(a, 2); return ewise(T_(a[0], 'mod'), T_(a[1], 'mod'), (x, m) => { if (m === 0) return x; const r = x - Math.floor(x / m) * m; return Math.abs(r - m) < 1e-14 * Math.abs(m) ? 0 : r; }); });
def('rem', a => { need(a, 2); return ewise(T_(a[0], 'rem'), T_(a[1], 'rem'), (x, y) => y === 0 ? NaN : x - Math.trunc(x / y) * y); });
def('atan2', a => { need(a, 2); return ewise(T_(a[0]), T_(a[1]), Math.atan2); });
def('hypot', a => { need(a, 2); return ewise(T_(a[0]), T_(a[1]), Math.hypot); });
def('power', a => { need(a, 2); return binop('.^', a[0], a[1]); });
def('plus', a => binop('+', a[0], a[1])); def('minus', a => binop('-', a[0], a[1]));
def('times', a => binop('.*', a[0], a[1])); def('rdivide', a => binop('./', a[0], a[1]));
def('mtimes', a => binop('*', a[0], a[1])); def('mrdivide', a => binop('/', a[0], a[1])); def('mldivide', a => binop('\\', a[0], a[1]));
def('mpower', a => binop('^', a[0], a[1]));
def('eq', a => binop('==', a[0], a[1])); def('ne', a => binop('~=', a[0], a[1]));
def('lt', a => binop('<', a[0], a[1])); def('gt', a => binop('>', a[0], a[1]));
def('le', a => binop('<=', a[0], a[1])); def('ge', a => binop('>=', a[0], a[1]));
def('and', a => binop('&', a[0], a[1])); def('or', a => binop('|', a[0], a[1]));
def('not', a => opNot(a[0]));
def('xor', a => ewise(T_(a[0]), T_(a[1]), (x, y) => ((x !== 0) !== (y !== 0)) ? 1 : 0, 'logical'));
def('uminus', a => neg(a[0]));
def('transpose', a => transpose(a[0], false)); def('ctranspose', a => transpose(a[0], true));
def('gcd', a => ewise(T_(a[0]), T_(a[1]), (x, y) => { x = Math.abs(x); y = Math.abs(y); while (y) [x, y] = [y, x % y]; return x; }));
def('lcm', a => ewise(T_(a[0]), T_(a[1]), (x, y) => { x = Math.abs(x); y = Math.abs(y); if (!x || !y) return 0; let g = x, h = y; while (h) [g, h] = [h, g % h]; return x / g * y; }));
def('factorial', a => sameMap(T_(a[0], 'factorial'), x => { if (x < 0 || x !== Math.floor(x)) err('N must be an array of real non-negative integers.'); if (x > 170) return Infinity; let r = 1; for (let k = 2; k <= x; k++) r *= k; return r; }));
def('nchoosek', a => {
  need(a, 2);
  const v = T_(a[0]), k = sc(a[1]);
  if (v.r * v.c === 1) { const n = v.re[0]; let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return num(Math.round(r)); }
  const items = Array.from(v.re), combos = [];
  const rec = (start, cur) => { if (cur.length === k) { combos.push(cur.slice()); return; } for (let i = start; i < items.length; i++) { cur.push(items[i]); rec(i + 1, cur); cur.pop(); } };
  rec(0, []);
  if (combos.length > 1e5) err('组合数太多了。');
  return combos.length ? fromRows(combos) : mk(0, k);
});
def('primes', a => { const n = Math.floor(sc(a[0])); const s = new Uint8Array(n + 1), out = []; for (let i = 2; i <= n; i++) { if (!s[i]) { out.push(i); for (let j = i * i; j <= n; j += i) s[j] = 1; } } return rowv(out); });
def('isprime', a => sameMap(T_(a[0]), x => { if (x < 2 || x !== Math.floor(x)) return 0; for (let d = 2; d * d <= x; d++) if (x % d === 0) return 0; return 1; }, 'logical'));
def('factor', a => { let n = sc(a[0]); const out = []; for (let d = 2; d * d <= n; d++) while (n % d === 0) { out.push(d); n /= d; } if (n > 1) out.push(n); return rowv(out); });
function gammaFn(x) {
  if (x === Math.floor(x)) { if (x <= 0) return Infinity; if (x < 171) { let r = 1; for (let k = 2; k < x; k++) r *= k; return r; } return Infinity; }
  if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gammaFn(1 - x));
  x -= 1;
  const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  let s = c[0]; for (let i = 1; i < g + 2; i++) s += c[i] / (x + i);
  const t = x + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, x + 0.5) * Math.exp(-t) * s;
}
function erf(x) {
  // Abramowitz–Stegun 7.1.26 精度不够，这里用级数/连分式组合
  const ax = Math.abs(x);
  if (ax < 2.5) { let s = 0, term = ax, k = 0; while (Math.abs(term) > 1e-17 * Math.abs(s) || k < 3) { s += term / (2 * k + 1); k++; term *= -ax * ax / k; if (k > 200) break; } return Math.sign(x) * 2 / Math.sqrt(Math.PI) * s; }
  if (ax > 6) return Math.sign(x);
  // erfc 连分式
  let f = 0; for (let k = 60; k >= 1; k--) f = k / 2 / (ax + f);
  const erfc = Math.exp(-ax * ax) / Math.sqrt(Math.PI) / (ax + f);
  return Math.sign(x) * (1 - erfc);
}

// ---------- 归约与统计 ----------
function defaultDim(t) { return t.r !== 1 ? 1 : 2; }
function dimArg(t, d) { if (d === undefined) return defaultDim(t); if (isText(d)) { if (textOf(d) === 'all') return 'all'; return defaultDim(t); } return sc(d); }
function reduceT(t, dim, f, type) {
  if (dim === 'all') return num(f(Array.from(t.re)));
  if (t.r === 0 && t.c === 0) return num(f([]));
  if (dim === 1) {
    const o = mk(1, t.c, type);
    for (let j = 0; j < t.c; j++) { const a = new Array(t.r); for (let i = 0; i < t.r; i++) a[i] = t.re[i + j * t.r]; o.re[j] = f(a); }
    return o;
  }
  if (dim === 2) {
    const o = mk(t.r, 1, type);
    for (let i = 0; i < t.r; i++) { const a = new Array(t.c); for (let j = 0; j < t.c; j++) a[j] = t.re[i + j * t.r]; o.re[i] = f(a); }
    return o;
  }
  return sameMap(t, x => f([x]), type);
}
function reduceC(t, dim, f) {
  const re = reduceT({ ...t, im: null }, dim, f);
  if (!t.im) return re;
  const im = reduceT({ ...t, re: t.im, im: null }, dim, f);
  const o = mk(re.r, re.c, 'double', true); o.re.set(re.re); o.im.set(im.re); return dropIm(o);
}
const sumA = a => { let s = 0; for (const x of a) s += x; return s; };
function defReduce(names, f, cplx) {
  def(names, (a, n, env, name) => {
    need(a, 1);
    const t = T_(a[0], name);
    const dim = dimArg(t, a.find((x, i) => i > 0 && !(isText(x) && textOf(x) !== 'all')));
    if (a.some((x, i) => i > 0 && txtIs(x, 'omitnan'))) {
      const g = f; return reduceT(t, dim, arr => g(arr.filter(v => v === v)));
    }
    return cplx ? reduceC(t, dim, f) : reduceT(t, dim, f);
  });
}
defReduce('sum', sumA, true);
defReduce('prod', a => a.reduce((p, x) => p * x, 1));
defReduce('mean', a => a.length ? sumA(a) / a.length : NaN, true);
defReduce('median', a => { if (!a.length) return NaN; if (a.some(x => x !== x)) return NaN; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; });
defReduce('mode', a => { if (!a.length) return NaN; const cnt = new Map(); for (const x of a) cnt.set(x, (cnt.get(x) || 0) + 1); let best = NaN, bc = 0; for (const [k, v] of cnt) if (v > bc || (v === bc && k < best)) { best = k; bc = v; } return best; });
defReduce('range', a => Math.max(...a) - Math.min(...a));
defReduce('rms', a => Math.sqrt(sumA(a.map(x => x * x)) / a.length));
def('any', a => { const t = T_(a[0], 'any'); const dim = a.length > 1 ? dimArg(t, a[1]) : (t.r === 1 || t.c === 1 ? 'all' : 1); return reduceT(t, dim, arr => arr.some(x => x !== 0 && x === x) ? 1 : 0, 'logical'); });
def('all', a => { const t = T_(a[0], 'all'); const dim = a.length > 1 ? dimArg(t, a[1]) : (t.r === 1 || t.c === 1 ? 'all' : 1); return reduceT(t, dim, arr => arr.every(x => x !== 0) ? 1 : 0, 'logical'); });
function varA(a, w) { const n = a.length; if (n === 0) return NaN; if (n === 1) return 0; const m = sumA(a) / n; let s = 0; for (const x of a) s += (x - m) * (x - m); return s / (w === 1 ? n : n - 1); }
def('var std', (a, n, env, name) => {
  need(a, 1);
  const t = T_(a[0], name);
  const w = a.length > 1 && nel(a[1]) ? sc(a[1]) : 0;
  const dim = a.length > 2 ? dimArg(t, a[2]) : defaultDim(t);
  return reduceT(t, dim, arr => name === 'var' ? varA(arr, w) : Math.sqrt(varA(arr, w)));
});
def('cumsum cumprod', (a, n, env, name) => {
  const t = T_(a[0], name), dim = a.length > 1 ? sc(a[1]) : defaultDim(t), o = copyT(t, 'double');
  const isSum = name === 'cumsum';
  if (dim === 1) for (let j = 0; j < t.c; j++) for (let i = 1; i < t.r; i++) o.re[i + j * t.r] = isSum ? o.re[i + j * t.r] + o.re[i - 1 + j * t.r] : o.re[i + j * t.r] * o.re[i - 1 + j * t.r];
  else for (let i = 0; i < t.r; i++) for (let j = 1; j < t.c; j++) o.re[i + j * t.r] = isSum ? o.re[i + j * t.r] + o.re[i + (j - 1) * t.r] : o.re[i + j * t.r] * o.re[i + (j - 1) * t.r];
  return o;
});
def('cummax cummin', (a, n, env, name) => {
  const t = T_(a[0], name), o = copyT(t, 'double'), f = name === 'cummax' ? Math.max : Math.min;
  if (defaultDim(t) === 1) { for (let j = 0; j < t.c; j++) for (let i = 1; i < t.r; i++) o.re[i + j * t.r] = f(o.re[i + j * t.r], o.re[i - 1 + j * t.r]); }
  else for (let j = 1; j < t.c; j++) o.re[j] = f(o.re[j], o.re[j - 1]);
  return o;
});
def('diff', a => {
  need(a, 1);
  let t = T_(a[0], 'diff');
  const order = a.length > 1 ? sc(a[1]) : 1;
  for (let k = 0; k < order; k++) {
    if (t.r === 1 || t.c === 1) {
      const n = t.r * t.c, out = [];
      for (let i = 1; i < n; i++) out.push(t.re[i] - t.re[i - 1]);
      t = t.r === 1 ? rowv(out) : colv(out);
    } else {
      const o = mk(t.r - 1, t.c);
      for (let j = 0; j < t.c; j++) for (let i = 0; i < t.r - 1; i++) o.re[i + j * (t.r - 1)] = t.re[i + 1 + j * t.r] - t.re[i + j * t.r];
      t = o;
    }
  }
  return t;
});
function maxmin(a, nargout, isMax, name) {
  need(a, 1);
  if (a.length >= 2 && nel(a[1]) > 0) {
    const f = isMax ? Math.max : Math.min;
    return ewise(T_(a[0], name), T_(a[1], name), (x, y) => x !== x ? y : y !== y ? x : f(x, y));
  }
  const t = T_(a[0], name);
  if (t.r * t.c === 0) return [emptyD(), emptyD()];
  const dim = a.length >= 3 ? dimArg(t, a[2]) : defaultDim(t);
  const key = t.im ? (i => Math.hypot(t.re[i], t.im[i])) : (i => t.re[i]);
  const better = (x, y) => isMax ? x > y : x < y;
  const pick = idxs => { let best = -1; for (const i of idxs) { const v = key(i); if (v !== v) continue; if (best < 0 || better(v, key(best))) best = i; } return best < 0 ? idxs[0] : best; };
  let groups, R, C;
  if (dim === 'all') { groups = [seq(t.r * t.c)]; R = C = 1; }
  else if (dim === 1) { groups = seq(t.c).map(j => seq(t.r).map(i => i + j * t.r)); R = 1; C = t.c; }
  else { groups = seq(t.r).map(i => seq(t.c).map(j => i + j * t.r)); R = t.r; C = 1; }
  const vals = mk(R, C, t.type === 'logical' ? 'logical' : 'double', !!t.im), idx = mk(R, C);
  groups.forEach((g, k) => {
    const b = pick(g);
    vals.re[k] = t.re[b]; if (t.im) vals.im[k] = t.im[b];
    idx.re[k] = (dim === 'all' ? b : dim === 1 ? b % t.r : Math.floor(b / t.r)) + 1;
  });
  return [t.im ? dropIm(vals) : vals, idx];
}
def('max', (a, n) => maxmin(a, n, true, 'max'));
def('min', (a, n) => maxmin(a, n, false, 'min'));
def('bounds', a => [maxmin([a[0]], 1, false, 'min')[0], maxmin([a[0]], 1, true, 'max')[0]]);
def('sort', (a, nargout) => {
  need(a, 1);
  const v = a[0];
  const desc = a.some(x => txtIs(x, 'descend'));
  const dnum = a.find((x, i) => i > 0 && !isText(x));
  if (v.k === 'c') {
    const strs = v.d.map(x => textOf(x));
    const order = seq(strs.length).sort((p, q) => desc ? (strs[q] < strs[p] ? -1 : strs[q] > strs[p] ? 1 : 0) : (strs[p] < strs[q] ? -1 : strs[p] > strs[q] ? 1 : 0));
    return [{ k: 'c', r: v.r, c: v.c, d: order.map(i => v.d[i]) }, vecLike(v, order.map(i => i + 1))];
  }
  const t = T_(v, 'sort');
  const dim = dnum ? sc(dnum) : defaultDim(t);
  const o = mk(t.r, t.c, t.type), ix = mk(t.r, t.c);
  const cmp = (x, y) => {
    if (x !== x) return y !== y ? 0 : (desc ? -1 : 1);
    if (y !== y) return desc ? 1 : -1;
    return desc ? y - x : x - y;
  };
  const doGroup = g => {
    const order = g.map((gi, k) => k).sort((p, q) => cmp(t.re[g[p]], t.re[g[q]]) || p - q);
    order.forEach((k, pos) => { o.re[g[pos]] = t.re[g[k]]; ix.re[g[pos]] = k + 1; });
  };
  if (dim === 1) for (let j = 0; j < t.c; j++) doGroup(seq(t.r).map(i => i + j * t.r));
  else for (let i = 0; i < t.r; i++) doGroup(seq(t.c).map(j => i + j * t.r));
  return [o, ix];
});
def('sortrows', (a) => {
  const t = T_(a[0], 'sortrows');
  let col = a.length > 1 ? sc(a[1]) : 1;
  const desc = col < 0; col = Math.abs(col) - 1;
  const order = seq(t.r).sort((p, q) => { for (let c = col; c < t.c; c++) { const d = t.re[p + c * t.r] - t.re[q + c * t.r]; if (d) return desc ? -d : d; if (a.length > 1) break; } return p - q; });
  return [parenGet(t, [colv(order.map(i => i + 1)), COLON]), colv(order.map(i => i + 1))];
});
def('find', (a, nargout) => {
  need(a, 1);
  const t = T_(a[0], 'find');
  let lim = a.length > 1 ? sc(a[1]) : Infinity;
  const fromEnd = a.length > 2 && txtIs(a[2], 'last');
  const idx = [];
  const N = t.r * t.c;
  if (fromEnd) { for (let i = N - 1; i >= 0 && idx.length < lim; i--) if (t.re[i] !== 0 || (t.im && t.im[i] !== 0)) idx.unshift(i); }
  else for (let i = 0; i < N && idx.length < lim; i++) if (t.re[i] !== 0 || (t.im && t.im[i] !== 0)) idx.push(i);
  const asRow = t.r === 1 && t.c !== 1 || (t.r === 1 && t.c === 1);
  const mkv = arr => (t.r === 0 && t.c === 0) ? mk(0, 0) : asRow ? rowv(arr) : colv(arr);
  if (nargout <= 1) return mkv(idx.map(i => i + 1));
  return [mkv(idx.map(i => i % t.r + 1)), mkv(idx.map(i => Math.floor(i / t.r) + 1)), mkv(idx.map(i => t.re[i]))];
});
def('sub2ind', a => { const sz = Array.from(T_(a[0]).re); const r = T_(a[1]), c = T_(a[2]); return ewise(r, c, (i, j) => { if (i < 1 || j < 1 || i > sz[0] || j > sz[1]) err('Out of range subscript.'); return i + (j - 1) * sz[0]; }); });
def('ind2sub', (a, nargout) => { const sz = Array.from(T_(a[0]).re); const ix = T_(a[1]); const R = sameMap(ix, k => (k - 1) % sz[0] + 1), C = sameMap(ix, k => Math.floor((k - 1) / sz[0]) + 1); if (nargout < 2) return ix; return [R, C]; });
def('nnz', a => { const t = T_(a[0]); let c = 0; for (const x of t.re) if (x !== 0) c++; return num(c); });
def('unique', (a, nargout) => {
  need(a, 1);
  const v = a[0];
  const stable = a.some(x => txtIs(x, 'stable'));
  if (v.k === 'c') {
    const strs = v.d.map(x => textOf(x));
    let u = [...new Set(strs)]; if (!stable) u.sort();
    return { k: 'c', r: u.length, c: 1, d: u.map(chr) };
  }
  const t = T_(v, 'unique');
  const vals = Array.from(t.re);
  let u = [];
  const seen = new Set();
  for (const x of vals) if (!seen.has(x)) { seen.add(x); u.push(x); }
  if (!stable) u.sort((x, y) => x - y);
  const ia = u.map(x => vals.indexOf(x) + 1), ic = vals.map(x => u.indexOf(x) + 1);
  const out = t.r === 1 ? rowv(u, t.type) : colv(u, t.type);
  return [out, colv(ia), colv(ic)];
});
def('union intersect setdiff', (a, n, env, name) => {
  const x = Array.from(T_(a[0]).re), y = Array.from(T_(a[1]).re);
  let r;
  if (name === 'union') r = [...new Set([...x, ...y])];
  else if (name === 'intersect') r = [...new Set(x.filter(v => y.includes(v)))];
  else r = [...new Set(x.filter(v => !y.includes(v)))];
  r.sort((p, q) => p - q);
  return (a[0].c === 1 && a[0].r > 1) ? colv(r) : rowv(r);
});
def('ismember', (a, nargout) => {
  need(a, 2);
  const x = a[0], S = a[1];
  if (isText(x) && S.k === 'c') { const strs = S.d.map(e => textOf(e)); const k = strs.indexOf(textOf(x)); return [lgc(k >= 0), num(k + 1)]; }
  if (x.k === 'c' && S.k === 'c') { const strs = S.d.map(e => textOf(e)); const ks = x.d.map(e => strs.indexOf(textOf(e))); const o = mk(x.r, x.c, 'logical'), l = mk(x.r, x.c); ks.forEach((k, i) => { o.re[i] = k >= 0 ? 1 : 0; l.re[i] = k + 1; }); return [o, l]; }
  const t = T_(x), s = Array.from(T_(S).re);
  const o = mk(t.r, t.c, 'logical'), loc = mk(t.r, t.c);
  for (let i = 0; i < t.re.length; i++) { const k = s.indexOf(t.re[i]); o.re[i] = k >= 0 ? 1 : 0; loc.re[i] = k + 1; }
  return [o, loc];
});
function valEq(a, b) {
  if (a.k !== b.k) {
    if (isText(a) && isText(b)) return textOf(a) === textOf(b);
    return false;
  }
  if (a.k === 's') return a.v === b.v;
  if (a.k === 't') { if (a.r !== b.r || a.c !== b.c) return false; for (let i = 0; i < a.re.length; i++) { if (a.re[i] !== b.re[i]) return false; if ((a.im ? a.im[i] : 0) !== (b.im ? b.im[i] : 0)) return false; } return true; }
  if (a.k === 'c') return a.r === b.r && a.c === b.c && a.d.every((x, i) => valEq(x, b.d[i]));
  if (a.k === 'st') return a.f.size === b.f.size && [...a.f.keys()].every(k => b.f.has(k) && valEq(a.f.get(k), b.f.get(k)));
  return a === b;
}
def('isequal', a => { need(a, 2); for (let i = 1; i < a.length; i++) if (!valEq(a[0], a[i])) return lgc(false); return lgc(true); });
def('histcounts', (a, nargout) => {
  const x = Array.from(T_(a[0]).re).filter(v => isFinite(v));
  let edges;
  if (a.length > 1 && nel(a[1]) > 1) edges = Array.from(T_(a[1]).re);
  else edges = autoEdges(x, a.length > 1 ? sc(a[1]) : null);
  const counts = new Array(edges.length - 1).fill(0);
  for (const v of x) { for (let k = 0; k < counts.length; k++) { if (v >= edges[k] && (v < edges[k + 1] || (k === counts.length - 1 && v === edges[k + 1]))) { counts[k]++; break; } } }
  return [rowv(counts), rowv(edges)];
});
function niceStep(raw) {
  const e = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / e;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e;
}
function autoEdges(x, nbins) {
  if (!x.length) return [0, 1];
  let lo = Math.min(...x), hi = Math.max(...x);
  if (lo === hi) { lo -= 0.5; hi += 0.5; }
  if (nbins) { const w = (hi - lo) / nbins; return seq(nbins + 1).map(k => lo + k * w); }
  const sd = Math.sqrt(varA(x, 0)) || (hi - lo) / 10;
  const w = niceStep(3.5 * sd * Math.pow(x.length, -1 / 3));
  const left = Math.floor(lo / w) * w, right = Math.ceil(hi / w) * w;
  const n = Math.max(1, Math.round((right - left) / w));
  return seq(n + 1).map(k => left + k * w);
}
def('cov', a => {
  const t = T_(a[0]);
  if (a.length > 1 && nel(a[1]) > 1) { const X = hcat([colvT(t), colvT(T_(a[1]))]); return covMat(X); }
  if (t.r === 1 || t.c === 1) return num(varA(Array.from(t.re), 0));
  return covMat(t);
});
function colvT(t) { const o = copyT(t); o.r = t.r * t.c; o.c = 1; return o; }
function covMat(X) {
  const n = X.r, p = X.c, means = seq(p).map(j => { let s = 0; for (let i = 0; i < n; i++) s += X.re[i + j * n]; return s / n; });
  const o = mk(p, p);
  for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) { let s = 0; for (let i = 0; i < n; i++) s += (X.re[i + a * n] - means[a]) * (X.re[i + b * n] - means[b]); o.re[a + b * p] = s / (n - 1); }
  return o;
}
def('corrcoef corr', a => {
  let X = T_(a[0]);
  if (a.length > 1 && !isText(a[1])) X = hcat([colvT(X), colvT(T_(a[1]))]);
  else if (X.r === 1) X = colvT(X);
  const C = covMat(X), p = C.r, o = mk(p, p);
  for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) o.re[i + j * p] = C.re[i + j * p] / Math.sqrt(C.re[i + i * p] * C.re[j + j * p]);
  return o;
});
def('zscore normalize', (a, n, env, name) => {
  const t = T_(a[0], name), o = copyT(t, 'double');
  const cols = t.r === 1 ? [seq(t.c)] : seq(t.c).map(j => seq(t.r).map(i => i + j * t.r));
  for (const g of cols) { const arr = g.map(i => t.re[i]); const m = sumA(arr) / arr.length, s = Math.sqrt(varA(arr, 0)) || 1; g.forEach(i => o.re[i] = (t.re[i] - m) / s); }
  return o;
});
def('mapminmax', a => {
  const t = T_(a[0]), lo = a.length > 1 ? sc(a[1]) : -1, hi = a.length > 2 ? sc(a[2]) : 1, o = copyT(t, 'double');
  for (let i = 0; i < t.r; i++) { let mn = Infinity, mx = -Infinity; for (let j = 0; j < t.c; j++) { mn = Math.min(mn, t.re[i + j * t.r]); mx = Math.max(mx, t.re[i + j * t.r]); } for (let j = 0; j < t.c; j++) o.re[i + j * t.r] = mx === mn ? lo : (hi - lo) * (t.re[i + j * t.r] - mn) / (mx - mn) + lo; }
  return o;
});
def('rescale', a => { const t = T_(a[0]); const lo = a.length > 1 ? sc(a[1]) : 0, hi = a.length > 2 ? sc(a[2]) : 1; const mn = Math.min(...t.re), mx = Math.max(...t.re); return sameMap(t, x => mx === mn ? lo : lo + (x - mn) * (hi - lo) / (mx - mn)); });
def('normpdf', a => { const x = T_(a[0]), mu = a.length > 1 ? T_(a[1]) : num(0), s = a.length > 2 ? T_(a[2]) : num(1); return ewise(ewise(x, mu, (p, q) => p - q), s, (d, sg) => Math.exp(-d * d / (2 * sg * sg)) / (sg * Math.sqrt(2 * Math.PI))); });
def('normcdf', a => { const x = T_(a[0]), mu = a.length > 1 ? T_(a[1]) : num(0), s = a.length > 2 ? T_(a[2]) : num(1); return ewise(ewise(x, mu, (p, q) => p - q), s, (d, sg) => 0.5 * (1 + erf(d / (sg * Math.SQRT2)))); });
def('prctile', a => { const x = Array.from(T_(a[0]).re).sort((p, q) => p - q), ps = Array.from(T_(a[1]).re); const n = x.length; return rowv(ps.map(p => { const pos = p / 100 * n - 0.5; if (pos <= 0) return x[0]; if (pos >= n - 1) return x[n - 1]; const lo = Math.floor(pos); return x[lo] + (pos - lo) * (x[lo + 1] - x[lo]); })); });

// ---------- 线性代数 ----------
def('det', a => { need(a, 1); const [r, i] = matDet(T_(a[0], 'det')); return cnum(r, i); });
def('inv', a => { need(a, 1); return matInv(T_(a[0], 'inv')); });
def('pinv', a => { const A = T_(a[0]); const At = transpose(A, true); return A.r >= A.c ? mtimes(matInv(mtimes(At, A)), At) : mtimes(At, matInv(mtimes(A, At))); });
def('rank', a => { need(a, 1); return num(matRank(T_(a[0], 'rank'))); });
def('trace', a => { const t = T_(a[0]); let s = 0; for (let i = 0; i < Math.min(t.r, t.c); i++) s += t.re[i + i * t.r]; return num(s); });
def('eig', (a, nargout) => { need(a, 1); return matEig(T_(a[0], 'eig'), nargout); });
def('norm', a => {
  need(a, 1);
  const t = T_(a[0], 'norm');
  const pArg = a[1];
  const p = pArg === undefined ? 2 : isText(pArg) ? textOf(pArg) : sc(pArg);
  const abs = i => t.im ? Math.hypot(t.re[i], t.im[i]) : Math.abs(t.re[i]);
  const N = t.r * t.c;
  if (t.r === 1 || t.c === 1 || p === 'fro') {
    if (p === Infinity || p === 'inf' || p === 'Inf') { let m = 0; for (let i = 0; i < N; i++) m = Math.max(m, abs(i)); return num(m); }
    if (p === -Infinity) { let m = Infinity; for (let i = 0; i < N; i++) m = Math.min(m, abs(i)); return num(m); }
    const q = p === 'fro' ? 2 : p;
    let s = 0; for (let i = 0; i < N; i++) s += Math.pow(abs(i), q);
    return num(Math.pow(s, 1 / q));
  }
  if (p === 1) { let m = 0; for (let j = 0; j < t.c; j++) { let s = 0; for (let i = 0; i < t.r; i++) s += abs(i + j * t.r); m = Math.max(m, s); } return num(m); }
  if (p === Infinity || p === 'inf') { let m = 0; for (let i = 0; i < t.r; i++) { let s = 0; for (let j = 0; j < t.c; j++) s += abs(i + j * t.r); m = Math.max(m, s); } return num(m); }
  const AtA = mtimes(transpose(t, true), t);
  const { vals } = eigSym(AtA);
  return num(Math.sqrt(Math.max(0, vals[vals.length - 1])));
});
def('cond', a => {
  const t = T_(a[0]);
  const { vals } = eigSym(mtimes(transpose(t, true), t));
  return num(Math.sqrt(vals[vals.length - 1] / vals[0]));
});
def('dot', a => { need(a, 2); const x = T_(a[0]), y = T_(a[1]); if (x.r * x.c !== y.r * y.c) err('A and B must be same size.'); let s = 0; for (let i = 0; i < x.re.length; i++) s += x.re[i] * y.re[i]; return num(s); });
def('cross', a => { need(a, 2); const x = T_(a[0]).re, y = T_(a[1]).re; if (x.length !== 3 || y.length !== 3) err('A and B must be of length 3 in the dimension in which the cross product is taken.'); return vecLike(a[0], [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]]); });
def('null', a => {
  const A = T_(a[0]); const { vals, vecs } = eigSym(mtimes(transpose(A, false), A));
  const tol = Math.max(A.r, A.c) * (vals[vals.length - 1] || 1) * 1e-12; const cols = [];
  vals.forEach((v, k) => { if (Math.abs(v) <= tol) cols.push(k + 1); });
  return cols.length ? parenGet(vecs, [COLON, rowv(cols)]) : mk(A.c, 0);
});
def('lu', (a, nargout) => {
  const A = T_(a[0]); const n = A.r; if (n !== A.c) err('实验台的 lu 只支持方阵。');
  const U = copyT(A), L = eyeT(n), P = eyeT(n);
  for (let k = 0; k < n; k++) {
    let piv = k; for (let i = k + 1; i < n; i++) if (Math.abs(U.re[i + k * n]) > Math.abs(U.re[piv + k * n])) piv = i;
    if (piv !== k) for (let j = 0; j < n; j++) { [U.re[k + j * n], U.re[piv + j * n]] = [U.re[piv + j * n], U.re[k + j * n]]; [P.re[k + j * n], P.re[piv + j * n]] = [P.re[piv + j * n], P.re[k + j * n]]; if (j < k) [L.re[k + j * n], L.re[piv + j * n]] = [L.re[piv + j * n], L.re[k + j * n]]; }
    for (let i = k + 1; i < n; i++) { const f = U.re[k + k * n] ? U.re[i + k * n] / U.re[k + k * n] : 0; L.re[i + k * n] = f; for (let j = k; j < n; j++) U.re[i + j * n] -= f * U.re[k + j * n]; }
  }
  if (nargout === 3) return [L, U, P];
  return [mtimes(transpose(P, false), L), U];
});

// ---------- 多项式 ----------
def('polyval', a => {
  need(a, 2);
  const p = T_(a[0], 'polyval'), x = T_(a[1], 'polyval');
  const cx = !!(x.im || p.im);
  const o = mk(x.r, x.c, 'double', cx);
  for (let i = 0; i < x.re.length; i++) {
    let yr = 0, yi = 0;
    const xr = x.re[i], xi = x.im ? x.im[i] : 0;
    for (let k = 0; k < p.re.length; k++) { const nr = yr * xr - yi * xi + p.re[k], ni = yr * xi + yi * xr + (p.im ? p.im[k] : 0); yr = nr; yi = ni; }
    o.re[i] = yr; if (cx) o.im[i] = yi;
  }
  return cx ? dropIm(o) : o;
});
def('polyfit', (a, nargout, env) => {
  need(a, 3);
  const x = Array.from(T_(a[0]).re), y = Array.from(T_(a[1]).re), n = sc(a[2]);
  if (x.length !== y.length) err('The first two inputs must have the same number of elements.', 'polyfit(x, y, n) 里 x 和 y 的长度必须一样。');
  if (n + 1 > x.length) env.sess.warn('Polynomial is not unique; degree >= number of data points.');
  const V = mk(x.length, n + 1);
  for (let i = 0; i < x.length; i++) for (let j = 0; j <= n; j++) V.re[i + j * x.length] = Math.pow(x[i], n - j);
  const p = x.length >= n + 1 ? qrSolve(V, colv(y)) : mldivide(V, colv(y));
  const pr = rowv(Array.from(p.re));
  if (nargout < 2) return pr;
  let ss = 0; for (let i = 0; i < x.length; i++) { let yh = 0; for (let j = 0; j <= n; j++) yh = yh * x[i] + pr.re[j]; ss += (y[i] - yh) ** 2; }
  return [pr, { k: 'st', f: new Map([['normr', num(Math.sqrt(ss))], ['df', num(x.length - n - 1)]]) }];
});
def('roots', a => { need(a, 1); return rootsToT(polyRoots(Array.from(T_(a[0], 'roots').re))); });
def('poly', a => {
  const t = T_(a[0]);
  if (t.r === t.c && t.r > 1) return rowv(charPoly(t));
  let cr = [1], ci = [0];
  for (let k = 0; k < t.re.length; k++) {
    const rr = t.re[k], ri = t.im ? t.im[k] : 0;
    const nr = new Array(cr.length + 1).fill(0), ni = new Array(cr.length + 1).fill(0);
    for (let i = 0; i < cr.length; i++) { nr[i] += cr[i]; ni[i] += ci[i]; nr[i + 1] -= cr[i] * rr - ci[i] * ri; ni[i + 1] -= cr[i] * ri + ci[i] * rr; }
    cr = nr; ci = ni;
  }
  const o = mk(1, cr.length, 'double', true); o.re.set(cr); o.im.set(ci.map(v => Math.abs(v) < 1e-12 ? 0 : v)); return dropIm(o);
});
def('conv', a => {
  need(a, 2);
  const u = T_(a[0], 'conv'), v = T_(a[1], 'conv');
  if (!isVec(u) || !isVec(v)) err('A and B must be vectors.', 'conv 只对向量做卷积。');
  const shape = a.length > 2 ? textOf(a[2]) : 'full';
  const m = u.re.length, n = v.re.length;
  if (!m || !n) return mk(1, 0);
  const cx = !!(u.im || v.im);
  const L = m + n - 1, re = new Float64Array(L), im = new Float64Array(L);
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) {
    const ar = u.re[i], ai = u.im ? u.im[i] : 0, br = v.re[j], bi = v.im ? v.im[j] : 0;
    re[i + j] += ar * br - ai * bi; im[i + j] += ar * bi + ai * br;
  }
  let s = 0, e = L;
  if (shape === 'same') { s = Math.floor(n / 2) - (n % 2 === 0 ? 0 : 0); s = Math.ceil((n - 1) / 2); e = s + m; }
  else if (shape === 'valid') { s = n - 1; e = m; if (e < s) return mk(1, 0); }
  const outCol = (u.c === 1 && u.r > 1) || (m === 1 && v.c === 1 && v.r > 1);
  const len = e - s;
  const o = outCol ? mk(len, 1, 'double', cx) : mk(1, len, 'double', cx);
  for (let k = 0; k < len; k++) { o.re[k] = re[s + k]; if (cx) o.im[k] = im[s + k]; }
  return cx ? dropIm(o) : o;
});
def('deconv', a => {
  const b = Array.from(T_(a[0]).re), d = Array.from(T_(a[1]).re);
  if (d[0] === 0) err('First coefficient of A must be non-zero.');
  const r = b.slice(), q = [];
  for (let i = 0; i <= b.length - d.length; i++) { const f = r[i] / d[0]; q.push(f); for (let j = 0; j < d.length; j++) r[i + j] -= f * d[j]; }
  return [rowv(q.length ? q : [0]), rowv(r.map(x => Math.abs(x) < 1e-12 ? 0 : x))];
});
def('polyder', a => {
  let p = Array.from(T_(a[0]).re);
  if (a.length > 1) p = pconv(p, Array.from(T_(a[1]).re));
  const n = p.length - 1;
  if (n < 1) return num(0);
  return rowv(trimLead(p.slice(0, n).map((c, i) => c * (n - i))));
});
def('polyint', a => { const p = Array.from(T_(a[0]).re), k = a.length > 1 ? sc(a[1]) : 0, n = p.length; return rowv([...p.map((c, i) => c / (n - i)), k]); });

// ---------- 插值与积分 ----------
function splineCoefs(x, y) {
  // not-a-knot 三次样条，返回每段二阶导 M
  const n = x.length;
  if (n === 2) return { kind: 'lin' };
  if (n === 3) { // 抛物线
    return { kind: 'par' };
  }
  const h = seq(n - 1).map(i => x[i + 1] - x[i]);
  const A = mk(n, n), r = mk(n, 1);
  // 内部点
  for (let i = 1; i < n - 1; i++) {
    A.re[i + (i - 1) * n] = h[i - 1]; A.re[i + i * n] = 2 * (h[i - 1] + h[i]); A.re[i + (i + 1) * n] = h[i];
    r.re[i] = 6 * ((y[i + 1] - y[i]) / h[i] - (y[i] - y[i - 1]) / h[i - 1]);
  }
  // not-a-knot：第一、二段三阶导相等
  A.re[0] = h[1]; A.re[0 + 1 * n] = -(h[0] + h[1]); A.re[0 + 2 * n] = h[0];
  const L = n - 1;
  A.re[L + (L - 2) * n] = h[L - 1]; A.re[L + (L - 1) * n] = -(h[L - 2] + h[L - 1]); A.re[L + L * n] = h[L - 2];
  const M = gaussSolve(A, r, false);
  return { kind: 'cub', M: Array.from(M.re), h };
}
function splineEval(x, y, sp, xq) {
  const n = x.length;
  if (sp.kind === 'lin') return y[0] + (y[1] - y[0]) * (xq - x[0]) / (x[1] - x[0]);
  if (sp.kind === 'par') {
    const [x0, x1, x2] = x, [y0, y1, y2] = y;
    return y0 * (xq - x1) * (xq - x2) / ((x0 - x1) * (x0 - x2)) + y1 * (xq - x0) * (xq - x2) / ((x1 - x0) * (x1 - x2)) + y2 * (xq - x0) * (xq - x1) / ((x2 - x0) * (x2 - x1));
  }
  let i = 0;
  if (xq >= x[n - 1]) i = n - 2; else if (xq > x[0]) { let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (x[m] <= xq) lo = m; else hi = m; } i = lo; }
  const h = sp.h[i], M = sp.M, t0 = x[i + 1] - xq, t1 = xq - x[i];
  return M[i] * t0 ** 3 / (6 * h) + M[i + 1] * t1 ** 3 / (6 * h) + (y[i] / h - M[i] * h / 6) * t0 + (y[i + 1] / h - M[i + 1] * h / 6) * t1;
}
function pchipSlopes(x, y) {
  const n = x.length, h = seq(n - 1).map(i => x[i + 1] - x[i]), del = seq(n - 1).map(i => (y[i + 1] - y[i]) / h[i]);
  const d = new Array(n).fill(0);
  if (n === 2) { d[0] = d[1] = del[0]; return d; }
  for (let k = 1; k < n - 1; k++) {
    if (del[k - 1] * del[k] > 0) {
      const w1 = 2 * h[k] + h[k - 1], w2 = h[k] + 2 * h[k - 1];
      d[k] = (w1 + w2) / (w1 / del[k - 1] + w2 / del[k]);
    }
  }
  const endS = (h0, h1, d0, d1) => {
    let s = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
    if (Math.sign(s) !== Math.sign(d0)) s = 0;
    else if (Math.sign(d0) !== Math.sign(d1) && Math.abs(s) > Math.abs(3 * d0)) s = 3 * d0;
    return s;
  };
  d[0] = endS(h[0], h[1], del[0], del[1]);
  d[n - 1] = endS(h[n - 2], h[n - 3], del[n - 2], del[n - 3]);
  return d;
}
function hermite(x0, x1, y0, y1, d0, d1, xq) {
  const h = x1 - x0, t = (xq - x0) / h;
  const h00 = (1 + 2 * t) * (1 - t) ** 2, h10 = t * (1 - t) ** 2, h01 = t * t * (3 - 2 * t), h11 = t * t * (t - 1);
  return h00 * y0 + h10 * h * d0 + h01 * y1 + h11 * h * d1;
}
function interp1Core(x, y, xq, method, extrap) {
  // 排序
  const order = seq(x.length).sort((p, q) => x[p] - x[q]);
  x = order.map(i => x[i]); y = order.map(i => y[i]);
  for (let i = 1; i < x.length; i++) if (x[i] === x[i - 1]) err('The sample points must be unique.', 'interp1 的 x 里有重复值。');
  const n = x.length;
  let sp = null, pd = null;
  if (method === 'spline') sp = splineCoefs(x, y);
  if (method === 'pchip' || method === 'cubic') pd = pchipSlopes(x, y);
  const doExtrap = extrap !== undefined ? extrap : (method === 'spline' || method === 'pchip' || method === 'cubic');
  return xq.map(q => {
    if (q !== q) return NaN;
    if ((q < x[0] || q > x[n - 1]) && !doExtrap) return typeof extrap === 'number' ? extrap : NaN;
    if (sp) return splineEval(x, y, sp, q);
    let i;
    if (q <= x[0]) i = 0; else if (q >= x[n - 1]) i = n - 2;
    else { let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (x[m] <= q) lo = m; else hi = m; } i = lo; }
    if (n === 1) return y[0];
    switch (method) {
      case 'nearest': return (q - x[i] < x[i + 1] - q) ? y[i] : y[i + 1];
      case 'previous': return q >= x[i + 1] ? y[i + 1] : y[i];
      case 'next': return q <= x[i] ? y[i] : y[i + 1];
      case 'pchip': case 'cubic': return hermite(x[i], x[i + 1], y[i], y[i + 1], pd[i], pd[i + 1], q);
      default: return y[i] + (y[i + 1] - y[i]) * (q - x[i]) / (x[i + 1] - x[i]);
    }
  });
}
def('interp1', a => {
  need(a, 2);
  let x, y, xq, rest;
  if (a.length === 2 || (a.length >= 3 && isText(a[2]))) { y = T_(a[0]); x = rowv(seq(nel(y)).map(i => i + 1)); xq = T_(a[1]); rest = a.slice(2); }
  else { x = T_(a[0]); y = T_(a[1]); xq = T_(a[2]); rest = a.slice(3); }
  if (nel(x) !== nel(y)) err('The grid vectors do not define a grid of points that match the given values.', 'interp1(x, v, xq) 中 x 与 v 的长度必须一致。');
  let method = 'linear', extrap;
  for (const r of rest) { if (isText(r)) { const s = textOf(r).toLowerCase(); if (s === 'extrap') extrap = true; else method = s; } else extrap = sc(r); }
  const out = interp1Core(Array.from(x.re), Array.from(y.re), Array.from(xq.re), method, extrap);
  return shapeLike(xq, out);
});
def('spline pchip', (a, n, env, name) => {
  need(a, 3);
  const x = T_(a[0]), y = T_(a[1]), xq = T_(a[2]);
  return shapeLike(xq, interp1Core(Array.from(x.re), Array.from(y.re), Array.from(xq.re), name));
});
def('trapz', a => {
  need(a, 1);
  let x, y;
  if (a.length === 1) { y = Array.from(T_(a[0]).re); x = null; } else { x = Array.from(T_(a[0]).re); y = Array.from(T_(a[1]).re); }
  let s = 0;
  for (let i = 1; i < y.length; i++) s += (x ? x[i] - x[i - 1] : 1) * (y[i] + y[i - 1]) / 2;
  return num(s);
});
def('cumtrapz', a => {
  let x, yv;
  if (a.length === 1) { yv = T_(a[0]); x = null; } else { x = Array.from(T_(a[0]).re); yv = T_(a[1]); }
  const y = Array.from(yv.re), out = [0];
  for (let i = 1; i < y.length; i++) out.push(out[i - 1] + (x ? x[i] - x[i - 1] : 1) * (y[i] + y[i - 1]) / 2);
  return vecLike(yv, out);
});
const GK = {
  xk: [0.991455371120812639, 0.949107912342758525, 0.864864423359769073, 0.741531185599394440, 0.586087235467691130, 0.405845151377397167, 0.207784955007898468, 0],
  wk: [0.022935322010529225, 0.063092092629978553, 0.104790010322250184, 0.140653259715525919, 0.169004726639267903, 0.190350578064785410, 0.204432940075298892, 0.209482141084727828],
  wg: [0.129484966168869693, 0.279705391489276668, 0.381830050505118945, 0.417959183673469388],
};
function integrate(fv, a, b, env, opts) {
  let flip = 1;
  if (a === b) return 0;
  if (a > b) { [a, b] = [b, a]; flip = -1; }
  let g;
  const f = xs => {
    const arg = rowv(xs);
    const r = T_(callF(fv, [arg], env));
    if (r.r * r.c !== xs.length) {
      if (r.r * r.c === 1 && xs.length > 1) err('Output of the function must be the same size as the input. If FUN is an array-valued integrand, set the \'ArrayValued\' option to true.', '被积函数要支持向量输入：把 * / ^ 写成 .* ./ .^，例如 @(x) x.^2 .* exp(-x)。');
      err('被积函数输出尺寸不对。');
    }
    return Array.from(r.re);
  };
  if (isFinite(a) && isFinite(b)) g = f;
  else if (isFinite(a)) { const a0 = a; g = ts => { const xs = ts.map(t => a0 + t / (1 - t)); const ys = f(xs); return ys.map((y, i) => y / ((1 - ts[i]) ** 2)); }; a = 0; b = 1; }
  else if (isFinite(b)) { const b0 = b; g = ts => { const xs = ts.map(t => b0 - (1 - t) / t); const ys = f(xs); return ys.map((y, i) => y / (ts[i] ** 2)); }; a = 0; b = 1; }
  else { g = ts => { const xs = ts.map(t => t / (1 - t * t)); const ys = f(xs); return ys.map((y, i) => y * (1 + ts[i] ** 2) / ((1 - ts[i] ** 2) ** 2)); }; a = -1; b = 1; }
  const absTol = (opts && opts.abs) || 1e-10, relTol = (opts && opts.rel) || 1e-6;
  const seg = (lo, hi) => {
    const c = (lo + hi) / 2, h = (hi - lo) / 2, xs = [];
    for (let k = 0; k < 7; k++) { xs.push(c - h * GK.xk[k], c + h * GK.xk[k]); }
    xs.push(c);
    const ys = g(xs);
    let K = GK.wk[7] * ys[14], G = GK.wg[3] * ys[14];
    for (let k = 0; k < 7; k++) { const s = ys[2 * k] + ys[2 * k + 1]; K += GK.wk[k] * s; if (k % 2 === 1) G += GK.wg[(k - 1) / 2] * s; }
    return { lo, hi, val: K * h, err: Math.abs((K - G) * h) };
  };
  let segs = [];
  const n0 = 10;
  for (let k = 0; k < n0; k++) segs.push(seg(a + (b - a) * k / n0, a + (b - a) * (k + 1) / n0));
  for (let it = 0; it < 650; it++) {
    const tot = segs.reduce((s, x) => s + x.val, 0), te = segs.reduce((s, x) => s + x.err, 0);
    if (te <= Math.max(absTol, relTol * Math.abs(tot)) || !isFinite(tot)) break;
    segs.sort((p, q) => q.err - p.err);
    const w = segs.shift(), m = (w.lo + w.hi) / 2;
    segs.push(seg(w.lo, m), seg(m, w.hi));
    tick(env);
  }
  return flip * segs.reduce((s, x) => s + x.val, 0);
}
def('integral quad quadgk quadl', (a, n, env) => {
  need(a, 3);
  const opts = {};
  for (let i = 3; i + 1 < a.length; i += 2) { const k = textOf(a[i]).toLowerCase(); if (k === 'abstol') opts.abs = sc(a[i + 1]); if (k === 'reltol') opts.rel = sc(a[i + 1]); }
  return num(integrate(a[0], sc(a[1]), sc(a[2]), env, opts));
});
def('integral2', (a, n, env) => {
  need(a, 5);
  const f = a[0], x0 = sc(a[1]), x1 = sc(a[2]);
  const ylo = a[3], yhi = a[4];
  const yb = (v, x) => v.k === 'f' ? sc(callF(v, [num(x)], env)) : sc(v);
  // 用嵌套 Gauss–Kronrod（逐点求内层积分）
  const gl = (lo, hi, fun, m) => { // 复合 Gauss–Legendre 5 点
    const xg = [-0.9061798459386640, -0.5384693101056831, 0, 0.5384693101056831, 0.9061798459386640], wg = [0.2369268850561891, 0.4786286704993665, 0.5688888888888889, 0.4786286704993665, 0.2369268850561891];
    let s = 0; const hseg = (hi - lo) / m;
    for (let k = 0; k < m; k++) { const c = lo + (k + 0.5) * hseg; for (let q = 0; q < 5; q++) s += wg[q] * fun(c + xg[q] * hseg / 2) * hseg / 2; }
    return s;
  };
  const val = gl(x0, x1, x => { const y0 = yb(ylo, x), y1 = yb(yhi, x); return gl(y0, y1, y => sc(callF(f, [num(x), num(y)], env)), 20); }, 20);
  return num(val);
});

// ---------- 优化与方程求解 ----------
function vecFn(fv, env, shapeRef) {
  return xs => {
    const x = shapeRef.c === 1 && shapeRef.r > 1 ? colv(xs) : (shapeRef.r === 1 && shapeRef.c > 1 ? rowv(xs) : (xs.length === 1 ? num(xs[0]) : colv(xs)));
    return callF(fv, [x], env);
  };
}
function nelderMead(f, x0, opts) {
  const n = x0.length, tolX = opts.tolX || 1e-4, tolF = opts.tolF || 1e-4, maxIt = opts.maxIt || 200 * n, maxF = opts.maxF || 200 * n;
  let simplex = [x0.slice()];
  for (let i = 0; i < n; i++) { const p = x0.slice(); p[i] = p[i] !== 0 ? p[i] * 1.05 : 0.00025; simplex.push(p); }
  let fv = simplex.map(f), nf = n + 1, it = 0;
  const order = () => { const idx = seq(n + 1).sort((a, b) => fv[a] - fv[b]); simplex = idx.map(i => simplex[i]); fv = idx.map(i => fv[i]); };
  order();
  while (it < maxIt && nf < maxF) {
    let dx = 0, df = 0;
    for (let k = 1; k <= n; k++) { df = Math.max(df, Math.abs(fv[k] - fv[0])); for (let j = 0; j < n; j++) dx = Math.max(dx, Math.abs(simplex[k][j] - simplex[0][j])); }
    if (dx <= tolX && df <= tolF) break;
    it++;
    const xbar = seq(n).map(j => { let s = 0; for (let k = 0; k < n; k++) s += simplex[k][j]; return s / n; });
    const xr = xbar.map((v, j) => 2 * v - simplex[n][j]); const fr = f(xr); nf++;
    if (fr < fv[0]) {
      const xe = xbar.map((v, j) => 3 * v - 2 * simplex[n][j]); const fe = f(xe); nf++;
      if (fe < fr) { simplex[n] = xe; fv[n] = fe; } else { simplex[n] = xr; fv[n] = fr; }
    } else if (fr < fv[n - 1]) { simplex[n] = xr; fv[n] = fr; }
    else {
      let shrink = false;
      if (fr < fv[n]) {
        const xc = xbar.map((v, j) => 1.5 * v - 0.5 * simplex[n][j]); const fc = f(xc); nf++;
        if (fc <= fr) { simplex[n] = xc; fv[n] = fc; } else shrink = true;
      } else {
        const xcc = xbar.map((v, j) => 0.5 * v + 0.5 * simplex[n][j]); const fcc = f(xcc); nf++;
        if (fcc < fv[n]) { simplex[n] = xcc; fv[n] = fcc; } else shrink = true;
      }
      if (shrink) for (let k = 1; k <= n; k++) { simplex[k] = simplex[k].map((v, j) => simplex[0][j] + 0.5 * (v - simplex[0][j])); fv[k] = f(simplex[k]); nf++; }
    }
    order();
  }
  return { x: simplex[0], f: fv[0], it, nf, ok: it < maxIt && nf < maxF };
}
function optsFromArgs(v) {
  const o = {};
  if (v && v.k === 'st') { for (const [k, val] of v.f) { const kk = k.toLowerCase(); if (kk === 'tolx' || kk === 'steptolerance') o.tolX = sc(val); if (kk === 'tolfun' || kk === 'functiontolerance' || kk === 'optimalitytolerance') o.tolF = sc(val); if (kk === 'maxiter' || kk === 'maxiterations') o.maxIt = sc(val); if (kk === 'maxfunevals' || kk === 'maxfunctionevaluations') o.maxF = sc(val); if (kk === 'display') o.display = textOf(val); } }
  return o;
}
def('optimset optimoptions', a => {
  const f = new Map();
  let i = a.length && !isText(a[0]) ? 1 : (a.length && isText(a[0]) && a.length % 2 === 1 ? 1 : 0);
  for (; i + 1 < a.length; i += 2) f.set(textOf(a[i]), a[i + 1]);
  return { k: 'st', f };
});
def('fminsearch', (a, nargout, env) => {
  need(a, 2);
  const x0t = T_(a[1], 'fminsearch'), opts = optsFromArgs(a[2]);
  const f = vecFn(a[0], env, x0t);
  const r = nelderMead(xs => sc(f(xs)), Array.from(x0t.re), opts);
  if (!r.ok) env.sess.printLine('\nExiting: Maximum number of iterations has been exceeded\n         - increase MaxIter option.\n');
  return [shapeLike(x0t, r.x), num(r.f), num(r.ok ? 1 : 0)];
});
def('fminunc', (a, nargout, env) => {
  need(a, 2);
  const x0t = T_(a[1], 'fminunc');
  const f = vecFn(a[0], env, x0t);
  let r = nelderMead(xs => sc(f(xs)), Array.from(x0t.re), { tolX: 1e-10, tolF: 1e-12, maxIt: 5000, maxF: 10000 });
  r = nelderMead(xs => sc(f(xs)), r.x, { tolX: 1e-12, tolF: 1e-14, maxIt: 5000, maxF: 10000 });
  env.sess.printLine('\nLocal minimum found.\n');
  return [shapeLike(x0t, r.x), num(r.f), num(1)];
});
def('fminbnd', (a, nargout, env) => {
  need(a, 3);
  const f = x => sc(callF(a[0], [num(x)], env));
  let lo = sc(a[1]), hi = sc(a[2]);
  const gr = (Math.sqrt(5) - 1) / 2;
  let c = hi - gr * (hi - lo), d = lo + gr * (hi - lo), fc = f(c), fd = f(d);
  for (let it = 0; it < 200 && hi - lo > 1e-10 * (1 + Math.abs(c)); it++) {
    if (fc < fd) { hi = d; d = c; fd = fc; c = hi - gr * (hi - lo); fc = f(c); }
    else { lo = c; c = d; fc = fd; d = lo + gr * (hi - lo); fd = f(d); }
  }
  const x = (lo + hi) / 2;
  return [num(x), num(f(x)), num(1)];
});
def('fzero', (a, nargout, env) => {
  need(a, 2);
  const f = x => sc(callF(a[0], [num(x)], env));
  const x0 = T_(a[1], 'fzero');
  let lo, hi, flo, fhi;
  if (x0.r * x0.c >= 2) {
    lo = x0.re[0]; hi = x0.re[1]; flo = f(lo); fhi = f(hi);
    if (Math.sign(flo) === Math.sign(fhi) && flo !== 0 && fhi !== 0) err('The function values at the interval endpoints must differ in sign.', 'fzero(f, [a b]) 要求 f(a) 和 f(b) 异号，区间内才保证有根。换一个区间试试。');
  } else {
    const x = x0.re[0], fx = f(x);
    if (fx === 0) return [num(x), num(0), num(1)];
    let dx = x !== 0 ? Math.abs(x) / 50 : 1 / 50, found = false;
    for (let k = 0; k < 120; k++) {
      dx *= Math.SQRT2;
      const a1 = x - dx, b1 = x + dx, fa = f(a1), fb = f(b1);
      if (Math.sign(fa) !== Math.sign(fx) && isFinite(fa)) { lo = a1; hi = x; flo = fa; fhi = fx; found = true; break; }
      if (Math.sign(fb) !== Math.sign(fx) && isFinite(fb)) { lo = x; hi = b1; flo = fx; fhi = fb; found = true; break; }
    }
    if (!found) { env.sess.printLine('Exiting fzero: aborting search for an interval containing a sign change\n    because no sign change is detected during search.'); return [num(NaN), num(NaN), num(-1)]; }
  }
  if (flo === 0) return [num(lo), num(0), num(1)];
  if (fhi === 0) return [num(hi), num(0), num(1)];
  // Brent 法
  let A = lo, Bb = hi, fa = flo, fb = fhi, C = A, fc = fa, D = Bb - A, E = D;
  for (let it = 0; it < 200; it++) {
    if (Math.sign(fb) === Math.sign(fc)) { C = A; fc = fa; D = Bb - A; E = D; }
    if (Math.abs(fc) < Math.abs(fb)) { A = Bb; Bb = C; C = A; fa = fb; fb = fc; fc = fa; }
    const tol = 2 * 2.22e-16 * Math.abs(Bb) + 1e-15, m = (C - Bb) / 2;
    if (Math.abs(m) <= tol || fb === 0) break;
    if (Math.abs(E) >= tol && Math.abs(fa) > Math.abs(fb)) {
      let p, q, s = fb / fa;
      if (A === C) { p = 2 * m * s; q = 1 - s; }
      else { const qq = fa / fc, r = fb / fc; p = s * (2 * m * qq * (qq - r) - (Bb - A) * (r - 1)); q = (qq - 1) * (r - 1) * (s - 1); }
      if (p > 0) q = -q; else p = -p;
      if (2 * p < Math.min(3 * m * q - Math.abs(tol * q), Math.abs(E * q))) { E = D; D = p / q; } else { D = m; E = m; }
    } else { D = m; E = m; }
    A = Bb; fa = fb;
    Bb += Math.abs(D) > tol ? D : (m > 0 ? tol : -tol);
    fb = f(Bb);
  }
  return [num(Bb), num(fb), num(1)];
});
def('fsolve', (a, nargout, env) => {
  need(a, 2);
  const x0t = T_(a[1], 'fsolve');
  const F = vecFn(a[0], env, x0t);
  let x = Array.from(x0t.re);
  const n = x.length;
  const evalF = xs => Array.from(T_(F(xs)).re);
  let fx = evalF(x), m = fx.length;
  const nrm = v => Math.sqrt(v.reduce((s, y) => s + y * y, 0));
  for (let it = 0; it < 200; it++) {
    if (nrm(fx) < 1e-12) break;
    const J = mk(m, n);
    for (let j = 0; j < n; j++) {
      const h = 1e-7 * Math.max(1, Math.abs(x[j]));
      const xp = x.slice(); xp[j] += h;
      const fp = evalF(xp);
      for (let i = 0; i < m; i++) J.re[i + j * m] = (fp[i] - fx[i]) / h;
    }
    // Levenberg–Marquardt 步
    const Jt = transpose(J, false), JtJ = mtimes(Jt, J), g = mtimes(Jt, colv(fx));
    let lam = 1e-6, improved = false;
    for (let t = 0; t < 30; t++) {
      const Ad = copyT(JtJ); for (let i = 0; i < n; i++) Ad.re[i + i * n] += lam * (1 + JtJ.re[i + i * n]);
      const dx = gaussSolve(Ad, g, false);
      const xn = x.map((v, i) => v - dx.re[i]);
      const fn = evalF(xn);
      if (nrm(fn) < nrm(fx)) { x = xn; fx = fn; improved = true; break; }
      lam *= 10;
    }
    if (!improved) break;
    tick(env);
  }
  const ok = nrm(fx) < 1e-6;
  env.sess.printLine(ok ? '\nEquation solved.\n' : '\nfsolve stopped because the problem appears regular as measured by the gradient,\nbut the vector of function values is not near zero.\n');
  return [shapeLike(x0t, x), vecLike(T_(F(x)), fx), num(ok ? 1 : -2)];
});
def('lsqcurvefit', (a, nargout, env) => {
  need(a, 4);
  const x0t = T_(a[1]), xd = a[2], yd = Array.from(T_(a[3]).re);
  const lb = a[4] && nel(a[4]) ? Array.from(T_(a[4]).re) : null, ub = a[5] && nel(a[5]) ? Array.from(T_(a[5]).re) : null;
  const clamp = xs => xs.map((v, i) => Math.min(ub ? ub[i] : Infinity, Math.max(lb ? lb[i] : -Infinity, v)));
  const res = xs => { const p = shapeLike(x0t, clamp(xs)); const yh = Array.from(T_(callF(a[0], [p, xd], env)).re); let s = 0; for (let i = 0; i < yd.length; i++) s += (yh[i] - yd[i]) ** 2; return s; };
  let r = nelderMead(res, Array.from(x0t.re), { tolX: 1e-10, tolF: 1e-14, maxIt: 8000, maxF: 16000 });
  r = nelderMead(res, r.x, { tolX: 1e-12, tolF: 1e-16, maxIt: 8000, maxF: 16000 });
  env.sess.printLine('\nLocal minimum possible.\n');
  return [shapeLike(x0t, clamp(r.x)), num(r.f)];
});
def('nlinfit', (a, nargout, env) => {
  need(a, 4);
  const xd = a[0], yd = Array.from(T_(a[1]).re), b0 = T_(a[3]);
  const res = xs => { const yh = Array.from(T_(callF(a[2], [shapeLike(b0, xs), xd], env)).re); let s = 0; for (let i = 0; i < yd.length; i++) s += (yh[i] - yd[i]) ** 2; return s; };
  let r = nelderMead(res, Array.from(b0.re), { tolX: 1e-10, tolF: 1e-14, maxIt: 8000, maxF: 16000 });
  r = nelderMead(res, r.x, { tolX: 1e-12, tolF: 1e-16, maxIt: 8000, maxF: 16000 });
  return shapeLike(b0, r.x);
});
// 两阶段单纯形法：min c'x, A x <= b, Aeq x = beq, lb <= x <= ub
function lpSolve(c, A, b, Aeq, beq, lb, ub) {
  const n = c.length;
  // 变量变换：有限下界 x = lb + x'；无下界 x = x+ - x-
  const cols = []; // 每个原变量对应的新列 {j, sign, shift}
  let nv = 0;
  const map = [];
  for (let j = 0; j < n; j++) {
    const L = lb ? lb[j] : -Infinity, U = ub ? ub[j] : Infinity;
    if (isFinite(L)) { map.push({ cols: [[nv++, 1]], shift: L, U: isFinite(U) ? U - L : Infinity }); }
    else if (isFinite(U)) { map.push({ cols: [[nv++, -1]], shift: U, U: Infinity }); }
    else { map.push({ cols: [[nv++, 1], [nv++, -1]], shift: 0, U: Infinity }); }
  }
  const rows = [];
  const addRow = (coef, rhs, type) => {
    const r = new Array(nv).fill(0); let shiftSum = 0;
    for (let j = 0; j < n; j++) { if (!coef[j]) continue; shiftSum += coef[j] * map[j].shift; for (const [cj, sg] of map[j].cols) r[cj] += coef[j] * sg; }
    rows.push({ r, rhs: rhs - shiftSum, type });
  };
  if (A) for (let i = 0; i < A.length; i++) addRow(A[i], b[i], 'le');
  if (Aeq) for (let i = 0; i < Aeq.length; i++) addRow(Aeq[i], beq[i], 'eq');
  for (let j = 0; j < n; j++) if (isFinite(map[j].U)) { const r = new Array(nv).fill(0); r[map[j].cols[0][0]] = 1; rows.push({ r, rhs: map[j].U, type: 'le' }); }
  const cc = new Array(nv).fill(0); let c0 = 0;
  for (let j = 0; j < n; j++) { c0 += c[j] * map[j].shift; for (const [cj, sg] of map[j].cols) cc[cj] += c[j] * sg; }
  const m = rows.length;
  let nSlack = rows.filter(r => r.type === 'le').length;
  const total = nv + nSlack + m; // 人工变量每行一个
  const T = []; const basis = [];
  let si = nv;
  rows.forEach((row, i) => {
    const t = new Array(total + 1).fill(0);
    for (let j = 0; j < nv; j++) t[j] = row.r[j];
    if (row.type === 'le') t[si++] = 1;
    t[total] = row.rhs;
    if (t[total] < 0) for (let j = 0; j <= total; j++) t[j] = -t[j];
    t[nv + nSlack + i] = 1;
    T.push(t); basis.push(nv + nSlack + i);
  });
  const pivot = (pr, pc) => {
    const pv = T[pr][pc];
    for (let j = 0; j <= total; j++) T[pr][j] /= pv;
    for (let i = 0; i < m; i++) if (i !== pr && T[i][pc] !== 0) { const f = T[i][pc]; for (let j = 0; j <= total; j++) T[i][j] -= f * T[pr][j]; }
    basis[pr] = pc;
  };
  const simplex = (cost, allowed) => {
    for (let it = 0; it < 5000; it++) {
      // 约化成本
      let enter = -1;
      for (let j = 0; j < total; j++) {
        if (!allowed(j) || basis.includes(j)) continue;
        let rc = cost[j]; for (let i = 0; i < m; i++) rc -= cost[basis[i]] * T[i][j];
        if (rc < -1e-10) { enter = j; break; }
      }
      if (enter < 0) return 'opt';
      let leave = -1, best = Infinity;
      for (let i = 0; i < m; i++) if (T[i][enter] > 1e-12) { const r = T[i][total] / T[i][enter]; if (r < best - 1e-12 || (Math.abs(r - best) <= 1e-12 && basis[i] < basis[leave])) { best = r; leave = i; } }
      if (leave < 0) return 'unbounded';
      pivot(leave, enter);
    }
    return 'maxit';
  };
  const cost1 = new Array(total).fill(0); for (let i = 0; i < m; i++) cost1[nv + nSlack + i] = 1;
  simplex(cost1, () => true);
  let infeas = 0; for (let i = 0; i < m; i++) if (basis[i] >= nv + nSlack) infeas += T[i][total];
  if (infeas > 1e-7) return { status: 'infeasible' };
  // 把仍在基中的人工变量换出
  for (let i = 0; i < m; i++) if (basis[i] >= nv + nSlack) { for (let j = 0; j < nv + nSlack; j++) if (Math.abs(T[i][j]) > 1e-10 && !basis.includes(j)) { pivot(i, j); break; } }
  const cost2 = new Array(total).fill(0); for (let j = 0; j < nv; j++) cost2[j] = cc[j];
  const st = simplex(cost2, j => j < nv + nSlack);
  if (st === 'unbounded') return { status: 'unbounded' };
  const y = new Array(total).fill(0); for (let i = 0; i < m; i++) y[basis[i]] = T[i][total];
  const x = map.map(mp => mp.shift + mp.cols.reduce((s, [cj, sg]) => s + sg * y[cj], 0));
  const fval = x.reduce((s, v, j) => s + c[j] * v, 0);
  return { status: 'opt', x, fval };
}
function matRowsOrNull(v) {
  if (!v || v.k !== 't' || v.r * v.c === 0) return null;
  const rows = []; for (let i = 0; i < v.r; i++) { const r = []; for (let j = 0; j < v.c; j++) r.push(v.re[i + j * v.r]); rows.push(r); }
  return rows;
}
function vecOrNull(v) { return !v || v.k !== 't' || v.r * v.c === 0 ? null : Array.from(v.re); }
def('linprog', (a, nargout, env) => {
  need(a, 3);
  const c = Array.from(T_(a[0]).re);
  const r = lpSolve(c, matRowsOrNull(a[1]), vecOrNull(a[2]), matRowsOrNull(a[3]), vecOrNull(a[4]), vecOrNull(a[5]), vecOrNull(a[6]));
  if (r.status === 'infeasible') { env.sess.printLine('\nNo feasible solution found.\n\nLinprog stopped because no point satisfies the constraints.\n'); return [emptyD(), emptyD(), num(-2)]; }
  if (r.status === 'unbounded') { env.sess.printLine('\nProblem is unbounded.\n'); return [emptyD(), emptyD(), num(-3)]; }
  env.sess.printLine('\nOptimal solution found.\n');
  return [colv(r.x.map(v => Math.abs(v) < 1e-12 ? 0 : v)), num(r.fval), num(1)];
});
def('intlinprog', (a, nargout, env) => {
  need(a, 4);
  const c = Array.from(T_(a[0]).re), n = c.length;
  const intcon = vecOrNull(a[1]) || [];
  const A = matRowsOrNull(a[2]), b = vecOrNull(a[3]), Aeq = matRowsOrNull(a[4]), beq = vecOrNull(a[5]);
  const lb0 = vecOrNull(a[6]) || new Array(n).fill(-Infinity), ub0 = vecOrNull(a[7]) || new Array(n).fill(Infinity);
  let best = null, nodes = 0;
  const stack = [{ lb: lb0.slice(), ub: ub0.slice() }];
  while (stack.length && nodes < 4000) {
    const nd = stack.pop(); nodes++;
    const r = lpSolve(c, A, b, Aeq, beq, nd.lb, nd.ub);
    if (r.status !== 'opt') { if (r.status === 'unbounded' && !best) { env.sess.printLine('\nIntlinprog stopped because the root LP problem is unbounded.\n'); return [emptyD(), emptyD(), num(-3)]; } continue; }
    if (best && r.fval >= best.fval - 1e-9) continue;
    let frac = -1, fv = 0;
    for (const k of intcon) { const v = r.x[k - 1]; const d = Math.abs(v - Math.round(v)); if (d > 1e-7 && d > fv) { fv = d; frac = k - 1; } }
    if (frac < 0) { best = { x: r.x.map((v, j) => intcon.includes(j + 1) ? Math.round(v) : v), fval: r.fval }; continue; }
    const v = r.x[frac];
    const left = { lb: nd.lb.slice(), ub: nd.ub.slice() }; left.ub[frac] = Math.floor(v);
    const right = { lb: nd.lb.slice(), ub: nd.ub.slice() }; right.lb[frac] = Math.ceil(v);
    stack.push(right, left);
    tick(env);
  }
  if (!best) { env.sess.printLine('\nIntlinprog stopped because no point satisfies the constraints.\n'); return [emptyD(), emptyD(), num(-2)]; }
  env.sess.printLine(`\nOptimal solution found.\n\nIntlinprog stopped because the objective value is within a gap tolerance of the\noptimal value. （分支定界共搜索 ${nodes} 个节点）\n`);
  const fval = best.x.reduce((s, v, j) => s + c[j] * v, 0);
  return [colv(best.x), num(fval), num(1)];
});
def('fmincon', (a, nargout, env) => {
  need(a, 2);
  const x0t = T_(a[1], 'fmincon');
  const f = vecFn(a[0], env, x0t);
  const A = matRowsOrNull(a[2]), b = vecOrNull(a[3]), Aeq = matRowsOrNull(a[4]), beq = vecOrNull(a[5]);
  const lb = vecOrNull(a[6]), ub = vecOrNull(a[7]);
  const nonl = a[8] && a[8].k === 'f' ? a[8] : null;
  const n = x0t.re.length;
  const cons = xs => {
    const g = [], h = [];
    if (A) A.forEach((r, i) => g.push(r.reduce((s, v, j) => s + v * xs[j], 0) - b[i]));
    if (Aeq) Aeq.forEach((r, i) => h.push(r.reduce((s, v, j) => s + v * xs[j], 0) - beq[i]));
    if (lb) lb.forEach((v, j) => { if (isFinite(v)) g.push(v - xs[j]); });
    if (ub) ub.forEach((v, j) => { if (isFinite(v)) g.push(xs[j] - v); });
    if (nonl) {
      const outs = callValue(nonl, [shapeLike(x0t, xs)], 2, env);
      if (outs[0] && nel(outs[0])) g.push(...Array.from(T_(outs[0]).re));
      if (outs[1] && nel(outs[1])) h.push(...Array.from(T_(outs[1]).re));
    }
    return [g, h];
  };
  let x = Array.from(x0t.re);
  if (lb) x = x.map((v, j) => Math.max(v, isFinite(lb[j]) ? lb[j] : -Infinity));
  if (ub) x = x.map((v, j) => Math.min(v, isFinite(ub[j]) ? ub[j] : Infinity));
  let [g0, h0] = cons(x);
  let lamG = g0.map(() => 0), lamH = h0.map(() => 0), mu = 10;
  for (let outer = 0; outer < 30; outer++) {
    const L = xs => {
      const fx = sc(f(xs)); const [g, h] = cons(xs);
      let s = fx;
      h.forEach((v, i) => { s += lamH[i] * v + mu / 2 * v * v; });
      g.forEach((v, i) => { const t = Math.max(0, lamG[i] + mu * v); s += (t * t - lamG[i] * lamG[i]) / (2 * mu); });
      return s;
    };
    let r = nelderMead(L, x, { tolX: 1e-9, tolF: 1e-12, maxIt: 3000 * n, maxF: 6000 * n });
    r = nelderMead(L, r.x, { tolX: 1e-11, tolF: 1e-14, maxIt: 3000 * n, maxF: 6000 * n });
    x = r.x;
    const [g, h] = cons(x);
    lamH = lamH.map((l, i) => l + mu * h[i]);
    lamG = lamG.map((l, i) => Math.max(0, l + mu * g[i]));
    const viol = Math.max(0, ...g, ...h.map(Math.abs));
    if (viol < 1e-8 && outer > 2) break;
    mu = Math.min(mu * 4, 1e8);
    tick(env);
  }
  const [g, h] = cons(x);
  const viol = Math.max(0, ...g, ...h.map(Math.abs));
  env.sess.printLine(viol < 1e-6 ? '\nLocal minimum found that satisfies the constraints.\n' : '\nConverged to an infeasible point.\n');
  return [shapeLike(x0t, x.map(v => Math.abs(v) < 1e-12 ? 0 : v)), num(sc(f(x))), num(viol < 1e-6 ? 1 : -2)];
});

// ---------- 常微分方程 ----------
function odeSolve(fv, tspan, y0t, env, opts) {
  const t0 = tspan[0], tf = tspan[tspan.length - 1], dir = Math.sign(tf - t0) || 1;
  const n = y0t.re.length;
  const F = (t, y) => { const r = T_(callF(fv, [num(t), colv(y)], env)); if (r.re.length !== n) err(`@(t,y) 函数返回了 ${r.re.length} 个值，但初始条件 y0 有 ${n} 个分量，两者必须一致。`, 'ode45 要求导数函数返回列向量，例如 @(t,y) [y(2); -y(1)]。'); return Array.from(r.re); };
  const rtol = opts.rtol || 1e-3, atol = opts.atol || 1e-6;
  // Dormand–Prince 5(4)
  const c2 = 1 / 5, c3 = 3 / 10, c4 = 4 / 5, c5 = 8 / 9;
  const a21 = 1 / 5, a31 = 3 / 40, a32 = 9 / 40, a41 = 44 / 45, a42 = -56 / 15, a43 = 32 / 9;
  const a51 = 19372 / 6561, a52 = -25360 / 2187, a53 = 64448 / 6561, a54 = -212 / 729;
  const a61 = 9017 / 3168, a62 = -355 / 33, a63 = 46732 / 5247, a64 = 49 / 176, a65 = -5103 / 18656;
  const b1 = 35 / 384, b3 = 500 / 1113, b4 = 125 / 192, b5 = -2187 / 6784, b6 = 11 / 84;
  const e1 = 71 / 57600, e3 = -71 / 16695, e4 = 71 / 1920, e5 = -17253 / 339200, e6 = 22 / 525, e7 = -1 / 40;
  let t = t0, y = Array.from(y0t.re), k1 = F(t, y);
  const span = Math.abs(tf - t0);
  let h = opts.h0 || Math.min(span / 10, 0.1 * span) || 1e-3;
  { const sc0 = y.map(v => atol + rtol * Math.abs(v)); const d0 = Math.sqrt(y.reduce((s, v, i) => s + (v / sc0[i]) ** 2, 0) / n), d1 = Math.sqrt(k1.reduce((s, v, i) => s + (v / sc0[i]) ** 2, 0) / n); const h1 = (d0 < 1e-5 || d1 < 1e-5) ? 1e-6 : 0.01 * d0 / d1; h = Math.min(h, Math.max(h1 * 100, span * 1e-6), span / 10); }
  const T = [t], Y = [y.slice()], K = [k1.slice()];
  let steps = 0;
  const add = (u, v, s) => u.map((x, i) => x + s * v[i]);
  while (dir * (tf - t) > 1e-12 * Math.max(1, Math.abs(tf))) {
    if (++steps > 200000) err('ode45 步数过多，可能是刚性方程或解发散。');
    if (dir * (t + dir * h - tf) > 0) h = Math.abs(tf - t);
    const hs = dir * h;
    const k2 = F(t + c2 * hs, y.map((v, i) => v + hs * a21 * k1[i]));
    const k3 = F(t + c3 * hs, y.map((v, i) => v + hs * (a31 * k1[i] + a32 * k2[i])));
    const k4 = F(t + c4 * hs, y.map((v, i) => v + hs * (a41 * k1[i] + a42 * k2[i] + a43 * k3[i])));
    const k5 = F(t + c5 * hs, y.map((v, i) => v + hs * (a51 * k1[i] + a52 * k2[i] + a53 * k3[i] + a54 * k4[i])));
    const k6 = F(t + hs, y.map((v, i) => v + hs * (a61 * k1[i] + a62 * k2[i] + a63 * k3[i] + a64 * k4[i] + a65 * k5[i])));
    const yn = y.map((v, i) => v + hs * (b1 * k1[i] + b3 * k3[i] + b4 * k4[i] + b5 * k5[i] + b6 * k6[i]));
    const k7 = F(t + hs, yn);
    let en = 0;
    for (let i = 0; i < n; i++) {
      const e = hs * (e1 * k1[i] + e3 * k3[i] + e4 * k4[i] + e5 * k5[i] + e6 * k6[i] + e7 * k7[i]);
      const s = Math.max(atol, rtol * Math.max(Math.abs(y[i]), Math.abs(yn[i])));
      en = Math.max(en, Math.abs(e) / s);
    }
    if (en <= 1 || h < 1e-14 * Math.max(1, Math.abs(t))) {
      const tn = t + hs;
      // Refine = 4：三个中间点（Hermite 插值）
      if (!opts.points) for (const s of [0.25, 0.5, 0.75]) { const tt = t + s * hs; T.push(tt); Y.push(seq(n).map(i => hermite(t, tn, y[i], yn[i], k1[i], k7[i], tt))); }
      T.push(tn); Y.push(yn.slice()); K.push(k7.slice());
      if (opts.points) { opts.seg = opts.seg || []; opts.seg.push([t, tn, y.slice(), yn.slice(), k1.slice(), k7.slice()]); }
      t = tn; y = yn; k1 = k7;
      if (!isFinite(y[0])) err('ode45 的解发散到了无穷大。');
    }
    const fac = en === 0 ? 5 : Math.min(5, Math.max(0.2, 0.9 * Math.pow(en, -0.2)));
    h = Math.min(h * (en > 1 ? Math.min(1, fac) : fac), opts.hmax || span / 10);
    tick(env);
  }
  if (opts.points) {
    const segs = opts.seg || [];
    const out = tspan.map(tq => {
      if (tq === t0) return Array.from(y0t.re);
      const sgm = segs.find(sg => dir > 0 ? (tq >= sg[0] && tq <= sg[1]) : (tq <= sg[0] && tq >= sg[1])) || segs[segs.length - 1];
      return seq(n).map(i => hermite(sgm[0], sgm[1], sgm[2][i], sgm[3][i], sgm[4][i], sgm[5][i], tq));
    });
    return { T: tspan.slice(), Y: out };
  }
  return { T, Y };
}
def('ode45 ode23 ode113 ode15s ode23s', (a, nargout, env, name) => {
  need(a, 3);
  const tspan = Array.from(T_(a[1]).re), y0 = T_(a[2]);
  if (tspan.length < 2) err('The entries in tspan must strictly increase or decrease.', 'tspan 至少要两个元素，比如 [0 10]。');
  const opts = { points: tspan.length > 2 };
  const o = a[3];
  if (o && o.k === 'st') for (const [k, v] of o.f) { const kk = k.toLowerCase(); if (kk === 'reltol') opts.rtol = sc(v); if (kk === 'abstol') opts.atol = sc(v); }
  if ((name === 'ode15s' || name === 'ode23s') && !env.sess.warnedStiff) { env.sess.warn(`实验台用 ode45 的算法代替 ${name}，刚性很强的方程可能会很慢。`); env.sess.warnedStiff = true; }
  const { T, Y } = odeSolve(a[0], tspan, y0, env, opts);
  const n = y0.re.length;
  const tcol = colv(T), Ym = mk(T.length, n);
  for (let i = 0; i < T.length; i++) for (let j = 0; j < n; j++) Ym.re[i + j * T.length] = Y[i][j];
  if (nargout === 0) {
    const ax = plotPrep(env);
    for (let j = 0; j < n; j++) addLine(ax, T, Y.map(r => r[j]), { marker: 'o', ms: 3 });
    return;
  }
  if (nargout === 1) return { k: 'st', f: new Map([['x', rowv(T)], ['y', transpose(Ym, false)], ['solver', chr(name)]]) };
  return [tcol, Ym];
});
def('deval', a => {
  const sol = a[0], tq = Array.from(T_(a[1]).re);
  const x = Array.from(T_(sol.f.get('x')).re), Y = T_(sol.f.get('y'));
  const n = Y.r;
  const o = mk(n, tq.length);
  for (let i = 0; i < n; i++) { const yi = seq(x.length).map(k => Y.re[i + k * n]); const v = interp1Core(x, yi, tq, 'pchip', true); v.forEach((val, k) => o.re[i + k * n] = val); }
  return o;
});

// ---------- 信号处理 ----------
def('filter', a => {
  need(a, 3);
  let b = Array.from(T_(a[0]).re), av = Array.from(T_(a[1]).re);
  const x = T_(a[2], 'filter');
  if (av[0] === 0) err('First denominator filter coefficient must be non-zero.');
  const a0 = av[0]; b = b.map(v => v / a0); av = av.map(v => v / a0);
  const n = Math.max(b.length, av.length);
  while (b.length < n) b.push(0); while (av.length < n) av.push(0);
  const run = xs => {
    const z = new Float64Array(n), out = new Array(xs.length);
    for (let k = 0; k < xs.length; k++) {
      const xi = xs[k], yi = b[0] * xi + z[0];
      for (let i = 1; i < n; i++) z[i - 1] = b[i] * xi + z[i] - av[i] * yi;
      out[k] = yi;
    }
    return out;
  };
  if (isVec(x)) return shapeLike(x, run(Array.from(x.re)));
  const o = mk(x.r, x.c);
  for (let j = 0; j < x.c; j++) { const col = run(Array.from(x.re.subarray(j * x.r, (j + 1) * x.r))); col.forEach((v, i) => o.re[i + j * x.r] = v); }
  return o;
});
function fftT(x, N, inv) {
  const doVec = (re, im) => { fftAny(re, im, inv); if (inv) for (let i = 0; i < re.length; i++) { re[i] /= re.length; im[i] /= re.length; } };
  const vec = isVec(x);
  const L = vec ? x.r * x.c : x.r;
  const n = N || L;
  const cols = vec ? 1 : x.c;
  const o = vec ? (x.c === 1 && x.r > 1 ? mk(n, 1, 'double', true) : mk(1, n, 'double', true)) : mk(n, x.c, 'double', true);
  for (let j = 0; j < cols; j++) {
    const re = new Float64Array(n), im = new Float64Array(n);
    for (let i = 0; i < Math.min(n, L); i++) { re[i] = x.re[i + j * L]; im[i] = x.im ? x.im[i + j * L] : 0; }
    doVec(re, im);
    o.re.set(re, j * n); o.im.set(im, j * n);
  }
  if (inv) {
    // 共轭对称输入 → 实数输出（与 MATLAB 一致）
    let sym = true;
    for (let j = 0; j < cols && sym; j++) for (let i = 1; i < n; i++) {
      const a1 = x.re[i + j * L], b1 = x.re[(n - i) + j * L], ai = x.im ? x.im[i + j * L] : 0, bi = x.im ? x.im[(n - i) + j * L] : 0;
      if (Math.abs(a1 - b1) > 1e-12 * (Math.abs(a1) + 1) || Math.abs(ai + bi) > 1e-12 * (Math.abs(ai) + 1)) { sym = false; break; }
    }
    if (sym && n === L) o.im = null;
  }
  return dropIm(o);
}
def('fft', a => { need(a, 1); const x = T_(a[0], 'fft'); const N = a.length > 1 && nel(a[1]) ? sc(a[1]) : 0; if (N > 2 ** 22) err('FFT 长度太大。'); return fftT(x, N, false); });
def('ifft', a => { need(a, 1); const x = T_(a[0], 'ifft'); const N = a.length > 1 && nel(a[1]) && !isText(a[1]) ? sc(a[1]) : 0; const o = fftT(x, N, true); if (a.some(v => txtIs(v, 'symmetric'))) o.im = null; return o; });
def('fftshift ifftshift', (a, n, env, name) => {
  const x = a[0], L = nel(x);
  const k = name === 'fftshift' ? Math.floor(L / 2) : Math.ceil(L / 2);
  const idx = seq(L).map(i => ((i - k) % L + L) % L + 1);
  if (!isVec(x)) return x;
  return parenGet(x, [x.r === 1 ? rowv(idx) : colv(idx)]);
});
def('unwrap', a => {
  const t = T_(a[0]); const v = Array.from(t.re);
  for (let i = 1; i < v.length; i++) { let d = v[i] - v[i - 1]; while (d > Math.PI) { for (let k = i; k < v.length; k++) v[k] -= 2 * Math.PI; d -= 2 * Math.PI; } while (d < -Math.PI) { for (let k = i; k < v.length; k++) v[k] += 2 * Math.PI; d += 2 * Math.PI; } }
  return shapeLike(t, v);
});
def('rectpuls', a => { const t = T_(a[0]), w = a.length > 1 ? sc(a[1]) : 1; return sameMap(t, x => (x >= -w / 2 && x < w / 2) ? 1 : 0); });
def('tripuls', a => { const t = T_(a[0]), w = a.length > 1 ? sc(a[1]) : 1; return sameMap(t, x => Math.abs(x) < w / 2 ? 1 - 2 * Math.abs(x) / w : 0); });
def('square', a => { const t = T_(a[0]), duty = a.length > 1 ? sc(a[1]) : 50; return sameMap(t, x => { const ph = ((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); return ph < duty / 100 * 2 * Math.PI ? 1 : -1; }); });
def('sawtooth', a => { const t = T_(a[0]), w = a.length > 1 ? sc(a[1]) : 1; return sameMap(t, x => { const ph = (((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI); return ph < w ? -1 + 2 * ph / w : 1 - 2 * (ph - w) / (1 - w); }); });
def('gauspuls', a => { const t = T_(a[0]), fc = a.length > 1 ? sc(a[1]) : 1000, bw = a.length > 2 ? sc(a[2]) : 0.5; const r = Math.pow(10, -6 / 20), s2 = -((Math.PI * fc * bw) ** 2) / (4 * Math.log(r)); return sameMap(t, x => Math.exp(-s2 * x * x) * Math.cos(2 * Math.PI * fc * x)); });
def('hamming hann hanning blackman rectwin', (a, n, env, name) => {
  const N = sc(a[0]);
  const w = seq(N).map(k => {
    const d = N - 1 || 1;
    switch (name) {
      case 'hamming': return 0.54 - 0.46 * Math.cos(2 * Math.PI * k / d);
      case 'hann': return 0.5 - 0.5 * Math.cos(2 * Math.PI * k / d);
      case 'hanning': return 0.5 - 0.5 * Math.cos(2 * Math.PI * (k + 1) / (N + 1));
      case 'blackman': return 0.42 - 0.5 * Math.cos(2 * Math.PI * k / d) + 0.08 * Math.cos(4 * Math.PI * k / d);
      default: return 1;
    }
  });
  return colv(w);
});
def('xcorr', (a, nargout) => {
  const x = Array.from(T_(a[0]).re), y = a.length > 1 && !isText(a[1]) ? Array.from(T_(a[1]).re) : x;
  const N = Math.max(x.length, y.length), out = [], lags = [];
  for (let m = -(N - 1); m <= N - 1; m++) { let s = 0; for (let n2 = 0; n2 < N; n2++) { const k = n2 + m; if (k >= 0 && k < x.length && n2 < y.length) s += x[k] * y[n2]; } out.push(s); lags.push(m); }
  return [vecLike(T_(a[0]), out), rowv(lags)];
});
def('downsample', a => { const t = T_(a[0]), k = sc(a[1]); const out = []; for (let i = 0; i < nel(t); i += k) out.push(t.re[i]); return vecLike(t, out); });
def('upsample', a => { const t = T_(a[0]), k = sc(a[1]); const out = []; for (let i = 0; i < nel(t); i++) { out.push(t.re[i]); for (let j = 1; j < k; j++) out.push(0); } return vecLike(t, out); });
def('freqs', (a, nargout, env) => {
  need(a, 2);
  const bb = T_(a[0]), aa = T_(a[1]);
  let w;
  if (a.length > 2 && nel(a[2]) > 1) w = Array.from(T_(a[2]).re);
  else {
    const npts = a.length > 2 ? sc(a[2]) : 200;
    const rs = polyRoots(Array.from(aa.re)).concat(polyRoots(Array.from(bb.re)));
    const mags = rs.map(r => Math.hypot(r.re, r.im)).filter(m => m > 0);
    const lo = mags.length ? Math.floor(Math.log10(Math.min(...mags))) - 1 : -1, hi = mags.length ? Math.ceil(Math.log10(Math.max(...mags))) + 1 : 1;
    w = seq(npts).map(k => Math.pow(10, lo + (hi - lo) * k / (npts - 1)));
  }
  const jw = mk(1, w.length, 'double', true); w.forEach((v, i) => { jw.re[i] = 0; jw.im[i] = v; });
  const h = binop('./', B.polyval([bb, jw]), B.polyval([aa, jw]));
  if (nargout === 0) {
    const mag = Array.from(B.abs([h]).re), ph = Array.from(B.unwrap([B.angle([h])]).re).map(v => v * 180 / Math.PI);
    const fig = env.sess.figs.gcf(); fig.axes = []; fig.cur = null;
    let ax = subplotSel(env, 2, 1, [1]); addLine(ax, w, mag, {}); ax.xscale = 'log'; ax.yscale = 'log'; ax.gridOn = true; ax.ylabel = 'Magnitude'; ax.xlabel = 'Frequency (rad/s)';
    ax = subplotSel(env, 2, 1, [2]); addLine(ax, w, ph, {}); ax.xscale = 'log'; ax.gridOn = true; ax.ylabel = 'Phase (degrees)'; ax.xlabel = 'Frequency (rad/s)';
    return;
  }
  return [h, rowv(w)];
});
def('freqz', (a, nargout, env) => {
  need(a, 1);
  const bb = Array.from(T_(a[0]).re), aa = a.length > 1 ? Array.from(T_(a[1]).re) : [1];
  const N = a.length > 2 ? sc(a[2]) : 512;
  const fs = a.length > 3 ? sc(a[3]) : null;
  const w = seq(N).map(k => Math.PI * k / N);
  const H = mk(N, 1, 'double', true);
  w.forEach((om, k) => {
    let nr = 0, ni = 0, dr = 0, di = 0;
    bb.forEach((c, m) => { nr += c * Math.cos(om * m); ni -= c * Math.sin(om * m); });
    aa.forEach((c, m) => { dr += c * Math.cos(om * m); di -= c * Math.sin(om * m); });
    const [r, i] = cDiv(nr, ni, dr, di); H.re[k] = r; H.im[k] = i;
  });
  const wout = fs ? w.map(v => v / (2 * Math.PI) * fs) : w;
  if (nargout === 0) {
    const fig = env.sess.figs.gcf(); fig.axes = []; fig.cur = null;
    const xs = fs ? wout : w.map(v => v / Math.PI);
    const xl = fs ? 'Frequency (Hz)' : 'Normalized Frequency (\\times\\pi rad/sample)';
    const mag = Array.from(B.abs([H]).re).map(v => 20 * Math.log10(v));
    const ph = Array.from(B.unwrap([B.angle([H])]).re).map(v => v * 180 / Math.PI);
    let ax = subplotSel(env, 2, 1, [1]); addLine(ax, xs, mag, {}); ax.gridOn = true; ax.ylabel = 'Magnitude (dB)'; ax.xlabel = xl; ax.xlim = [xs[0], fs ? fs / 2 : 1];
    ax = subplotSel(env, 2, 1, [2]); addLine(ax, xs, ph, {}); ax.gridOn = true; ax.ylabel = 'Phase (degrees)'; ax.xlabel = xl; ax.xlim = [xs[0], fs ? fs / 2 : 1];
    return;
  }
  return [H, colv(wout)];
});

// ---------- 控制系统 ----------
def('tf', a => {
  need(a, 1);
  if (isText(a[0])) { const v = textOf(a[0]); const Ts = a.length > 1 ? sc(a[1]) : 0; if (v === 's') return mkTf([1, 0], [1], 0); if (v === 'z') return mkTf([1, 0], [1], Ts || 1); err("tf 的字符参数只能是 's' 或 'z'。"); }
  if (a.length < 2) { if (a[0].k === 'tf') return a[0]; return mkTf([sc(a[0])], [1]); }
  const Ts = a.length > 2 ? sc(a[2]) : 0;
  const num_ = Array.from(T_(a[0]).re), den_ = Array.from(T_(a[1]).re);
  if (den_.every(v => v === 0)) err('分母不能全为 0。');
  return mkTf(num_, den_, Ts);
});
def('pole', a => rootsToT(polyRoots(asTf(a[0]).den)));
def('zero', a => rootsToT(polyRoots(asTf(a[0]).num)));
def('dcgain', a => { const s = asTf(a[0]); const ev = (p, x) => p.reduce((acc, c) => acc * x + c, 0); const x = s.Ts > 0 ? 1 : 0; return num(ev(s.num, x) / ev(s.den, x)); });
def('feedback', a => {
  need(a, 2);
  const G = asTf(a[0]), Hh = asTf(a[1], G.Ts), sign = a.length > 2 ? sc(a[2]) : -1;
  const num_ = pconv(G.num, Hh.den);
  const den_ = padd(pconv(G.den, Hh.den), pconv(G.num, Hh.num).map(v => -sign * v));
  return mkTf(num_, den_, G.Ts);
});
def('series', a => tfBinop('*', a[0], a[1]));
def('parallel', a => tfBinop('+', a[0], a[1]));
def('minreal', a => a[0]);
function tfSS(sys) {
  const den = sys.den.slice(), d0 = den[0];
  const dn = den.map(v => v / d0);
  let nm = sys.num.map(v => v / d0);
  const n = dn.length - 1;
  if (nm.length > dn.length) err('实验台只支持分子阶数不高于分母阶数的传递函数（物理可实现系统）。');
  while (nm.length < n + 1) nm.unshift(0);
  const D = nm[0];
  const C = seq(n).map(i => nm[i + 1] - dn[i + 1] * D);
  return { n, a: dn.slice(1), C, D };
}
function simTf(sys, tEnd, u, mode) {
  // mode: 'step' | 'impulse' | 'lsim'(u 为函数)
  const { n, a, C, D } = tfSS(sys);
  const N = 1000, dt = tEnd / N, sub = 8, hh = dt / sub;
  const deriv = (x, uu) => { const dx = new Array(n).fill(0); let s = 0; for (let i = 0; i < n; i++) s -= a[i] * x[i]; dx[0] = s + uu; for (let i = 1; i < n; i++) dx[i] = x[i - 1]; return dx; };
  let x = new Array(n).fill(0);
  if (mode === 'impulse' && n) x[0] = 1;
  const T = [], Y = [];
  const out = (x, uu) => C.reduce((s, c, i) => s + c * x[i], 0) + (mode === 'impulse' ? 0 : D * uu);
  for (let k = 0; k <= N; k++) {
    const t = k * dt, uu = mode === 'step' ? 1 : mode === 'impulse' ? 0 : u(t);
    T.push(t); Y.push(out(x, uu));
    if (k === N) break;
    for (let s = 0; s < sub; s++) {
      const t0 = t + s * hh;
      const u0 = mode === 'lsim' ? u(t0) : (mode === 'step' ? 1 : 0), u1 = mode === 'lsim' ? u(t0 + hh / 2) : u0, u2 = mode === 'lsim' ? u(t0 + hh) : u0;
      const k1 = deriv(x, u0), k2 = deriv(add(x, k1, hh / 2), u1), k3 = deriv(add(x, k2, hh / 2), u1), k4 = deriv(add(x, k3, hh), u2);
      x = x.map((v, i) => v + hh / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    }
  }
  return { T, Y };
  function add(p, q, s) { return p.map((v, i) => v + s * q[i]); }
}
function autoTime(sys) {
  const ps = polyRoots(sys.den);
  if (sys.Ts > 0) {
    const mags = ps.map(p => Math.hypot(p.re, p.im));
    const mx = Math.max(0, ...mags);
    const n = mx > 0 && mx < 1 ? Math.min(200, Math.ceil(Math.log(0.001) / Math.log(mx))) : 50;
    return Math.max(10, n);
  }
  const re = ps.map(p => p.re);
  const stable = re.length && re.every(r => r < -1e-9);
  if (!stable) return 10;
  const sig = Math.min(...re.map(r => -r));
  let T = 7 / sig;
  const wmax = Math.max(...ps.map(p => Math.abs(p.im)));
  if (wmax > 0) T = Math.max(T, Math.min(7 / sig, 30 * 2 * Math.PI / wmax));
  const e = Math.pow(10, Math.floor(Math.log10(T)));
  return Math.ceil(T / e * 2) / 2 * e;
}
function discreteResp(sys, N, mode, uArr) {
  const uu = mode === 'step' ? new Array(N + 1).fill(1) : mode === 'impulse' ? [1, ...new Array(N).fill(0)] : uArr;
  const nm = sys.num.slice(), dn = sys.den.slice();
  while (nm.length < dn.length) nm.unshift(0);
  const y = Array.from(B.filter([rowv(nm), rowv(dn), rowv(uu)]).re);
  return { T: seq(uu.length).map(k => k * sys.Ts), Y: y.map(v => mode === 'impulse' ? v / sys.Ts : v) };
}
def('step impulse', (a, nargout, env, name) => {
  need(a, 1);
  const systems = a.filter(v => v.k === 'tf');
  const tArg = a.find(v => v.k === 't' && v.type !== 'char');
  const results = systems.map(sys => {
    let r;
    if (sys.Ts > 0) {
      const N = tArg ? Math.round((tArg.r * tArg.c > 1 ? tArg.re[tArg.re.length - 1] : tArg.re[0]) / sys.Ts) : autoTime(sys);
      r = discreteResp(sys, N, name);
    } else {
      const tEnd = tArg ? (tArg.r * tArg.c > 1 ? tArg.re[tArg.re.length - 1] : tArg.re[0]) : autoTime(sys);
      r = simTf(sys, tEnd, null, name);
      if (tArg && tArg.r * tArg.c > 1) { const tq = Array.from(tArg.re); r = { T: tq, Y: interp1Core(r.T, r.Y, tq, 'linear', true) }; }
    }
    return { sys, ...r };
  });
  if (nargout === 0) {
    const ax = plotPrep(env);
    results.forEach(r => {
      if (r.sys.Ts > 0) addStairs(ax, r.T, r.Y, {});
      else addLine(ax, r.T, r.Y, {});
      const fin = r.Y[r.Y.length - 1];
      if (name === 'step' && r.sys.Ts === 0 && polyRoots(r.sys.den).every(p => p.re < 0)) ax.refLines.push({ axis: 'y', v: fin, ls: ':', color: 'muted' });
    });
    ax.title = name === 'step' ? 'Step Response' : 'Impulse Response';
    ax.xlabel = 'Time (seconds)'; ax.ylabel = 'Amplitude';
    ax.gridOn = ax.gridOn || false;
    ax.xlim = [0, Math.max(...results.map(r => r.T[r.T.length - 1]))];
    return;
  }
  const r = results[0];
  return [colv(r.Y), colv(r.T)];
});
def('lsim', (a, nargout, env) => {
  need(a, 3);
  const sys = asTf(a[0]), uA = Array.from(T_(a[1]).re), tA = Array.from(T_(a[2]).re);
  if (uA.length !== tA.length) err('输入信号 u 和时间向量 t 的长度必须一样。');
  let r;
  if (sys.Ts > 0) r = discreteResp(sys, uA.length - 1, 'lsim', uA);
  else {
    const t0 = tA[0];
    const uf = t => { const tt = t + t0; let lo = 0, hi = tA.length - 1; if (tt <= tA[0]) return uA[0]; if (tt >= tA[hi]) return uA[hi]; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tA[m] <= tt) lo = m; else hi = m; } return uA[lo] + (uA[hi] - uA[lo]) * (tt - tA[lo]) / (tA[hi] - tA[lo]); };
    const sim = simTf(sys, tA[tA.length - 1] - t0, uf, 'lsim');
    r = { T: tA, Y: interp1Core(sim.T.map(t => t + t0), sim.Y, tA, 'linear', true) };
  }
  if (nargout === 0) {
    const ax = plotPrep(env);
    addLine(ax, tA, uA, { color: { name: 'muted' } });
    addLine(ax, r.T, r.Y, {});
    ax.title = 'Linear Simulation Results'; ax.xlabel = 'Time (seconds)'; ax.ylabel = 'Amplitude';
    return;
  }
  return [colv(r.Y), colv(r.T)];
});
def('bode', (a, nargout, env) => {
  need(a, 1);
  const sys = asTf(a[0]);
  let w;
  if (a.length > 1 && a[1].k === 't' && nel(a[1]) > 2) w = Array.from(a[1].re);
  else if (a.length > 1 && a[1].k === 'c') { const lo = sc(a[1].d[0]), hi = sc(a[1].d[1]); w = seq(400).map(k => lo * Math.pow(hi / lo, k / 399)); }
  else {
    const rs = polyRoots(sys.den).concat(polyRoots(sys.num)).map(r => Math.hypot(r.re, r.im)).filter(m => m > 1e-12);
    const lo = rs.length ? Math.floor(Math.log10(Math.min(...rs))) - 1 : -1, hi = rs.length ? Math.ceil(Math.log10(Math.max(...rs))) + 1 : 1;
    w = seq(400).map(k => Math.pow(10, lo + (hi - lo) * k / 399));
  }
  const evalH = om => {
    const ev = (p) => { let r = 0, i = 0; for (const c of p) { const nr = r * 0 - i * om + c, ni = r * om + i * 0; r = nr; i = ni; } return [r, i]; };
    const [nr, ni] = ev(sys.num), [dr, di] = ev(sys.den);
    return cDiv(nr, ni, dr, di);
  };
  const Hs = w.map(evalH);
  const mag = Hs.map(([r, i]) => Math.hypot(r, i));
  let ph = Hs.map(([r, i]) => Math.atan2(i, r));
  for (let k = 1; k < ph.length; k++) { while (ph[k] - ph[k - 1] > Math.PI) ph[k] -= 2 * Math.PI; while (ph[k] - ph[k - 1] < -Math.PI) ph[k] += 2 * Math.PI; }
  ph = ph.map(v => v * 180 / Math.PI);
  if (nargout === 0) {
    const fig = env.sess.figs.gcf(); fig.axes = []; fig.cur = null; fig.sgtitle = 'Bode Diagram';
    let ax = subplotSel(env, 2, 1, [1]); addLine(ax, w, mag.map(v => 20 * Math.log10(v)), {}); ax.xscale = 'log'; ax.gridOn = true; ax.ylabel = 'Magnitude (dB)';
    ax = subplotSel(env, 2, 1, [2]); addLine(ax, w, ph, {}); ax.xscale = 'log'; ax.gridOn = true; ax.ylabel = 'Phase (deg)'; ax.xlabel = 'Frequency (rad/s)';
    return;
  }
  return [colv(mag), colv(ph), colv(w)];
});
def('pzmap', (a, nargout, env) => {
  const sys = asTf(a[0]);
  const ps = polyRoots(sys.den), zs = polyRoots(sys.num);
  if (nargout > 0) return [rootsToT(ps), rootsToT(zs)];
  const ax = plotPrep(env);
  if (ps.length) addLine(ax, ps.map(p => p.re), ps.map(p => p.im), { ls: 'none', marker: 'x', ms: 9, lw: 1.5 });
  if (zs.length) addLine(ax, zs.map(p => p.re), zs.map(p => p.im), { ls: 'none', marker: 'o', ms: 8, lw: 1.5 });
  ax.refLines.push({ axis: 'x', v: 0, ls: ':', color: 'muted' }, { axis: 'y', v: 0, ls: ':', color: 'muted' });
  ax.title = 'Pole-Zero Map'; ax.xlabel = 'Real Axis (seconds^{-1})'; ax.ylabel = 'Imaginary Axis (seconds^{-1})';
});

// ---------- 字符串 ----------
function num2strScalar(x) {
  if (!isFinite(x)) return specialNum(x);
  if (x === Math.floor(x) && Math.abs(x) < 1e15) return String(x === 0 ? 0 : x);
  const ax = Math.abs(x);
  const d = Math.floor(Math.log10(ax)) + 1;
  const dgt = Math.min(16, Math.max(d + 4, 5));
  return (x < 0 ? '-' : '') + gfmt(ax, dgt);
}
function charMatrix(lines) {
  const w = Math.max(0, ...lines.map(s => s.length));
  const o = mk(lines.length, w, 'char');
  lines.forEach((s, i) => { for (let j = 0; j < w; j++) o.re[i + j * lines.length] = j < s.length ? s.charCodeAt(j) : 32; });
  return o;
}
def('num2str', a => {
  need(a, 1);
  const v = a[0];
  if (isText(v)) return v.k === 's' ? chr(v.v) : v;
  const t = T_(v, 'num2str');
  if (a.length > 1) {
    if (isText(a[1])) { const f = textOf(a[1]); const lines = []; for (let i = 0; i < t.r; i++) { let s = ''; for (let j = 0; j < t.c; j++) s += mprintf(f, [num(t.re[i + j * t.r])]); lines.push(s); } return lines.length === 1 ? chr(lines[0]) : charMatrix(lines); }
    const p = sc(a[1]);
    const lines = []; for (let i = 0; i < t.r; i++) { const parts = []; for (let j = 0; j < t.c; j++) { const x = t.re[i + j * t.r]; parts.push(isFinite(x) ? (x < 0 ? '-' : '') + gfmt(Math.abs(x), p) : specialNum(x)); } lines.push(parts.join('  ')); }
    return lines.length === 1 ? chr(lines[0]) : charMatrix(lines);
  }
  if (t.im) { const parts = []; for (let i = 0; i < nel(t); i++) { const re = t.re[i], im = t.im[i]; parts.push(num2strScalar(re) + (im < 0 ? '-' : '+') + num2strScalar(Math.abs(im)) + 'i'); } return chr(parts.join('  ')); }
  if (t.r * t.c === 0) return chr('');
  const strs = Array.from(t.re, num2strScalar);
  const w = Math.max(...strs.map(s => s.length));
  const lines = [];
  for (let i = 0; i < t.r; i++) { const parts = []; for (let j = 0; j < t.c; j++) parts.push(t.c > 1 ? padL(strs[i + j * t.r], w) : strs[i + j * t.r]); lines.push(parts.join('  ').replace(/^\s+/, i === 0 && t.r === 1 ? '' : '')); }
  if (t.r === 1) return chr(lines[0].trim());
  return charMatrix(lines);
});
def('int2str', a => B.num2str([B.round([a[0]])]));
def('mat2str', a => {
  const v = a[0], p = a.length > 1 ? sc(a[1]) : 15;
  if (isText(v)) return chr(`'${textOf(v)}'`);
  const t = T_(v);
  const f = x => t.type === 'logical' ? (x ? 'true' : 'false') : isFinite(x) ? (x < 0 ? '-' : '') + gfmt(Math.abs(x), p) : specialNum(x);
  if (t.r * t.c === 1) return chr(f(t.re[0]));
  const rows = []; for (let i = 0; i < t.r; i++) { const r = []; for (let j = 0; j < t.c; j++) r.push(f(t.re[i + j * t.r])); rows.push(r.join(' ')); }
  return chr('[' + rows.join(';') + ']');
});
function fmtEscapes(s) {
  return s.replace(/\\(n|t|\\|r|a|b|f|v|x[0-9a-fA-F]+|[0-7]{1,3})/g, (m, c) => {
    if (c === 'n') return '\n'; if (c === 't') return '\t'; if (c === '\\') return '\\'; if (c === 'r') return '\r';
    if (c === 'a' || c === 'b' || c === 'f' || c === 'v') return '';
    if (c[0] === 'x') return String.fromCharCode(parseInt(c.slice(1), 16));
    return String.fromCharCode(parseInt(c, 8));
  });
}
function fmtNumC(conv, flags, width, prec, x) {
  let body, sign = '';
  if (!isFinite(x)) body = x !== x ? 'NaN' : 'Inf';
  else {
    const ax = Math.abs(x);
    switch (conv) {
      case 'd': case 'i': case 'u':
        if (x !== Math.floor(x)) return fmtNumC('e', flags, width, prec, x);
        body = ax.toFixed(0); break;
      case 'f': case 'F': body = ax.toFixed(prec < 0 ? 6 : Math.min(prec, 100)); break;
      case 'e': case 'E': body = expo(ax, prec < 0 ? 6 : prec); if (conv === 'E') body = body.toUpperCase(); break;
      case 'g': case 'G': body = gfmt(ax, prec < 0 ? 6 : prec, flags.includes('#')); if (conv === 'G') body = body.toUpperCase(); break;
      case 'x': case 'X': body = Math.round(ax).toString(16); if (conv === 'X') body = body.toUpperCase(); break;
      case 'o': body = Math.round(ax).toString(8); break;
      default: body = String(x);
    }
  }
  if (x < 0 || Object.is(x, -0) && false) sign = '-';
  else if (flags.includes('+')) sign = '+';
  else if (flags.includes(' ')) sign = ' ';
  let s = sign + body;
  if (width > s.length) {
    if (flags.includes('-')) s = s + ' '.repeat(width - s.length);
    else if (flags.includes('0') && isFinite(x)) s = sign + '0'.repeat(width - s.length) + body;
    else s = ' '.repeat(width - s.length) + s;
  }
  return s;
}
function mprintf(fmt, args) {
  const atoms = [];
  for (const v of args) {
    if (v.k === 's') atoms.push(v.v);
    else if (v.k === 't' && v.type === 'char') atoms.push(textOf(v));
    else if (v.k === 't') { for (let i = 0; i < v.re.length; i++) atoms.push(v.type === 'logical' ? v.re[i] : v.re[i]); }
    else if (v.k === 'c') err('Function is not defined for \'cell\' inputs.', 'sprintf/fprintf 不能直接打印元胞，先用 c{k} 取出内容，或写成 c{:}。');
    else err(`sprintf/fprintf 不能打印 ${className(v)} 类型。`);
  }
  // 解析格式串
  const segs = [];
  let lit = '', i = 0;
  while (i < fmt.length) {
    const ch = fmt[i];
    if (ch === '%') {
      if (fmt[i + 1] === '%') { lit += '%'; i += 2; continue; }
      const m = /^%([-+ 0#]*)(\*|\d+)?(?:\.(\*|\d+))?([diuoxXfFeEgGcs])/.exec(fmt.slice(i));
      if (!m) { lit += ch; i++; continue; }
      if (lit) { segs.push({ lit: fmtEscapes(lit) }); lit = ''; }
      segs.push({ flags: m[1], width: m[2], prec: m[3], conv: m[4] });
      i += m[0].length; continue;
    }
    lit += ch; i++;
  }
  if (lit) segs.push({ lit: fmtEscapes(lit) });
  const nspec = segs.filter(s => !s.lit && s.lit !== '').length;
  let out = '', ai = 0;
  const one = (sg, a) => {
    let width = sg.width === '*' ? (typeof atoms[ai] === 'number' ? atoms[ai++] : 0) : sg.width ? parseInt(sg.width, 10) : 0;
    let prec = sg.prec === '*' ? (typeof atoms[ai] === 'number' ? atoms[ai++] : -1) : sg.prec !== undefined ? parseInt(sg.prec, 10) : -1;
    if (a === undefined) a = atoms[ai++];
    if (a === undefined) return '';
    if (sg.conv === 's' || sg.conv === 'c') {
      let s = typeof a === 'string' ? a : (sg.conv === 'c' || (a === Math.floor(a) && a >= 0 && a < 1114112 && sg.conv === 's' && false) ? String.fromCharCode(a) : num2strForS(a));
      if (sg.conv === 'c' && typeof a === 'number') s = String.fromCharCode(a);
      if (prec >= 0 && sg.conv === 's') s = s.slice(0, prec);
      if (width > s.length) s = sg.flags.includes('-') ? s + ' '.repeat(width - s.length) : ' '.repeat(width - s.length) + s;
      return s;
    }
    if (typeof a === 'string') {
      // 字符串套用数值格式：按 MATLAB 的做法逐字符输出编码；这里直接输出原文更符合直觉
      return width > a.length ? ' '.repeat(width - a.length) + a : a;
    }
    return fmtNumC(sg.conv, sg.flags, width, prec, a);
  };
  function num2strForS(x) { return Number.isInteger(x) ? String(x) : gfmt(Math.abs(x), 5).replace(/^/, x < 0 ? '-' : ''); }
  if (nspec === 0) { for (const sg of segs) out += sg.lit; return out; }
  if (atoms.length === 0) { for (const sg of segs) { if (sg.lit !== undefined) out += sg.lit; else if (sg.conv === 's' || sg.conv === 'c') out += ''; } return out; }
  let guard = 0;
  while (ai < atoms.length && guard++ < 100000) {
    for (const sg of segs) {
      if (sg.lit !== undefined) { out += sg.lit; continue; }
      if (ai >= atoms.length) return out;
      out += one(sg);
    }
  }
  return out;
}
def('sprintf', a => { need(a, 1); const f = textOf(a[0], 'Format'); const s = mprintf(f, a.slice(1)); return a[0].k === 's' ? mstr(s) : chr(s); });
def('fprintf', (a, nargout, env) => {
  need(a, 1);
  let args = a;
  if (args[0].k === 't' && args[0].type !== 'char' && nel(args[0]) === 1 && args.length > 1) { const fid = sc(args[0]); args = args.slice(1); if (fid === 2) { const s = mprintf(textOf(args[0]), args.slice(1)); env.sess.print(s, 'stderr'); return; } }
  if (!isText(args[0])) { const s = mprintf('%g\n', args); env.sess.print(s); return; }
  const s = mprintf(textOf(args[0]), args.slice(1));
  env.sess.print(s);
  if (nargout > 0) return num(s.length);
});
def('disp display', (a, n, env) => {
  need(a, 1);
  const v = a[0];
  if (v.k === 't' && v.r * v.c === 0 && v.type !== 'char') return;
  env.sess.printLine(dispBody(v, env.sess.format));
});
def('string', a => { need(a, 1); const v = a[0]; if (v.k === 's') return v; if (v.k === 'c') { if (nel(v) === 1) return mstr(textOf(v.d[0])); err('实验台暂不支持字符串数组。'); } if (isText(v)) return mstr(textOf(v)); const t = T_(v); if (nel(t) !== 1) err('实验台暂不支持字符串数组，只能把标量转换为字符串。'); return mstr(toStringScalar(t)); });
def('char', a => {
  need(a, 1);
  if (a.length > 1 || a[0].k === 'c') { const items = a.length > 1 ? a : a[0].d; return charMatrix(items.map(x => textOf(x))); }
  const v = a[0];
  if (v.k === 's') return chr(v.v);
  return copyT(T_(v), 'char');
});
def('cellstr', a => { const v = a[0]; if (v.k === 'c') return v; const t = textOf(v); const rows = v.k === 't' && v.r > 1 ? seq(v.r).map(i => charRow(v, i).replace(/\s+$/, '')) : [t]; return { k: 'c', r: rows.length, c: 1, d: rows.map(chr) }; });
def('str2double', a => {
  const conv = s => { s = s.trim(); if (/^[-+]?(\d+\.?\d*|\.\d+)([eEdD][-+]?\d+)?$/.test(s)) return Number(s.replace(/[dD]/, 'e')); if (/^[-+]?inf$/i.test(s)) return s[0] === '-' ? -Infinity : Infinity; return NaN; };
  const v = a[0];
  if (v.k === 'c') { const o = mk(v.r, v.c); v.d.forEach((x, i) => o.re[i] = isText(x) ? conv(textOf(x)) : NaN); return o; }
  if (!isText(v)) return num(NaN);
  return num(conv(textOf(v)));
});
def('str2num', (a, n, env) => {
  const s = textOf(a[0]);
  const sub = new Session(); sub.rng = env.sess.rng;
  try { const prog = parse('valTmp = [' + s + '];'); const e2 = { vars: sub.vars, sess: sub, depth: 0 }; execBlock(prog.body, e2); return [sub.vars.get('valTmp'), lgc(true)]; }
  catch (e) { return [emptyD(), lgc(false)]; }
});
def('strcat', a => {
  if (a.some(v => v.k === 'c')) { const n = Math.max(...a.map(v => v.k === 'c' ? nel(v) : 1)); const d = seq(n).map(i => chr(a.map(v => v.k === 'c' ? textOf(v.d[i]) : textOf(v)).join(''))); return { k: 'c', r: 1, c: n, d }; }
  if (a.some(v => v.k === 's')) return mstr(a.map(v => textOf(v)).join(''));
  return chr(a.map(v => isText(v) ? textOf(v).replace(/[ \t\n]+$/, '') : textOf(B.num2str([v]))).join(''));
});
def('upper lower', (a, n, env, name) => { const v = a[0]; const f = s => name === 'upper' ? s.toUpperCase() : s.toLowerCase(); if (v.k === 's') return mstr(f(v.v)); if (v.k === 'c') return { ...v, d: v.d.map(x => chr(f(textOf(x)))) }; return chr(f(textOf(v))); });
def('strtrim', a => { const v = a[0]; if (v.k === 's') return mstr(v.v.trim()); if (v.k === 'c') return { ...v, d: v.d.map(x => chr(textOf(x).trim())) }; return chr(textOf(v).trim()); });
def('strrep', a => { need(a, 3); const v = a[0], o = textOf(a[1]), r = textOf(a[2]); const f = s => s.split(o).join(r); if (v.k === 's') return mstr(f(v.v)); if (v.k === 'c') return { ...v, d: v.d.map(x => chr(f(textOf(x)))) }; return chr(f(textOf(v))); });
def('replace', a => B.strrep(a));
def('strsplit split', (a, n, env, name) => {
  const s = textOf(a[0]);
  let parts;
  if (a.length > 1) { const dl = a[1].k === 'c' ? a[1].d.map(x => textOf(x)) : [fmtEscapes(textOf(a[1]))]; const re = new RegExp(dl.map(d => d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')); parts = s.split(re); }
  else parts = name === 'split' ? s.trim().split(/\s+/) : s.split(/\s+/);
  return { k: 'c', r: name === 'split' ? parts.length : 1, c: name === 'split' ? 1 : parts.length, d: parts.map(chr) };
});
def('strjoin join', a => { const c = a[0]; if (c.k !== 'c') err('strjoin 的第一个参数必须是元胞数组。'); const dl = a.length > 1 ? fmtEscapes(textOf(a[1])) : ' '; return chr(c.d.map(x => textOf(x)).join(dl)); });
def('strcmp strcmpi', (a, n, env, name) => {
  need(a, 2);
  const norm = s => name === 'strcmpi' ? s.toLowerCase() : s;
  const eq = (x, y) => isText(x) && isText(y) && norm(textOf(x)) === norm(textOf(y)) && !(x.k === 't' && y.k === 't' && x.r !== y.r);
  const [x, y] = a;
  if (x.k === 'c' || y.k === 'c') { const c = x.k === 'c' ? x : y, o = c === x ? y : x; const out = mk(c.r, c.c, 'logical'); c.d.forEach((e, i) => out.re[i] = (o.k === 'c' ? eq(e, o.d[i]) : eq(e, o)) ? 1 : 0); return out; }
  return lgc(eq(x, y));
});
def('strncmp', a => lgc(textOf(a[0]).slice(0, sc(a[2])) === textOf(a[1]).slice(0, sc(a[2]))));
def('contains startsWith endsWith', (a, n, env, name) => {
  const s = textOf(a[0]), pats = a[1].k === 'c' ? a[1].d.map(x => textOf(x)) : [textOf(a[1])];
  const ic = a.length > 3 && txtIs(a[2], 'ignorecase') && truthy(a[3]);
  const S = ic ? s.toLowerCase() : s;
  return lgc(pats.some(p => { const P = ic ? p.toLowerCase() : p; return name === 'contains' ? S.includes(P) : name === 'startsWith' ? S.startsWith(P) : S.endsWith(P); }));
});
def('strfind', a => { const s = textOf(a[0]), p = textOf(a[1]); const out = []; if (p.length) for (let i = s.indexOf(p); i >= 0; i = s.indexOf(p, i + 1)) out.push(i + 1); return out.length ? rowv(out) : mk(1, 0); });
def('regexprep', a => { const s = textOf(a[0]); const re = new RegExp(textOf(a[1]).replace(/\(\?<(\w+)>/g, '(?<$1>'), 'g'); const rep = textOf(a[2]).replace(/\$(\d)/g, '$$$1'); return chr(s.replace(re, rep)); });
def('regexp', (a, nargout) => {
  const s = textOf(a[0]), re = new RegExp(textOf(a[1]), 'g');
  const opt = a.length > 2 ? textOf(a[2]) : null;
  const ms = [...s.matchAll(re)];
  if (opt === 'match') return { k: 'c', r: 1, c: ms.length, d: ms.map(m => chr(m[0])) };
  if (opt === 'tokens') return { k: 'c', r: 1, c: ms.length, d: ms.map(m => ({ k: 'c', r: 1, c: m.length - 1, d: m.slice(1).map(x => chr(x || '')) })) };
  if (opt === 'split') { const parts = s.split(new RegExp(textOf(a[1]))); return { k: 'c', r: 1, c: parts.length, d: parts.map(chr) }; }
  return ms.length ? rowv(ms.map(m => m.index + 1)) : mk(1, 0);
});
def('blanks', a => chr(' '.repeat(sc(a[0]))));
def('newline', () => chr('\n'));
def('deblank', a => chr(textOf(a[0]).replace(/[\s\0]+$/, '')));
def('fliplr_str', a => chr(textOf(a[0]).split('').reverse().join('')));
def('isspace', a => { const s = textOf(a[0]); return rowv(s.split('').map(ch => /\s/.test(ch) ? 1 : 0), 'logical'); });
def('isletter', a => { const s = textOf(a[0]); return rowv(s.split('').map(ch => /[A-Za-z]/.test(ch) ? 1 : 0), 'logical'); });
def('isstrprop', a => { const s = textOf(a[0]), k = textOf(a[1]); const re = { digit: /\d/, alpha: /[A-Za-z]/, wspace: /\s/, upper: /[A-Z]/, lower: /[a-z]/, alphanum: /[A-Za-z0-9]/ }[k] || /./; return rowv(s.split('').map(ch => re.test(ch) ? 1 : 0), 'logical'); });
def('dec2bin', a => { const v = Math.round(sc(a[0])), n = a.length > 1 ? sc(a[1]) : 0; return chr(v.toString(2).padStart(n, '0')); });
def('bin2dec', a => num(parseInt(textOf(a[0]), 2)));
def('dec2hex', a => chr(Math.round(sc(a[0])).toString(16).toUpperCase()));
def('hex2dec', a => num(parseInt(textOf(a[0]), 16)));

// ---------- 元胞与结构体 ----------
def('cell', a => { const [r, c] = dimsArgs(a, 'cell'); return cellv(r, c); });
def('num2cell', a => { const t = T_(a[0]); const d = []; for (let i = 0; i < nel(t); i++) d.push(t.im ? cnum(t.re[i], t.im[i]) : (() => { const x = mk(1, 1, t.type); x.re[0] = t.re[i]; return x; })()); return { k: 'c', r: t.r, c: t.c, d }; });
def('cell2mat', a => { const c = a[0]; if (c.k !== 'c') err('cell2mat 的输入必须是元胞数组。'); if (!nel(c)) return emptyD(); const rows = []; for (let i = 0; i < c.r; i++) { const r = []; for (let j = 0; j < c.c; j++) r.push(c.d[i + j * c.r]); rows.push(r); } return buildMatrix(rows); });
def('iscellstr', a => lgc(a[0].k === 'c' && a[0].d.every(isText)));
def('struct', a => {
  const f = new Map();
  for (let i = 0; i + 1 < a.length; i += 2) { const v = a[i + 1]; f.set(textOf(a[i]), v.k === 'c' && nel(v) === 1 ? v.d[0] : v); }
  return { k: 'st', f };
});
def('fieldnames', a => { const s = a[0]; if (s.k !== 'st') err('fieldnames 的输入必须是结构体。'); const ks = [...s.f.keys()]; return { k: 'c', r: ks.length, c: 1, d: ks.map(chr) }; });
def('rmfield', a => { const s = a[0]; const f = new Map(s.f); f.delete(textOf(a[1])); return { k: 'st', f }; });
def('getfield', a => fieldGet(a[0], textOf(a[1])));
def('setfield', a => { const f = new Map(a[0].f); f.set(textOf(a[1]), a[2]); return { k: 'st', f }; });
function applyFun(a, env, isCell, name) {
  need(a, 2);
  let fv = a[0];
  if (isText(fv)) fv = { k: 'f', name: textOf(fv), src: '@' + textOf(fv) };
  let uniform = true;
  const inputs = [];
  for (let i = 1; i < a.length; i++) {
    if (isText(a[i]) && textOf(a[i]) === 'UniformOutput') { uniform = truthy(a[i + 1]); i++; continue; }
    if (isText(a[i]) && textOf(a[i]) === 'ErrorHandler') { i++; continue; }
    inputs.push(a[i]);
  }
  const N = nel(inputs[0]), ref = inputs[0];
  const results = [];
  for (let k = 0; k < N; k++) {
    const args = inputs.map(v => isCell ? (v.k === 'c' ? v.d[k] : err(`${name} 的输入必须是元胞数组。`)) : parenGet(v, [num(k + 1)]));
    results.push(callF(fv, args, env));
    tick(env);
  }
  const R = ref.k === 't' || ref.k === 'c' ? ref.r : 1, C = ref.k === 't' || ref.k === 'c' ? ref.c : 1;
  if (!uniform) return { k: 'c', r: R, c: C, d: results };
  const o = mk(R, C, results.length && results.every(r => r.k === 't' && r.type === 'logical') ? 'logical' : 'double');
  results.forEach((r, k) => {
    if (r.k !== 't' || nel(r) !== 1) err(`Non-scalar in Uniform output, at index ${k + 1}, output 1.\nSet 'UniformOutput' to false.`, `${name} 默认要求每次调用返回一个标量。如果返回的是向量或文字，加上参数 'UniformOutput', false，结果会存成元胞数组。`);
    o.re[k] = r.re[0];
  });
  return o;
}
def('arrayfun', (a, n, env) => applyFun(a, env, false, 'arrayfun'));
def('cellfun', (a, n, env) => applyFun(a, env, true, 'cellfun'));
def('deal', (a, nargout) => { const n = Math.max(1, nargout); if (a.length === 1) return seq(n).map(() => a[0]); if (a.length < n) err('The number of outputs should match the number of inputs.'); return a.slice(0, n); });
def('func2str', a => chr(a[0].src));
def('str2func', (a, n, env) => {
  const s = textOf(a[0]).trim();
  if (s[0] !== '@') return { k: 'f', name: s, src: '@' + s };
  const prog = parse('fhTmp = ' + s + ';');
  const e2 = { vars: new Map(), sess: env.sess, depth: 0 };
  execBlock(prog.body, e2);
  return e2.vars.get('fhTmp');
});
def('feval', (a, nargout, env) => { need(a, 1); const f = isText(a[0]) ? { k: 'f', name: textOf(a[0]), src: '' } : a[0]; return callValue(f, a.slice(1), nargout, env); });

// ---------- 工作区与环境 ----------
def('nargin', (a, n, env) => { if (env.nargin === undefined) err('You can only call nargin from within a MATLAB function.'); return num(env.nargin); });
def('nargout', (a, n, env) => { if (env.nargout === undefined) err('You can only call nargout from within a MATLAB function.'); return num(env.nargout); });
def('exist', (a, n, env) => { const nm = textOf(a[0]); if (env.vars.has(nm)) return num(1); if (env.sess.funcs[nm]) return num(2); if (B[nm]) return num(5); return num(0); });
def('isvarname', a => lgc(/^[A-Za-z][A-Za-z0-9_]{0,62}$/.test(textOf(a[0])) && !KW.has(textOf(a[0]))));
def('clear clearvars', (a, n, env) => {
  const names = a.map(x => textOf(x));
  if (!names.length || names.includes('all') || names.includes('variables')) { env.vars.clear(); if (names.includes('all')) for (const k in env.sess.funcs) delete env.sess.funcs[k]; return; }
  if (names.includes('functions')) { for (const k in env.sess.funcs) delete env.sess.funcs[k]; return; }
  for (const nm of names) {
    if (nm.includes('*')) { const re = new RegExp('^' + nm.replace(/\*/g, '.*') + '$'); for (const k of [...env.vars.keys()]) if (re.test(k)) env.vars.delete(k); }
    else env.vars.delete(nm);
  }
});
def('clc home', (a, n, env) => { env.sess.out = env.sess.out.filter(x => x.kind === 'fig'); env.sess.out.push({ kind: 'clc' }); });
def('who', (a, n, env) => { const ks = [...env.vars.keys()].sort(); if (ks.length) env.sess.printLine('\nYour variables are:\n\n' + ks.join('  ') + '\n'); });
function bytesOf(v) {
  if (v.k === 't') return v.r * v.c * (v.type === 'logical' ? 1 : v.type === 'char' ? 2 : v.im ? 16 : 8);
  if (v.k === 'c') return v.d.reduce((s, x) => s + bytesOf(x) + 104, 0);
  if (v.k === 'st') return [...v.f.values()].reduce((s, x) => s + bytesOf(x) + 176, 0);
  if (v.k === 's') return 150 + 2 * v.v.length;
  return 32;
}
function sizeStr(v) { const r = v.k === 't' || v.k === 'c' ? v.r : 1, c = v.k === 't' || v.k === 'c' ? v.c : 1; return `${r}x${c}`; }
def('whos', (a, n, env) => {
  const ks = [...env.vars.keys()].sort();
  if (!ks.length) return;
  const rows = ks.map(k => { const v = env.vars.get(k); return [k, sizeStr(v), String(bytesOf(v)), className(v), v.k === 't' && v.im ? 'complex' : '']; });
  const w = [Math.max(4, ...rows.map(r => r[0].length)) + 2, 14, 7, 10];
  let s = '  ' + padR('Name', w[0]) + padR('Size', w[1]) + padL('Bytes', w[2]) + '  ' + padR('Class', w[3]) + 'Attributes\n\n';
  for (const r of rows) s += '  ' + padR(r[0], w[0]) + padR(r[1], w[1]) + padL(r[2], w[2]) + '  ' + padR(r[3], w[3]) + r[4] + '\n';
  env.sess.printLine(s);
});
def('format', (a, n, env) => {
  const s = a.map(x => textOf(x).toLowerCase()).join('');
  if (!s || s === 'short' || s === 'default') env.sess.format = 'short';
  else if (s === 'long') env.sess.format = 'long';
  else if (s === 'shortg') env.sess.format = 'shortg';
  else if (s === 'longg') env.sess.format = 'longg';
  else if (s === 'compact' || s === 'loose' || s === 'rat' || s === 'bank') { if (s === 'rat' || s === 'bank') env.sess.warn(`实验台不支持 format ${s}，已忽略。`); }
});
def('tic', (a, nargout, env) => { env.sess.ticT = (typeof performance !== 'undefined' ? performance.now() : Date.now()); if (nargout > 0) return num(env.sess.ticT); });
def('toc', (a, nargout, env) => {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const st = a.length ? sc(a[0]) : env.sess.ticT;
  if (st === null || st === undefined) err('You must call TIC without an output argument before calling TOC without an input argument.');
  const el = (now - st) / 1000;
  if (nargout > 0) return num(el);
  env.sess.printLine(`Elapsed time is ${el.toFixed(6)} seconds.`);
});
def('error', a => {
  need(a, 1);
  let args = a;
  if (args.length >= 2 && isText(args[0]) && /^[\w]+(:[\w-]+)+$/.test(textOf(args[0])) && !/\s/.test(textOf(args[0]))) args = args.slice(1);
  const msg = args.length > 1 ? mprintf(textOf(args[0]), args.slice(1)) : (isText(args[0]) ? textOf(args[0]) : textOf(args[0].f.get('message')));
  throw new MErr(msg, '这是代码里主动调用 error() 抛出的错误。');
});
def('warning', (a, n, env) => {
  if (!a.length) return;
  const first = textOf(a[0]);
  if (first === 'off' || first === 'on' || first === 'query') return;
  let args = a;
  if (args.length >= 2 && /^[\w]+(:[\w-]+)+$/.test(first)) args = args.slice(1);
  env.sess.warn(args.length > 1 ? mprintf(textOf(args[0]), args.slice(1)) : textOf(args[0]));
});
def('assert', a => { if (!truthy(a[0])) throw new MErr(a.length > 1 ? mprintf(textOf(a[1]), a.slice(2)) : 'Assertion failed.'); });
def('input keyboard inputdlg ginput uigetfile', (a, n, env, name) => err(`实验台不支持 ${name}：网页里没法弹出输入框。`, '请把需要输入的值直接写进代码，例如 n = 10;'));
def('pause beep drawnow shg more', () => undefined);
def('help doc', (a, n, env) => {
  const nm = a.length ? textOf(a[0]) : '';
  const docs = (typeof MLiteDocs !== 'undefined' && MLiteDocs) || {};
  if (!nm) { env.sess.printLine('用法：help 函数名，例如 help linspace。页面底部的「函数速查」列出了实验台支持的全部函数。'); return; }
  const d = docs[nm];
  if (d) env.sess.printLine(` ${nm}  ${d.desc}\n\n   用法：${d.usage}\n${d.example ? '   示例：' + d.example + '\n' : ''}`);
  else if (B[nm]) env.sess.printLine(` ${nm} 是实验台支持的内置函数。完整说明请查 MATLAB 官方文档：doc ${nm}`);
  else if (UNSUPPORTED[nm]) env.sess.printLine(` ${nm}：${UNSUPPORTED[nm]}`);
  else env.sess.printLine(` 没有找到 ${nm}。`);
});
def('version', () => chr('MATLAB 实验台（浏览器子集解释器）'));
def('ver', (a, n, env) => env.sess.printLine('MATLAB 实验台：浏览器里运行的 MATLAB 语法子集，不是 MathWorks 的产品。'));
def('computer', () => chr('BROWSER'));
def('now', () => num(Date.now() / 86400000 + 719529));
def('clock', () => { const d = new Date(); return rowv([d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds() + d.getMilliseconds() / 1000]); });
def('datestr', () => chr(new Date().toLocaleString('zh-CN')));

// ---------- 未实现的常用函数（给出中文说明） ----------
const symMsg = '符号计算（Symbolic Math Toolbox）需要完整的 MATLAB，实验台不支持。本页「信号与系统」一章给出了这类代码的参考输出，可以在本地 MATLAB 里运行。';
'syms sym simplify solve dsolve laplace ilaplace ztrans iztrans fourier ifourier subs vpa expand factor_sym collect limit taylor int pretty latex ezplot fimplicit symsum'.split(' ').forEach(n => UNSUPPORTED[n] = symMsg);
const fileMsg = '浏览器里的实验台读不到你电脑上的文件。可以把数据直接写成矩阵，例如 data = [1 2; 3 4];，或者在本地 MATLAB 中运行这段代码。';
'readmatrix readtable readcell xlsread xlswrite csvread csvwrite writematrix writetable writecell load save importdata fopen fclose fgetl fgets fscanf textscan dlmread dlmwrite imread imwrite audioread audiowrite dir ls cd pwd mkdir'.split(' ').forEach(n => UNSUPPORTED[n] = fileMsg);
const plot3Msg = '实验台目前只画二维图。三维曲面、等高线等请在本地 MATLAB 中运行。';
'surf mesh plot3 contour contourf contour3 meshc surfc quiver quiver3 imagesc imshow image pcolor fill3 scatter3 waterfall ribbon'.split(' ').forEach(n => UNSUPPORTED[n] = plot3Msg);
'ga gamultiobj particleswarm simulannealbnd patternsearch'.split(' ').forEach(n => UNSUPPORTED[n] = '全局优化工具箱（Global Optimization Toolbox）实验台未实现。小规模问题可以先用 fminsearch 或 fmincon 多试几个初值。');
'fitlm regress glmfit stepwiselm kmeans pca fitcsvm fitctree TreeBagger fitrgp kfoldLoss crossval'.split(' ').forEach(n => UNSUPPORTED[n] = '统计与机器学习工具箱的这个函数实验台未实现。线性回归可以用 polyfit 或 A\\b 最小二乘代替。');
'graph digraph shortestpath minspantree maxflow'.split(' ').forEach(n => UNSUPPORTED[n] = '图论函数实验台未实现，请在本地 MATLAB 中运行。Dijkstra、Floyd 这类算法也可以用 for 循环自己写，正好练手。');
'ss c2d d2c margin rlocus nyquist nichols zpk lqr place ctrb obsv'.split(' ').forEach(n => UNSUPPORTED[n] = '这个控制系统工具箱函数实验台未实现。实验台支持 tf、step、impulse、lsim、bode、pzmap、feedback。');
'sim simulink open_system'.split(' ').forEach(n => UNSUPPORTED[n] = 'Simulink 是图形化建模环境，只能在本地 MATLAB 中使用。');
'sound soundsc audioplayer'.split(' ').forEach(n => UNSUPPORTED[n] = '实验台不能播放声音。');
'expm logm sqrtm svd qr chol'.split(' ').forEach(n => UNSUPPORTED[n] = '这个矩阵分解函数实验台暂未实现，请在本地 MATLAB 中运行。');
