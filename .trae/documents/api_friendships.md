# 好友请求列表接口文档

## 1. 接口信息

| 项目 | 内容 |
| --- | --- |
| 接口地址 | `/api/friendships/pending` |
| 请求方法 | `GET` |
| 认证方式 | JWT Token |
| 功能描述 | 获取与当前用户相关的所有好友请求，包括所有状态 |

## 2. 请求头

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| Authorization | string | 是 | Bearer Token，格式：`Bearer {token}` |

## 3. 请求参数

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| 无 | - | - | - |

## 4. 返回数据

### 4.1 成功响应

```json
{
  "success": true,
  "message": "获取待处理好友请求成功",
  "data": {
    "pending_requests": [
      {
        "id": 1,
        "sender_id": 2,
        "receiver_id": 1,
        "nickname": "张三",
        "avatar": "https://example.com/avatar.jpg",
        "request_time": "2小时前",
        "match_score": 85,
        "match_tag": 2,
        "message": "",
        "status": "pending",
        "is_sender": false,
        "is_receiver": true,
        "button_texts": ["拒绝", "同意"],
        "button_actions": ["reject", "approve"]
      }
    ]
  }
}
```

### 4.2 失败响应

```json
{
  "success": false,
  "message": "无效的令牌"
}
```

## 5. 返回字段说明

### 5.1 顶层字段

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| success | boolean | 操作是否成功 |
| message | string | 操作结果描述 |
| data | object | 返回数据主体 |

### 5.2 data.pending_requests[] 字段

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| id | integer | 好友请求ID |
| sender_id | integer | 发送者用户ID |
| receiver_id | integer | 接收者用户ID |
| nickname | string | 对方用户昵称（根据当前用户角色自动判断） |
| avatar | string | 对方用户头像URL（处理后的临时访问URL） |
| request_time | string | 请求发送时间（格式化显示，如：2小时前） |
| match_score | integer | 匹配度百分比（0-100） |
| match_tag | integer | 匹配标签：0=无标签，1=高潜力，2=高质量 |
| message | string | 请求消息内容（当前返回空字符串） |
| status | string | 好友请求状态：pending=待同意，accepted=已同意，rejected=已拒绝，blocked=已拉黑 |
| is_sender | boolean | 当前用户是否为请求发起者 |
| is_receiver | boolean | 当前用户是否为请求接收者 |
| button_texts | array | 操作按钮文本（根据状态和角色动态生成） |
| button_actions | array | 操作按钮动作标识（与button_texts一一对应） |

## 6. 状态与按钮映射关系

| 状态 | 当前用户角色 | 按钮文本 | 按钮动作 |
| --- | --- | --- | --- |
| pending | 接收者 | ["拒绝", "同意"] | ["reject", "approve"] |
| pending | 发送者 | ["待验证"] | ["pending"] |
| accepted | 任意 | ["已同意"] | ["accepted"] |
| rejected | 任意 | ["已拒绝"] | ["rejected"] |
| blocked | 任意 | ["已拉黑"] | ["blocked"] |

## 7. 匹配标签规则

| 匹配度分数范围 | 匹配标签 |
| --- | --- |
| match_score < 75 | 0（无标签） |
| 75 ≤ match_score < 85 | 1（高潜力） |
| match_score ≥ 85 | 2（高质量） |

## 8. 示例请求

```bash
curl -X GET \
  http://127.0.0.1:5000/api/friendships/pending \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

## 9. 注意事项

1. 接口需要有效的JWT Token才能访问
2. 接口返回所有与当前用户相关的好友请求，包括不同状态
3. 匹配度数据可能不存在，此时返回默认值0
4. 头像URL经过`process_image_url`处理，返回的是临时访问URL
5. 按钮文本和动作根据请求状态和当前用户角色动态生成

## 10. 接口变更历史

| 日期 | 变更内容 |
| --- | --- |
| 2026-01-03 | 优化接口逻辑，合并查询条件 |
| 2026-01-03 | 添加按钮文本生成逻辑，支持不同状态和角色 |
| 2026-01-03 | 优化匹配度计算和标签生成 |
| 2026-01-03 | 添加process_image_url处理头像URL |