// ============================================================
//  运算符与线性代数
// ============================================================

function bshape(a, b) {
  const r = a.r === b.r ? a.r : a.r === 1 ? b.r : b.r === 1 ? a.r : -1;
  const c = a.c === b.c ? a.c : a.c === 1 ? b.c : b.c === 1 ? a.c : -1;
  if (r < 0 || c < 0) err('Arrays have incompatible sizes for this operation.', H.incompat);
  return [r, c];
}
function ewise(a, b, f, type) {
  const [r, c] = bshape(a, b);
  const o = mk(r, c, type), A = a.re, Bv = b.re, O = o.re, n = r * c;
  const an = a.r * a.c, bn = b.r * b.c;
  if (an === n && bn === n) for (let i = 0; i < n; i++) O[i] = f(A[i], Bv[i]);
  else if (an === 1 && bn === n) { const x = A[0]; for (let i = 0; i < n; i++) O[i] = f(x, Bv[i]); }
  else if (bn === 1 && an === n) { const y = Bv[0]; for (let i = 0; i < n; i++) O[i] = f(A[i], y); }
  else {
    const ar = a.r, br = b.r, a1 = a.r === 1, ac = a.c === 1, b1 = b.r === 1, bc = b.c === 1;
    for (let j = 0; j < c; j++) for (let i = 0; i < r; i++)
      O[i + j * r] = f(A[(a1 ? 0 : i) + (ac ? 0 : j) * ar], Bv[(b1 ? 0 : i) + (bc ? 0 : j) * br]);
  }
  return o;
}
function ewiseC(a, b, f) {
  const [r, c] = bshape(a, b);
  const o = mk(r, c, 'double', true);
  const ar = a.r, br = b.r, a1 = a.r === 1, ac = a.c === 1, b1 = b.r === 1, bc = b.c === 1;
  const AI = a.im, BI = b.im;
  for (let j = 0; j < c; j++) for (let i = 0; i < r; i++) {
    const ia = (a1 ? 0 : i) + (ac ? 0 : j) * ar, ib = (b1 ? 0 : i) + (bc ? 0 : j) * br;
    const z = f(a.re[ia], AI ? AI[ia] : 0, b.re[ib], BI ? BI[ib] : 0);
    o.re[i + j * r] = z[0]; o.im[i + j * r] = z[1];
  }
  return dropIm(o);
}
function numOperand(v, op) {
  if (v.k === 't') return v;
  const names = { '+': 'plus', '-': 'minus', '*': 'mtimes', '.*': 'times', '/': 'mrdivide', './': 'rdivide', '^': 'mpower', '.^': 'power', '<': 'lt', '>': 'gt', '<=': 'le', '>=': 'ge', '==': 'eq', '~=': 'ne', '&': 'and', '|': 'or', '\\': 'mldivide' };
  err(`Operator '${op}' is not supported for operands of type '${className(v)}'.`, v.k === 'c' ? '元胞数组不能直接参与运算，先用 c{k} 取出里面的内容。' : v.k === 'f' ? '函数句柄要先调用，比如 f(2)，才能得到数值。' : '');
}
function toStringScalar(v) {
  if (v.k === 's') return v.v;
  if (v.k === 't' && v.type === 'char') return textOf(v);
  if (v.k === 't' && v.r * v.c === 1) return v.type === 'logical' ? (v.re[0] ? 'true' : 'false') : gfmt(Math.abs(v.re[0]), 5).replace(/^/, v.re[0] < 0 ? '-' : '');
  err('实验台只支持把标量转换成字符串。');
}
function cDiv(a, b, c, d) { const den = c * c + d * d; return [(a * c + b * d) / den, (b * c - a * d) / den]; }
function cPow(a, b, c, d) {
  if (a === 0 && b === 0) { if (c === 0 && d === 0) return [1, 0]; if (c > 0) return [0, 0]; return [Infinity, 0]; }
  const lr = Math.log(Math.hypot(a, b)), th = Math.atan2(b, a);
  const er = c * lr - d * th, ei = d * lr + c * th, m = Math.exp(er);
  return [m * Math.cos(ei), m * Math.sin(ei)];
}

