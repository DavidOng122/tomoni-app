# Tomoni Documentation

本目录保存 Tomoni 的产品、架构和开发规范。

## 文档索引

| 文件 | 用途 |
|---|---|
| `PRODUCT_WORKFLOW.md` | 核心用户流程与异常流程 |
| `ARCHITECTURE.md` | 系统分层、模块职责与数据流 |
| `DOMAIN_MODEL.md` | 核心业务对象与关系 |
| `STATE_MACHINES.md` | 业务状态与合法转换 |
| `DATABASE.md` | 数据表、约束与 Migration 规则 |
| `API.md` | API、权限与错误格式 |
| `TESTING.md` | Unit、Integration、E2E 测试策略 |
| `DEPENDENCIES.md` | 技术栈与依赖规则 |
| `SECURITY_PRIVACY.md` | 位置隐私、社交安全和敏感数据 |
| `ERROR_HANDLING.md` | 错误、日志和监控规范 |
| `DEPLOYMENT.md` | 环境、部署和回滚流程 |
| `ROADMAP.md` | MVP 开发顺序 |
| `decisions/` | 重要架构决策记录 |

开发具体功能前，优先阅读：

1. 根目录 `AGENTS.md`
2. 当前 Feature 对应文档
3. 涉及的状态机和数据库说明
