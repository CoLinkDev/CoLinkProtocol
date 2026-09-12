# 笔记图片与附件协议

图片和普通附件使用同一资源模型。附件内容不进入笔记同步响应；客户端在用户打开图片或附件时按需下载，并 MAY 在本地缓存。

## API

| 文档 | 方法与路径 | 作用 |
|------|------------|------|
| [`upload.md`](upload.md) | `POST /api/v1/note-attachments` | 暂存图片或普通附件 |
| [`get.md`](get.md) | `GET /api/v1/note-attachments/:attachmentId` | 获取附件元数据 |
| [`download.md`](download.md) | `GET /api/v1/note-attachments/:attachmentId/content` | 下载附件内容 |
| [`references.md`](references.md) | `GET /api/v1/note-attachments/:attachmentId/references` | 查询引用该附件的笔记 |
| [`delete.md`](delete.md) | `DELETE /api/v1/note-attachments/:attachmentId` | 删除未被笔记引用的附件 |

所有接口均遵循[云端笔记协议](../README.md)的认证、资源限制和错误码约定。内容下载成功时直接返回二进制；其他成功响应和所有错误响应使用 Server REST API 的通用 JSON 封装。

## Attachment

| 字段 | 类型 | 说明 |
|------|------|------|
| `attachmentId` | UUID v4 | 客户端生成的永久标识 |
| `kind` | string | `image` 或 `file` |
| `fileName` | string | 原始文件名，仅用于显示 |
| `mediaType` | string | 服务器确认后的 MIME type |
| `size` | integer | 文件字节数 |
| `sha256` | string | 文件内容的 SHA-256 小写十六进制摘要 |
| `createdAt` | string | 服务器生成的 ISO 8601 时间 |

附件是账户级不可变资源，关联关系完全由笔记的 `attachmentIds` 决定。同一附件 MAY 被当前账户的多篇笔记引用，因此复用图片或移动附件不需要重新上传。

附件内容和元数据创建后不可修改。需要替换文件时，客户端 MUST 创建新的 `attachmentId`，再更新相关笔记的 `attachmentIds` 和 Markdown 引用。由于附件不可变，不定义 `revision` 或 `updatedAt`。

## Markdown 引用

Markdown 中的内嵌图片和下载链接 MUST 使用稳定 URI：

```markdown
![图片说明](colink-attachment://a559d4df-24a8-49ff-8aa5-0fab74be7402)

[查看附件](colink-attachment://95b91af8-f6f9-441e-ac36-c54cd01aec31)
```

客户端渲染器负责将该 URI 解析为本地缓存或鉴权下载请求，不得把 Bearer Token 写入 Markdown。

URI 的唯一合法格式为 `colink-attachment://<attachmentId>`，其中 `attachmentId` 是小写连字符形式的 UUID v4。URI 不得包含用户名、端口、额外路径、query 或 fragment。接收方 MUST 拒绝不符合以下形式的附件 URI：

```text
colink-attachment://xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
```

其中 `x` 为小写十六进制字符，`y` 为 `8`、`9`、`a` 或 `b`。

`attachmentIds` 是附件关联关系的权威集合。Markdown 中出现的每个 `colink-attachment` URI 都 MUST 同时出现在该笔记的 `attachmentIds` 中；未在 Markdown 中出现的 ID 作为普通附件显示。

## 生命周期

附件上传是暂存操作，不增加笔记 `revision`，也不生成同步事件。客户端必须先上传附件，再在创建或更新笔记时通过 `attachmentIds` 正式关联。关联失败或发生笔记冲突时，已上传附件保持暂存状态，可用于重试。

服务器 MUST 保留未被任何有效笔记引用的附件至少 7 天，此后 MAY 自动清理。仍被至少一篇笔记引用的附件不得自动清理。删除笔记后，只有不再被其他笔记引用的附件才进入未关联附件保留期。

无论附件由客户端显式删除还是由服务器自动清理，其 `attachmentId` 都 MUST 在当前账户内永久保留为墓碑，直到该账户被删除。后续上传不得复用该 ID；元数据和内容查询仍返回 `5005 attachment not found`。此规则防止客户端缓存把新内容误认为已删除的旧附件。墓碑不计入用户存储配额。

## 离线上传顺序

1. 客户端本地生成 `attachmentId`，Markdown 立即引用 `colink-attachment://<attachmentId>`。
2. 联网后上传所有新附件。
3. 所有附件上传成功后创建或更新笔记。
4. 若笔记写入发生版本冲突，客户端保留已上传附件并在合并后重试。