function binop(op, a, b) {
  if (a.k === 'tf' || b.k === 'tf') return tfBinop(op, a, b);
  if ((a.k === 's' || b.k === 's')) {
    if (op === '+') return mstr(toStringScalar(a) + toStringScalar(b));
    if (op === '==' || op === '~=') { const eq = toStringScalar(a) === toStringScalar(b); return lgc(op === '==' ? eq : !eq); }
    if (['<', '>', '<=', '>='].includes(op)) { const x = toStringScalar(a), y = toStringScalar(b); return lgc(op === '<' ? x < y : op === '>' ? x > y : op === '<=' ? x <= y : x >= y); }
  }
  a = numOperand(a, op); b = numOperand(b, op);
  const cx = a.im || b.im;
  switch (op) {
    case '+': return cx ? ewiseC(a, b, (x, xi, y, yi) => [x + y, xi + yi]) : ewise(a, b, (x, y) => x + y);
    case '-': return cx ? ewiseC(a, b, (x, xi, y, yi) => [x - y, xi - yi]) : ewise(a, b, (x, y) => x - y);
    case '.*': return cx ? ewiseC(a, b, (x, xi, y, yi) => [x * y - xi * yi, x * yi + xi * y]) : ewise(a, b, (x, y) => x * y);
    case './': return cx ? ewiseC(a, b, (x, xi, y, yi) => cDiv(x, xi, y, yi)) : ewise(a, b, (x, y) => x / y);
    case '.\\': return binop('./', b, a);
    case '.^': return epow(a, b);
    case '*': return mtimes(a, b);
    case '/': return mrdivide(a, b);
    case '\\': return mldivide(a, b);
    case '^': return mpower(a, b);
    case '==': return cx ? ewiseCmpC(a, b, true) : ewise(a, b, (x, y) => x === y ? 1 : 0, 'logical');
    case '~=': return cx ? opNot(ewiseCmpC(a, b, true)) : ewise(a, b, (x, y) => x !== y ? 1 : 0, 'logical');
    case '<': return ewise(a, b, (x, y) => x < y ? 1 : 0, 'logical');
    case '<=': return ewise(a, b, (x, y) => x <= y ? 1 : 0, 'logical');
    case '>': return ewise(a, b, (x, y) => x > y ? 1 : 0, 'logical');
    case '>=': return ewise(a, b, (x, y) => x >= y ? 1 : 0, 'logical');
    case '&': return ewise(a, b, (x, y) => { if (x !== x || y !== y) err("NaN's cannot be converted to logicals."); return x !== 0 && y !== 0 ? 1 : 0; }, 'logical');
    case '|': return ewise(a, b, (x, y) => { if (x !== x || y !== y) err("NaN's cannot be converted to logicals."); return x !== 0 || y !== 0 ? 1 : 0; }, 'logical');
  }
  err('未知运算符 ' + op);
}
function ewiseCmpC(a, b) {
  const o = ewiseC(a, b, (x, xi, y, yi) => [x === y && xi === yi ? 1 : 0, 0]);
  o.type = 'logical'; return o;
}
function epow(a, b) {
  let needC = !!(a.im || b.im);
  if (!needC) {
    const [r, c] = bshape(a, b);
    const test = ewise(a, b, (x, y) => (x < 0 && y !== Math.floor(y)) ? 1 : 0);
    for (let i = 0; i < r * c; i++) if (test.re[i]) { needC = true; break; }
  }
  if (needC) return ewiseC(a, b, cPow);
  return ewise(a, b, Math.pow);
}
function neg(a) {
  if (a.k === 'tf') return { k: 'tf', num: a.num.map(x => -x), den: a.den.slice(), Ts: a.Ts };
  a = numOperand(a, '-');
  const o = mk(a.r, a.c, 'double', !!a.im);
  for (let i = 0; i < o.re.length; i++) { o.re[i] = -a.re[i]; if (a.im) o.im[i] = -a.im[i]; }
  return o;
}
function opNot(a) {
  a = numOperand(a, '~');
  const o = mk(a.r, a.c, 'logical');
  for (let i = 0; i < o.re.length; i++) { const x = a.re[i]; if (x !== x) err("NaN's cannot be converted to logicals."); o.re[i] = (x === 0 && !(a.im && a.im[i] !== 0)) ? 1 : 0; }
  return o;
}
function transpose(a, conj) {
  if (a.k === 's' || a.k === 'f' || a.k === 'st' || a.k === 'tf') return a;
  if (a.k === 'c') {
    const d = new Array(a.r * a.c);
    for (let i = 0; i < a.r; i++) for (let j = 0; j < a.c; j++) d[j + i * a.c] = a.d[i + j * a.r];
    return { k: 'c', r: a.c, c: a.r, d };
  }
  const o = mk(a.c, a.r, a.type, !!a.im);
  for (let i = 0; i < a.r; i++) for (let j = 0; j < a.c; j++) {
    o.re[j + i * a.c] = a.re[i + j * a.r];
    if (a.im) o.im[j + i * a.c] = conj ? -a.im[i + j * a.r] : a.im[i + j * a.r];
  }
  return o;
}
function mtimes(a, b) {
  if (a.r * a.c === 1 || b.r * b.c === 1) return binop('.*', a, b);
  if (a.c !== b.r) err('Incorrect dimensions for matrix multiplication. Check that the number of columns in the first matrix matches the number of rows in the second matrix. To operate on each element of the matrix individually, use TIMES (.*) for elementwise multiplication.', H.mtimes);
  const R = a.r, C = b.c, K = a.c, cx = a.im || b.im;
  const o = mk(R, C, 'double', !!cx);
  for (let j = 0; j < C; j++) for (let k = 0; k < K; k++) {
    const br = b.re[k + j * K], bi = b.im ? b.im[k + j * K] : 0;
    if (br === 0 && bi === 0) continue;
    for (let i = 0; i < R; i++) {
      const ar = a.re[i + k * R], ai = a.im ? a.im[i + k * R] : 0;
      o.re[i + j * R] += ar * br - ai * bi;
      if (cx) o.im[i + j * R] += ar * bi + ai * br;
    }
  }
  return cx ? dropIm(o) : o;
}
function eyeT(n) { const o = mk(n, n); for (let i = 0; i < n; i++) o.re[i + i * n] = 1; return o; }
function mpower(a, b) {
  if (a.r * a.c === 1 && b.r * b.c === 1) return epow(a, b);
  if (a.r !== a.c || b.r * b.c !== 1) err('Incorrect dimensions for raising a matrix to a power. Check that the matrix is square and the power is a scalar. To operate on each element of the matrix individually, use POWER (.^) for elementwise power.', H.mpower);
  let p = b.re[0];
  if (p !== Math.floor(p)) err('实验台只支持整数次矩阵乘方。', '非整数次幂请用 expm/sqrtm（实验台未实现），或改用逐元素运算 .^');
  let base = a;
  if (p < 0) { base = matInv(a); p = -p; }
  let res = eyeT(a.r);
  while (p > 0) { if (p & 1) res = mtimes(res, base); base = mtimes(base, base); p = Math.floor(p / 2); }
  return res;
}
function mrdivide(a, b) {
  if (b.r * b.c === 1) return binop('./', a, b);
  if (a.c !== b.c) err('Matrix dimensions must agree.', '右除 A/B 要求 A 和 B 的列数相同。');
  return transpose(mldivide(transpose(b, false), transpose(a, false)), false);
}
function mldivide(a, b) {
  if (a.r * a.c === 1) return binop('./', b, a);
  if (a.r !== b.r) err('Matrix dimensions must agree.', '左除 A\\b 要求 A 的行数和 b 的行数相同。解方程组 Ax = b 时，b 通常是列向量，可以写成 b = [1; 2; 3]。');
  if (a.r === a.c) return gaussSolve(a, b, true);
  if (a.im || b.im) err('实验台的最小二乘只支持实数矩阵。');
  if (a.r > a.c) return qrSolve(a, b);
  // 欠定：最小范数解 A'(AA')^{-1}b
  const at = transpose(a, false);
  return mtimes(at, gaussSolve(mtimes(a, at), b, true));
}
// 复数兼容的列主元高斯消元
function gaussSolve(A, Bm, warn) {
  const n = A.r, m = Bm.c;
  const ar = Float64Array.from(A.re), ai = A.im ? Float64Array.from(A.im) : new Float64Array(n * n);
  const br = Float64Array.from(Bm.re), bi = Bm.im ? Float64Array.from(Bm.im) : new Float64Array(n * m);
  let maxA = 0; for (let i = 0; i < n * n; i++) maxA = Math.max(maxA, Math.hypot(ar[i], ai[i]));
  let singular = false;
  const tol = n * maxA * 2.220446049250313e-16;
  let minPiv = Infinity;
  for (let k = 0; k < n; k++) {
    let piv = k, pv = -1;
    for (let i = k; i < n; i++) { const v = Math.hypot(ar[i + k * n], ai[i + k * n]); if (v > pv) { pv = v; piv = i; } }
    minPiv = Math.min(minPiv, pv);
    if (pv <= tol) { singular = true; continue; }
    if (piv !== k) {
      for (let j = 0; j < n; j++) { let t = ar[k + j * n]; ar[k + j * n] = ar[piv + j * n]; ar[piv + j * n] = t; t = ai[k + j * n]; ai[k + j * n] = ai[piv + j * n]; ai[piv + j * n] = t; }
      for (let j = 0; j < m; j++) { let t = br[k + j * n]; br[k + j * n] = br[piv + j * n]; br[piv + j * n] = t; t = bi[k + j * n]; bi[k + j * n] = bi[piv + j * n]; bi[piv + j * n] = t; }
    }
    const pr = ar[k + k * n], pi = ai[k + k * n];
    for (let i = k + 1; i < n; i++) {
      const [fr, fi] = cDiv(ar[i + k * n], ai[i + k * n], pr, pi);
      if (fr === 0 && fi === 0) continue;
      for (let j = k; j < n; j++) { const xr = ar[k + j * n], xi = ai[k + j * n]; ar[i + j * n] -= fr * xr - fi * xi; ai[i + j * n] -= fr * xi + fi * xr; }
      for (let j = 0; j < m; j++) { const xr = br[k + j * n], xi = bi[k + j * n]; br[i + j * n] -= fr * xr - fi * xi; bi[i + j * n] -= fr * xi + fi * xr; }
    }
  }
  if (singular && warn) curSession && curSession.warn('Matrix is singular to working precision.');
  else if (warn && maxA > 0 && minPiv / maxA < 1e-12 && curSession) curSession.warn('Matrix is close to singular or badly scaled. Results may be inaccurate.');
  const o = mk(n, m, 'double', true);
  for (let j = 0; j < m; j++) for (let i = n - 1; i >= 0; i--) {
    let sr = br[i + j * n], si = bi[i + j * n];
    for (let k = i + 1; k < n; k++) { const xr = ar[i + k * n], xi = ai[i + k * n], yr = o.re[k + j * n], yi = o.im[k + j * n]; sr -= xr * yr - xi * yi; si -= xr * yi + xi * yr; }
    const [qr, qi] = cDiv(sr, si, ar[i + i * n], ai[i + i * n]);
    o.re[i + j * n] = qr; o.im[i + j * n] = qi;
  }
  return dropIm(o);
}
// Householder QR 最小二乘（实数，行数 ≥ 列数）
function qrSolve(A, Bm) {
  const m = A.r, n = A.c, k = Bm.c;
  const a = Float64Array.from(A.re), b = Float64Array.from(Bm.re);
  for (let j = 0; j < n; j++) {
    let nrm = 0; for (let i = j; i < m; i++) nrm += a[i + j * m] * a[i + j * m];
    nrm = Math.sqrt(nrm);
    if (nrm === 0) continue;
    const alpha = a[j + j * m] > 0 ? -nrm : nrm;
    const v = new Float64Array(m);
    for (let i = j; i < m; i++) v[i] = a[i + j * m];
    v[j] -= alpha;
    let vv = 0; for (let i = j; i < m; i++) vv += v[i] * v[i];
    if (vv === 0) continue;
    for (let c = j; c < n; c++) { let s = 0; for (let i = j; i < m; i++) s += v[i] * a[i + c * m]; s = 2 * s / vv; for (let i = j; i < m; i++) a[i + c * m] -= s * v[i]; }
    for (let c = 0; c < k; c++) { let s = 0; for (let i = j; i < m; i++) s += v[i] * b[i + c * m]; s = 2 * s / vv; for (let i = j; i < m; i++) b[i + c * m] -= s * v[i]; }
  }
  const o = mk(n, k);
  for (let c = 0; c < k; c++) for (let i = n - 1; i >= 0; i--) {
    let s = b[i + c * m];
    for (let j = i + 1; j < n; j++) s -= a[i + j * m] * o.re[j + c * n];
    const d = a[i + i * m];
    o.re[i + c * n] = Math.abs(d) < 1e-14 ? 0 : s / d;
  }
  return o;
}
function matInv(a) {
  if (a.r !== a.c) err('Matrix must be square.', 'inv 只能对方阵求逆。非方阵可以考虑 pinv（实验台未实现）或用 A\\b 求最小二乘解。');
  return gaussSolve(a, eyeT(a.r), true);
}
function matDet(a) {
  if (a.r !== a.c) err('Matrix must be square.', 'det 只能对方阵计算行列式。');
  const n = a.r;
  if (n === 0) return [1, 0];
  const ar = Float64Array.from(a.re), ai = a.im ? Float64Array.from(a.im) : new Float64Array(n * n);
  let dr = 1, di = 0;
  for (let k = 0; k < n; k++) {
    let piv = k, pv = -1;
    for (let i = k; i < n; i++) { const v = Math.hypot(ar[i + k * n], ai[i + k * n]); if (v > pv) { pv = v; piv = i; } }
    if (pv === 0) return [0, 0];
    if (piv !== k) { for (let j = 0; j < n; j++) { let t = ar[k + j * n]; ar[k + j * n] = ar[piv + j * n]; ar[piv + j * n] = t; t = ai[k + j * n]; ai[k + j * n] = ai[piv + j * n]; ai[piv + j * n] = t; } dr = -dr; di = -di; }
    const pr = ar[k + k * n], pi = ai[k + k * n];
    const ndr = dr * pr - di * pi, ndi = dr * pi + di * pr; dr = ndr; di = ndi;
    for (let i = k + 1; i < n; i++) {
      const [fr, fi] = cDiv(ar[i + k * n], ai[i + k * n], pr, pi);
      for (let j = k; j < n; j++) { const xr = ar[k + j * n], xi = ai[k + j * n]; ar[i + j * n] -= fr * xr - fi * xi; ai[i + j * n] -= fr * xi + fi * xr; }
    }
  }
  return [dr, di];
}
function matRank(a) {
  const m = a.r, n = a.c, A = Float64Array.from(a.re);
  let maxA = 0; for (const x of A) maxA = Math.max(maxA, Math.abs(x));
  const tol = Math.max(m, n) * maxA * 2.220446049250313e-16 * 10;
  let rank = 0;
  const rowUsed = new Array(m).fill(false);
  for (let j = 0; j < n; j++) {
    let piv = -1, pv = tol;
    for (let i = 0; i < m; i++) if (!rowUsed[i] && Math.abs(A[i + j * m]) > pv) { pv = Math.abs(A[i + j * m]); piv = i; }
    if (piv < 0) continue;
    rowUsed[piv] = true; rank++;
    for (let i = 0; i < m; i++) if (i !== piv) {
      const f = A[i + j * m] / A[piv + j * m];
      if (f !== 0) for (let c = j; c < n; c++) A[i + c * m] -= f * A[piv + c * m];
    }
  }
  return rank;
}
// 对称矩阵 Jacobi 特征分解
function eigSym(a) {
  const n = a.r, A = Float64Array.from(a.re), V = new Float64Array(n * n);
  for (let i = 0; i < n; i++) V[i + i * n] = 1;
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i + j * n] * A[i + j * n];
    if (off < 1e-30) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      const apq = A[p + q * n];
      if (Math.abs(apq) < 1e-300) continue;
      const app = A[p + p * n], aqq = A[q + q * n];
      const th = (aqq - app) / (2 * apq);
      const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1));
      const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) {
        const akp = A[k + p * n], akq = A[k + q * n];
        A[k + p * n] = c * akp - s * akq; A[k + q * n] = s * akp + c * akq;
      }
      for (let k = 0; k < n; k++) {
        const apk = A[p + k * n], aqk = A[q + k * n];
        A[p + k * n] = c * apk - s * aqk; A[q + k * n] = s * apk + c * aqk;
      }
      for (let k = 0; k < n; k++) {
        const vkp = V[k + p * n], vkq = V[k + q * n];
        V[k + p * n] = c * vkp - s * vkq; V[k + q * n] = s * vkp + c * vkq;
      }
    }
  }
  const order = seq(n).sort((x, y) => A[x + x * n] - A[y + y * n]);
  const vals = order.map(i => A[i + i * n]);
  const vecs = mk(n, n);
  order.forEach((src, dst) => {
    let big = 0; for (let k = 0; k < n; k++) if (Math.abs(V[k + src * n]) > Math.abs(big)) big = V[k + src * n];
    const sgn = 1;
    for (let k = 0; k < n; k++) vecs.re[k + dst * n] = sgn * V[k + src * n];
  });
  return { vals, vecs };
}
function charPoly(a) {
  // Faddeev–LeVerrier
  const n = a.r;
  let M = mk(n, n);
  const c = new Array(n + 1).fill(0); c[0] = 1;
  const I = eyeT(n);
  for (let k = 1; k <= n; k++) {
    M = binop('+', mtimes(a, M), binop('*', num(c[k - 1]), I));
    const AM = mtimes(a, M);
    let tr = 0; for (let i = 0; i < n; i++) tr += AM.re[i + i * n];
    c[k] = -tr / k;
  }
  return c;
}
// 多项式求根（Aberth 迭代），返回 [{re, im}]
function polyRoots(coef) {
  let a = coef.slice();
  while (a.length && a[0] === 0) a.shift();
  let nz = 0;
  while (a.length > 1 && a[a.length - 1] === 0) { a.pop(); nz++; }
  const n = a.length - 1, roots = [];
  if (n >= 1) {
    const b = a.map(x => x / a[0]);
    if (n === 1) roots.push({ re: -b[1], im: 0 });
    else if (n === 2) {
      const p = b[1], q = b[2], D = p * p - 4 * q;
      if (D >= 0) { const s = -(p + Math.sign(p || 1) * Math.sqrt(D)) / 2; const r1 = s, r2 = s !== 0 ? q / s : 0; roots.push({ re: r1, im: 0 }, { re: r2, im: 0 }); }
      else { const sd = Math.sqrt(-D) / 2; roots.push({ re: -p / 2, im: sd }, { re: -p / 2, im: -sd }); }
    } else {
      let R = 0; for (let i = 1; i <= n; i++) R = Math.max(R, Math.pow(Math.abs(b[i]), 1 / i));
      R = 2 * R || 1;
      let zr = [], zi = [];
      for (let k = 0; k < n; k++) { const th = 2 * Math.PI * k / n + 0.4; zr.push(R * 0.6 * Math.cos(th)); zi.push(R * 0.6 * Math.sin(th)); }
      const evalP = (xr, xi) => {
        let pr = 1, pi = 0, dr = 0, di = 0;
        for (let i = 1; i <= n; i++) {
          const ndr = dr * xr - di * xi + pr, ndi = dr * xi + di * xr + pi; dr = ndr; di = ndi;
          const npr = pr * xr - pi * xi + b[i], npi = pr * xi + pi * xr; pr = npr; pi = npi;
        }
        return [pr, pi, dr, di];
      };
      for (let it = 0; it < 800; it++) {
        let maxd = 0;
        for (let k = 0; k < n; k++) {
          const [pr, pi, dr, di] = evalP(zr[k], zi[k]);
          if (pr === 0 && pi === 0) continue;
          const [qr, qi] = cDiv(pr, pi, dr, di); // p/p'
          let sr = 0, si = 0;
          for (let j = 0; j < n; j++) if (j !== k) { const [ur, ui] = cDiv(1, 0, zr[k] - zr[j], zi[k] - zi[j]); sr += ur; si += ui; }
          // w = q / (1 - q*s)
          const den = [1 - (qr * sr - qi * si), -(qr * si + qi * sr)];
          const [wr, wi] = cDiv(qr, qi, den[0], den[1]);
          if (isFinite(wr) && isFinite(wi)) { zr[k] -= wr; zi[k] -= wi; maxd = Math.max(maxd, Math.hypot(wr, wi) / (Math.hypot(zr[k], zi[k]) || 1)); }
        }
        if (maxd < 1e-15) break;
      }
      for (let k = 0; k < n; k++) {
        let re = zr[k], im = zi[k];
        if (Math.abs(im) < 1e-9 * Math.max(1, Math.abs(re))) {
          // 牛顿迭代修正实根
          for (let t = 0; t < 5; t++) { const [pr, , dr] = evalP(re, 0); if (dr === 0) break; re -= pr / dr; }
          im = 0;
        }
        roots.push({ re, im });
      }
      // 共轭配对
      for (const r of roots) if (r.im !== 0) {
        const mate = roots.find(q => q !== r && q.im !== 0 && Math.abs(q.re - r.re) < 1e-7 * Math.max(1, Math.abs(r.re)) && Math.abs(q.im + r.im) < 1e-7 * Math.max(1, Math.abs(r.im)));
        if (mate) { const mr = (r.re + mate.re) / 2, mi = (Math.abs(r.im) + Math.abs(mate.im)) / 2; r.re = mr; mate.re = mr; r.im = Math.sign(r.im) * mi; mate.im = -r.im; }
      }
    }
  }
  roots.sort((x, y) => {
    const mx = Math.hypot(x.re, x.im), my = Math.hypot(y.re, y.im);
    if (Math.abs(mx - my) > 1e-9 * Math.max(1, mx)) return my - mx;
    if (Math.abs(x.re - y.re) > 1e-12) return y.re - x.re;
    return y.im - x.im;
  });
  for (let i = 0; i < nz; i++) roots.push({ re: 0, im: 0 });
  return roots;
}
function rootsToT(rs) {
  const o = mk(rs.length, 1, 'double', true);
  rs.forEach((r, i) => { o.re[i] = Math.abs(r.re) < 1e-14 ? 0 : r.re; o.im[i] = r.im; });
  return dropIm(o);
}
function matEig(a, nargout) {
  if (a.r !== a.c) err('Matrix must be square.', 'eig 只能对方阵求特征值。');
  const n = a.r;
  let sym = !a.im;
  if (sym) for (let i = 0; i < n && sym; i++) for (let j = i + 1; j < n; j++) if (Math.abs(a.re[i + j * n] - a.re[j + i * n]) > 1e-12 * (Math.abs(a.re[i + j * n]) + 1)) { sym = false; break; }
  if (sym) {
    const { vals, vecs } = eigSym(a);
    if (nargout < 2) return [colv(vals)];
    const D = mk(n, n); vals.forEach((v, i) => D.re[i + i * n] = v);
    return [vecs, D];
  }
  if (a.im) err('实验台的 eig 不支持复数矩阵。');
  if (n > 12) err('实验台的 eig 对非对称矩阵只支持 12 阶以内。');
  const rs = polyRoots(charPoly(a));
  if (nargout < 2) return [rootsToT(rs)];
  // 逆迭代求特征向量
  const V = mk(n, n, 'double', true), D = mk(n, n, 'double', true);
  rs.forEach((lam, k) => {
    const shift = mk(n, n, 'double', true);
    for (let i = 0; i < n * n; i++) shift.re[i] = a.re[i];
    const eps = 1e-10 * (Math.hypot(lam.re, lam.im) + 1);
    for (let i = 0; i < n; i++) { shift.re[i + i * n] -= lam.re + eps; shift.im[i + i * n] -= lam.im; }
    let x = mk(n, 1, 'double', true); for (let i = 0; i < n; i++) x.re[i] = 1 + i * 0.1;
    for (let t = 0; t < 3; t++) {
      x = gaussSolve(shift, x, false);
      if (!x.im) x.im = new Float64Array(n);
      let s = 0; for (let i = 0; i < n; i++) s += x.re[i] * x.re[i] + x.im[i] * x.im[i];
      s = Math.sqrt(s); for (let i = 0; i < n; i++) { x.re[i] /= s; x.im[i] /= s; }
    }
    // 归一化相位：使最大分量为实数
    let bi = 0; for (let i = 1; i < n; i++) if (Math.hypot(x.re[i], x.im[i]) > Math.hypot(x.re[bi], x.im[bi])) bi = i;
    const ph = Math.atan2(x.im[bi], x.re[bi]), cr = Math.cos(-ph), ci = Math.sin(-ph);
    for (let i = 0; i < n; i++) { const r = x.re[i] * cr - x.im[i] * ci, im = x.re[i] * ci + x.im[i] * cr; V.re[i + k * n] = Math.abs(r) < 1e-14 ? 0 : r; V.im[i + k * n] = Math.abs(im) < 1e-14 ? 0 : im; }
    D.re[k + k * n] = lam.re; D.im[k + k * n] = lam.im;
  });
  return [dropIm(V), dropIm(D)];
}

