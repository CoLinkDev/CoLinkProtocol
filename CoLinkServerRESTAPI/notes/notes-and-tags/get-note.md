# 获取单篇笔记

## Endpoint

```http
GET /api/v1/notes/:noteId
```

## Request

| 参数 | 位置 | 类型 | 必需 | 说明 |
|------|------|------|------|------|
| `noteId` | path | UUID v4 | 是 | 笔记 ID |

## Response

成功响应的 `data` 为完整 [`Note`](README.md#note)。已删除的笔记返回 `5001 note not found`。
