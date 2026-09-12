# 查询笔记附件引用

查询当前账户中所有引用指定附件的有效笔记，用于在删除共享附件前解除关联。

## Endpoint

```http
GET /api/v1/note-attachments/:attachmentId/references?pageToken=<opaque>&limit=100
```

## Request

| 参数 | 位置 | 类型 | 必需 | 说明 |
|------|------|------|------|------|
| `attachmentId` | path | UUID v4 | 是 | 附件 ID |
| `pageToken` | query | string | 否 | 服务器签发的不透明分页令牌，客户端 MUST 原样回传 |
| `limit` | query | integer | 否 | `1..500`，默认 100 |

## Response

```json
{
  "code": 0,
  "data": {
    "noteIds": [
      "0d998630-e4cb-4ef3-8b27-dc451f55b86f",
      "9ee57936-bf6c-4793-b9d4-870d9100dc1d"
    ],
    "nextPageToken": null
  },
  "message": "ok"
}
```

`noteIds` 按字典序稳定排列。`nextPageToken` 为 `null` 表示已返回全部引用。附件不存在、已删除或不属于当前账户时返回 `5005 attachment not found`。

