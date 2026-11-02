// ============================================================
//  MATLAB 实验台 · 浏览器内 MATLAB 子集解释器（核心）
//  值类型、格式化输出、词法、语法、执行
// ============================================================

// ---------- 错误 ----------
class MErr extends Error {
  constructor(msg, hint) { super(msg); this.hint = hint || ''; this.isM = true; this.line = 0; }
}
function err(msg, hint) { throw new MErr(msg, hint); }

const H = {
  incompat: '两边数组的尺寸对不上。逐元素运算（+ - .* ./ .^）要求尺寸相同，或者某一维为 1 才能自动扩展。常见原因：行向量和列向量混用，或者想逐元素相乘却写成了 *。',
  mtimes: '矩阵乘法 A*B 要求 A 的列数等于 B 的行数。如果只是想让对应位置的元素相乘，请改用 .*（点乘）。',
  mpower: '矩阵乘方 A^2 表示 A*A，只对方阵有意义。想对每个元素平方请用 A.^2。',
  bound: '索引超出范围：要取的位置比数组实际长度还大。用 size() 或 numel() 看看数组到底多大，记住 MATLAB 从 1 开始计数。',
  idx: 'MATLAB 的索引从 1 开始，而且必须是正整数。x(0)、x(-1)、x(2.5) 都不合法；如果索引是算出来的，可以用 round() 消除浮点误差。',
  undef: n => `找不到名为「${n}」的变量或函数。检查三件事：拼写和大小写（A 和 a 是两个变量）；变量是否在使用前已经赋值；它是否属于本实验台没有实现的工具箱函数。`,
  concat: '拼接的数组尺寸不一致。横向拼接 [A, B] 要求行数相同，纵向拼接 [A; B] 要求列数相同。',
  assignN: '等号左边选中的位置数和右边给出的元素个数不一样。左边选了几个位置，右边就要给几个数，或者只给一个标量让它自动填满。',
  notEnough: '调用函数时给的输入参数不够。用 help 函数名 查看它需要哪些输入。',
  tooManyOut: '要的输出比函数能给的多，或者这个函数（比如 disp、plot）本身没有返回值，却被写在了等号右边。',
  parse: '语法错误。检查括号是否成对，运算符有没有漏写（2x 要写成 2*x），以及中文标点有没有混进代码。',
  endMissing: '少了 end：每个 if / for / while / switch / function 都需要一个 end 收尾。',
  timeout: '代码运行超过时间上限，可能写成了死循环（比如 while 的条件永远成立）。检查循环变量有没有更新。',
  str: '字符串没有正确结束：检查引号是否成对。字符串里要表示单引号时写两个单引号，比如 \'It\'\'s\'。',
  logical: '|| 和 && 只能连接标量条件。对数组做判断时，用 any() 或 all() 先把它变成一个真假值，或者改用逐元素的 | 和 &。',
  complex: '本实验台的这个函数只支持实数输入。',
};

// ---------- 值 ----------
// 张量 {k:'t', type:'double'|'logical'|'char', r, c, re, im}（列优先存储）
function mk(r, c, type, cx) {
  return { k: 't', type: type || 'double', r, c, re: new Float64Array(r * c), im: cx ? new Float64Array(r * c) : null };
}
function num(x) { const t = mk(1, 1); t.re[0] = x; return t; }
function cnum(a, b) { const t = mk(1, 1, 'double', true); t.re[0] = a; t.im[0] = b; return dropIm(t); }
function lgc(x) { const t = mk(1, 1, 'logical'); t.re[0] = x ? 1 : 0; return t; }
function chr(s) {
  const t = mk(s.length ? 1 : 0, s.length, 'char');
  for (let i = 0; i < s.length; i++) t.re[i] = s.charCodeAt(i);
  return t;
}
function mstr(s) { return { k: 's', v: s }; }
function emptyD() { return mk(0, 0); }
function rowv(arr, type) { const t = mk(1, arr.length, type); for (let i = 0; i < arr.length; i++) t.re[i] = arr[i]; return t; }
function colv(arr, type) { const t = mk(arr.length, 1, type); for (let i = 0; i < arr.length; i++) t.re[i] = arr[i]; return t; }
function fromRows(rows) {
  const r = rows.length, c = r ? rows[0].length : 0, t = mk(r, c);
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) t.re[i + j * r] = rows[i][j];
  return t;
}
function cellv(r, c, d) { return { k: 'c', r, c, d: d || new Array(r * c).fill(null).map(() => emptyD()) }; }
function dropIm(t) {
  if (t.im) { const im = t.im; for (let i = 0; i < im.length; i++) if (im[i] !== 0) return t; t.im = null; }
  return t;
}
function isT(v) { return v && v.k === 't'; }
function nel(v) { return v.k === 't' || v.k === 'c' ? v.r * v.c : 1; }
function isText(v) { return v.k === 's' || (v.k === 't' && v.type === 'char'); }
function charRow(t, i) { let s = ''; for (let j = 0; j < t.c; j++) s += String.fromCharCode(t.re[i + j * t.r]); return s; }
function textOf(v, what) {
  if (v.k === 's') return v.v;
  if (v.k === 't' && v.type === 'char') {
    if (v.r <= 1) { let s = ''; for (let i = 0; i < v.c; i++) s += String.fromCharCode(v.re[i]); return s; }
    const rows = []; for (let i = 0; i < v.r; i++) rows.push(charRow(v, i)); return rows.join('\n');
  }
  err((what || '输入参数') + ' must be a character vector or string scalar.', '这里需要文本（用单引号或双引号括起来）。');
}
function className(v) {
  if (v.k === 't') return v.type;
  return { s: 'string', c: 'cell', st: 'struct', f: 'function_handle', tf: 'tf' }[v.k] || 'unknown';
}
function T_(v, fname) {
  if (v && v.k === 't') return v;
  err(`Check for incorrect argument data type or missing argument in call to function '${fname || '?'}'.`,
    `${fname || '该函数'} 需要数值输入，但收到了 ${v ? className(v) : '空'} 类型。`);
}
function sc(v, fname) {
  const t = T_(v, fname);
  if (t.r * t.c < 1) err(`Check for incorrect argument data type or missing argument in call to function '${fname || '?'}'.`, '这里需要一个标量，但收到了空数组。');
  return t.re[0];
}
function toArr(v) { return Array.from(T_(v).re); }
function isVec(t) { return t.r === 1 || t.c === 1; }
function shapeLike(t, arr) { const o = mk(t.r, t.c); o.re.set(arr); return o; }
function vecLike(t, arr) { return t.c === 1 && t.r !== 1 ? colv(arr) : rowv(arr); }
function truthy(v) {
  if (v.k === 's') err('Conversion to logical from string is not possible.');
  if (v.k !== 't') err(`Conversion to logical from ${className(v)} is not possible.`);
  const n = v.r * v.c;
  if (n === 0) return false;
  for (let i = 0; i < n; i++) {
    const x = v.re[i];
    if (x !== x) err("NaN's cannot be converted to logicals.");
    if (x === 0 && !(v.im && v.im[i] !== 0)) return false;
  }
  return true;
}
function copyT(t, type) {
  const o = mk(t.r, t.c, type || t.type, !!t.im);
  o.re.set(t.re); if (t.im) o.im.set(t.im);
  return o;
}

// ---------- 数字格式化 ----------
function expo(x, p) {
  const s = x.toExponential(p);
  return s.replace(/e([+-])(\d)$/, 'e$10$2');
}
function gfmt(a, p, alt) {
  if (p === 0) p = 1;
  if (a === 0) return alt ? (0).toFixed(p - 1) : '0';
  const es = a.toExponential(p - 1);
  const e = parseInt(es.split('e')[1], 10);
  let s;
  if (e < -4 || e >= p) {
    s = es;
    if (!alt) s = s.replace(/\.?0+e/, 'e');
    s = s.replace(/e([+-])(\d)$/, 'e$10$2');
  } else {
    s = a.toFixed(Math.max(0, p - 1 - e));
    if (!alt && s.indexOf('.') >= 0) s = s.replace(/\.?0+$/, '');
  }
  return s;
}
function specialNum(x) { return x !== x ? 'NaN' : x > 0 ? 'Inf' : '-Inf'; }
function fmtScalar(x, fmt) {
  if (!isFinite(x)) return specialNum(x);
  if (fmt === 'shortg') return gfmt(Math.abs(x), 5) .replace(/^/, x < 0 ? '-' : '');
  if (fmt === 'longg') return gfmt(Math.abs(x), 15).replace(/^/, x < 0 ? '-' : '');
  if (x === Math.floor(x) && Math.abs(x) < 1e9) return String(x === 0 ? 0 : x);
  const a = Math.abs(x);
  if (fmt === 'long') {
    if (a >= 1e-3 && a < 1e3) return x.toFixed(a >= 100 ? 13 : a >= 10 ? 14 : 15);
    return expo(x, 15);
  }
  if (a >= 1e-3 && a < 1e3) return x.toFixed(4);
  return expo(x, 4);
}
function fmtComplex(re, im, fmt) {
  const d = fmt === 'long' ? 15 : 4;
  const f = x => !isFinite(x) ? specialNum(x) : (Math.abs(x) >= 1e5 || (Math.abs(x) < 1e-4 && x !== 0)) ? expo(x, d) : x.toFixed(d);
  return `${f(re)} ${im < 0 || Object.is(im, -0) ? '-' : '+'} ${f(Math.abs(im))}i`;
}
function padL(s, w) { return s.length >= w ? s : ' '.repeat(w - s.length) + s; }
function padR(s, w) { return s.length >= w ? s : s + ' '.repeat(w - s.length); }

