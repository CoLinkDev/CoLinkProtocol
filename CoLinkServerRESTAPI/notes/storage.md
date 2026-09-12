# 获取笔记存储用量

获取当前账户的笔记存储用量、剩余空间和协议单项限制。客户端 SHOULD 在展示存储管理界面或准备上传大附件前调用此接口。

## Endpoint

```http
GET /api/v1/notes/storage
```

## Request

无请求参数，仅需通用 `Authorization` Header。

## Response

```json
{
  "code": 0,
  "data": {
    "usedBytes": 125829120,
    "limitBytes": 1073741824,
    "remainingBytes": 947912704,
    "attachmentBytes": 123731968,
    "markdownBytes": 2097152,
    "maxAttachmentBytes": 104857600,
    "maxMarkdownBytes": 2097152
  },
  "message": "ok"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `usedBytes` | integer | 计入配额的已用总字节数 |
| `limitBytes` | integer | 账户笔记总容量 |
| `remainingBytes` | integer | `max(limitBytes - usedBytes, 0)` |
| `attachmentBytes` | integer | 所有附件占用的字节数，包括仍在保留期内的未关联附件 |
| `markdownBytes` | integer | 所有有效笔记 Markdown 的 UTF-8 字节数 |
| `maxAttachmentBytes` | integer | 单个附件允许的最大字节数 |
| `maxMarkdownBytes` | integer | 单篇 Markdown 允许的最大 UTF-8 字节数 |

`usedBytes` MUST 等于 `attachmentBytes + markdownBytes`。数据库索引、标签、标题和内部元数据不计入用户可见配额。服务器执行写入容量检查时 MUST 使用与本接口相同的计算口径。

