x = 5
y = 3.14159
A = [1 2 3; 4 5 6]
B = A'
v = 1:5
w = 0:0.25:1
z = [1 -2]
z2 = [1 - 2]
s = 'hello'
t = "world"
n = numel(A), sz = size(A)
%%%
A = magic(4)
A(2,3)
A(end, :)
A(:, 1)'
A(A > 10)'
A(7)
%%%
x = [1 2 3];
x(5) = 9
x(2) = []
x(10)
%%%
a = [1 2 3]; b = [4 5 6];
a * b
%%%
a = [1 2 3]; b = [4; 5];
c = a + b
d = a .* [1 2]
%%%
A = [2 1; 1 3]; b = [3; 5];
x = A \ b
inv(A)
det(A)
eig(A)
[V, D] = eig(A)
%%%
f = @(x) x.^2 + 1
f(3)
g = @(x, y) x + y;
g(1, 2)
q = arrayfun(@(k) k^2, 1:4)
%%%
total = 0;
for k = 1:100
  if mod(k, 3) == 0
    total = total + k;
  end
end
total
n = 0; while 2^n < 1000, n = n + 1; end, n
switch 'b'
  case {'a','b'}
    disp('a or b')
  otherwise
    disp('other')
end
%%%
fprintf('pi = %.4f, e = %g\n', pi, exp(1));
fprintf('%d ', 1:5); fprintf('\n');
s = sprintf('%5.2f|', [1.234 5.6])
disp(['x = ', num2str(3.14159)])
num2str(123.456789)
mat2str([1 2;3 4])
%%%
p = polyfit(1:5, [2.1 3.9 6.2 7.8 10.1], 1)
r = roots([1 -3 2])
r2 = roots([1 2 5])
polyval([1 2 3], 2)
conv([1 1], [1 -1])
%%%
x = linspace(0, 1, 5)
y = interp1([0 1 2], [0 10 20], 1.5)
integral(@(x) x.^2, 0, 1)
trapz(0:0.1:1, (0:0.1:1).^2)
%%%
f = [-3; -5]; A = [1 0; 0 2; 3 2]; b = [4; 12; 18];
[x, fval] = linprog(f, A, b, [], [], [0; 0], [])
%%%
[t, y] = ode45(@(t, y) -2*y, [0 1], 1);
y(end)
exp(-2)
%%%
X = fft([1 2 3 4])
abs(X)
ifft(X)
%%%
sys = tf([1 5], [1 3 2])
[y, t] = step(sys);
y(end)
pole(sys)
%%%
x = 3
x(0)
%%%
undefinedThing + 1
%%%
A = [1 2; 3 4];
B = [1 2 3];
A * B
%%%
for i = 1:3
  disp(i)
%%%
s.name = 'Tom';
s.age = 20;
s
c = {1, 'abc', [1 2 3]}
c{2}
%%%
x = 1e5 * [1.5 2.25]
y = [0.001 0.0002]
z = 3 + 4i
abs(z)
m = [1+2i, 3-4i]
true
[1 0 1] > 0
isempty([])
1/0
-1/0
0/0