// ---------- 快速傅里叶变换 ----------
function fftRadix2(re, im, inv) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (inv ? 2 : -2) * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let j = 0; j < len / 2; j++) {
        const ur = re[i + j], ui = im[i + j];
        const vr = re[i + j + len / 2] * cr - im[i + j + len / 2] * ci, vi = re[i + j + len / 2] * ci + im[i + j + len / 2] * cr;
        re[i + j] = ur + vr; im[i + j] = ui + vi;
        re[i + j + len / 2] = ur - vr; im[i + j + len / 2] = ui - vi;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}
function fftAny(re, im, inv) {
  const n = re.length;
  if (n <= 1) return;
  if ((n & (n - 1)) === 0) { fftRadix2(re, im, inv); return; }
  // Bluestein
  let m = 1; while (m < 2 * n - 1) m <<= 1;
  const s = inv ? 1 : -1;
  const wr = new Float64Array(n), wi = new Float64Array(n);
  for (let k = 0; k < n; k++) { const a = s * Math.PI * ((k * k) % (2 * n)) / n; wr[k] = Math.cos(a); wi[k] = Math.sin(a); }
  const ar = new Float64Array(m), ai = new Float64Array(m), br = new Float64Array(m), bi = new Float64Array(m);
  for (let k = 0; k < n; k++) { ar[k] = re[k] * wr[k] - im[k] * wi[k]; ai[k] = re[k] * wi[k] + im[k] * wr[k]; }
  br[0] = wr[0]; bi[0] = -wi[0];
  for (let k = 1; k < n; k++) { br[k] = br[m - k] = wr[k]; bi[k] = bi[m - k] = -wi[k]; }
  fftRadix2(ar, ai, false); fftRadix2(br, bi, false);
  for (let k = 0; k < m; k++) { const r = ar[k] * br[k] - ai[k] * bi[k], i = ar[k] * bi[k] + ai[k] * br[k]; ar[k] = r; ai[k] = i; }
  fftRadix2(ar, ai, true);
  for (let k = 0; k < n; k++) { const r = ar[k] / m, i = ai[k] / m; re[k] = r * wr[k] - i * wi[k]; im[k] = r * wi[k] + i * wr[k]; }
}

