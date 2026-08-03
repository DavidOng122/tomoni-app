# Database

## 1. 目标

数据库必须保证：

- 状态可追踪
- 不同页面读取同一数据源
- 重复请求不会产生重复记录
- 取消和拒绝保留历史
- 核心写操作具有原子性

## 2. 初始数据表

```text
users
profiles
locations
fixed_schedules
recommendations
conversations
conversation_participants
messages
invitations
meetups
notifications
blocks
reports
```

## 3. 关键约束

### Profile

```text
profiles.user_id UNIQUE
```

### Conversation

一对一 Conversation 应防止重复创建。

### Invitation

防止相同发送者、接收者、FixedSchedule 和日期同时存在多个 pending Invitation。

### Meetup

```text
meetups.invitation_id UNIQUE
```

确保一个 Invitation 最多生成一个 Meetup。

### Block

```text
(blocker_id, blocked_user_id) UNIQUE
```

## 4. Index 建议

```text
fixed_schedules.user_id
fixed_schedules.status
recommendations.source_user_id
recommendations.target_user_id
messages.conversation_id
messages.created_at
invitations.sender_id
invitations.receiver_id
invitations.status
meetups.invitation_id
meetups.status
notifications.user_id
notifications.read_at
blocks.blocker_id
blocks.blocked_user_id
```

## 5. Migration

所有结构变化必须通过 Migration。

建议顺序：

```text
001_create_users
002_create_profiles
003_create_locations
004_create_fixed_schedules
005_create_conversations
006_create_messages
007_create_invitations
008_create_meetups
009_create_notifications
010_create_blocks
011_create_reports
```

每个 Migration 必须说明：

- 新增或修改内容
- NULL 和默认值
- Foreign Key
- Index
- 旧数据处理
- 回滚或恢复方式

## 6. Transaction

必须原子执行：

### 接受 Invitation

1. 锁定或重新读取 Invitation
2. 验证仍为 `pending`
3. 更新为 `accepted`
4. 创建唯一 Meetup
5. 创建通知
6. 提交 Transaction

### Block 用户

1. 创建 Block
2. 停止推荐
3. 禁止新消息和邀请
4. 提交 Transaction

### 取消 Meetup

1. 验证状态
2. 更新为 `cancelled`
3. 保存取消人和原因
4. 创建双方通知
5. 提交 Transaction

## 7. 数据保留

不应直接 Hard Delete：

- FixedSchedule
- Invitation
- Meetup
- Block
- Report
