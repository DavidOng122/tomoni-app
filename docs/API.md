# API

## 1. 原则

API 必须：

- 有明确输入和输出 Type
- 验证身份
- 验证权限
- 验证当前状态
- 验证用户输入
- 防止重复提交
- 不返回无关敏感字段
- 使用统一错误格式

## 2. 统一响应

成功：

```ts
type ApiSuccess<T> = {
  data: T;
  requestId: string;
};
```

失败：

```ts
type ApiError = {
  code: string;
  message: string;
  requestId: string;
  details?: Record<string, unknown>;
};
```

## 3. 错误代码

```text
AUTH_REQUIRED
PERMISSION_DENIED
VALIDATION_ERROR
RESOURCE_NOT_FOUND
INVALID_STATE_TRANSITION
DUPLICATE_SUBMISSION
USER_BLOCKED
INVITATION_EXPIRED
NETWORK_ERROR
INTERNAL_ERROR
```

## 4. 主要 API

### Profile

```text
GET    /api/profile/me
PATCH  /api/profile/me
GET    /api/users/:userId
```

### FixedSchedule

```text
GET    /api/fixed-schedules
POST   /api/fixed-schedules
PATCH  /api/fixed-schedules/:id
POST   /api/fixed-schedules/:id/pause
POST   /api/fixed-schedules/:id/resume
DELETE /api/fixed-schedules/:id
```

### Recommendation

```text
GET /api/recommendations
GET /api/recommendations/:id
```

### Conversation

```text
GET  /api/conversations
POST /api/conversations
GET  /api/conversations/:id/messages
POST /api/conversations/:id/messages
```

### Invitation

```text
POST /api/invitations
GET  /api/invitations/:id
POST /api/invitations/:id/accept
POST /api/invitations/:id/decline
POST /api/invitations/:id/withdraw
```

### Meetup

```text
GET  /api/meetups
GET  /api/meetups/:id
POST /api/meetups/:id/cancel
POST /api/meetups/:id/feedback
```

### Safety

```text
POST   /api/blocks
DELETE /api/blocks/:userId
POST   /api/reports
```

## 5. 幂等性

以下操作必须防止重复：

- 完成 Onboarding
- 发送 Invitation
- 接受 Invitation
- 取消 Meetup
- 提交反馈
- 创建 Block

## 6. 精确位置

接受邀请前只返回大概区域。

接受邀请后才返回：

- exactLocationName
- latitude
- longitude
- meetingInstructions

权限必须在服务端检查。
