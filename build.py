import re, pathlib
root = pathlib.Path(__file__).parent
src = root / 'src'
engine = ''.join((src / f).read_text() for f in ['e0-head.js','e1-core.js','e2-ops.js','e3-lib.js','e4-plot.js','e9-tail.js'])
data = (src / 'data.js').read_text()
app = (src / 'app.js').read_text()
for name, js in [('engine', engine), ('data', data), ('app', app)]:
    assert '</script' not in js.lower() and '<!--' not in js, name
page = (src / 'page.html').read_text()
page = page.replace('<!--ENGINE-->', '<script>\n' + engine + '\n</script>')
page = page.replace('<!--DATA-->', '<script>\n' + data + '\n</script>')
page = page.replace('<!--APP-->', '<script>\n' + app + '\n</script>')
dist = root / 'dist'; dist.mkdir(exist_ok=True)
(dist / 'index.html').write_text(page)
# 本地双击打开用的完整版
head_end = page.index('</style>') + len('</style>')
standalone = ('<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n'
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
  + page[:head_end] + '\n</head>\n<body>\n' + page[head_end:] + '\n</body>\n</html>\n')
(root / 'MATLAB实验台.html').write_text(standalone)
(root / 'index.html').write_text(standalone)  # GitHub Pages 入口
(root / 'test' / 'engine.js').write_text(engine)
print('ok', len(page)//1024, 'KB')
