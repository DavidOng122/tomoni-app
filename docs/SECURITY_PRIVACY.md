# Security and Privacy

## 1. 位置隐私

Invitation 接受前只能显示：

- 区域
- 公园附近
- 车站附近
- 设施周边

Invitation 接受并创建 Meetup 后，才允许显示：

- 精确集合地点
- 出入口
- 地图坐标
- 集合说明

服务端必须验证访问权限。

## 2. 禁止公开

- 电话号码
- 邮箱
- 精确住址
- 实时位置
- 完整生活路线
- 登录方式
- 内部 User ID
- Access Token
- Refresh Token

## 3. 社交安全

必须支持：

- Block
- Report
- Cancel Meetup
- 隐藏精确地点
- 18 岁以上限制
- Block 后停止推荐
- Block 后停止聊天
- Block 后停止邀请
- 首次见面优先公共场所

## 4. 服务端权限

必须验证：

- 读取用户资料
- 读取 Conversation
- 发送 Message
- 发送或处理 Invitation
- 读取 Meetup 精确地点
- 取消 Meetup
- 提交反馈
- 创建 Block 或 Report

## 5. 日志隐私

日志不得包含：

- 密码
- Token
- 完整电话
- 完整邮箱
- 精确 GPS
- 私人聊天全文
- 用户上传的敏感内容
