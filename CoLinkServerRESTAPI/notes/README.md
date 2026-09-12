# 云端笔记协议

## 文档

| 文档 | 内容 |
|------|------|
| [`notes-and-tags`](notes-and-tags/) | 笔记与标签的数据结构、CRUD API 和同步协议 |
| [`attachments`](attachments/) | 图片、普通附件的上传和按需下载 API |
| [`storage.md`](storage.md) | 账户笔记存储用量和配额查询 API |

## 通用请求约定

| Header | 类型 | 必需 | 说明 |
|--------|------|------|------|
| `Authorization` | string | 是 | `Bearer <token>` |

## 容量与分页

协议不规定笔记、标签或附件数量、标题、Markdown、标签名、文件名和单个附件的长度上限。服务器实现自行处理相关配额和上限，并通过 [`GET /api/v1/notes/storage`](storage.md) 返回当前值。超过服务器当前限制时返回 `6007 note storage limit reached`。

标题和标签名称 MUST 使用有效 UTF-8，不得包含控制字符。标签名称去除首尾空白后不得为空。

客户端渲染 Markdown 时 MUST 禁止脚本执行，并对原始 HTML、外部 URL 和危险 URI scheme 进行安全过滤。`colink-attachment` 只允许本文档定义的 UUID URI 形式。

## 模块错误码

| Code | Message | HTTP 状态 | 说明 |
|------|---------|-----------|------|
| 6001 | `note not found` | 404 | 笔记不存在、已删除或不属于当前账户 |
| 6002 | `revision conflict` | 412 | 笔记或标签的 `baseRevision` 与当前版本不一致 |
| 6003 | `tag not found` | 404 | 标签不存在、已删除或不属于当前账户 |
| 6004 | `tag name conflict` | 409 | 当前账户已有同名标签 |
| 6005 | `attachment not found` | 404 | 附件不存在或不属于当前账户 |
| 6006 | `attachment in use` | 409 | 附件仍被笔记引用，不能删除 |
| 6007 | `note storage limit reached` | 413 | 单项限制或账户存储容量已达到上限 |
| 6008 | `invalid note reference` | 409 | `tagIds` 或 `attachmentIds` 含无效、已删除或归属不符的资源 |
| 6009 | `sync cursor expired` | 410 | 增量游标已失效，客户端必须重新执行完整快照同步 |
| 6010 | `attachment checksum mismatch` | 422 | 上传内容的 SHA-256 与请求中的 `sha256` 不一致 |

为避免泄露其他账户资源是否存在，跨账户访问 MUST 返回与资源不存在相同的错误。