// 矩阵主体（不含变量名），返回行数组
function fmtMatrixLines(v, fmt) {
  const R = v.r, C = v.c, N = R * C;
  let strs = new Array(N), w, header = null;
  if (v.type === 'logical') {
    for (let i = 0; i < N; i++) strs[i] = String(v.re[i]);
    w = 4;
  } else if (v.im) {
    const parts = [];
    for (let i = 0; i < N; i++) parts.push(fmtComplex(v.re[i], v.im[i], fmt));
    strs = parts; w = Math.max(...parts.map(s => s.length)) + 3;
  } else {
    let allInt = true, maxA = 0;
    for (let i = 0; i < N; i++) {
      const x = v.re[i];
      if (isFinite(x)) { if (x !== Math.floor(x)) allInt = false; const a = Math.abs(x); if (a > maxA) maxA = a; }
    }
    if (fmt === 'shortg' || fmt === 'longg') {
      for (let i = 0; i < N; i++) strs[i] = fmtScalar(v.re[i], fmt);
      w = Math.max(...strs.map(s => s.length)) + 3;
    } else if (allInt && maxA < 1e9) {
      for (let i = 0; i < N; i++) { const x = v.re[i]; strs[i] = isFinite(x) ? String(x === 0 ? 0 : x) : specialNum(x); }
      w = Math.max(6, Math.max(...strs.map(s => s.length)) + 2);
    } else {
      const dec = fmt === 'long' ? 15 : 4;
      let scale = 1;
      if (maxA >= 1e3 || (maxA > 0 && maxA < 1e-3)) {
        const e = Math.floor(Math.log10(maxA));
        scale = Math.pow(10, e);
        header = `   1.0e${e < 0 ? '-' : '+'}${String(Math.abs(e)).padStart(2, '0')} *`;
      }
      for (let i = 0; i < N; i++) { const x = v.re[i]; strs[i] = x === 0 ? '0' : isFinite(x) ? (x / scale).toFixed(dec) : specialNum(x); }
      w = Math.max(fmt === 'long' ? 20 : 10, Math.max(...strs.map(s => s.length)) + 2);
    }
  }
  const lines = [];
  if (header) lines.push(header, '');
  const maxW = 100, per = Math.max(1, Math.floor(maxW / w));
  const MAXR = 200;
  const rshow = Math.min(R, MAXR);
  for (let c0 = 0; c0 < C; c0 += per) {
    const c1 = Math.min(C, c0 + per);
    if (C > per) {
      if (c0 > 0) lines.push('');
      lines.push(c1 - c0 === 1 ? `  Column ${c0 + 1}` : `  Columns ${c0 + 1} through ${c1}`, '');
    }
    for (let i = 0; i < rshow; i++) {
      let s = '';
      for (let j = c0; j < c1; j++) s += padL(strs[i + j * R], w);
      lines.push(s);
    }
  }
  if (R > MAXR) lines.push(`  …（共 ${R} 行，仅显示前 ${MAXR} 行）`);
  return lines;
}

function shortRepr(v, fmt) {
  if (v.k === 's') return `"${v.v}"`;
  if (v.k === 'f') return v.src;
  if (v.k === 'c') return `{${v.r}×${v.c} cell}`;
  if (v.k === 'st') return '[1×1 struct]';
  if (v.k === 'tf') return '[1×1 tf]';
  if (v.type === 'char' && v.r <= 1) return `'${textOf(v)}'`;
  const n = v.r * v.c;
  if (n === 0) return '[]';
  if (n === 1) return v.im ? fmtComplex(v.re[0], v.im[0], fmt) : v.type === 'logical' ? String(v.re[0]) : fmtScalar(v.re[0], fmt === 'long' ? 'long' : 'short');
  if (v.r === 1 && n <= 10 && !v.im) return '[' + Array.from(v.re, x => fmtScalar(x, 'shortg')).join(' ') + ']';
  return `[${v.r}×${v.c} ${v.type}]`;
}

function polyStr(p, x) {
  const n = p.length - 1, parts = [];
  for (let i = 0; i <= n; i++) {
    const c = p[i]; if (c === 0) continue;
    const pw = n - i, a = Math.abs(c);
    let cs = (a === 1 && pw > 0) ? '' : gfmt(a, 4);
    let term = cs + (pw > 0 ? (cs ? ' ' : '') + x + (pw > 1 ? '^' + pw : '') : '');
    parts.push({ neg: c < 0, term });
  }
  if (!parts.length) return '0';
  let s = (parts[0].neg ? '-' : '') + parts[0].term;
  for (let k = 1; k < parts.length; k++) s += (parts[k].neg ? ' - ' : ' + ') + parts[k].term;
  return s;
}

function dispBody(v, fmt) {
  // disp() 的输出（不带变量名）
  if (v.k === 's') return v.v;
  if (v.k === 'f') return '    ' + v.src;
  if (v.k === 'c') return cellLines(v).join('\n');
  if (v.k === 'st') return structLines(v, fmt).join('\n');
  if (v.k === 'tf') return tfLines(v).join('\n');
  if (v.type === 'char') return textOf(v);
  const n = v.r * v.c;
  if (n === 0) return '';
  if (n === 1 && !v.im) {
    if (v.type === 'logical') return '   ' + v.re[0];
    const s = fmtScalar(v.re[0], fmt);
    const isInt = v.re[0] === Math.floor(v.re[0]) && isFinite(v.re[0]);
    return (isInt && fmt !== 'shortg' && fmt !== 'longg' ? '     ' : '    ') + s;
  }
  if (n === 1 && v.im) return '   ' + fmtComplex(v.re[0], v.im[0], fmt);
  return fmtMatrixLines(v, fmt).join('\n');
}
function cellLines(v) {
  const strs = v.d.map(e => {
    if (e.k === 't' && e.type === 'char' && e.r <= 1) return `{'${textOf(e)}'}`;
    if (e.k === 's') return `{["${e.v}"]}`;
    if (e.k === 'c') return `{${e.r}×${e.c} cell}`;
    if (e.k === 'f') return `{${e.src}}`;
    if (e.k === 'st') return '{1×1 struct}';
    if (e.k === 'tf') return '{1×1 tf}';
    if (e.r * e.c === 0) return '{0×0 double}';
    if (e.r * e.c === 1) return `{[${e.im ? fmtComplex(e.re[0], e.im[0], 'short') : fmtScalar(e.re[0], 'shortg')}]}`;
    if (e.r === 1 && e.r * e.c <= 6 && !e.im) return `{[${Array.from(e.re, x => fmtScalar(x, 'shortg')).join(' ')}]}`;
    return `{${e.r}×${e.c} ${e.type}}`;
  });
  const lines = [];
  const colW = [];
  for (let j = 0; j < v.c; j++) { let m = 0; for (let i = 0; i < v.r; i++) m = Math.max(m, strs[i + j * v.r].length); colW.push(m); }
  for (let i = 0; i < v.r; i++) {
    let s = '';
    for (let j = 0; j < v.c; j++) s += '    ' + padR(strs[i + j * v.r], colW[j]);
    lines.push(s.replace(/\s+$/, ''));
  }
  return lines;
}
function structLines(v, fmt) {
  const keys = [...v.f.keys()];
  const w = Math.max(0, ...keys.map(k => k.length));
  return keys.map(k => '    ' + padL(k, w) + ': ' + shortRepr(v.f.get(k), fmt));
}
function tfLines(v) {
  const x = v.Ts > 0 ? 'z' : 's';
  const ns = polyStr(v.num, x), ds = polyStr(v.den, x);
  const L = Math.max(ns.length, ds.length) + 2;
  const center = s => ' '.repeat(Math.floor((L - s.length) / 2)) + s;
  const lines = ['', '  ' + center(ns), '  ' + '-'.repeat(L), '  ' + center(ds), ''];
  if (v.Ts > 0) lines.push(`Sample time: ${gfmt(v.Ts, 5)} seconds`, 'Discrete-time transfer function.');
  else lines.push('Continuous-time transfer function.');
  return lines;
}

function dispNamed(name, v, fmt) {
  if (v.k === 's') return `${name} = "${v.v}"`;
  if (v.k === 'f') return `${name} = function_handle with value:\n    ${v.src}`;
  if (v.k === 'c') {
    if (v.r * v.c === 0) return `${name} =\n  ${v.r}×${v.c} empty cell array`;
    return `${name} = ${v.r}×${v.c} cell\n` + cellLines(v).join('\n');
  }
  if (v.k === 'st') return `${name} = struct with fields:\n\n` + structLines(v, fmt).join('\n');
  if (v.k === 'tf') return `${name} =\n` + tfLines(v).join('\n');
  const n = v.r * v.c;
  if (v.type === 'char') {
    if (n === 0) return `${name} =\n  ${v.r}×${v.c} empty char array`;
    if (v.r === 1) return `${name} = '${textOf(v)}'`;
    const rows = []; for (let i = 0; i < v.r; i++) rows.push(`    '${charRow(v, i)}'`);
    return `${name} = ${v.r}×${v.c} char array\n` + rows.join('\n');
  }
  if (n === 0) {
    if (v.r === 0 && v.c === 0) return `${name} = []`;
    const kind = v.r === 1 ? 'row vector' : v.c === 1 ? 'column vector' : 'array';
    return `${name} = ${v.r}×${v.c} empty ${v.type} ${kind}`;
  }
  if (v.type === 'logical') {
    if (n === 1) return `${name} = logical\n   ${v.re[0]}`;
    return `${name} = ${v.r}×${v.c} logical array\n` + fmtMatrixLines(v, fmt).join('\n');
  }
  if (n === 1) return `${name} = ` + (v.im ? fmtComplex(v.re[0], v.im[0], fmt) : fmtScalar(v.re[0], fmt));
  return `${name} = ${v.r}×${v.c}${v.im ? ' complex' : ''}\n` + fmtMatrixLines(v, fmt).join('\n');
}

