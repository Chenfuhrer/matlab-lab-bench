% 注释
%{
块注释
%}
x = [1, 2, ...
     3, 4]
y = x.'
fprintf('%d %d\n', [1 2; 3 4])
disp([1.5 2; 3 4])
A = eye(3)
B = ones(2, 3) * 2
v = repmat([1 2], 2, 2)
[X, Y] = meshgrid(1:3, 1:2)
%%%
s = 0;
for i = 1:1000000
  s = s + i;
end
s
%%%
while true
end
%%%
x = 1:10;
y = x(x > 3 & mod(x, 2) == 0)
z = x([1 end])
numel(x(2:end-1))
%%%
x = 5; y = x';
if x > 3 disp('big'), end
%%%
a = 3 % trailing comment
b = 'it''s'
c = {'a', "b"}
d = [ 1 , 2 ;
      3 , 4 ]
%%%
x = 1；
%%%
y = sin(x
%%%
A = rand(3) > 2
nnz(A)
%%%
v = [3 1 2];
v(1.5)
%%%
m = containers.Map()
%%%
syms x
%%%
data = readmatrix('a.csv')
%%%
t = 0:0.01:1;
y = sin(2*pi*5*t) .* exp(-3*t);
plot(t, y)
xlabel('t (s)'); ylabel('y(t)'); title('e^{-3t}sin(10\pi t)')
