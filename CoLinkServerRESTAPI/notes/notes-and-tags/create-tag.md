# 创建标签

## Endpoint

```http
POST /api/v1/note-tags
```

## Request

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `tagId` | UUID v4 | 是 | 客户端生成，支持离线创建 |
| `name` | string | 是 | 去除首尾空白后不得为空 |

## Response

成功返回完整 [`Tag`](README.md#tag)，初始 `revision` 为 1。同名标签返回 `5004 tag name conflict`。
