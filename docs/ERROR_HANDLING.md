# Error Handling

## 1. 目标

任何错误都应该能够回答：

1. 哪里出错
2. 用户当时做了什么
3. 哪个版本发生
4. 是否影响数据
5. 是否可以重试

## 2. 统一错误结构

```ts
type AppError = {
  code: string;
  message: string;
  requestId: string;
  cause?: unknown;
  details?: Record<string, unknown>;
};
```

## 3. 用户可见错误

应提供：

- 清楚说明
- 是否可以重试
- 下一步操作
- 不暴露内部技术细节

## 4. 日志字段

```text
timestamp
requestId
environment
appVersion
module
action
userId
resourceType
resourceId
previousState
attemptedState
errorCode
errorMessage
```

## 5. 可重试

- 网络临时失败
- 第三方服务暂时不可用
- 超时

## 6. 不可直接重试

- 权限不足
- 非法状态转换
- Invitation 已过期
- 用户已被 Block
- 输入验证失败

## 7. 禁止

```ts
catch {
  return { success: true };
}
```

禁止吞掉异常或返回假成功。
