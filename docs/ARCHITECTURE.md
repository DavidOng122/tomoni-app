# Architecture

## 1. 目标

Tomoni 使用 Feature-based Architecture，目标是：

- Bug 容易定位
- 业务边界清楚
- 第三方服务可替换
- 小范围修改不会影响整个项目
- 核心规则可以独立测试

## 2. 分层

```text
src/app
↓
src/features
↓
src/domain
↓
src/infrastructure
↓
Database / External Services
```

## 3. Folder 职责

### `src/app`

负责：

- 路由
- Layout
- 页面入口
- 页面组合
- Route Handler 或 Server Action 入口

不得保存复杂业务逻辑。

### `src/features`

按产品功能组织：

```text
auth
onboarding
profiles
fixed-schedules
recommendations
conversations
invitations
meetups
notifications
blocking
reporting
```

每个 Feature 只在有实际需要时创建：

```text
components/
actions/
services/
domain/
repositories/
schemas/
types/
tests/
```

### `src/components`

只保存通用 UI，例如：

- Button
- Input
- Dialog
- Avatar
- Badge
- Skeleton
- Header
- BottomNavigation
- EmptyState
- ErrorState

业务组件应放在对应 Feature。

### `src/domain`

只保存多个 Feature 共用的业务概念：

- User
- Location
- Relationship
- EntityId
- DomainError
- Result

### `src/infrastructure`

负责：

- 数据库
- 认证
- 地图
- 推送
- 文件存储
- 日志和监控

业务层依赖接口，不直接依赖具体平台 SDK。

### `src/lib`

只保存小型、通用、无业务含义的工具。

避免大型：

```text
utils.ts
helpers.ts
common.ts
```

## 4. 依赖方向

允许：

```text
app → features
features → domain
features → repository interfaces
infrastructure → repository interfaces
```

禁止：

```text
domain → features
domain → infrastructure
components/ui → feature-specific code
feature A → feature B 的内部实现
```

## 5. 示例：接受邀请

页面只调用：

```ts
await acceptInvitation({
  invitationId,
  currentUserId,
});
```

Use Case 负责：

1. 验证身份和权限
2. 检查 Invitation 状态
3. 原子更新 Invitation
4. 创建唯一 Meetup
5. 创建双方通知
6. 返回结果

## 6. 单一权威来源

以下规则必须集中管理：

```text
canRecommend
canSendInvitation
canAcceptInvitation
canWithdrawInvitation
canCancelMeetup
canRevealExactLocation
canMessageUser
```
