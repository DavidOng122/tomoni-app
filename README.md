# Tomoni App

这个项目使用 Feature-based Architecture 组织代码。

## Structure
- src/app：页面和路由
- src/features：按照产品功能组织代码
- src/components：通用 UI 和 Layout
- src/domain：跨功能共享的业务概念
- src/infrastructure：数据库、认证、地图等外部服务
- src/lib：没有业务含义的通用工具
- database：Migration、Seed 和 Schema
- 	ests：跨模块测试和 E2E 测试
- docs：产品和技术文档