// ---------- 词法分析 ----------
const KW = new Set(['if', 'elseif', 'else', 'end', 'for', 'parfor', 'while', 'switch', 'case', 'otherwise',
  'break', 'continue', 'return', 'function', 'try', 'catch', 'global', 'persistent']);
const CMDS = new Set(['hold', 'grid', 'clc', 'clear', 'close', 'format', 'axis', 'box', 'figure', 'clf', 'syms',
  'warning', 'more', 'disp', 'whos', 'who', 'rng', 'legend', 'colormap', 'help', 'doc', 'pkg', 'load', 'save', 'cd', 'ls', 'pause', 'drawnow', 'shg']);
const FULLWIDTH = '，；（）：‘’“”。【】！、＝＋－＊／《》';

function lex(src) {
  const T = [], n = src.length, st = [];
  let i = 0, line = 1, sp = false;
  const inMat = () => st.length > 0 && st[st.length - 1] !== '(';
  const lastT = () => T[T.length - 1];
  const isValEnd = t => !!t && (t.t === 'num' || t.t === 'str' || t.t === 'dstr' || t.t === 'id' ||
    (t.t === 'op' && (t.v === ')' || t.v === ']' || t.v === '}' || t.v === "'" || t.v === ".'")) ||
    (t.t === 'kw' && t.v === 'end' && st.length > 0));
  const isIdStart = c => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
  const isIdChar = c => isIdStart(c) || (c >= '0' && c <= '9') || c === '_';
  const isDigit = c => c >= '0' && c <= '9';
  const add = (t, v, pos, s, x) => { const o = { t, v, pos, line, sp: s }; if (x) Object.assign(o, x); T.push(o); return o; };
  const lineText = p => { let a = p; while (a > 0 && src[a - 1] !== '\n') a--; let b = p; while (b < n && src[b] !== '\n') b++; return src.slice(a, b).trim(); };
  function valueStartsAt(p) {
    const c = src[p], d = src[p + 1];
    if (isDigit(c) || (c === '.' && isDigit(d))) return true;
    if (isIdStart(c)) return true;
    if (c === "'" || c === '"' || c === '(' || c === '[' || c === '{' || c === '@') return true;
    if (c === '~' && d !== '=') return true;
    if ((c === '-' || c === '+') && d !== undefined && d !== ' ' && d !== '\t' && d !== '=' && d !== '\n' && d !== '\r') return true;
    return false;
  }
  while (i < n) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\r' || c === ' ' || c === '　') {
      if (c === '　') err('Invalid text character. Check for unsupported symbol, invisible character, or pasting of non-ASCII characters.', `第 ${line} 行有一个全角空格，请删掉后改用半角空格。`);
      i++; sp = true; continue;
    }
    if (c === '.' && src[i + 1] === '.' && src[i + 2] === '.') {
      while (i < n && src[i] !== '\n') i++;
      if (i < n) { i++; line++; }
      sp = true; continue;
    }
    if (c === '%') {
      if (src[i + 1] === '{' && lineText(i) === '%{') {
        let p = i;
        while (p < n) {
          let e = src.indexOf('\n', p); if (e < 0) e = n;
          const ln = src.slice(p, e).trim();
          if (ln === '%}') { p = e; break; }
          if (e < n) line++;
          p = e + 1;
        }
        i = Math.min(p, n); continue;
      }
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    if (c === '\n') {
      if (st.length && inMat()) {
        const lt = lastT();
        if (lt && !(lt.t === 'op' && (lt.v === ';' || lt.v === '[' || lt.v === '{' || lt.v === ','))) add('op', ';', i, true);
      } else if (!st.length) add('nl', '\n', i, sp);
      i++; line++; sp = true; continue;
    }
    const hadSp = sp; sp = false;
    if (inMat() && hadSp && isValEnd(lastT()) && valueStartsAt(i)) add('op', ',', i, true, { implicit: true });
    const p0 = i;
    if (isDigit(c) || (c === '.' && isDigit(src[i + 1]))) {
      let j = i;
      while (j < n && isDigit(src[j])) j++;
      if (src[j] === '.' && !'*/\\^\''.includes(src[j + 1] || ' ')) { j++; while (j < n && isDigit(src[j])) j++; }
      if ('eEdD'.includes(src[j] || ' ') && (isDigit(src[j + 1] || ' ') || ('+-'.includes(src[j + 1] || ' ') && isDigit(src[j + 2] || ' ')))) {
        j += 2; while (j < n && isDigit(src[j])) j++;
      }
      const txt = src.slice(i, j).replace(/[dD]/, 'e');
      let imag = false;
      if ((src[j] === 'i' || src[j] === 'j') && !isIdChar(src[j + 1] || ' ')) { imag = true; j++; }
      add('num', parseFloat(txt), p0, hadSp, { imag });
      i = j; continue;
    }
    if (isIdStart(c)) {
      let j = i; while (j < n && isIdChar(src[j])) j++;
      const w = src.slice(i, j), prev = lastT();
      const afterDot = prev && prev.t === 'op' && prev.v === '.';
      add(KW.has(w) && !afterDot ? 'kw' : 'id', w, p0, hadSp);
      i = j; continue;
    }
    if (c === '"') {
      let j = i + 1, s = '';
      for (;;) {
        if (j >= n || src[j] === '\n') err('String is not terminated properly.', H.str);
        if (src[j] === '"') { if (src[j + 1] === '"') { s += '"'; j += 2; continue; } break; }
        s += src[j++];
      }
      add('dstr', s, p0, hadSp); i = j + 1; continue;
    }
    if (c === "'") {
      if (isValEnd(lastT()) && !(inMat() && hadSp)) { add('op', "'", p0, hadSp); i++; continue; }
      let j = i + 1, s = '';
      for (;;) {
        if (j >= n || src[j] === '\n') err('Character vector is not terminated properly.', H.str);
        if (src[j] === "'") { if (src[j + 1] === "'") { s += "'"; j += 2; continue; } break; }
        s += src[j++];
      }
      add('str', s, p0, hadSp); i = j + 1; continue;
    }
    const two = src.substr(i, 2);
    if (['.*', './', '.\\', '.^', ".'", '==', '~=', '!=', '<=', '>=', '&&', '||'].includes(two)) {
      add('op', two === '!=' ? '~=' : two, p0, hadSp); i += 2; continue;
    }
    if ('+-*/\\^<>&|~!=:,;()[]{}.@'.includes(c)) {
      if (c === '(' || c === '[' || c === '{') st.push(c);
      else if (c === ')' || c === ']' || c === '}') st.pop();
      add('op', c === '!' ? '~' : c, p0, hadSp); i++; continue;
    }
    const e = new MErr('Invalid text character. Check for unsupported symbol, invisible character, or pasting of non-ASCII characters.',
      FULLWIDTH.includes(c) ? `第 ${line} 行出现了中文标点「${c}」，请切换到英文输入法，改成对应的半角符号。` : `第 ${line} 行有无法识别的字符「${c}」。`);
    e.line = line; throw e;
  }
  add('eof', null, n, sp);
  return T;
}

