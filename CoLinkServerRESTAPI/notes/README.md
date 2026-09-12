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

See [Error Codes](../error-codes.md#notes-6xxx).

为避免泄露其他账户资源是否存在，跨账户访问 MUST 返回与资源不存在相同的错误。
