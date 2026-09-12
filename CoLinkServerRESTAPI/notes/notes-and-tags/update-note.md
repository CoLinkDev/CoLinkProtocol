# 更新笔记

## Endpoint

```http
PUT /api/v1/notes/:noteId
```

## Request

| 参数 | 位置 | 类型 | 必需 | 说明 |
|------|------|------|------|------|
| `noteId` | path | UUID v4 | 是 | 要更新的笔记 ID |

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `baseRevision` | integer | 是 | 本次编辑所基于的笔记版本 |
| `title` | string | 是 | 完整的新标题 |
| `markdown` | string | 是 | 完整的新 Markdown |
| `tagIds` | UUID v4[] | 是 | 完整的新标签集合 |
| `attachmentIds` | UUID v4[] | 是 | 完整的新附件集合 |

这是完整替换操作，不采用字段级合并。服务器 MUST 使用 `noteId + userId + baseRevision` 做条件更新；仅在版本匹配时写入 `revision + 1`。版本不匹配返回 `5002 revision conflict`，响应 `data` 为 `null`，客户端再获取当前笔记执行三方合并。缺少或无法解析 `baseRevision` 时返回 `4002 invalid parameter`。

## Response

成功返回完整的新 [`Note`](README.md#note)。
