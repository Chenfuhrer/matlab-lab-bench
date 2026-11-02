# MATLAB 实验台

在浏览器里学 MATLAB：一本可以直接运行代码的交互式教程，不用装 MATLAB。

**在线使用**：<https://chenfuhrer.github.io/matlab-lab-bench/>

## 内容

- **10 章教程**：命令行与变量 → 矩阵 → 索引 → 运算 → 流程控制 → 函数与句柄 → 绘图 → 字符串与数据结构 → 信号与系统实战 → 数学建模常用工具，另附常见报错对照和函数速查
- **64 段可运行示例**：页面里每段代码都能改了再跑，底部有抽屉式命令行窗口
- **报错带中文提示**：错误信息和 MATLAB 一致，下面再用中文解释原因和改法（比如 `*` 和 `.*` 混用、索引从 1 开始）
- **30 道测验题**和练习，练习自动判题
- **函数速查**：常用函数的说明、用法和可运行示例；解释器内置 438 个函数（以上数字取自页面自身统计）

## 实现

核心是一个用 JavaScript 写的 **MATLAB 子集解释器**（`src/e0-head.js` ~ `src/e9-tail.js`）：词法/语法分析、矩阵运算与广播、索引与赋值、控制流、函数句柄，以及 `plot`/`stem`/`subplot` 绘图和 `conv`、`fft`、`filter`、`freqs`、`tf`、`step`、`impulse`、`lsim`、`roots`、`polyfit`、`interp1`、`ode45` 等教学常用函数，符号运算支持 `syms`、`laplace`、`ztrans` 的常见情形。

只覆盖教学常用的语法和函数，数值结果与 MATLAB 可能在末位有差异。

## 构建与测试

```bash
python3 build.py              # 拼接 src/ → index.html（GitHub Pages 用）、MATLAB实验台.html（本地双击打开）、test/engine.js
node test/run.js test/t1.m    # 用 Node 跑测试用例，%%% 分隔每个用例
```

`test/t1.m`、`test/t3.m` 里有一部分是故意写错的代码，用来检查报错信息和中文提示。
