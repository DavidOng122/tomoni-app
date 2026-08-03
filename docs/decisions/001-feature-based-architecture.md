# ADR 001: Feature-based Architecture

## Status

Accepted

## Context

Tomoni 包含固定计划、推荐、聊天、邀请和 Meetup 等多个业务模块。按文件类型组织所有组件和 Service，会让相关代码分散并增加 Bug 定位成本。

## Decision

采用 Feature-based Architecture。

每个产品功能独立保存自己的组件、业务规则、Schema、Repository Interface 和测试。

## Consequences

优点：

- 相关代码集中
- 修改范围清楚
- Feature 可独立测试
- 更容易控制跨模块依赖

代价：

- 需要明确公开接口
- 共享代码放置需要判断
- 小项目初期目录数量会增加

## Rule

不提前创建无实际内容的大量子目录。