// ---------- 语法分析 ----------
function parse(src) {
  const T = lex(src);
  let p = 0, depth = 0;
  const pk = (o = 0) => T[Math.min(p + o, T.length - 1)];
  const isOp = (v, o = 0) => { const t = pk(o); return t.t === 'op' && t.v === v; };
  const isKw = (v, o = 0) => { const t = pk(o); return t.t === 'kw' && t.v === v; };
  const tokText = t => t.t === 'eof' ? '代码末尾' : t.t === 'nl' ? '换行' : t.t === 'str' ? `'${t.v}'` : t.t === 'dstr' ? `"${t.v}"` : String(t.v);
  const fail = t => {
    const e = new MErr(t.t === 'eof' || t.t === 'nl'
      ? 'Invalid expression. Check for missing multiplication operator, missing or unbalanced delimiters, or other syntax error.'
      : `Invalid use of operator or syntax error near '${tokText(t)}'.`, H.parse);
    e.line = t.line; throw e;
  };
  const expectOp = v => { if (!isOp(v)) fail(pk()); return T[p++]; };
  const endMissing = st => { const e = new MErr('At least one END is missing. The statement beginning here does not have a matching end.', H.endMissing); e.line = st.line; throw e; };
  const funcs = {};

  function skipSep() { if (isOp(',') || isOp(';') || pk().t === 'nl') p++; }
  function block(terms, startTok) {
    const out = [];
    for (;;) {
      const t = pk();
      if (t.t === 'eof') { if (terms.length) endMissing(startTok); break; }
      if (t.t === 'kw' && terms.includes(t.v)) break;
      if (t.t === 'nl' || (t.t === 'op' && (t.v === ';' || t.v === ','))) { p++; continue; }
      const s = statement();
      if (s) out.push(s);
    }
    return out;
  }
  function endStmt(s) {
    const t = pk();
    if (t.t === 'op' && t.v === ';') { p++; s.print = false; }
    else if (t.t === 'op' && t.v === ',') { p++; s.print = true; }
    else if (t.t === 'nl') { p++; s.print = true; }
    else if (t.t === 'eof') s.print = true;
    else if (t.t === 'kw' && ['end', 'else', 'elseif', 'case', 'otherwise', 'catch', 'function'].includes(t.v)) s.print = true;
    else fail(t);
    return s;
  }
  function isMultiAssign() {
    if (!isOp('[')) return false;
    let d = 0;
    for (let j = p; j < T.length; j++) {
      const t = T[j];
      if (t.t === 'nl' || t.t === 'eof') return false;
      if (t.t === 'op') {
        if ('([{'.includes(t.v)) d++;
        else if (')]}'.includes(t.v)) { d--; if (d === 0) { const nx = T[j + 1]; return !!nx && nx.t === 'op' && nx.v === '='; } }
      }
    }
    return false;
  }
  function statement() {
    const t = pk(), line = t.line;
    if (t.t === 'kw') {
      switch (t.v) {
        case 'if': return ifStmt();
        case 'for': case 'parfor': return forStmt();
        case 'while': {
          p++; const cond = expr(); skipSep();
          const body = block(['end'], t); p++;
          return endStmt({ type: 'while', cond, body, line });
        }
        case 'switch': return switchStmt();
        case 'try': {
          p++; skipSep();
          const body = block(['catch', 'end'], t); let id = null, cbody = [];
          if (isKw('catch')) {
            const ct = T[p++];
            if (pk().t === 'id' && pk().line === ct.line) id = T[p++].v;
            cbody = block(['end'], t);
          }
          p++;
          return endStmt({ type: 'try', body, id, cbody, line });
        }
        case 'break': case 'continue': case 'return': p++; return endStmt({ type: t.v, line });
        case 'function': funcDef(); return null;
        case 'global': case 'persistent': err(`实验台不支持 ${t.v} 变量。`, '请改用函数参数传递数据。');
        default: fail(t);
      }
    }
    if (t.t === 'id' && CMDS.has(t.v)) {
      const n1 = pk(1);
      if ((n1.t === 'id' || n1.t === 'num' || n1.t === 'kw') && n1.sp && n1.line === t.line && !(pk(2).t === 'op' && pk(2).v === '=')) {
        p++;
        const args = [];
        while (!(pk().t === 'nl' || pk().t === 'eof' || isOp(';') || isOp(','))) { const a = T[p++]; args.push(String(a.v)); }
        return endStmt({ type: 'cmd', name: t.v, args, line });
      }
    }
    if (isMultiAssign()) {
      p++;
      const lhs = [];
      while (!isOp(']')) {
        if (isOp(',')) { p++; continue; }
        if (isOp('~')) { p++; lhs.push(null); continue; }
        lhs.push(postfix());
      }
      p++; expectOp('=');
      const rhs = expr();
      return endStmt({ type: 'massign', lhs, rhs, line });
    }
    const e = expr();
    if (isOp('=')) {
      p++;
      if (!isLvalue(e)) { const er = new MErr("Incorrect use of '=' operator. To assign a value to a variable, use '='. To compare values for equality, use '=='.", '等号左边必须是变量（或变量的一部分，如 x(2)、s.name）。比较两个值是否相等要用 ==。'); er.line = line; throw er; }
      const rhs = expr();
      return endStmt({ type: 'assign', lhs: e, rhs, line });
    }
    return endStmt({ type: 'expr', e, line });
  }
  function isLvalue(e) {
    while (e.type === 'index' || e.type === 'field' || e.type === 'dynfield') e = e.base;
    return e.type === 'id';
  }
  function ifStmt() {
    const st = T[p++], clauses = [];
    let els = null;
    let cond = expr(); skipSep();
    clauses.push({ cond, body: block(['elseif', 'else', 'end'], st) });
    while (isKw('elseif')) { p++; cond = expr(); skipSep(); clauses.push({ cond, body: block(['elseif', 'else', 'end'], st) }); }
    if (isKw('else')) { p++; els = block(['end'], st); }
    if (!isKw('end')) endMissing(st);
    p++;
    return endStmt({ type: 'if', clauses, els, line: st.line });
  }
  function forStmt() {
    const st = T[p++];
    let paren = false;
    if (isOp('(')) { paren = true; p++; }
    const vt = T[p++];
    if (vt.t !== 'id') fail(vt);
    expectOp('=');
    const range = expr();
    if (paren) expectOp(')');
    skipSep();
    const body = block(['end'], st); p++;
    return endStmt({ type: 'for', v: vt.v, range, body, line: st.line });
  }
  function switchStmt() {
    const st = T[p++];
    const e = expr(); skipSep();
    const cases = []; let other = null;
    while (pk().t === 'nl' || isOp(';') || isOp(',')) p++;
    while (isKw('case')) { p++; const v = expr(); skipSep(); cases.push({ v, body: block(['case', 'otherwise', 'end'], st) }); }
    if (isKw('otherwise')) { p++; skipSep(); other = block(['end'], st); }
    if (!isKw('end')) endMissing(st);
    p++;
    return endStmt({ type: 'switch', e, cases, other, line: st.line });
  }
  function funcDef() {
    const ft = T[p++];
    const outs = [];
    if (isOp('[')) {
      p++;
      while (!isOp(']')) { const q = T[p++]; if (q.t === 'id') outs.push(q.v); else if (!(q.t === 'op' && q.v === ',')) fail(q); }
      p++; expectOp('=');
    } else if (pk().t === 'id' && isOp('=', 1)) { outs.push(T[p].v); p += 2; }
    const nt = T[p++];
    if (nt.t !== 'id') fail(nt);
    const params = [];
    if (isOp('(')) {
      p++;
      while (!isOp(')')) { const q = T[p++]; if (q.t === 'id') params.push(q.v); else if (q.t === 'op' && q.v === '~') params.push('~'); else if (!(q.t === 'op' && q.v === ',')) fail(q); }
      p++;
    }
    const body = block(['end', 'function'], ft);
    if (isKw('end')) p++;
    funcs[nt.v] = { name: nt.v, outs, params, body };
  }

  // 表达式（按 MATLAB 运算符优先级）
  function expr() { return oror(); }
  function oror() { let a = andand(); while (isOp('||')) { p++; a = { type: 'oror', a, b: andand() }; } return a; }
  function andand() { let a = elor(); while (isOp('&&')) { p++; a = { type: 'andand', a, b: elor() }; } return a; }
  function elor() { let a = eland(); while (isOp('|')) { p++; a = { type: 'bin', op: '|', a, b: eland() }; } return a; }
  function eland() { let a = cmp(); while (isOp('&')) { p++; a = { type: 'bin', op: '&', a, b: cmp() }; } return a; }
  function cmp() {
    let a = range();
    while (pk().t === 'op' && ['==', '~=', '<', '<=', '>', '>='].includes(pk().v)) { const o = T[p++].v; a = { type: 'bin', op: o, a, b: range() }; }
    return a;
  }
  function range() {
    const a = additive();
    if (isOp(':') && !(isOp(',', 1) || isOp(')', 1))) {
      p++;
      const b = additive();
      if (isOp(':')) { p++; const c = additive(); return { type: 'range', a, step: b, b: c }; }
      return { type: 'range', a, step: null, b };
    }
    return a;
  }
  function additive() {
    let a = mult();
    while (pk().t === 'op' && (pk().v === '+' || pk().v === '-')) { const o = T[p++].v; a = { type: 'bin', op: o, a, b: mult() }; }
    return a;
  }
  function mult() {
    let a = unary();
    while (pk().t === 'op' && ['*', '/', '\\', '.*', './', '.\\'].includes(pk().v)) { const o = T[p++].v; a = { type: 'bin', op: o, a, b: unary() }; }
    return a;
  }
  function unary() {
    const t = pk();
    if (t.t === 'op' && (t.v === '-' || t.v === '+' || t.v === '~')) { p++; return { type: 'un', op: t.v, a: unary() }; }
    return power();
  }
  function power() {
    let a = postfix();
    while (pk().t === 'op' && (pk().v === '^' || pk().v === '.^')) { const o = T[p++].v; a = { type: 'bin', op: o, a, b: powOperand() }; }
    return a;
  }
  function powOperand() {
    const t = pk();
    if (t.t === 'op' && (t.v === '-' || t.v === '+' || t.v === '~')) { p++; return { type: 'un', op: t.v, a: powOperand() }; }
    return postfix();
  }
  function postfix() {
    let e = primary();
    for (;;) {
      const t = pk();
      if (t.t !== 'op') break;
      if (t.v === '(') { p++; e = { type: 'index', base: e, args: argList(')'), brace: false }; continue; }
      if (t.v === '{') { p++; e = { type: 'index', base: e, args: argList('}'), brace: true }; continue; }
      if (t.v === '.') {
        const n1 = pk(1);
        if (n1.t === 'id' || n1.t === 'kw') { p += 2; e = { type: 'field', base: e, name: n1.v }; continue; }
        if (n1.t === 'op' && n1.v === '(') { p += 2; const fe = expr(); expectOp(')'); e = { type: 'dynfield', base: e, e: fe }; continue; }
        fail(n1);
      }
      if (t.v === "'") { p++; e = { type: 'tr', a: e, conj: true }; continue; }
      if (t.v === ".'") { p++; e = { type: 'tr', a: e, conj: false }; continue; }
      break;
    }
    return e;
  }
  function argList(close) {
    const args = [];
    depth++;
    if (isOp(close)) { p++; depth--; return args; }
    for (;;) {
      if (isOp(':') && (isOp(',', 1) || isOp(close, 1))) { p++; args.push({ type: 'colon' }); }
      else args.push(expr());
      if (isOp(',')) { p++; continue; }
      if (isOp(close)) { p++; break; }
      fail(pk());
    }
    depth--;
    return args;
  }
  function matrix(close, type) {
    const rows = []; let cur = [];
    for (;;) {
      const t = pk();
      if (t.t === 'op' && t.v === close) { p++; break; }
      if (t.t === 'op' && t.v === ';') { p++; if (cur.length) rows.push(cur); cur = []; continue; }
      if (t.t === 'op' && t.v === ',') { p++; continue; }
      if (t.t === 'eof' || t.t === 'nl') fail(t);
      cur.push(expr());
    }
    if (cur.length) rows.push(cur);
    return { type, rows };
  }
  function primary() {
    const t = pk();
    if (t.t === 'num') { p++; return { type: 'num', v: t.v, imag: t.imag }; }
    if (t.t === 'str') { p++; return { type: 'str', v: t.v }; }
    if (t.t === 'dstr') { p++; return { type: 'dstr', v: t.v }; }
    if (t.t === 'id') { p++; return { type: 'id', name: t.v }; }
    if (t.t === 'kw' && t.v === 'end' && depth > 0) { p++; return { type: 'end' }; }
    if (t.t === 'op') {
      if (t.v === '(') { p++; const d0 = depth; const e = expr(); depth = d0; expectOp(')'); return { type: 'paren', e }; }
      if (t.v === '[') { p++; return matrix(']', 'matrix'); }
      if (t.v === '{') { p++; return matrix('}', 'cell'); }
      if (t.v === '@') {
        p++;
        if (isOp('(')) {
          p++;
          const params = [];
          while (!isOp(')')) {
            const q = T[p++];
            if (q.t === 'id') params.push(q.v);
            else if (q.t === 'op' && q.v === '~') params.push('~');
            else if (!(q.t === 'op' && q.v === ',')) fail(q);
          }
          p++;
          const bstart = pk().pos, d0 = depth;
          depth = 0;
          const body = expr();
          depth = d0;
          const bend = pk().implicit ? pk().pos : pk().pos;
          const bodySrc = src.slice(bstart, bend).trim().replace(/\s+/g, ' ').replace(/\s*([-+*/\\^=<>&|~,;:()\[\]{}])\s*/g, (m, c, off, str) => c);
          return { type: 'anon', params, body, src: '@(' + params.join(',') + ')' + bodySrc };
        }
        if (pk().t === 'id') return { type: 'fh', name: T[p++].v };
        fail(pk());
      }
    }
    fail(t);
  }

  const body = block([]);
  return { body, funcs };
}

