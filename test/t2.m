[t, y] = ode45(@(t, y) -2*y, [0 1], 1);
y(end)
f = @(x) x.^2 + 1
w = 0:0.25:1
%%%
x = linspace(0, 2*pi, 100);
plot(x, sin(x), 'r--', 'LineWidth', 2); hold on
plot(x, cos(x))
title('正弦与余弦'); xlabel('x'); ylabel('y'); legend('sin', 'cos'); grid on
%%%
n = 0:10;
x = 0.8.^n;
stem(n, x, 'filled')
%%%
subplot(2,1,1); plot(1:10)
subplot(2,1,2); bar([3 5 2])
%%%
tic; s = 0; for k = 1:200000, s = s + k; end; s
t = toc;
%%%
x = randn(1, 1000);
histogram(x)
rng(1); a = rand(1,3)
rng(1); b = rand(1,3)
%%%
function y = sq(x)
  y = x.^2;
end
sq(4)
%%%
r = fact(5)
function r = fact(n)
  if n <= 1
    r = 1;
  else
    r = n * fact(n-1);
  end
end
%%%
[m, i] = max([3 9 2])
[s, idx] = sort([3 1 2], 'descend')
find([0 1 0 1])
cumsum(1:5)
mean([1 2; 3 4])
sum([1 2; 3 4], 2)
any([0 0 1]), all([1 1 0])
%%%
A = zeros(2,3);
A(:) = 1:6
A(2, :) = []
B = reshape(1:6, 2, 3)
B(:, end+1) = [7; 8]
%%%
c = {'apple', 'banana'};
for k = 1:numel(c)
  fprintf('%d: %s\n', k, c{k});
end
names = strjoin(c, ', ')
upper('abc')
strrep('hello world', 'o', '0')
strsplit('a,b,c', ',')
%%%
x = 10;
if x > 5 && x < 20
  disp('in range')
end
y = ~(x == 10)
xor(true, false)
%%%
x = fzero(@(x) x^3 - 2*x - 5, 2)
[xm, fv] = fminsearch(@(p) (p(1)-1)^2 + (p(2)-2)^2, [0 0])
[xb, fb] = fminbnd(@(x) (x-2).^2, 0, 5)
%%%
fun = @(x) x(1)^2 + x(2)^2;
[x, fval] = fmincon(fun, [1; 1], [-1 -1], -1)
%%%
x = intlinprog([-1; -2], [1 2], [1 1; -1 1], [4; 2], [], [], [0; 0], [])
%%%
b = [1 1]/2; a = 1;
y = filter(b, a, [1 2 3 4])
fs = 100; t = 0:1/fs:1-1/fs; x = sin(2*pi*10*t);
X = abs(fft(x)) / numel(x);
[pk, k] = max(X(1:50)); f0 = (k-1)*fs/numel(x)
%%%
x = 0:0.5:3; y = x.^2;
yi = interp1(x, y, 1.25, 'spline')
yp = interp1(x, y, 1.25, 'pchip')
yl = interp1(x, y, 1.25)
%%%
G = tf(1, [1 2 1]);
H = feedback(G, 1)
s = tf('s');
G2 = 1/(s^2 + 2*s + 1)
%%%
format long
pi
format short
pi
x = int8(3.7)
%%%
a = 1:3;
a(end+1) = 4
a(end:-1:1)
b = [];
for k = 1:3, b(end+1) = k^2; end
b
%%%
A = [1 2; 3 4];
A^2
A.^2
2.^[1 2 3]
1./[1 2 4]
(-8)^(1/3)
sqrt(-4)
%%%
x = 0.1 + 0.2;
x == 0.3
abs(x - 0.3) < eps
%%%
whos
a = 1; b = [1 2 3]; c = 'hi';
whos
%%%
ss = "abc" + 1
strcat('a', 'b', 'c')
['abc', 'def']
['ab'; 'cd']
length('hello')
double('A')
char(72)
