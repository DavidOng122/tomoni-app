# Dependencies

## 1. 原则

每个依赖都必须：

- 有明确职责
- 不与现有工具重复
- 持续维护
- 可以升级
- 可以替换
- 不显著增加部署和排错成本

## 2. 当前基础

```text
Next.js
React
TypeScript
ESLint
```

准确版本以 `package.json` 和 Lockfile 为准。

## 3. 新增前检查

1. 浏览器原生能力能否完成
2. JavaScript 或 TypeScript 原生能力能否完成
3. React 或 Next.js 原生能力能否完成
4. 现有依赖能否完成
5. 是否已有同类型 Library
6. 自己实现是否简单、安全和稳定

## 4. 禁止重复类别

同一项目原则上只保留一套主要方案：

- 日期库
- 表单库
- Validation Library
- 状态管理库
- UI Component Library
- HTTP Client
- 地图供应商
- Analytics SDK
- Error Monitoring SDK

## 5. 新增记录模板

```text
名称：
版本范围：
职责：
使用模块：
为什么现有能力不能完成：
替代方案：
维护状态：
Bundle 或部署影响：
未来移除方式：
```

## 6. 默认优先

- 网络请求：原生 `fetch`
- 简单日期显示：`Intl.DateTimeFormat`
- 唯一 ID：`crypto.randomUUID`
- 页面状态：React 和 Framework 原生能力
- 样式：保持单一主方案

## 7. 安全敏感功能

以下不自行实现底层算法：

- Authentication Protocol
- 密码 Hash
- Token Signature
- Encryption
- Payment
- 权限系统底层机制

## 8. 升级规则

禁止为了修复一个功能执行无范围限制的：

```bash
npm update
```

功能修改与依赖升级必须分开提交。