// ---------- 执行 ----------
const COLON = { k: 'colon' };
const BREAK = { sig: 'break' }, CONTINUE = { sig: 'continue' }, RETURN = { sig: 'return' };
const B = Object.create(null);          // 内置函数表
const UNSUPPORTED = Object.create(null); // 已知但未实现的函数 → 中文说明

let curSession = null;
class Session {
  constructor() {
    this.vars = new Map();
    this.funcs = Object.create(null);
    this.format = 'short';
    this.out = [];
    this.figs = new FigureManager(this);
    this.ops = 0;
    this.deadline = Infinity;
    this.rng = makeRng(0);
    this.ticT = null;
  }
  print(s, kind) {
    const last = this.out[this.out.length - 1];
    if (last && last.kind === (kind || 'text') && kind !== 'warn') last.text += s;
    else this.out.push({ kind: kind || 'text', text: s });
  }
  printLine(s, kind) { this.print(s.endsWith('\n') ? s : s + '\n', kind); }
  warn(msg) { this.out.push({ kind: 'warn', text: 'Warning: ' + msg + '\n' }); }
  run(src, opts) {
    opts = opts || {};
    curSession = this;
    this.out = [];
    this.figs.beginRun(!!opts.freshFigures);
    this.deadline = Date.now() + (opts.timeLimit || 6000);
    this.ops = 0;
    const env = { vars: this.vars, sess: this, depth: 0, fname: null, line: 0 };
    let error = null;
    try {
      const prog = parse(src);
      Object.assign(this.funcs, prog.funcs);
      execBlock(prog.body, env);
    } catch (e) {
      if (e === RETURN) { /* 脚本中的 return：正常结束 */ }
      else if (e === BREAK || e === CONTINUE) { /* 忽略 */ }
      else if (e && e.isM) { error = { msg: e.message, hint: e.hint, line: e.line || env.line }; }
      else { error = { msg: '实验台内部错误：' + (e && e.message ? e.message : String(e)), hint: '这可能是实验台自身的缺陷。可以换一种写法，或在本地 MATLAB 中运行。', line: env.line }; if (typeof console !== 'undefined') console.error(e); }
    }
    if (error) this.out.push({ kind: 'error', text: error.msg, hint: error.hint, line: error.line });
    this.figs.endRun();
    return { items: this.out, error, figures: this.figs.touched.slice() };
  }
}

function tick(env) {
  const s = env.sess;
  if ((++s.ops & 2047) === 0 && Date.now() > s.deadline) err('Execution timed out（运行超时，已自动停止）', H.timeout);
}

function execBlock(stmts, env) { for (let i = 0; i < stmts.length; i++) execStmt(stmts[i], env); }

function execStmt(s, env) {
  tick(env);
  env.line = s.line;
  try {
    switch (s.type) {
      case 'expr': {
        const e = s.e;
        if (e.type === 'id' && env.vars.has(e.name)) { if (s.print) show(env, e.name, env.vars.get(e.name)); return; }
        const vals = evMulti(e, env, 0);
        if (vals.length && vals[0] !== undefined) { env.vars.set('ans', vals[0]); if (s.print) show(env, 'ans', vals[0]); }
        return;
      }
      case 'assign': {
        const v = ev(s.rhs, env);
        const name = assignTo(s.lhs, v, env);
        if (s.print) show(env, name, env.vars.get(name));
        return;
      }
      case 'massign': {
        const want = s.lhs.length;
        const vals = evMulti(s.rhs, env, want);
        const needed = s.lhs.reduce((m, l, i) => l ? i + 1 : m, 0);
        if (vals.length < needed) err('Too many output arguments.', H.tooManyOut);
        s.lhs.forEach((l, i) => {
          if (!l) return;
          const name = assignTo(l, vals[i], env);
          if (s.print) show(env, name, env.vars.get(name));
        });
        return;
      }
      case 'if': {
        for (const c of s.clauses) { if (truthy(ev(c.cond, env))) { execBlock(c.body, env); return; } }
        if (s.els) execBlock(s.els, env);
        return;
      }
      case 'for': {
        const rv = ev(s.range, env);
        let cols, get;
        if (rv.k === 't') {
          cols = rv.r * rv.c === 0 ? 0 : rv.c;
          if (rv.r === 1 && !rv.im && rv.type === 'double') get = j => num(rv.re[j]);
          else get = j => parenGet(rv, [COLON, num(j + 1)]);
        } else if (rv.k === 'c') { cols = rv.c; get = j => parenGet(rv, [COLON, num(j + 1)]); }
        else { cols = 1; get = () => rv; }
        for (let j = 0; j < cols; j++) {
          env.vars.set(s.v, get(j));
          try { execBlock(s.body, env); }
          catch (e) { if (e === BREAK) break; if (e === CONTINUE) continue; throw e; }
          tick(env);
        }
        return;
      }
      case 'while': {
        while (truthy(ev(s.cond, env))) {
          try { execBlock(s.body, env); }
          catch (e) { if (e === BREAK) break; if (e === CONTINUE) continue; throw e; }
          tick(env);
        }
        return;
      }
      case 'switch': {
        const v = ev(s.e, env);
        const match = cv => {
          if (cv.k === 'c') return cv.d.some(match);
          if (isText(v) || isText(cv)) return isText(v) && isText(cv) && textOf(v) === textOf(cv);
          return nel(cv) > 0 && nel(v) > 0 && sc(cv) === sc(v);
        };
        for (const c of s.cases) { if (match(ev(c.v, env))) { execBlock(c.body, env); return; } }
        if (s.other) execBlock(s.other, env);
        return;
      }
      case 'try': {
        try { execBlock(s.body, env); }
        catch (e) {
          if (!(e && e.isM)) throw e;
          if (s.id) {
            const me = { k: 'st', f: new Map([['message', chr(e.message)], ['identifier', chr('')]]) };
            env.vars.set(s.id, me);
          }
          execBlock(s.cbody, env);
        }
        return;
      }
      case 'break': throw BREAK;
      case 'continue': throw CONTINUE;
      case 'return': throw RETURN;
      case 'cmd': {
        const outs = callFn(s.name, s.args.map(chr), 0, env);
        if (outs.length && outs[0] && s.print && s.name !== 'help') { env.vars.set('ans', outs[0]); show(env, 'ans', outs[0]); }
        return;
      }
    }
  } catch (e) {
    if (e && e.isM && !e.line) e.line = s.line;
    throw e;
  }
}

function show(env, name, v) { env.sess.printLine(dispNamed(name, v, env.sess.format)); }

function ev(n, env) {
  switch (n.type) {
    case 'num': return n.imag ? cnum(0, n.v) : num(n.v);
    case 'str': return chr(n.v);
    case 'dstr': return mstr(n.v);
    case 'id': {
      const v = env.vars.get(n.name);
      if (v !== undefined) return v;
      if (env.missing && env.missing.has(n.name)) err('Not enough input arguments.', H.notEnough);
      const outs = callFn(n.name, [], 1, env);
      if (!outs.length) err(`Error using ${n.name}\nToo many output arguments.`, H.tooManyOut);
      return outs[0];
    }
    case 'paren': return ev(n.e, env);
    case 'bin': return binop(n.op, ev(n.a, env), ev(n.b, env));
    case 'un': {
      const a = ev(n.a, env);
      if (n.op === '-') return neg(a);
      if (n.op === '+') return a.k === 't' && a.type !== 'double' ? copyT(a, 'double') : a;
      return opNot(a);
    }
    case 'oror': case 'andand': {
      const sym = n.type === 'oror' ? '||' : '&&';
      const cv = v => {
        if (v.k !== 't' || v.r * v.c !== 1) err(`Operands to the logical AND (&&) and OR (||) operators must be convertible to logical scalar values. Use the ANY or ALL functions to reduce operands to logical scalar values.`, H.logical);
        return truthy(v);
      };
      const a = cv(ev(n.a, env));
      if (sym === '||' && a) return lgc(1);
      if (sym === '&&' && !a) return lgc(0);
      return lgc(cv(ev(n.b, env)));
    }
    case 'range': return makeRange(ev(n.a, env), n.step ? ev(n.step, env) : null, ev(n.b, env));
    case 'tr': return transpose(ev(n.a, env), n.conj);
    case 'matrix': return buildMatrix(n.rows.map(r => flatCSL(r, env)));
    case 'cell': return buildCell(n.rows.map(r => r.map(e => ev(e, env))));
    case 'anon': {
      const closure = new Map();
      collectIds(n.body, new Set(n.params)).forEach(id => { const v = env.vars.get(id); if (v !== undefined) closure.set(id, v); });
      return { k: 'f', params: n.params, body: n.body, closure, src: n.src };
    }
    case 'fh': return { k: 'f', name: n.name, src: '@' + n.name };
    case 'end': {
      const c = env.endCtx;
      if (!c) err("'end' 只能用在索引里，比如 x(end)。");
      const v = c.v;
      if (c.n === 1) return num(nel(v));
      const r = v.k === 't' || v.k === 'c' ? v.r : 1, cc = v.k === 't' || v.k === 'c' ? v.c : 1;
      return num(c.k === 0 ? r : c.k === 1 ? cc : 1);
    }
    case 'index': case 'field': case 'dynfield': {
      const outs = evChain(n, env, 1);
      if (!outs.length) err('Too many output arguments.', H.tooManyOut);
      return outs[0];
    }
    case 'colon': return chr(':');
  }
  err('无法求值的表达式');
}

