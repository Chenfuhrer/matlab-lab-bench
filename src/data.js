/* MATLAB 实验台 · 数据：函数速查、测验、练习判题 */
(function () {
'use strict';
const D = {};
function add(cat, list) { for (const [name, desc, usage, example] of list) D[name] = { cat, desc, usage, example }; }

add('基础与工作区', [
  ['disp', '显示变量的值或一段文字，不显示变量名', 'disp(X)', "disp('Hello'); disp(pi)"],
  ['clc', '清空命令行窗口', 'clc', 'clc'],
  ['clear', '删除工作区变量；clear x 只删 x', 'clear / clear x y', 'x = 1; clear x; exist(\'x\')'],
  ['who', '列出工作区里所有变量名', 'who', 'a = 1; b = 2; who'],
  ['whos', '列出变量的尺寸、字节数和类型', 'whos', 'A = magic(3); whos'],
  ['format', '切换数字显示格式：short（默认）、long、shortG、longG', 'format long', 'format long; pi, format short'],
  ['class', '返回变量的数据类型', 'class(x)', "class('abc')"],
  ['exist', '检查变量或函数是否存在（1 变量，5 内置函数，0 不存在）', 'exist(name)', "exist('sin')"],
  ['help', '查看函数的简要说明', 'help name', 'help linspace'],
  ['tic', '开始计时，配合 toc 使用', 'tic; …; toc', 'tic; s = sum(1:1e6); toc'],
  ['toc', '显示从上一次 tic 到现在经过的秒数', 't = toc', 'tic; pause(0); t = toc'],
  ['error', '主动抛出错误并停止运行', "error('msg')", "error('输入必须为正数')"],
  ['warning', '显示警告但继续运行', "warning('msg')", "warning('精度可能不足')"],
  ['rng', '设置随机数种子，让随机结果可重复', 'rng(seed)', 'rng(1); rand(1,3)'],
]);
add('矩阵构造', [
  ['zeros', '全 0 矩阵', 'zeros(m, n)', 'zeros(2, 3)'],
  ['ones', '全 1 矩阵', 'ones(m, n)', 'ones(2)'],
  ['eye', '单位矩阵', 'eye(n)', 'eye(3)'],
  ['rand', '[0,1) 均匀分布随机数', 'rand(m, n)', 'rand(2, 3)'],
  ['randn', '标准正态分布随机数', 'randn(m, n)', 'randn(1, 5)'],
  ['randi', '随机整数', 'randi([a b], m, n)', 'randi([1 6], 1, 10)'],
  ['randperm', '1~n 的随机排列', 'randperm(n)', 'randperm(6)'],
  ['magic', '魔方矩阵（行、列、对角线之和都相等）', 'magic(n)', 'magic(4)'],
  ['linspace', '在区间内生成 n 个等间距点（默认 100 个）', 'linspace(a, b, n)', 'linspace(0, 1, 5)'],
  ['logspace', '在 10^a 到 10^b 之间生成对数等间距点', 'logspace(a, b, n)', 'logspace(0, 3, 4)'],
  ['repmat', '把矩阵按块复制', 'repmat(A, m, n)', 'repmat([1 2], 2, 3)'],
  ['reshape', '改变形状（元素按列优先顺序不变）', 'reshape(A, m, n)', 'reshape(1:6, 2, 3)'],
  ['diag', '用向量构造对角矩阵，或取出矩阵的对角线', 'diag(v) / diag(A)', 'diag([1 2 3])'],
  ['meshgrid', '生成二维网格坐标', '[X, Y] = meshgrid(x, y)', '[X, Y] = meshgrid(1:3, 1:2)'],
  ['cat', '沿指定维度拼接', 'cat(dim, A, B)', 'cat(1, [1 2], [3 4])'],
  ['fliplr', '左右翻转', 'fliplr(A)', 'fliplr(1:5)'],
  ['flipud', '上下翻转', 'flipud(A)', 'flipud([1; 2; 3])'],
  ['circshift', '循环移位', 'circshift(v, k)', 'circshift(1:5, 2)'],
  ['triu', '取上三角部分', 'triu(A)', 'triu(magic(3))'],
  ['tril', '取下三角部分', 'tril(A)', 'tril(magic(3))'],
  ['kron', 'Kronecker 积', 'kron(A, B)', 'kron(eye(2), [1 2])'],
]);
add('尺寸与查找', [
  ['size', '矩阵的行数和列数', '[m, n] = size(A)', '[m, n] = size(zeros(3, 5))'],
  ['length', '最长维度的长度', 'length(A)', 'length(zeros(3, 5))'],
  ['numel', '元素总个数', 'numel(A)', 'numel(magic(4))'],
  ['isempty', '是否为空数组', 'isempty(A)', 'isempty([])'],
  ['find', '找出非零（为真）元素的下标', 'idx = find(x > 3)', 'find([0 3 0 5] > 1)'],
  ['any', '是否有任意一个元素为真', 'any(x)', 'any([0 0 1])'],
  ['all', '是否所有元素都为真', 'all(x)', 'all([1 1 0])'],
  ['ismember', '判断元素是否属于某个集合', 'ismember(a, S)', 'ismember([1 5], [1 2 3])'],
  ['unique', '去重并排序', 'unique(x)', 'unique([3 1 3 2 1])'],
  ['sort', '排序，可返回原位置下标', "[s, i] = sort(x, 'descend')", "[s, i] = sort([3 1 2], 'descend')"],
  ['sortrows', '按某一列对整行排序', 'sortrows(A, col)', 'sortrows([3 1; 1 2; 2 0], 1)'],
  ['nnz', '非零元素个数', 'nnz(A)', 'nnz([0 1 2 0])'],
  ['isequal', '判断两个数组是否完全相同', 'isequal(A, B)', 'isequal([1 2], [1 2])'],
]);
add('数学运算', [
  ['abs', '绝对值；对复数求模', 'abs(x)', 'abs([-2 3+4i])'],
  ['sqrt', '平方根（负数得到复数）', 'sqrt(x)', 'sqrt([4 -9])'],
  ['exp', '自然指数 e^x', 'exp(x)', 'exp(1)'],
  ['log', '自然对数 ln x', 'log(x)', 'log(exp(2))'],
  ['log10', '常用对数', 'log10(x)', 'log10(1000)'],
  ['log2', '以 2 为底的对数', 'log2(x)', 'log2(1024)'],
  ['sin', '正弦（弧度）', 'sin(x)', 'sin(pi/6)'],
  ['cos', '余弦（弧度）', 'cos(x)', 'cos(pi)'],
  ['tan', '正切（弧度）', 'tan(x)', 'tan(pi/4)'],
  ['sind', '正弦（角度）', 'sind(x)', 'sind(30)'],
  ['atan2', '四象限反正切', 'atan2(y, x)', 'atan2(1, -1)'],
  ['round', '四舍五入；round(x, n) 保留 n 位小数', 'round(x, n)', 'round(pi, 2)'],
  ['floor', '向下取整', 'floor(x)', 'floor(-2.5)'],
  ['ceil', '向上取整', 'ceil(x)', 'ceil(2.1)'],
  ['fix', '向 0 取整', 'fix(x)', 'fix(-2.7)'],
  ['mod', '取模（结果与除数同号）', 'mod(a, m)', 'mod(-7, 3)'],
  ['rem', '取余（结果与被除数同号）', 'rem(a, b)', 'rem(-7, 3)'],
  ['sign', '符号函数', 'sign(x)', 'sign([-3 0 2])'],
  ['factorial', '阶乘', 'factorial(n)', 'factorial(5)'],
  ['nchoosek', '组合数 C(n,k)，或列出所有组合', 'nchoosek(n, k)', 'nchoosek(5, 2)'],
  ['primes', '不超过 n 的所有素数', 'primes(n)', 'primes(30)'],
  ['isprime', '判断是否为素数', 'isprime(x)', 'isprime(1:10)'],
  ['gcd', '最大公约数', 'gcd(a, b)', 'gcd(12, 18)'],
  ['lcm', '最小公倍数', 'lcm(a, b)', 'lcm(4, 6)'],
  ['real', '复数的实部', 'real(z)', 'real(3+4i)'],
  ['imag', '复数的虚部', 'imag(z)', 'imag(3+4i)'],
  ['angle', '复数的相角（弧度）', 'angle(z)', 'angle(1i)'],
  ['conj', '共轭复数', 'conj(z)', 'conj(3+4i)'],
]);
add('统计', [
  ['sum', '求和（矩阵默认按列）', 'sum(A, dim)', 'sum([1 2; 3 4])'],
  ['prod', '连乘', 'prod(x)', 'prod(1:5)'],
  ['cumsum', '累加', 'cumsum(x)', 'cumsum(1:5)'],
  ['cumprod', '累乘', 'cumprod(x)', 'cumprod(1:5)'],
  ['mean', '平均值', 'mean(A, dim)', 'mean([1 2 3 4])'],
  ['median', '中位数', 'median(x)', 'median([3 1 4 1 5])'],
  ['mode', '众数', 'mode(x)', 'mode([1 2 2 3])'],
  ['std', '标准差（默认除以 n-1）', 'std(x)', 'std([2 4 4 4 5 5 7 9])'],
  ['var', '方差（默认除以 n-1）', 'var(x)', 'var([1 2 3 4])'],
  ['max', '最大值及其位置', '[m, i] = max(x)', '[m, i] = max([3 9 2])'],
  ['min', '最小值及其位置', '[m, i] = min(x)', '[m, i] = min([3 9 2])'],
  ['diff', '相邻元素之差', 'diff(x)', 'diff([1 4 9 16])'],
  ['corrcoef', '相关系数矩阵', 'R = corrcoef(x, y)', 'corrcoef(1:5, [2 4 5 4 5])'],
  ['cov', '协方差', 'cov(x, y)', 'cov(1:5, [2 4 5 4 5])'],
  ['zscore', '标准化：减均值再除以标准差（按列）', 'zscore(X)', 'zscore([1 2 3 4])'],
  ['histcounts', '统计落在各区间的个数', '[N, edges] = histcounts(x, edges)', 'histcounts([1 2 2 3 5], 0:2:6)'],
  ['normpdf', '正态分布概率密度', 'normpdf(x, mu, sigma)', 'normpdf(0)'],
  ['normcdf', '正态分布累积概率', 'normcdf(x, mu, sigma)', 'normcdf(1.96)'],
]);
add('线性代数', [
  ['inv', '矩阵求逆（解方程更推荐用 A\\b）', 'inv(A)', 'inv([2 1; 1 3])'],
  ['det', '行列式', 'det(A)', 'det(magic(3))'],
  ['rank', '矩阵的秩', 'rank(A)', 'rank(magic(4))'],
  ['trace', '迹（对角线之和）', 'trace(A)', 'trace(magic(3))'],
  ['eig', '特征值与特征向量', '[V, D] = eig(A)', '[V, D] = eig([2 1; 1 2])'],
  ['norm', '向量或矩阵的范数', 'norm(x, p)', 'norm([3 4])'],
  ['dot', '向量点积', 'dot(a, b)', 'dot([1 2 3], [4 5 6])'],
  ['cross', '三维向量叉积', 'cross(a, b)', 'cross([1 0 0], [0 1 0])'],
  ['cond', '条件数（越大越病态）', 'cond(A)', 'cond([1 2; 2 4.0001])'],
  ['pinv', '伪逆', 'pinv(A)', 'pinv([1 2; 3 4; 5 6])'],
  ['lu', 'LU 分解', '[L, U, P] = lu(A)', '[L, U] = lu([4 3; 6 3])'],
  ['null', '零空间的一组基', 'null(A)', 'null([1 1; 1 1])'],
]);
add('字符串与输出', [
  ['fprintf', '按格式打印，%d 整数、%f 小数、%s 文字、\\n 换行', "fprintf('x = %.2f\\n', x)", "fprintf('%d 的平方是 %d\\n', [1 2 3; 1 4 9])"],
  ['sprintf', '按格式生成字符串（不打印）', "s = sprintf('%05.1f', x)", "s = sprintf('第%d组', 3)"],
  ['num2str', '数字转字符串', 'num2str(x)', "['pi ≈ ', num2str(pi)]"],
  ['str2double', '字符串转数字', "str2double('3.14')", "str2double('2.5e3')"],
  ['mat2str', '把矩阵写成可复制的字符串', 'mat2str(A)', 'mat2str(magic(3))'],
  ['strcat', '拼接字符串', 'strcat(a, b)', "strcat('data_', '01')"],
  ['strsplit', '按分隔符拆分', "strsplit(s, ',')", "strsplit('a,b,c', ',')"],
  ['strjoin', '用分隔符连接元胞里的字符串', "strjoin(c, ', ')", "strjoin({'x','y','z'}, '-')"],
  ['strrep', '替换子串', 'strrep(s, old, new)', "strrep('2024-01-01', '-', '/')"],
  ['strcmp', '比较两个字符串是否相同', 'strcmp(a, b)', "strcmp('abc', 'abc')"],
  ['upper', '转大写', 'upper(s)', "upper('matlab')"],
  ['lower', '转小写', 'lower(s)', "lower('MATLAB')"],
  ['strtrim', '去掉首尾空白', 'strtrim(s)', "strtrim('  hi  ')"],
  ['contains', '是否包含子串', 'contains(s, pat)', "contains('signal.mat', '.mat')"],
  ['regexp', '正则表达式匹配', "regexp(s, expr, 'match')", "regexp('a1b22c333', '\\d+', 'match')"],
  ['string', '转为字符串（双引号）类型', 'string(x)', 'string(42)'],
]);
add('元胞与结构体', [
  ['cell', '创建空元胞数组', 'cell(m, n)', 'c = cell(1, 3)'],
  ['struct', '创建结构体', "s = struct('name', 'A', 'age', 20)", "s = struct('name', 'A', 'age', 20)"],
  ['fieldnames', '列出结构体的所有字段', 'fieldnames(s)', "fieldnames(struct('a', 1, 'b', 2))"],
  ['isfield', '判断结构体是否有某字段', "isfield(s, 'a')", "isfield(struct('a', 1), 'a')"],
  ['cellfun', '对元胞的每个元素调用函数', "cellfun(@length, c)", "cellfun(@length, {'ab', 'cde', 'f'})"],
  ['arrayfun', '对数组的每个元素调用函数', 'arrayfun(@(k) k^2, 1:5)', 'arrayfun(@(k) k^2, 1:5)'],
  ['cell2mat', '把元胞拼成普通矩阵', 'cell2mat(c)', 'cell2mat({[1 2], [3]})'],
  ['num2cell', '把矩阵的每个元素放进元胞', 'num2cell(A)', 'num2cell([1 2 3])'],
]);
add('函数与流程', [
  ['feval', '按函数名或句柄调用函数', "feval(@sin, x)", "feval('max', [3 7 5])"],
  ['func2str', '函数句柄转字符串', 'func2str(f)', 'func2str(@(x) x.^2)'],
  ['str2func', '字符串转函数句柄', "str2func('@(x) x+1')", "f = str2func('@(x) 2*x'); f(4)"],
  ['nargin', '函数内部：实际传入的输入个数', 'nargin', ''],
  ['isa', '判断变量是否属于某类型', "isa(x, 'double')", "isa(3, 'numeric')"],
]);
add('绘图', [
  ['plot', '二维折线图；线型如 \'r--o\'', "plot(x, y, 'r--', 'LineWidth', 1.5)", 'x = 0:0.1:2*pi; plot(x, sin(x))'],
  ['stem', '离散序列图（火柴杆图）', "stem(n, x, 'filled')", 'n = 0:10; stem(n, 0.8.^n)'],
  ['stairs', '阶梯图', 'stairs(x, y)', 'stairs(0:5, [1 3 2 4 3 5])'],
  ['bar', '柱状图', 'bar(x, y)', 'bar([3 5 2 4])'],
  ['histogram', '直方图', 'histogram(x, nbins)', 'histogram(randn(1, 500))'],
  ['scatter', '散点图', "scatter(x, y, sz, 'filled')", "scatter(rand(1,30), rand(1,30), 'filled')"],
  ['area', '面积图', 'area(x, y)', 'area(1:5, [1 3 2 4 3])'],
  ['errorbar', '误差棒图', 'errorbar(x, y, err)', 'errorbar(1:4, [2 3 2.5 4], [0.2 0.3 0.2 0.4])'],
  ['fplot', '画函数句柄在区间上的图像', 'fplot(f, [a b])', 'fplot(@(x) x.*sin(x), [0 10])'],
  ['semilogy', 'y 轴取对数', 'semilogy(x, y)', 'semilogy(1:10, exp(1:10))'],
  ['semilogx', 'x 轴取对数', 'semilogx(x, y)', 'semilogx(logspace(0, 3), 1:50)'],
  ['loglog', '双对数坐标', 'loglog(x, y)', 'loglog(1:100, (1:100).^2)'],
  ['figure', '新建图窗', 'figure', 'figure; plot(1:3)'],
  ['subplot', '把图窗分成 m×n 个子图', 'subplot(m, n, p)', 'subplot(2,1,1); plot(1:5); subplot(2,1,2); plot(5:-1:1)'],
  ['hold', '保留已有曲线继续画：hold on / hold off', 'hold on', 'plot(1:3); hold on; plot(3:-1:1)'],
  ['title', '图标题，支持 TeX，如 e^{-t}、\\omega', "title('x(t)')", "plot(1:3); title('\\omega_0 = 2\\pi f')"],
  ['xlabel', 'x 轴标签', "xlabel('t (s)')", "plot(1:3); xlabel('时间 t / s')"],
  ['ylabel', 'y 轴标签', "ylabel('幅值')", "plot(1:3); ylabel('幅值')"],
  ['legend', '图例', "legend('sin', 'cos')", "plot(1:3); hold on; plot(3:-1:1); legend('上升', '下降')"],
  ['grid', '显示网格：grid on', 'grid on', 'plot(1:3); grid on'],
  ['axis', "设置坐标范围 axis([x1 x2 y1 y2])，或 axis equal", 'axis([0 10 -1 1])', 'plot(1:10); axis([0 12 0 12])'],
  ['xlim', '设置 x 轴范围', 'xlim([a b])', 'plot(1:10); xlim([2 8])'],
  ['ylim', '设置 y 轴范围', 'ylim([a b])', 'plot(1:10); ylim([0 20])'],
  ['text', '在指定坐标写文字', "text(x, y, 'str')", "plot(1:3); text(2, 2, '中点')"],
  ['xline', '画竖直参考线', "xline(x, '--', 'label')", "plot(1:10); xline(5, '--', 'x = 5')"],
  ['yline', '画水平参考线', "yline(y, '--')", "plot(1:10); yline(5, ':')"],
  ['sgtitle', '整个图窗的总标题（多子图时用）', "sgtitle('总标题')", "subplot(1,2,1); plot(1:3); subplot(1,2,2); plot(3:-1:1); sgtitle('对比')"],
]);
add('多项式与插值', [
  ['polyfit', '多项式最小二乘拟合，返回系数（降幂）', 'p = polyfit(x, y, n)', 'p = polyfit(1:5, [1 4 9 16 25], 2)'],
  ['polyval', '计算多项式的值', 'polyval(p, x)', 'polyval([1 0 -1], 3)'],
  ['roots', '多项式求根', 'roots(p)', 'roots([1 -3 2])'],
  ['poly', '由根反求多项式系数；对方阵求特征多项式', 'poly(r)', 'poly([1 2])'],
  ['conv', '卷积；也用来做多项式乘法', 'conv(u, v)', 'conv([1 1], [1 -1])'],
  ['deconv', '反卷积；多项式除法', '[q, r] = deconv(b, a)', '[q, r] = deconv([1 0 -1], [1 1])'],
  ['polyder', '多项式求导', 'polyder(p)', 'polyder([1 2 3])'],
  ['polyint', '多项式积分', 'polyint(p)', 'polyint([3 2 1])'],
  ['interp1', "一维插值：'linear'（默认）、'spline'、'pchip'、'nearest'", "interp1(x, y, xq, 'spline')", "interp1(0:3, [0 1 4 9], 1.5, 'spline')"],
  ['spline', '三次样条插值（not-a-knot 边界）', 'spline(x, y, xq)', 'spline(0:3, [0 1 4 9], 1.5)'],
  ['pchip', '保形分段三次插值', 'pchip(x, y, xq)', 'pchip(0:3, [0 1 4 9], 1.5)'],
]);
add('微积分与方程', [
  ['integral', '数值积分（被积函数要支持向量输入）', 'integral(f, a, b)', 'integral(@(x) exp(-x.^2), -Inf, Inf)'],
  ['integral2', '二重积分', 'integral2(f, a, b, c, d)', 'integral2(@(x, y) x.*y, 0, 1, 0, 2)'],
  ['trapz', '梯形法积分（离散数据）', 'trapz(x, y)', 'x = 0:0.1:1; trapz(x, x.^2)'],
  ['cumtrapz', '累积梯形积分', 'cumtrapz(x, y)', 'cumtrapz(0:3, [0 1 2 3])'],
  ['ode45', '求解常微分方程初值问题（龙格-库塔 4/5 阶）', '[t, y] = ode45(f, tspan, y0)', '[t, y] = ode45(@(t, y) -y, [0 5], 1); y(end)'],
  ['fzero', '求一元函数的零点', 'fzero(f, x0)', 'fzero(@(x) x^3 - 2*x - 5, 2)'],
  ['fsolve', '求非线性方程组的解', 'fsolve(F, x0)', 'fsolve(@(x) [x(1)^2 + x(2)^2 - 4; x(1) - x(2)], [1; 1])'],
]);
add('优化', [
  ['fminsearch', '无约束多元最小化（单纯形法）', '[x, fval] = fminsearch(f, x0)', 'fminsearch(@(p) (p(1)-1)^2 + (p(2)+2)^2, [0 0])'],
  ['fminbnd', '区间上的一元最小化', '[x, fval] = fminbnd(f, a, b)', 'fminbnd(@(x) (x-2).^2, 0, 5)'],
  ['fmincon', '带约束的非线性最小化', 'fmincon(f, x0, A, b, Aeq, beq, lb, ub, nonlcon)', 'fmincon(@(x) x(1)^2 + x(2)^2, [1; 1], [-1 -1], -1)'],
  ['linprog', '线性规划：min f\'x，s.t. Ax ≤ b，Aeq x = beq，lb ≤ x ≤ ub', 'linprog(f, A, b, Aeq, beq, lb, ub)', 'linprog([-3; -5], [1 0; 0 2; 3 2], [4; 12; 18], [], [], [0; 0])'],
  ['intlinprog', '整数（混合整数）线性规划', 'intlinprog(f, intcon, A, b, Aeq, beq, lb, ub)', 'intlinprog([-1; -2], [1 2], [1 1; -1 1], [4; 2], [], [], [0; 0], [])'],
  ['lsqcurvefit', '非线性曲线拟合（最小二乘）', 'lsqcurvefit(fun, x0, xdata, ydata)', 'lsqcurvefit(@(p, x) p(1)*exp(p(2)*x), [1 0.1], 0:4, [1 1.6 2.7 4.5 7.4])'],
  ['optimset', '设置优化选项', "optimset('TolX', 1e-8)", "opts = optimset('TolX', 1e-8)"],
]);
add('信号处理', [
  ['filter', '按差分方程滤波：a(1)y(n) + … = b(1)x(n) + …', 'y = filter(b, a, x)', 'filter(1, [1 -0.5], [1 0 0 0 0])'],
  ['fft', '快速傅里叶变换', 'X = fft(x, N)', 'abs(fft([1 1 1 1 0 0 0 0]))'],
  ['ifft', '逆傅里叶变换', 'x = ifft(X)', 'ifft(fft([1 2 3]))'],
  ['fftshift', '把零频移到频谱中间', 'fftshift(X)', 'fftshift(1:6)'],
  ['freqz', '离散系统频率响应（不接输出时直接画图）', '[H, w] = freqz(b, a, n)', 'freqz([1 1]/2, 1)'],
  ['freqs', '连续系统频率响应', 'H = freqs(b, a, w)', 'freqs(1, [1 1])'],
  ['unwrap', '相位解卷绕（去掉 ±2π 跳变）', 'unwrap(p)', 'unwrap([0 3 6.5 -3])'],
  ['heaviside', '单位阶跃函数 u(t)（0 处取 0.5）', 'heaviside(t)', 'heaviside([-1 0 1])'],
  ['rectpuls', '矩形脉冲', 'rectpuls(t, w)', 'rectpuls(-1:0.5:1, 1)'],
  ['tripuls', '三角脉冲', 'tripuls(t, w)', 'tripuls(-1:0.5:1, 2)'],
  ['sinc', 'sinc(x) = sin(πx)/(πx)', 'sinc(x)', 'sinc([0 0.5 1])'],
  ['square', '方波（周期 2π）', 'square(t, duty)', 'square([0 1 4 6])'],
  ['sawtooth', '锯齿波（周期 2π）', 'sawtooth(t)', 'sawtooth([0 pi 2*pi-0.01])'],
  ['hamming', 'Hamming 窗', 'hamming(N)', "hamming(5)'"],
  ['xcorr', '互相关', '[r, lags] = xcorr(x, y)', 'xcorr([1 2 3], [1 1])'],
]);
add('控制系统', [
  ['tf', "创建传递函数；s = tf('s') 后可以直接写表达式", 'sys = tf(num, den)', 'sys = tf([1 5], [1 3 2])'],
  ['step', '阶跃响应（不接输出时画图）', '[y, t] = step(sys)', 'step(tf(1, [1 2 1]))'],
  ['impulse', '冲激响应', '[y, t] = impulse(sys)', 'impulse(tf(1, [1 1]))'],
  ['lsim', '任意输入下的响应', 'lsim(sys, u, t)', 't = 0:0.01:10; lsim(tf(1, [1 1]), sin(t), t)'],
  ['bode', '伯德图', 'bode(sys)', 'bode(tf(10, [1 11 10]))'],
  ['pzmap', '零极点图', 'pzmap(sys)', 'pzmap(tf([1 2], [1 2 5]))'],
  ['pole', '极点', 'pole(sys)', 'pole(tf(1, [1 3 2]))'],
  ['zero', '零点', 'zero(sys)', 'zero(tf([1 5], [1 3 2]))'],
  ['feedback', '反馈连接：G/(1+GH)', 'feedback(G, H)', 'feedback(tf(1, [1 1]), 1)'],
  ['dcgain', '直流增益', 'dcgain(sys)', 'dcgain(tf([1 5], [1 3 2]))'],
]);

// ---------- 测验 ----------
const Q = {
  'ch-start': [
    { q: '在命令行输入 <code>x = 3;</code>（末尾带分号）后按回车，会发生什么？', o: ['报错，因为语句不能以分号结尾', 'x 被赋值为 3，但不显示结果', '显示 x = 3', '什么都不做，x 不会被赋值'], a: 1, why: '分号只是不把结果显示出来，赋值照常完成。写长脚本时，大部分语句都要加分号，否则输出会刷屏。' },
    { q: '下面哪个变量名在 MATLAB 中是<b>合法</b>的？', o: ['2nd_value', 'my-data', 'data_2', 'end'], a: 2, why: '变量名必须以字母开头，只能含字母、数字、下划线，也不能是 end、for 这类关键字。' },
    { q: '输入 <code>3 + 4</code> 后不赋值给任何变量，结果保存在哪里？', o: ['不保存', '变量 ans', '变量 result', '变量 x'], a: 1, why: '没有指定变量名时，结果自动存进 ans。下一次产生新结果时 ans 会被覆盖。' },
  ],
  'ch-matrix': [
    { q: '<code>A = [1 2 3; 4 5 6]</code> 的尺寸是？', o: ['3×2', '2×3', '1×6', '6×1'], a: 1, why: '分号 ; 换行，所以有 2 行；每行 3 个元素，所以是 2×3。' },
    { q: '<code>0:2:9</code> 生成的向量是？', o: ['[0 2 4 6 8]', '[0 2 4 6 8 10]', '[2 4 6 8]', '[0 9]'], a: 0, why: '起点 0，步长 2，不超过终点 9，所以停在 8。' },
    { q: '想得到 0 到 1 之间均匀分布的 5 个点（含两端），应该写：', o: ['0:5:1', 'linspace(0, 1, 5)', 'linspace(0, 5, 1)', 'rand(1, 5)'], a: 1, why: 'linspace(a, b, n) 指定的是点数；冒号写法指定的是步长，这里要写成 0:0.25:1。' },
  ],
  'ch-index': [
    { q: '<code>A = magic(3)</code>（即 [8 1 6; 3 5 7; 4 9 2]），<code>A(2, 3)</code> 等于？', o: ['7', '9', '6', '3'], a: 0, why: '先行后列：第 2 行 [3 5 7] 的第 3 个元素是 7。' },
    { q: '同一个 A，<code>A(4)</code> 等于？', o: ['3', '1', '6', '4'], a: 1, why: 'MATLAB 按列优先存储：第 1 列 8, 3, 4，接着第 2 列从 1 开始，所以第 4 个元素是 1。' },
    { q: '要取出向量 v 中所有大于 0 的元素，最简洁的写法是：', o: ['v(v > 0)', 'v > 0', 'find(v) > 0', 'v(find > 0)'], a: 0, why: 'v > 0 得到一个逻辑数组，再用它当下标，就能直接挑出满足条件的元素。' },
  ],
  'ch-ops': [
    { q: '<code>[1 2 3] .* [4 5 6]</code> 的结果是？', o: ['32', '[4 10 18]', '报错', '[5 7 9]'], a: 1, why: '.* 是逐元素相乘。不带点的 * 是矩阵乘法，1×3 乘 1×3 会报错。' },
    { q: '解线性方程组 Ax = b，推荐的写法是：', o: ['x = inv(A) * b', 'x = A \\ b', 'x = b / A', 'x = A * b'], a: 1, why: 'A\\b 用高斯消元直接求解，比先求逆再相乘更快也更准。b/A 解的是 xA = b。' },
    { q: '<code>[1 2 3] + [10; 20]</code> 的结果尺寸是？', o: ['报错', '1×3', '2×3', '3×2'], a: 2, why: '隐式扩展：1×3 的行向量和 2×1 的列向量相加，会扩展成 2×3。这很方便，但也常常是 bug 的来源。' },
  ],
  'ch-flow': [
    { q: '下面的代码执行后 s 等于？', code: 's = 0;\nfor k = 1:2:7\n    s = s + k;\nend', o: ['16', '28', '15', '7'], a: 0, why: 'k 依次取 1, 3, 5, 7，和为 16。' },
    { q: '<code>if [1 1 0]</code> 的条件判断结果是？', o: ['真', '假', '报错', '只看第一个元素，所以为真'], a: 1, why: '对数组做 if 判断时，只有所有元素都非零才算真。想表达“有任意一个为真”，请写 if any(...)。' },
    { q: '下面哪种写法计算 1 到 100 的平方和最符合 MATLAB 风格？', o: ['for 循环逐个累加', 'sum((1:100).^2)', 'while 循环', 'sum(1:100)^2'], a: 1, why: '向量化写法一行搞定，也更快。注意 sum(1:100)^2 是“和的平方”，不是“平方和”。' },
  ],
  'ch-func': [
    { q: '<code>f = @(x) x.^2;</code> 之后 <code>f([1 2 3])</code> 的结果是？', o: ['[1 4 9]', '14', '报错', '[1 2 3]'], a: 0, why: '因为用了 .^，匿名函数可以接受向量，逐元素平方。' },
    { q: '脚本里的局部函数应该写在哪里？', o: ['脚本开头', '脚本末尾', '任意位置都行', '必须单独存成文件'], a: 1, why: '从 R2016b 起脚本可以包含局部函数，但函数定义必须放在脚本的最后。' },
    { q: '函数 <code>function [s, p] = sp(a, b)</code> 用 <code>r = sp(2, 3)</code> 调用时，r 得到的是？', o: ['s 和 p 组成的向量', 's', 'p', '报错'], a: 1, why: '只接一个输出时，得到的是第一个输出变量 s。要两个都拿到，写 [s, p] = sp(2, 3)。' },
  ],
  'ch-plot': [
    { q: "<code>plot(x, y, 'r--o')</code> 画出的是？", o: ['红色实线', '红色虚线，数据点画圆圈', '红色点线', '圆形散点，没有连线'], a: 1, why: "线型字符串可以组合：r 是红色，-- 是虚线，o 是圆圈标记。" },
    { q: '想在已有曲线上再画一条，而不是替换掉它，需要先执行：', o: ['figure', 'hold on', 'subplot', 'grid on'], a: 1, why: 'hold on 让后续的 plot 叠加到当前坐标区；figure 会新开一个图窗。' },
    { q: '画离散序列 x[n]（比如信号与系统作业里的单位冲激序列），最合适的函数是：', o: ['plot', 'stem', 'bar', 'area'], a: 1, why: 'stem 画火柴杆图，强调“只在整数 n 上有值”。用 plot 会把点连成线，容易让人误以为是连续信号。' },
  ],
  'ch-text': [
    { q: "<code>fprintf('%.2f\\n', pi)</code> 输出：", o: ['3.14', '3.1416', '3.141593', '%.2f'], a: 0, why: '%.2f 表示保留两位小数的浮点数，\\n 换行。' },
    { q: "<code>['x = ', 5]</code> 会得到什么？", o: ["'x = 5'", "'x = ' 加上一个编码为 5 的不可见字符", '报错', '"x = 5"'], a: 1, why: "字符向量和数字直接拼接时，数字会被当成字符编码。要显示数字，请写 ['x = ', num2str(5)]。" },
    { q: "单引号 <code>'abc'</code> 和双引号 <code>\"abc\"</code> 的区别是：", o: ['完全一样', "前者是字符向量（char），后者是字符串（string）", '双引号是错误写法', '前者只能存英文'], a: 1, why: "'abc' 是 1×3 的 char 数组，\"abc\" 是 1×1 的 string 对象。很多老代码和函数习惯用单引号。" },
  ],
  'ch-signal': [
    { q: '对 N 点 fft 的结果 X，第 k 个元素（MATLAB 下标从 1 开始）对应的频率是？（采样率 fs）', o: ['k·fs/N', '(k−1)·fs/N', 'k/N', '(k−1)/fs'], a: 1, why: 'X(1) 对应 0 Hz（直流），所以第 k 个元素对应 (k−1)·fs/N。忘了减 1 是最常见的频率轴错误。' },
    { q: '<code>conv([1 2 3], [1 1])</code> 的长度是？', o: ['3', '4', '5', '2'], a: 1, why: '线性卷积的长度 = 两个序列长度之和 − 1 = 3 + 2 − 1 = 4。' },
    { q: '差分方程 y[n] − 0.5y[n−1] = x[n]，用 filter 时 b 和 a 分别是？', o: ['b = [1 -0.5], a = 1', 'b = 1, a = [1 -0.5]', 'b = 1, a = [1 0.5]', 'b = [1 0.5], a = 1'], a: 1, why: 'filter(b, a, x) 中 a 对应输出 y 那一侧的系数：a(1)y[n] + a(2)y[n−1] = b(1)x[n]，所以 a = [1 -0.5]。' },
  ],
  'ch-model': [
    { q: 'linprog 默认求的是：', o: ['最大值', '最小值', '可行解', '整数解'], a: 1, why: 'linprog 只做最小化。求最大值时把目标系数取负：max c\'x 等价于 min (−c)\'x，最后再把 fval 取负。' },
    { q: '用 linprog 处理约束 x1 + x2 ≥ 3 时，应该写成：', o: ['A = [1 1], b = 3', 'A = [-1 -1], b = -3', 'Aeq = [1 1], beq = 3', 'lb = [3 3]'], a: 1, why: 'linprog 的不等式约束统一是 Ax ≤ b，“≥”要两边同乘 −1 变成“≤”。' },
    { q: '用 ode45 解二阶方程 y″ + y = 0 时，首先要做的是：', o: ['直接把 y″ 写进函数', '化成一阶方程组：令 y1 = y，y2 = y′', '改用 integral', '先求解析解'], a: 1, why: 'ode45 只解一阶方程组。y″ + y = 0 变成 y1′ = y2，y2′ = −y1，函数写成 @(t, y) [y(2); -y(1)]。' },
  ],
};

// ---------- 练习判题 ----------
function getVar(sess, name) { return sess.vars.get(name); }
function arr(v) { return v && v.k === 't' ? Array.from(v.re) : null; }
function close(a, b, tol) { return Math.abs(a - b) <= (tol || 1e-9) * Math.max(1, Math.abs(b)); }
function need(sess, name) { const v = getVar(sess, name); if (!v) throw new Error(`没有找到变量 ${name}，请把结果存进名为 ${name} 的变量。`); return v; }
function wrap(fn) { return (sess, ML) => { try { return fn(sess, ML); } catch (e) { return { ok: false, msg: e.message }; } }; }
const C = {
  'mat-ij': wrap(sess => {
    const M = need(sess, 'M');
    if (M.k !== 't' || M.r !== 4 || M.c !== 4) return { ok: false, msg: `M 应该是 4×4 矩阵，现在是 ${M.r}×${M.c}。` };
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (M.re[i + j * 4] !== (i + 1) * 10 + (j + 1)) return { ok: false, msg: `M(${i + 1},${j + 1}) 应该是 ${(i + 1) * 10 + j + 1}，现在是 ${M.re[i + j * 4]}。` };
    return { ok: true, msg: '例如 M = (1:4)\' * 10 + (1:4)，利用隐式扩展一行就能写出来。' };
  }),
  'scores': wrap(sess => {
    const p = arr(need(sess, 'pass')), nf = need(sess, 'nfail');
    const want = [88, 92, 75, 60, 95, 81];
    if (!p || p.length !== want.length || p.some((v, i) => v !== want[i])) return { ok: false, msg: `pass 应该是 [${want.join(' ')}]。注意 60 分也算及格（>=）。` };
    if (nf.re[0] !== 2) return { ok: false, msg: 'nfail 应该是 2。可以用 sum(scores < 60) 统计。' };
    return { ok: true, msg: '逻辑数组既能当下标，也能直接 sum 来计数。' };
  }),
  'linsys': wrap(sess => {
    const x = need(sess, 'x');
    if (x.k !== 't' || x.r * x.c !== 3) return { ok: false, msg: 'x 应该是含 3 个元素的列向量。' };
    if (x.c !== 1) return { ok: false, msg: '结果是对的方向吗？A\\b 中 b 应该是列向量，得到的 x 也是列向量。' };
    const w = [2, 3, -1];
    if (w.some((v, i) => !close(x.re[i], v, 1e-8))) return { ok: false, msg: `解不对，检查系数矩阵 A 的每一行是否和方程对应。` };
    return { ok: true, msg: 'x = [2; 3; -1]。用 A*x - b 检查残差，应该接近 0。' };
  }),
  'fib': wrap(sess => {
    const F = arr(need(sess, 'F'));
    if (!F || F.length !== 20) return { ok: false, msg: `F 应该有 20 个元素，现在有 ${F ? F.length : 0} 个。` };
    let a = 1, b = 1;
    for (let i = 0; i < 20; i++) { const want = i < 2 ? 1 : a + b; if (i >= 2) { a = b; b = want; } if (F[i] !== want) return { ok: false, msg: `F(${i + 1}) 应该是 ${want}，现在是 ${F[i]}。` }; }
    return { ok: true, msg: 'F(20) = 6765。先用 zeros(1, 20) 预分配，循环会更快。' };
  }),
  'anon': wrap((sess, ML) => {
    const f = need(sess, 'f');
    if (f.k !== 'f') return { ok: false, msg: 'f 应该是函数句柄，比如 f = @(x) ...' };
    const s2 = new ML.Session(); s2.vars.set('f', f);
    const r = s2.run('chkY = f([0 1 2 3]);');
    if (r.error) return { ok: false, msg: 'f([0 1 2 3]) 报错：' + r.error.msg + '。记得用 .^ 和 .* 支持向量输入。' };
    const y = arr(s2.vars.get('chkY'));
    const want = [1, 0, 1, 4];
    if (!y || y.length !== 4 || y.some((v, i) => !close(v, want[i]))) return { ok: false, msg: `f([0 1 2 3]) 应该得到 [1 0 1 4]，现在是 [${y ? y.join(' ') : ''}]。` };
    return { ok: true, msg: '匿名函数配合点运算，可以一次性对整个向量求值。' };
  }),
  'plot2': wrap(sess => {
    const figs = sess.figs.list;
    if (!figs.length) return { ok: false, msg: '没有画出任何图窗。' };
    const ax = figs[figs.length - 1].axes;
    const a = ax.find(x => x.series.length >= 2);
    if (!a) return { ok: false, msg: '同一个坐标区里应该有至少两条曲线。画第二条之前要先 hold on。' };
    if (!a.legend) return { ok: false, msg: '还缺图例：legend(...)。' };
    if (!a.title) return { ok: false, msg: '还缺标题：title(...)。' };
    if (!a.xlabel || !a.ylabel) return { ok: false, msg: '还缺坐标轴标签：xlabel(...) 和 ylabel(...)。' };
    return { ok: true, msg: '标题、轴标签、图例齐全，这是论文图和实验报告图的基本要求。' };
  }),
  'sprintf': wrap((sess, ML) => {
    const s = need(sess, 's');
    if (!ML.isText(s)) return { ok: false, msg: 's 应该是字符串。' };
    const t = ML.textOf(s);
    if (t !== 'r = 2.50, A = 19.63') return { ok: false, msg: `s 应该是 'r = 2.50, A = 19.63'，现在是 '${t}'。` };
    return { ok: true, msg: "sprintf('r = %.2f, A = %.2f', r, pi*r^2)。%.2f 会自动四舍五入。" };
  }),
  'conv': wrap(sess => {
    const y = arr(need(sess, 'y')), n = arr(need(sess, 'n'));
    const wy = [1, 3, 6, 5, 3], wn = [-1, 0, 1, 2, 3];
    if (!y || y.length !== 5 || y.some((v, i) => !close(v, wy[i]))) return { ok: false, msg: `y 应该是 [${wy.join(' ')}]。` };
    if (!n || n.length !== 5 || n.some((v, i) => !close(v, wn[i]))) return { ok: false, msg: `y 是对的，但时间轴 n 应该从 nx(1) + nh(1) = -1 开始，到 nx(end) + nh(end) = 3 结束。` };
    return { ok: true, msg: '卷积结果的起点 = 两个序列起点之和。这是信号与系统实验里最容易丢分的地方。' };
  }),
  'fit2': wrap(sess => {
    const p = arr(need(sess, 'p'));
    if (!p || p.length !== 3) return { ok: false, msg: 'p 应该有 3 个系数（二次多项式）。' };
    const want = [0.5, -1, 2];
    if (p.some((v, i) => Math.abs(v - want[i]) > 0.05)) return { ok: false, msg: `p 应该接近 [0.5 -1 2]，现在是 [${p.map(v => v.toFixed(3)).join(' ')}]。` };
    const R2 = sess.vars.get('R2');
    if (!R2) return { ok: false, msg: '系数对了。还要算出拟合优度 R2 = 1 - SSE/SST。' };
    if (!(R2.re[0] > 0.99 && R2.re[0] <= 1)) return { ok: false, msg: `R2 应该在 0.99 到 1 之间，现在是 ${R2.re[0]}。检查 SSE 和 SST 的公式。` };
    return { ok: true, msg: '论文里报告拟合结果时，系数和 R² 都要给出来。' };
  }),
};

window.MLDATA = { docs: D, quiz: Q, checks: C };
})();
