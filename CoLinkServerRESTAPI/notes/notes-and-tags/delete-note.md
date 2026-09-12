# 删除笔记

## Endpoint

```http
DELETE /api/v1/notes/:noteId?baseRevision=<revision>
```

## Request

| 参数 | 位置 | 类型 | 必需 | 说明 |
|------|------|------|------|------|
| `noteId` | path | UUID v4 | 是 | 笔记 ID |
| `baseRevision` | query | integer | 是 | 删除所基于的笔记版本 |

删除是同步语义上的软删除，MUST 生成 `revision + 1` 的删除事件。服务器可在变更日志保留期后清理正文和未引用附件。

## Response

```json
{
  "code": 0,
  "data": {
    "noteId": "0d998630-e4cb-4ef3-8b27-dc451f55b86f",
    "revision": 7,
    "deletedAt": "2026-09-12T06:00:00Z"
  },
  "message": "ok"
}
```