function collectIds(node, exclude, acc) {
  acc = acc || new Set();
  if (!node || typeof node !== 'object') return acc;
  if (Array.isArray(node)) { node.forEach(x => collectIds(x, exclude, acc)); return acc; }
  if (node.type === 'id' && !exclude.has(node.name)) acc.add(node.name);
  if (node.type === 'anon') { const ex = new Set([...exclude, ...node.params]); collectIds(node.body, ex, acc); return acc; }
  for (const k in node) if (k !== 'type' && node[k] && typeof node[k] === 'object') collectIds(node[k], exclude, acc);
  return acc;
}

function flatCSL(nodes, env) {
  const out = [];
  for (const nd of nodes) {
    if (nd.type === 'index' && nd.brace) { for (const v of evCSL(nd, env)) out.push(v); }
    else out.push(ev(nd, env));
  }
  return out;
}
function evCSL(nd, env) {
  // c{:} 之类的逗号分隔列表
  const base = ev(nd.base, env);
  if (base.k !== 'c') return [ev(nd, env)];
  const args = evArgsIdx(nd.args, base, env);
  const sub = parenGet(base, args);
  return sub.d.slice();
}
function evArgsPlain(args, env) {
  const out = [];
  for (const a of args) {
    if (a.type === 'colon') out.push(chr(':'));
    else if (a.type === 'index' && a.brace) { for (const v of evCSL(a, env)) out.push(v); }
    else out.push(ev(a, env));
  }
  return out;
}
function evArgsIdx(args, v, env) {
  const prev = env.endCtx, out = [];
  for (let k = 0; k < args.length; k++) {
    const a = args[k];
    if (a.type === 'colon') { out.push(COLON); continue; }
    env.endCtx = { v, n: args.length, k };
    try { out.push(ev(a, env)); } finally { env.endCtx = prev; }
  }
  return out;
}

function evMulti(node, env, nargout) {
  if (node.type === 'index' || node.type === 'field' || node.type === 'dynfield') return evChain(node, env, nargout);
  if (node.type === 'id' && !env.vars.has(node.name)) {
    if (env.missing && env.missing.has(node.name)) err('Not enough input arguments.', H.notEnough);
    return callFn(node.name, [], nargout, env);
  }
  if (node.type === 'paren') return [ev(node.e, env)];
  return [ev(node, env)];
}

function evChain(n, env, nargout) {
  const chain = [];
  let b = n;
  while (b.type === 'index' || b.type === 'field' || b.type === 'dynfield') { chain.push(b); b = b.base; }
  chain.reverse();
  let cur, start = 0;
  if (b.type === 'id') {
    const v = env.vars.get(b.name);
    if (v !== undefined) cur = v;
    else {
      if (env.missing && env.missing.has(b.name)) err('Not enough input arguments.', H.notEnough);
      const c0 = chain[0];
      let args = [];
      if (c0.type === 'index' && !c0.brace) { args = evArgsPlain(c0.args, env); start = 1; }
      const outs = callFn(b.name, args, start === chain.length ? nargout : 1, env);
      if (start === chain.length) return outs;
      if (!outs.length) err('Too many output arguments.', H.tooManyOut);
      cur = outs[0];
    }
  } else cur = ev(b, env);
  for (let i = start; i < chain.length; i++) {
    const c = chain[i], last = i === chain.length - 1;
    if (c.type === 'index') {
      if (cur.k === 'f' && !c.brace) {
        const outs = callValue(cur, evArgsPlain(c.args, env), last ? nargout : 1, env);
        if (last) return outs;
        if (!outs.length) err('Too many output arguments.', H.tooManyOut);
        cur = outs[0]; continue;
      }
      const args = evArgsIdx(c.args, cur, env);
      cur = c.brace ? braceGet(cur, args) : parenGet(cur, args);
    } else if (c.type === 'field') cur = fieldGet(cur, c.name);
    else cur = fieldGet(cur, textOf(ev(c.e, env)));
  }
  return [cur];
}

function fieldGet(v, name) {
  if (v.k === 'st') {
    if (!v.f.has(name)) err(`Unrecognized field name "${name}".`, `结构体里没有名为 ${name} 的字段。用 fieldnames(变量) 查看已有字段。`);
    return v.f.get(name);
  }
  if (v.k === 'tf') {
    if (name === 'Numerator' || name === 'num') return { k: 'c', r: 1, c: 1, d: [rowv(v.num)] };
    if (name === 'Denominator' || name === 'den') return { k: 'c', r: 1, c: 1, d: [rowv(v.den)] };
    if (name === 'Ts') return num(v.Ts || 0);
  }
  err('Dot indexing is not supported for variables of this type.', '只有结构体可以用「变量.字段」的写法。');
}

function callFn(name, args, nargout, env) {
  const sess = env.sess;
  const uf = sess.funcs[name];
  if (uf) return callUser(uf, args, nargout, env);
  const b = B[name];
  if (b) {
    const r = b(args, nargout, env, name);
    return r === undefined ? [] : Array.isArray(r) ? r : [r];
  }
  if (UNSUPPORTED[name]) err(`实验台暂未实现函数 '${name}'。`, UNSUPPORTED[name]);
  err(`Unrecognized function or variable '${name}'.`, H.undef(name));
}

function callUser(uf, args, nargout, env) {
  const np = uf.params.length, varargin = np && uf.params[np - 1] === 'varargin';
  if (args.length > np && !varargin) err('Too many input arguments.', `函数 ${uf.name} 只接受 ${np} 个输入。`);
  if (env.depth > 180) err('Maximum recursion limit of 180 reached.', '递归层数太深，检查递归函数有没有正确的终止条件。');
  const fenv = { vars: new Map(), sess: env.sess, depth: env.depth + 1, fname: uf.name, nargin: args.length, nargout, line: 0, missing: new Set() };
  uf.params.forEach((p, i) => {
    if (varargin && i === np - 1) { const rest = args.slice(i); fenv.vars.set('varargin', { k: 'c', r: 1, c: rest.length, d: rest }); return; }
    if (p === '~') return;
    if (i < args.length) fenv.vars.set(p, args[i]); else fenv.missing.add(p);
  });
  try { execBlock(uf.body, fenv); }
  catch (e) { if (e !== RETURN) { if (e && e.isM && !e.inFn) { e.message = `Error in ${uf.name} (line ${e.line || fenv.line})\n` + e.message; e.inFn = true; } throw e; } }
  const res = [], want = Math.max(1, nargout);
  if (nargout > uf.outs.length) err('Too many output arguments.', H.tooManyOut);
  for (let k = 0; k < uf.outs.length && k < want; k++) {
    const o = uf.outs[k];
    if (o === 'varargout') { const vo = fenv.vars.get('varargout'); if (vo && vo.k === 'c') res.push(...vo.d); continue; }
    const v = fenv.vars.get(o);
    if (v === undefined) {
      if (k === 0 && nargout === 0) break;
      err(`Output argument "${o}" (and possibly others) not assigned a value in the execution with "${uf.name}" function.`, `函数 ${uf.name} 结束时还没有给输出变量 ${o} 赋值。`);
    }
    res.push(v);
  }
  return res;
}

function callValue(fv, args, nargout, env) {
  if (fv.k !== 'f') err('需要函数句柄（例如 @sin 或 @(x) x.^2）。');
  if (fv.name) return callFn(fv.name, args, nargout, env);
  if (args.length > fv.params.length) err('Too many input arguments.', `这个匿名函数只有 ${fv.params.length} 个参数：${fv.src}`);
  const fenv = { vars: new Map(fv.closure), sess: env.sess, depth: env.depth + 1, fname: 'anonymous', line: env.line, missing: new Set() };
  if (fenv.depth > 180) err('Maximum recursion limit of 180 reached.');
  fv.params.forEach((p, i) => { if (p === '~') return; if (i < args.length) fenv.vars.set(p, args[i]); else fenv.missing.add(p); });
  return evMulti(fv.body, fenv, nargout);
}
function callF(fv, args, env) {
  const r = callValue(fv, args, 1, env);
  if (!r.length) err('函数没有返回值。');
  return r[0];
}

