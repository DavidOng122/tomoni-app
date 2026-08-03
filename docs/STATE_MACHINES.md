# State Machines

## 1. FixedSchedule

```text
draft → active
active → paused
paused → active
draft → deleted
active → deleted
paused → deleted
```

规则：

- 只有 `active` 参与推荐
- `deleted` 为终止状态
- 删除优先使用 Soft Delete

## 2. Invitation

```text
draft → pending
pending → accepted
pending → declined
pending → withdrawn
pending → expired
```

禁止：

```text
accepted → pending
declined → accepted
withdrawn → accepted
expired → accepted
```

权限：

- 发送者可以发送和撤回
- 接收者可以接受或拒绝
- 只有 `pending` 可以处理
- 一个 Invitation 最多创建一个 Meetup

## 3. Meetup

```text
confirmed → in_progress
confirmed → cancelled
in_progress → awaiting_feedback
in_progress → cancelled
awaiting_feedback → completed
awaiting_feedback → no_show
```

规则：

- Meetup 由 accepted Invitation 创建
- `cancelled`、`completed`、`no_show` 为终止状态
- 状态改变必须通知双方
- 不得通过删除记录表示取消

## 4. Relationship

```text
suggested
→ greeted
→ chatting
→ invitation_pending
→ meetup_confirmed
→ completed
→ connected
```

也可能进入：

```text
declined
cancelled
blocked
reported
```

Relationship 只是辅助视图，不代替 Invitation 或 Meetup 的真实状态。

## 5. Message Send Status

```text
sending → sent
sending → failed
failed → sending
```

## 6. 实现要求

状态变化必须通过统一函数或 Use Case。

非法转换必须：

- 不修改数据库
- 返回统一错误
- 记录 requestId
- 有对应测试
