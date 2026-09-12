# 下载笔记附件

按需下载附件的原始二进制内容，支持本地缓存和断点续传。

## Endpoint

```http
GET /api/v1/note-attachments/:attachmentId/content
```

## Request

| 参数 | 位置 | 类型 | 必需 | 说明 |
|------|------|------|------|------|
| `attachmentId` | path | UUID v4 | 是 | 附件 ID |
| `Range` | header | string | 否 | 单字节区间，例如 `bytes=0-1048575` |
| `If-None-Match` | header | string | 否 | 本地缓存的附件 `ETag` |

## Response

成功时直接返回原始二进制内容，不使用 JSON 响应封装。服务器 MUST 设置：

| Header | 说明 |
|--------|------|
| `Content-Type` | `Attachment.mediaType` |
| `Content-Length` | 本次响应正文的字节数；Range 响应为区间长度 |
| `ETag` | 双引号包裹的 `sha256` |
| `Content-Disposition` | 使用安全编码后的 `fileName` |
| `Accept-Ranges` | `bytes` |

服务器 MUST 支持单区间 HTTP Range 请求和 `If-None-Match`。完整内容返回 HTTP `200`；Range 成功时返回 HTTP `206` 并设置 `Content-Range`；缓存仍有效时返回 HTTP `304`；无效或多区间 Range 返回 HTTP `416`。

附件不存在或不属于当前账户时，以通用 JSON 错误封装返回 `5005 attachment not found`。