// ---------- 赋值 ----------
function assignTo(lhs, val, env) {
  if (lhs.type === 'id') { env.vars.set(lhs.name, val); return lhs.name; }
  const chain = [];
  let b = lhs;
  while (b.type === 'index' || b.type === 'field' || b.type === 'dynfield') { chain.push(b); b = b.base; }
  chain.reverse();
  const name = b.name;
  if (!env.vars.has(name) && (B[name] || env.sess.funcs[name]) && chain[0].type === 'index') {
    // 比如 sum(2) = 3：把函数名当成了变量
  }
  env.vars.set(name, setPath(env.vars.get(name), chain, 0, val, env));
  return name;
}
function setPath(cur, chain, i, val, env) {
  if (i === chain.length) return val;
  const c = chain[i];
  if (c.type === 'field' || c.type === 'dynfield') {
    const fname = c.type === 'field' ? c.name : textOf(ev(c.e, env));
    let s;
    if (cur === undefined || (isT(cur) && nel(cur) === 0)) s = { k: 'st', f: new Map() };
    else if (cur.k !== 'st') err('Unable to perform assignment because dot indexing is not supported for variables of this type.', '这个变量不是结构体，不能用「.字段」赋值。');
    else s = { k: 'st', f: new Map(cur.f) };
    s.f.set(fname, setPath(s.f.get(fname), chain, i + 1, val, env));
    return s;
  }
  const base = cur === undefined ? emptyD() : cur;
  const args = evArgsIdx(c.args, base, env);
  if (c.brace) {
    let cc = cur === undefined || (isT(cur) && nel(cur) === 0) ? { k: 'c', r: 0, c: 0, d: [] } : cur;
    if (cc.k !== 'c') err('Unable to perform assignment because brace indexing is not supported for variables of this type.', '只有元胞数组（cell）可以用花括号 {} 赋值。');
    let inner;
    if (i + 1 < chain.length) { try { inner = braceGet(cc, args); } catch (e) { inner = undefined; } }
    const nv = setPath(inner, chain, i + 1, val, env);
    return indexSet(cc, args, { k: 'c', r: 1, c: 1, d: [nv] });
  }
  if (i + 1 < chain.length) {
    const sub = cur === undefined ? undefined : parenGet(cur, args);
    return indexSet(cur, args, setPath(sub, chain, i + 1, val, env));
  }
  return indexSet(cur, args, val);
}

// ---------- 索引 ----------
function seq(n) { const a = new Array(n); for (let i = 0; i < n; i++) a[i] = i; return a; }
function boundErr(x, L, pos, npos) {
  err(npos <= 1 ? `Index exceeds the number of array elements. Index must not exceed ${L}.`
    : `Index in position ${pos} exceeds array bounds. Index must not exceed ${L}.`, H.bound);
}
function idxErr(x) {
  err(x === 0 ? 'Index in position 1 is invalid. Array indices must be positive integers or logical values.'
    : 'Array indices must be positive integers or logical values.', H.idx);
}
function resolveGet(a, L, pos, npos) {
  if (a.k !== 't') err(`Unable to use a value of type ${className(a)} as an index.`, '索引必须是数字或逻辑值。');
  const n = a.r * a.c;
  if (a.type === 'logical') {
    const out = [];
    for (let i = 0; i < n; i++) if (a.re[i]) { if (i >= L) boundErr(i + 1, L, pos, npos); out.push(i); }
    return out;
  }
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const x = a.re[i];
    if (!(x >= 1) || x !== Math.floor(x)) idxErr(x);
    if (x > L) boundErr(x, L, pos, npos);
    out[i] = x - 1;
  }
  return out;
}
function resolveSet(a, L) {
  if (a === COLON) return seq(L);
  if (a.k !== 't') err(`Unable to use a value of type ${className(a)} as an index.`);
  const n = a.r * a.c, out = [];
  if (a.type === 'logical') { for (let i = 0; i < n; i++) if (a.re[i]) out.push(i); return out; }
  for (let i = 0; i < n; i++) { const x = a.re[i]; if (!(x >= 1) || x !== Math.floor(x)) idxErr(x); out.push(x - 1); }
  return out;
}
function gather(v, ix, R, C) {
  if (v.k === 'c') { const d = ix.map(i => v.d[i]); return { k: 'c', r: R, c: C, d }; }
  const o = mk(R, C, v.type, !!v.im);
  for (let k = 0; k < ix.length; k++) { o.re[k] = v.re[ix[k]]; if (v.im) o.im[k] = v.im[ix[k]]; }
  return v.im ? dropIm(o) : o;
}
function parenGet(v, args) {
  if (v.k === 's' || v.k === 'st' || v.k === 'tf' || v.k === 'f') {
    for (const a of args) if (a !== COLON) { const ix = resolveGet(a, 1, 1, args.length); if (ix.length !== 1) err('Index exceeds the number of array elements. Index must not exceed 1.', H.bound); }
    return v;
  }
  if (args.length === 0) return v;
  if (args.length === 1) {
    const a = args[0], N = nel(v);
    let ix, R, C;
    if (a === COLON) { ix = seq(N); R = N; C = 1; }
    else {
      ix = resolveGet(a, N, 1, 1);
      if (a.type === 'logical') { if (v.r === 1 && (a.r === 1 || N === 1)) { R = 1; C = ix.length; } else { R = ix.length; C = 1; } }
      else if (N !== 1 && (v.r === 1 || v.c === 1) && (a.r === 1 || a.c === 1)) { if (v.r === 1) { R = 1; C = ix.length; } else { R = ix.length; C = 1; } }
      else { R = a.r; C = a.c; }
    }
    return gather(v, ix, R, C);
  }
  for (let k = 2; k < args.length; k++) {
    if (args[k] !== COLON) { const ix = resolveGet(args[k], 1, k + 1, args.length); if (ix.some(x => x !== 0)) boundErr(2, 1, k + 1, args.length); }
  }
  const ri = args[0] === COLON ? seq(v.r) : resolveGet(args[0], v.r, 1, args.length);
  const ci = args[1] === COLON ? seq(v.c) : resolveGet(args[1], v.c, 2, args.length);
  const ix = new Array(ri.length * ci.length);
  let k = 0;
  for (let b = 0; b < ci.length; b++) for (let a = 0; a < ri.length; a++) ix[k++] = ri[a] + ci[b] * v.r;
  return gather(v, ix, ri.length, ci.length);
}
function braceGet(v, args) {
  if (v.k !== 'c') err('Brace indexing is not supported for variables of this type.', '只有元胞数组（cell）才能用花括号 {} 取内容，普通数组请用圆括号 ()。');
  const sub = parenGet(v, args);
  if (sub.d.length !== 1) {
    if (sub.d.length === 0) err('Index exceeds the number of array elements.', H.bound);
    err('Expected one output from a curly brace or dot indexing expression, but there were ' + sub.d.length + ' results.', '一次取了多个元胞的内容。只取一个时写 c{2}；要拼接所有内容可以写 [c{:}]。');
  }
  return sub.d[0];
}
function resizeV(v, R, C) {
  if (v.r === R && v.c === C) return v.k === 'c' ? { k: 'c', r: R, c: C, d: v.d.slice() } : copyT(v);
  if (v.k === 'c') {
    const d = new Array(R * C);
    for (let j = 0; j < C; j++) for (let i = 0; i < R; i++) d[i + j * R] = (i < v.r && j < v.c) ? v.d[i + j * v.r] : emptyD();
    return { k: 'c', r: R, c: C, d };
  }
  const o = mk(R, C, v.type, !!v.im);
  for (let j = 0; j < Math.min(C, v.c); j++) for (let i = 0; i < Math.min(R, v.r); i++) {
    o.re[i + j * R] = v.re[i + j * v.r];
    if (v.im) o.im[i + j * R] = v.im[i + j * v.r];
  }
  return o;
}
function indexSet(cur, args, val) {
  if (cur === undefined || (cur.k === 't' && cur.r * cur.c === 0 && !(isT(val) && val.r === 0 && val.c === 0))) {
    if (val.k === 'c') cur = { k: 'c', r: 0, c: 0, d: [] };
    else if (val.k === 't') cur = mk(0, 0, cur && cur.type === 'char' && val.type === 'char' ? 'char' : val.type);
    else if (val.k === 's') { if (args.every(a => a === COLON || (a.k === 't' && nel(a) === 1 && a.re[0] === 1))) return val; err('实验台暂不支持字符串数组。', '可以改用元胞数组保存多段文本，例如 c = {\'a\', \'bc\'}。'); }
    else { if (args.every(a => a === COLON || (a.k === 't' && nel(a) === 1 && a.re[0] === 1))) return val; err('实验台不支持这种类型的数组。'); }
  }
  if (cur.k !== 't' && cur.k !== 'c') {
    if (args.every(a => a === COLON || (a.k === 't' && nel(a) === 1 && a.re[0] === 1))) return val;
    err('实验台不支持这种类型的数组下标赋值。');
  }
  // 删除元素
  if (val.k === 't' && val.type === 'double' && val.r === 0 && val.c === 0 && cur.k === 't' || (cur.k === 'c' && val.k === 't' && val.r === 0 && val.c === 0)) return doDelete(cur, args);
  if (cur.k === 't' && val.k === 'c') err('Conversion to double from cell is not possible.', '不能把元胞放进普通数组。');
  if (cur.k === 'c' && val.k !== 'c') err('Conversion to cell from ' + className(val) + ' is not possible.', '给元胞数组的元素赋值请用花括号：c{2} = 值。');
  if (val.k !== 't' && val.k !== 'c') err('实验台暂不支持把 ' + className(val) + ' 存入数组。', '可以把它放进元胞数组：c{1} = 值。');
  const nv = nel(val);
  if (args.length === 1) {
    const N = nel(cur);
    let ix;
    if (args[0] === COLON) ix = seq(N);
    else ix = resolveSet(args[0], N);
    if (nv !== 1 && nv !== ix.length) err('Unable to perform assignment because the left and right sides have a different number of elements.', H.assignN);
    let mx = -1; for (const x of ix) if (x > mx) mx = x;
    let o;
    if (mx >= N) {
      if (cur.r * cur.c === 0 || cur.r === 1) o = resizeV(cur, 1, mx + 1);
      else if (cur.c === 1) o = resizeV(cur, mx + 1, 1);
      else err('Attempt to grow array along ambiguous dimension.', '对矩阵用单个下标扩容时，MATLAB 不知道该加行还是加列。请改用 A(行, 列) = 值。');
    } else o = resizeV(cur, cur.r, cur.c);
    writeInto(o, ix, val);
    return o;
  }
  for (let k = 2; k < args.length; k++) if (args[k] !== COLON && !(args[k].k === 't' && nel(args[k]) === 1 && args[k].re[0] === 1)) err('实验台只支持二维数组。');
  let ri, ci;
  const vr = val.k === 't' || val.k === 'c' ? val.r : 1, vc = val.k === 't' || val.k === 'c' ? val.c : 1;
  if (args[0] === COLON) ri = seq(cur.r === 0 && cur.c === 0 ? (args[1] === COLON ? vr : (nv === 1 ? 1 : (vr === 1 || vc === 1 ? nv : vr))) : cur.r);
  else ri = resolveSet(args[0], cur.r);
  if (args[1] === COLON) ci = seq(cur.r === 0 && cur.c === 0 ? (args[0] === COLON ? vc : (nv === 1 ? 1 : (vr === 1 || vc === 1 ? nv : vc))) : cur.c);
  else ci = resolveSet(args[1], cur.c);
  const need = ri.length * ci.length;
  if (nv !== 1 && nv !== need) err(`Unable to perform assignment because the size of the left side is ${ri.length}-by-${ci.length} and the size of the right side is ${vr}-by-${vc}.`, H.assignN);
  let R = cur.r, C = cur.c;
  for (const x of ri) if (x + 1 > R) R = x + 1;
  for (const x of ci) if (x + 1 > C) C = x + 1;
  if (ri.length === 0 || ci.length === 0) return cur;
  const o = resizeV(cur, R, C);
  const ix = new Array(need);
  let k = 0;
  for (let b = 0; b < ci.length; b++) for (let a = 0; a < ri.length; a++) ix[k++] = ri[a] + ci[b] * R;
  writeInto(o, ix, val);
  return o;
}
function writeInto(o, ix, val) {
  const nv = nel(val);
  if (o.k === 'c') { for (let k = 0; k < ix.length; k++) o.d[ix[k]] = val.d[nv === 1 ? 0 : k]; return; }
  if (val.im && !o.im) o.im = new Float64Array(o.re.length);
  for (let k = 0; k < ix.length; k++) {
    const s = nv === 1 ? 0 : k;
    o.re[ix[k]] = val.re[s];
    if (o.im) o.im[ix[k]] = val.im ? val.im[s] : 0;
  }
  if (o.type === 'logical' && val.type !== 'logical') { for (const i of ix) if (o.re[i] !== 0 && o.re[i] !== 1) { o.type = 'double'; break; } }
  if (o.type !== 'char' && val.type === 'char' && o.r * o.c === ix.length) o.type = 'char';
  if (o.im) dropIm(o);
}
function doDelete(cur, args) {
  if (args.length === 1) {
    const N = nel(cur);
    if (args[0] === COLON) return cur.k === 'c' ? { k: 'c', r: 0, c: 0, d: [] } : mk(0, 0, cur.type);
    const del = new Set(resolveDel(args[0], N));
    const keep = [];
    for (let i = 0; i < N; i++) if (!del.has(i)) keep.push(i);
    const isCol = cur.c === 1 && cur.r !== 1;
    return gather(cur, keep, isCol ? keep.length : 1, isCol ? 1 : keep.length);
  }
  const full = (a, L) => a === COLON || (a.k === 't' && (() => { const s = new Set(resolveDel(a, L)); return s.size === L; })());
  if (full(args[0], cur.r)) {
    const del = new Set(args[1] === COLON ? seq(cur.c) : resolveDel(args[1], cur.c));
    const keepC = seq(cur.c).filter(j => !del.has(j));
    return parenGet(cur, [COLON, rowv(keepC.map(j => j + 1))]);
  }
  if (full(args[1], cur.c)) {
    const del = new Set(resolveDel(args[0], cur.r));
    const keepR = seq(cur.r).filter(i => !del.has(i));
    return parenGet(cur, [rowv(keepR.map(i => i + 1)), COLON]);
  }
  err('A null assignment can have only one non-colon index.', '删除元素时只能删整行或整列，比如 A(2,:) = [] 或 A(:,3) = []。');
}
function resolveDel(a, L) {
  const ix = resolveSet(a, L);
  for (const x of ix) if (x >= L) err('Matrix index is out of range for deletion.', H.bound);
  return ix;
}

