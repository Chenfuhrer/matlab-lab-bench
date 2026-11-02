global.window = global;
require('./engine.js');
require('../src/data.js');
const sols = {
  'mat-ij': 'M = (1:4)\' * 10 + (1:4);',
  'scores': 'scores = [88 92 75 60 95 58 81 45];\npass = scores(scores >= 60);\nnfail = sum(scores < 60);',
  'linsys': 'A = [2 1 -1; -3 -1 2; -2 1 2];\nb = [8; -11; -3];\nx = A \\ b;',
  'fib': 'F = zeros(1, 20); F(1) = 1; F(2) = 1;\nfor k = 3:20\n F(k) = F(k-1) + F(k-2);\nend',
  'anon': 'f = @(x) x.^2 - 2*x + 1;',
  'plot2': "x = linspace(0, 2*pi, 100);\nplot(x, sin(x)); hold on; plot(x, cos(x)); legend('sin','cos'); title('t'); xlabel('x'); ylabel('y')",
  'sprintf': "r = 2.5;\ns = sprintf('r = %.2f, A = %.2f', r, pi*r^2);",
  'conv': 'x = [1 2 3];  nx = -1:1;\nh = [1 1 1];  nh = 0:2;\ny = conv(x, h);\nn = (nx(1)+nh(1)):(nx(end)+nh(end));',
  'fit2': 'x = 0:0.5:5;\ny = [2.02 1.61 1.52 1.63 2.01 2.62 3.48 4.64 6.01 7.62 9.50];\np = polyfit(x, y, 2);\nyfit = polyval(p, x);\nR2 = 1 - sum((y - yfit).^2) / sum((y - mean(y)).^2);',
};
const wrong = { 'anon': 'f = @(x) x^2 - 2*x + 1;', 'scores': 'scores = [88 92 75 60 95 58 81 45];\npass = scores(scores > 60);\nnfail = 2;', 'plot2': 'plot(1:3)' };
for (const [k, code] of Object.entries(sols)) {
  const s = new MLite.Session(); const r = s.run(code, { freshFigures: true });
  const v = MLDATA.checks[k](s, MLite);
  console.log(k, r.error ? 'ERR ' + r.error.msg : '', v.ok ? 'PASS' : 'FAIL', v.msg);
}
for (const [k, code] of Object.entries(wrong)) {
  const s = new MLite.Session(); const r = s.run(code, { freshFigures: true });
  const v = MLDATA.checks[k](s, MLite);
  console.log('wrong', k, v.ok ? 'PASS(!)' : 'FAIL ok', v.msg);
}
// docs examples
let bad = 0;
for (const [name, d] of Object.entries(MLDATA.docs)) {
  if (!d.example) continue;
  const s = new MLite.Session(); const r = s.run(d.example, { freshFigures: true });
  if (r.error && !/error|warning/.test(name)) { bad++; console.log('DOC ERR', name, d.example, '→', r.error.msg); }
  if (!MLite.B[name]) console.log('NO BUILTIN', name);
}
console.log('doc examples with errors:', bad, 'of', Object.keys(MLDATA.docs).length);
