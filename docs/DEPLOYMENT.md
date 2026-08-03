# Deployment

## 1. 环境

至少区分：

```text
development
preview
production
```

每个环境使用独立配置和数据库。

## 2. 环境变量

`.env.example` 只保存变量名和说明，不保存真实 Secret。

建议分类：

```text
APP
DATABASE
AUTH
MAPS
NOTIFICATIONS
MONITORING
```

## 3. 部署前检查

```bash
npm ci
npm run typecheck
npm run lint
npm run build
```

配置测试后：

```bash
npm test
```

涉及数据库时还要检查：

- Migration 顺序
- 备份
- 旧数据兼容
- 回滚方式

## 4. 发布策略

大型功能优先使用 Feature Flag：

```text
开发者
→ 内部测试
→ 少量用户
→ 全部用户
```

## 5. 回滚

记录：

- Commit SHA
- 应用版本
- Migration 版本
- 环境变量变化
- 回滚步骤

## 6. Smoke Test

发布后至少验证：

- 首页可打开
- 登录入口可用
- API 健康检查正常
- 数据库连接正常
- 关键写操作没有重复提交
