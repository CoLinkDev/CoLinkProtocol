# 获取笔记附件元数据

获取附件的名称、类型、大小和摘要，不返回文件内容。

## Endpoint

```http
GET /api/v1/note-attachments/:attachmentId
```

## Request

| 参数 | 位置 | 类型 | 必需 | 说明 |
|------|------|------|------|------|
| `attachmentId` | path | UUID v4 | 是 | 附件 ID |

## Response

成功响应的 `data` 为完整 [`Attachment`](README.md#attachment)。附件不存在或不属于当前账户时返回 `5005 attachment not found`。

