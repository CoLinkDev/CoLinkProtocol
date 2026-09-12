# 列出笔记

## Endpoint

```http
GET /api/v1/notes?tagId=<uuid>&pageToken=<opaque>&limit=100
```

## Request

| 参数 | 位置 | 类型 | 必需 | 说明 |
|------|------|------|------|------|
| `tagId` | query | UUID v4 | 否 | 只返回包含该标签的笔记 |
| `pageToken` | query | string | 否 | 服务器签发的不透明分页令牌，客户端 MUST 原样回传 |
| `limit` | query | integer | 否 | `1..500`，默认 100 |

笔记按 `updatedAt` 降序、`noteId` 升序稳定排列。此接口用于界面浏览；客户端初次同步 MUST 使用快照接口。`pageToken` 与首次请求的筛选条件绑定，改变 `tagId` 或 `limit` 后不得继续使用原令牌。不存在的 `tagId` 返回 `5003 tag not found`。

## Response

```json
{
  "code": 0,
  "data": {
    "notes": [
      {
        "noteId": "0d998630-e4cb-4ef3-8b27-dc451f55b86f",
        "title": "周末安排",
        "tagIds": ["c712c0b5-3938-44c3-a3ef-7f09f86745f9"],
        "attachmentCount": 2,
        "revision": 6,
        "createdAt": "2026-09-10T05:00:00Z",
        "updatedAt": "2026-09-12T05:00:00Z"
      }
    ],
    "nextPageToken": null
  },
  "message": "ok"
}
```

`notes` 数组中的每一项都是 [`NoteSummary`](README.md#notesummary)。

