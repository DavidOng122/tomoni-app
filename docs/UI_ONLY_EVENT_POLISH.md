# Event Flow UI-Only Polish Contract

本文件是 Tomoni 活动流程视觉优化任务的强制执行边界。后续所有相关修改必须同时遵守根目录 `AGENTS.md` 与本文件；如果两者存在冲突，采用限制更严格的一项。

## 1. 目标

本轮及后续活动流程优化只允许改善 UI、视觉一致性和移动端体验，不得借 UI 工作修改产品规格、数据来源或业务行为。

覆盖界面：

- Discover 的活动区域
- 创建活动
- 活动详情
- 参加计划
- 同活动人员
- 主办方申请列表
- Connections 的活动邀请区域

真实页面当前的数据流和行为是不可变基线。

## 2. 允许修改

允许进行以下展示层修改：

- Layout、wrapper、section 和纯视觉分组
- Spacing、padding、margin、gap 和 alignment
- Typography、字号、字重、行高和视觉层级
- 颜色、背景、边框、圆角和阴影
- Button、input、select、textarea、card、tag 和 empty/loading/error 状态的外观
- Icon 的尺寸、对齐和纯展示替换
- Image 的尺寸、比例、裁切和 placeholder
- 375px、402px、430px 等移动端响应式适配
- 不改变行为的 `className`、CSS Module 和无障碍展示属性
- 为实现布局所需的最小 JSX wrapper
- 将 inline style 等量迁移到 CSS Module，但不得在迁移时改变事件处理或数据判断

优先复用现有 Button、Input、Card、layout 和 design token。默认不新增 production dependency。

## 3. 严禁修改

以下内容不属于 UI 工作，禁止修改：

- Supabase client、query、mutation、RPC 调用及返回值映射
- Database、Migration、RLS、policy、function、trigger 和 Storage bucket
- Auth、session、permission、redirect 和 onboarding 判断
- Server Action、repository、service、domain 和 infrastructure
- Routing、URL、route guard、`router.push`、`router.replace`、`redirect` 和 `notFound` 的现有行为
- Validation、submit、loading guard、double-submit protection 和错误处理逻辑
- Event create、join、cancel、approve、reject、invite、accept、decline 和 cancel invitation 行为
- 时间、日期、时区、地点和用户数据的转换或 canonical value
- Participation、Invitation、Connection、Conversation 等状态机及状态名称
- React Provider、global state、business hook 和现有本地 state 的业务含义
- 真实 fetching 替换、Mock fallback、API 接入或 backend 修复
- UI 文案、字段、步骤、入口、导航、modal 或其他新产品功能，除非用户另行明确批准

如果视觉实现似乎必须修改上述内容，必须停止并向用户说明原因，不得自行扩大范围。

## 4. Discover 假数据临时规则（用户明确覆盖）

用户已明确取消 `/dev/events-ui` 隔离方案，允许 `/discover` 临时直接显示 Figma 假数据。

- Fixtures 集中存放在 `src/app/discover/figmaFixtures.ts`
- `src/app/discover/page.tsx` 只通过 `USE_FIGMA_DISCOVER_DATA` 选择展示数据
- 不修改或删除原有 Supabase、RPC、Auth、查询和错误处理
- 不写入 Supabase、Storage 或浏览器持久化存储
- 不修改 API、Schema、Database types 或业务状态机
- 恢复真实数据时，将 `USE_FIGMA_DISCOVER_DATA` 改为 `false`；不需要改查询逻辑
- 不再创建或保留 `/dev/events-ui` 路由

## 5. 每轮执行流程

修改前：

1. 运行 `git status --short`，记录已有修改并避免覆盖他人工作。
2. 阅读目标页面、组件以及相关产品、架构和状态机文档。
3. 明确本轮唯一 UI 目标、预计修改文件和最小方案。
4. 建立文件白名单；不得顺便修改白名单之外的文件。
5. 保存或记录关键交互基线，确认真实数据来源和事件处理函数。

修改中：

1. 优先只改 CSS 或 `className`。
2. 必须改 JSX 时，只增加展示 wrapper 或调整纯视觉分组。
3. 不修改 handler 内容、条件判断、数据映射、async 调用或 state transition。
4. 发现非 UI 问题时只记录，不修复。

修改后：

1. 检查 `git diff` 和 `git diff --stat`，确认只有批准的 UI 文件。
2. 搜索并确认 Supabase、RPC、Server Action、routing、validation 和状态逻辑没有变化。
3. 运行 `npm run typecheck`、`npm run lint`、`npm run build`。
4. 在 375×812、402×874、430×932 下完成视觉检查。
5. Smoke test 原有点击、表单、导航和状态展示，确认 UI 修改没有破坏交互。
6. 运行 `git status --short`；未经用户批准不得 commit 或 push。

## 6. UI 验收标准

- 无水平溢出、内容裁切、按钮重叠或固定区域遮挡
- 日文文案不乱码、不截断，字号和行高适合移动端阅读
- 页面宽度、水平 padding、spacing rhythm、radius、border 和按钮系统一致
- Loading、empty、error、disabled 和 selected 状态有清晰且一致的视觉层级
- 图片裁切稳定，图标尺寸和文字基线对齐
- 键盘弹出时表单仍可滚动至当前字段和主要 CTA
- 原有真实数据、权限、状态和路由结果与修改前一致

## 7. 非 UI 问题记录格式

发现非 UI 问题时继续完成安全的 UI 工作，并按以下格式报告：

```text
NON-UI ISSUE FOUND

File:
Issue:
Observed behavior:
Suggested owner:
```

## 8. 完成报告模板

```text
A. UI Problems Found
B. UI Changes Made
C. Files Modified
   - File:
   - UI-only change: YES / NO
D. Functional Logic Changed: NO
E. Routes Changed: NO
F. API / Supabase / RPC Changed: NO
G. State / Provider Logic Changed: NO
H. Database / Migration Changed: NO
I. Responsive Test
   - 375px: PASS / FAIL
   - 402px: PASS / FAIL
   - 430px: PASS / FAIL
J. Interaction Regression: PASS / FAIL
K. TypeScript: PASS / FAIL
L. Lint: PASS / FAIL
M. Build: PASS / FAIL
N. Non-UI Issues Found
O. Git Status
```

任一项无法填写为规定结果时，必须如实说明，禁止用“UI-only”掩盖实际的逻辑或数据变更。
