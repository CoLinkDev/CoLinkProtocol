# 上传笔记附件

暂存一张图片或一个普通附件。附件在后续创建或更新笔记时通过 `attachmentIds` 关联，可由当前账户的多篇笔记复用。

## Endpoint

```http
POST /api/v1/note-attachments
Content-Type: multipart/form-data
```

## Request

除通用请求头外，请求包含以下 multipart parts：

| Part | 类型 | 必需 | 说明 |
|------|------|------|------|
| `attachmentId` | UUID v4 | 是 | 客户端生成，支持离线上传队列 |
| `kind` | string | 是 | `image` 或 `file` |
| `sha256` | string | 是 | 客户端计算的 SHA-256 小写十六进制摘要 |
| `file` | binary | 是 | 原始文件，文件名和 MIME type 取自该 part；文件名必须为有效 UTF-8、不得含控制字符 |

服务器 MUST 流式读取文件并计算大小和 SHA-256。文件超过服务器当前最大附件策略大小或账户剩余空间不足时返回 `5007 note storage limit reached`；摘要不匹配时返回 `5010 attachment checksum mismatch`。失败请求不得保留不完整文件。

## Response

成功响应的 `data` 为完整 [`Attachment`](README.md#attachment)。以下示例上传文件是内容为 `hello`、不含换行符的 5 字节 UTF-8 文本：

```json
{
  "code": 0,
  "data": {
    "attachmentId": "a559d4df-24a8-49ff-8aa5-0fab74be7402",
    "kind": "file",
    "fileName": "hello.txt",
    "mediaType": "text/plain",
    "size": 5,
    "sha256": "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    "createdAt": "2026-09-12T05:00:00Z"
  },
  "message": "ok"
}
```

相同账户中已存在或曾经使用过该 `attachmentId` 时返回 `4002 invalid parameter`。上传结果不确定时，客户端 MUST 先查询该附件的元数据：`kind`、`size` 和 `sha256` 均与待上传文件一致即可视为上传成功；附件不存在时才重新上传；字段不一致时作为 ID 冲突处理，不得覆盖已有附件。
