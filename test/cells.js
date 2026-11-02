require('./engine.js');
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/../src/page.html', 'utf8');
const re = /<div class="(cell[^"]*)"([^>]*)>\s*<textarea>([\s\S]*?)<\/textarea>/g;
let m, i = 0, bad = 0;
const unesc = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
while ((m = re.exec(html))) {
  const cls = m[1], attrs = m[2], code = unesc(m[3]);
  if (cls.includes('static')) continue;
  i++;
  const label = (/data-label="([^"]*)"/.exec(attrs) || [])[1];
  const s = new MLite.Session();
  const t0 = Date.now();
  const r = s.run(code, { freshFigures: true, timeLimit: 4000 });
  const ms = Date.now() - t0;
  const expectErr = /故意出错/.test(label);
  const flag = (!!r.error !== expectErr) ? '❌' : '✓';
  if (flag === '❌') bad++;
  console.log(`\n${flag} [${i}] ${label} (${ms} ms)`);
  for (const it of r.items) {
    if (it.kind === 'fig') console.log(`  [figure ${it.fig.id}: ${it.fig.axes.map(a => a.series.length + 's' + (a.title ? ' "' + a.title + '"' : '')).join(', ')}]`);
    else if (it.kind === 'error') console.log('  ERROR: ' + it.text.split('\n')[0] + ' | line ' + it.line);
    else process.stdout.write(it.text.split('\n').slice(0, 14).map(l => '  ' + l).join('\n') + '\n');
  }
}
console.log('\ncells:', i, 'unexpected:', bad);
