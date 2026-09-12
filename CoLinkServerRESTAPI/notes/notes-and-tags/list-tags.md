# 列出标签

## Endpoint

```http
GET /api/v1/note-tags
```

## Request

无请求参数。

## Response

```json
{
  "code": 0,
  "data": {
    "tags": [
      {
        "tagId": "c712c0b5-3938-44c3-a3ef-7f09f86745f9",
        "name": "工作",
        "revision": 2,
        "createdAt": "2026-09-10T05:00:00Z",
        "updatedAt": "2026-09-12T05:00:00Z"
      }
    ]
  },
  "message": "ok"
}
```