// ---------- 构造矩阵 ----------
function buildMatrix(rows) {
  const rowVals = [];
  for (const r of rows) {
    const items = r.filter(v => !(v.k === 't' && v.r === 0 && v.c === 0 && v.type !== 'char'));
    if (!items.length) { if (r.some(v => v.k === 't' && v.type === 'char')) rowVals.push(chr('')); continue; }
    rowVals.push(hcat(items));
  }
  if (!rowVals.length) return emptyD();
  const nonEmpty = rowVals.filter(v => !(v.k === 't' && v.r * v.c === 0));
  if (!nonEmpty.length) return rowVals[0];
  return vcat(nonEmpty);
}
function catType(items) {
  if (items.some(v => v.k === 'c')) return 'cell';
  if (items.some(v => v.k === 's')) err('实验台暂不支持字符串数组。', '要把文字拼在一起，可以用单引号字符向量：[\'abc\', \'def\']，或者用 + 号连接双引号字符串："abc" + "def"。');
  for (const v of items) if (v.k !== 't') err(`实验台不支持把 ${className(v)} 放进方括号里拼接。`, v.k === 'f' ? '多个函数句柄请放进元胞数组：{@sin, @cos}。' : '');
  if (items.some(v => v.type === 'char')) return 'char';
  if (items.every(v => v.type === 'logical')) return 'logical';
  return 'double';
}
function hcat(items) {
  const type = catType(items);
  if (type === 'cell') {
    const cs = items.map(v => v.k === 'c' ? v : { k: 'c', r: 1, c: 1, d: [v] });
    const R = cs[0].r;
    if (cs.some(v => v.r !== R)) err('Dimensions of arrays being concatenated are not consistent.', H.concat);
    const d = []; let C = 0;
    for (const v of cs) { for (const x of v.d) d.push(x); C += v.c; }
    return { k: 'c', r: R, c: C, d };
  }
  if (items.length === 1) return items[0].type === type ? items[0] : copyT(items[0], type);
  const R = items[0].r;
  let C = 0, cx = false;
  for (const v of items) { if (v.r !== R) err('Dimensions of arrays being concatenated are not consistent.', H.concat); C += v.c; if (v.im) cx = true; }
  const o = mk(R, C, type, cx);
  let off = 0;
  for (const v of items) { o.re.set(v.re, off); if (cx && v.im) o.im.set(v.im, off); off += v.r * v.c; }
  return o;
}
function vcat(items) {
  const type = catType(items);
  if (type === 'cell') {
    const cs = items.map(v => v.k === 'c' ? v : { k: 'c', r: 1, c: 1, d: [v] });
    const C = cs[0].c;
    if (cs.some(v => v.c !== C)) err('Dimensions of arrays being concatenated are not consistent.', H.concat);
    const R = cs.reduce((s, v) => s + v.r, 0), d = new Array(R * C);
    let r0 = 0;
    for (const v of cs) { for (let j = 0; j < C; j++) for (let i = 0; i < v.r; i++) d[(r0 + i) + j * R] = v.d[i + j * v.r]; r0 += v.r; }
    return { k: 'c', r: R, c: C, d };
  }
  if (items.length === 1) return items[0].type === type ? items[0] : copyT(items[0], type);
  const C = items[0].c;
  let R = 0, cx = false;
  for (const v of items) { if (v.c !== C) err('Dimensions of arrays being concatenated are not consistent.', H.concat); R += v.r; if (v.im) cx = true; }
  const o = mk(R, C, type, cx);
  let r0 = 0;
  for (const v of items) {
    for (let j = 0; j < C; j++) for (let i = 0; i < v.r; i++) { o.re[(r0 + i) + j * R] = v.re[i + j * v.r]; if (cx && v.im) o.im[(r0 + i) + j * R] = v.im[i + j * v.r]; }
    r0 += v.r;
  }
  return o;
}
function buildCell(rows) {
  const rowCells = rows.filter(r => r.length).map(r => {
    const d = r; return { k: 'c', r: 1, c: d.length, d: d.slice() };
  });
  if (!rowCells.length) return { k: 'c', r: 0, c: 0, d: [] };
  if (rowCells.length === 1) return rowCells[0];
  return vcat(rowCells);
}

function makeRange(a, s, b) {
  const av = sc(a, 'colon'), bv = sc(b, 'colon'), sv = s ? sc(s, 'colon') : 1;
  if (sv === 0 || (sv > 0 && av > bv) || (sv < 0 && av < bv) || !isFinite(av) || !isFinite(bv)) return mk(1, 0);
  const n = Math.floor((bv - av) / sv * (1 + 1e-15) + 1e-10) + 1;
  if (n > 5e7) err('Requested array exceeds the maximum possible variable size.', '数组太大了，浏览器放不下。');
  const o = mk(1, n);
  for (let k = 0; k < n; k++) o.re[k] = av + k * sv;
  if (a.type === 'char' && b.type === 'char') o.type = 'char';
  return o;
}