// ---------- 传递函数 tf ----------
function trimLead(p) { let i = 0; while (i < p.length - 1 && Math.abs(p[i]) < 1e-14 * Math.max(...p.map(Math.abs))) i++; return p.slice(i); }
function pconv(a, b) { const o = new Array(a.length + b.length - 1).fill(0); for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) o[i + j] += a[i] * b[j]; return o; }
function padd(a, b) { const n = Math.max(a.length, b.length), o = new Array(n).fill(0); a.forEach((x, i) => o[n - a.length + i] += x); b.forEach((x, i) => o[n - b.length + i] += x); return o; }
function mkTf(num, den, Ts) {
  num = trimLead(num); den = trimLead(den);
  return { k: 'tf', num, den, Ts: Ts || 0 };
}
function asTf(v, Ts) {
  if (v.k === 'tf') return v;
  if (v.k === 't' && v.r * v.c === 1) return { k: 'tf', num: [v.re[0]], den: [1], Ts: Ts || 0 };
  err('传递函数只能和标量或另一个传递函数运算。');
}
function tfBinop(op, a, b) {
  const Ts = (a.k === 'tf' ? a.Ts : 0) || (b.k === 'tf' ? b.Ts : 0);
  if (op === '^') {
    const n = sc(b);
    if (n !== Math.floor(n)) err('传递函数只能做整数次幂。');
    let r = { k: 'tf', num: [1], den: [1], Ts }, base = asTf(a, Ts);
    if (n < 0) base = { k: 'tf', num: base.den, den: base.num, Ts };
    for (let i = 0; i < Math.abs(n); i++) r = tfBinop('*', r, base);
    return mkTf(r.num, r.den, Ts);
  }
  const x = asTf(a, Ts), y = asTf(b, Ts);
  switch (op) {
    case '*': case '.*': return mkTf(pconv(x.num, y.num), pconv(x.den, y.den), Ts);
    case '/': case './': return mkTf(pconv(x.num, y.den), pconv(x.den, y.num), Ts);
    case '+': return mkTf(padd(pconv(x.num, y.den), pconv(y.num, x.den)), pconv(x.den, y.den), Ts);
    case '-': return mkTf(padd(pconv(x.num, y.den), pconv(y.num, x.den).map(v => -v)), pconv(x.den, y.den), Ts);
  }
  err(`传递函数不支持运算符 ${op}。`);
}
