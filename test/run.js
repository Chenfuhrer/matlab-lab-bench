require('./engine.js');
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8');
const cases = src.split(/^%%%.*$/m).map(s => s.trim()).filter(Boolean);
for (const c of cases) {
  const s = new MLite.Session();
  const r = s.run(c, { freshFigures: true });
  console.log('>>> ' + c.split('\n').join('\n    '));
  for (const it of r.items) {
    if (it.kind === 'fig') console.log(`[figure ${it.fig.id}: ${it.fig.axes.map(a => a.series.length + ' series' + (a.title ? ' "' + a.title + '"' : '')).join(', ')}]`);
    else if (it.kind === 'error') console.log('ERROR: ' + it.text + (it.line ? ` (line ${it.line})` : '') + '\n  hint: ' + it.hint);
    else process.stdout.write(it.text);
  }
  console.log('');
}
