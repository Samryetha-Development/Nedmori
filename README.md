# Nedmori Online Judge

按照用户提供的 Samryetha Interface Guidelines 制作的中文 OJ。界面控件使用 [@lako/ui](https://github.com/Samryetha-Development/lako-ui) 的 React 组件。

题面由本地 Node API 使用 markdown-it 渲染，KaTeX 处理数学公式，Shiki 在服务端生成代码高亮 HTML。

## 本地预览

在项目根目录运行：

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

然后访问 `http://127.0.0.1:3000`。源码直接放在当前项目根目录，仅本地运行。

生产构建使用 `pnpm build`，类型检查使用 `pnpm check`。

## 已实现

- 题库：16 道完整示例题、搜索、难度与算法筛选、分页、随机题、收藏。
- 题目工作台：Markdown / LaTeX / 服务端代码高亮题面、C++ / Python / Java 代码输入、按题目与语言保存草稿、下载、重置、提交记录。
- 比赛列表、比赛详情、本机演示报名和赛后练习入口。
- 提交记录、源代码详情、按积分或题数排序的示例榜单。
- 浅色 / 深色 / 跟随系统，键盘可操作的 Lako Tabs、Dialog、Dropdown、Notification、移动导航与减弱动效。

## 明确边界

项目包含一个本地 Node.js API，提供题目读取、提交创建、提交历史和健康检查，并将提交持久化到 `backend/data/submissions.json`。编译器、判题沙箱和登录尚未接入；榜单、用户统计、比赛和 Accepted / Wrong Answer 仍为标注过的示例数据。API 不可用时，代码会降级暂存到当前浏览器，避免草稿丢失。

`pnpm dev` 会同时启动网页 `http://127.0.0.1:3000` 和 API `http://127.0.0.1:8787`。可使用 `pnpm dev:web` 或 `pnpm dev:api` 单独启动。

## 设计对应

- 主站浅深主题值、系统字体栈及反色 CTA 来自提供的规范。
- 1160px 版心，740px 主列 + 88px 间距 + 332px 侧列；无卡片化题目列表。
- 64px 桌面导航，640px 下 56px 导航，900px 下主列表折单列。
- 雾蓝用于链接和辅助状态，语义色用于难度、提交状态；细线区分内容。
- OJ 题目页采用题面 / 编辑器工作台，是面向编程场景的布局扩展。

## 组件库

上游组件库当前未发布到 npm。本项目按照其 README 支持的方式，从上游源码生成本地 tarball，并通过 `file:vendor/lako-ui-0.1.0.tgz` 安装。上游提交、许可证与重建说明记录在 `vendor/README.md`。

实际使用了 `LakoButton`、`LakoInputBox`、`LakoTextarea`、`LakoDropdown`、`LakoTabs`、`LakoDialog`、`LakoNotifications`、`LakoRadioGroup`、`LakoBadge`、`LakoAlert` 和 `LakoEmptyState`。

## 文件

- `index.html`：React 挂载点与首屏主题。
- `src/App.tsx`：页面、hash 路由、业务交互与本机保存。
- `src/data.js`：题目、比赛和排行榜示例数据。
- `src/integration.css`：OJ 布局对 Lako 组件的适配。
- `backend/markdown.mjs`：Markdown、KaTeX 与 Shiki 服务端题面渲染。
- `styles.css`：主题变量、业务版式与响应式样式。
- `vendor/lako-ui-0.1.0.tgz`：锁定的本地 `@lako/ui` 依赖包。
