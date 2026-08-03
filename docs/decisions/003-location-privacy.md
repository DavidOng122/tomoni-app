# ADR 003: Progressive Location Disclosure

## Status

Accepted

## Context

产品需要使用活动地点进行推荐，但过早公开精确位置会增加隐私和安全风险。

## Decision

采用分阶段地点公开：

```text
推荐阶段：大概区域
聊天与 pending Invitation：地点名称或附近区域
Invitation accepted / Meetup confirmed：精确集合地点
```

## Consequences

优点：

- 减少生活路线暴露
- 降低陌生人安全风险
- 仍能支持有效推荐和见面

限制：

- 接受邀请前无法查看完整集合点
- API 和 UI 必须实现权限分层

## Rule

精确地点权限必须由服务端判断，不能只由前端隐藏。
