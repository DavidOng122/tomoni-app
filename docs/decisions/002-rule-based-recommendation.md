# ADR 002: Rule-based Recommendation for MVP

## Status

Accepted

## Context

第一版需要验证用户是否愿意通过固定计划认识附近的人。复杂 AI 推荐会增加解释、测试和调试成本。

## Decision

MVP 使用明确规则：

- 活动相同
- 星期重合
- 时间段重合
- 距离符合范围
- 双方没有 Block
- 账号状态正常

再根据时间重合、距离、重复频率和偏好排序。

## Consequences

优点：

- 可解释
- 可测试
- 容易调整
- Bug 容易定位

限制：

- 个性化程度较低
- 数据量增大后可能需要重新评估

## Revisit When

规则推荐稳定，并且有足够真实用户行为数据时重新评估。
