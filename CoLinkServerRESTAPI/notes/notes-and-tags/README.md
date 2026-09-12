# 笔记与标签协议

## API

| 文档 | 方法与路径 | 作用 |
|------|------------|------|
| [`list-notes.md`](list-notes.md) | `GET /api/v1/notes` | 分页列出笔记，可按标签筛选 |
| [`get-note.md`](get-note.md) | `GET /api/v1/notes/:noteId` | 获取单篇完整笔记 |
| [`create-note.md`](create-note.md) | `POST /api/v1/notes` | 创建笔记 |
| [`update-note.md`](update-note.md) | `PUT /api/v1/notes/:noteId` | 更新完整笔记 |
| [`delete-note.md`](delete-note.md) | `DELETE /api/v1/notes/:noteId` | 删除笔记 |
| [`list-tags.md`](list-tags.md) | `GET /api/v1/note-tags` | 列出标签 |
| [`create-tag.md`](create-tag.md) | `POST /api/v1/note-tags` | 创建标签 |
| [`update-tag.md`](update-tag.md) | `PUT /api/v1/note-tags/:tagId` | 重命名标签 |
| [`delete-tag.md`](delete-tag.md) | `DELETE /api/v1/note-tags/:tagId` | 删除标签 |
| [完整快照](#完整快照) | `GET /api/v1/notes/sync/snapshot` | 获取同步快照 |
| [增量变化](#增量变化) | `GET /api/v1/notes/sync/changes` | 拉取快照后的增量变化 |

所有接口均遵循[云端笔记协议](../README.md)的认证、容量、分页和错误码约定。

## 数据模型

### Note

| 字段 | 类型 | 说明 |
|------|------|------|
| `noteId` | UUID v4 | 客户端生成的永久标识，支持离线创建 |
| `title` | string | 标题，可为空 |
| `markdown` | string | Markdown 原文 |
| `tagIds` | UUID v4[] | 关联标签 ID 的集合；顺序无语义，不得重复 |
| `attachments` | Attachment[] | 已关联附件的元数据；不包含文件内容 |
| `revision` | integer | 服务器分配、从 1 开始的单篇笔记单调递增版本 |
| `createdAt` | string | 服务器生成的 ISO 8601 时间 |
| `updatedAt` | string | 服务器生成的 ISO 8601 时间 |

客户端时间不得参与冲突判定。笔记的标题、Markdown、标签集合或附件集合发生变化时，`revision` MUST 增加。标签重命名不改变笔记保存的 `tagIds`，因此不会批量改变相关笔记的 `revision`；标签删除会移除关联，具体规则见[删除标签](delete-tag.md)。

### NoteSummary

`GET /api/v1/notes` 返回 `NoteSummary`，用于列表展示，不包含 Markdown 和附件明细。

| 字段 | 类型 | 说明 |
|------|------|------|
| `noteId` | UUID v4 | 笔记 ID |
| `title` | string | 标题，可为空 |
| `tagIds` | UUID v4[] | 当前有效标签 ID 集合 |
| `attachmentCount` | integer | 当前关联的附件数量 |
| `revision` | integer | 当前笔记版本 |
| `createdAt` | string | 服务器生成的 ISO 8601 时间 |
| `updatedAt` | string | 服务器生成的 ISO 8601 时间 |

### Tag

| 字段 | 类型 | 说明 |
|------|------|------|
| `tagId` | UUID v4 | 客户端生成的永久标识 |
| `name` | string | 标签显示名称 |
| `revision` | integer | 服务器分配、从 1 开始的单个标签单调递增版本 |
| `createdAt` | string | 服务器生成的 ISO 8601 时间 |
| `updatedAt` | string | 服务器生成的 ISO 8601 时间 |

同一账户的标签名称 MUST 在 Unicode NFC 规范化并执行 Unicode 默认大小写折叠后唯一。服务器保存和返回用户提交的显示形式。

## 同步协议

### 设计原则

- 本地数据库是离线工作副本，云端是账户内设备交换版本的同步源。
- 每篇笔记和每个标签使用独立 `revision` 做乐观并发控制，不以客户端时间决定覆盖顺序。
- 所有资源变化同时写入账户级变更日志；客户端使用不透明 `cursor` 顺序拉取。
- 图片和附件内容按需下载；同步只传附件元数据。

客户端本地至少保存 `baseRevision`、当前本地内容、最近一次成功同步的内容和 `syncState`。建议的 `syncState` 为 `synced`、`pending`、`conflict`。

### 分页令牌与同步游标

`pageToken` 和 `cursor` 用途不同，客户端不得互换：

| 名称 | 生命周期 | 用途 |
|------|----------|------|
| `pageToken` | 短期，仅用于当前完整快照 | 继续读取同一次固定快照的下一页；快照完成后丢弃 |
| `cursor` | 长期，持久化到本地 | 记录账户变更日志已应用到的位置；用于后续增量同步 |

`nextPageToken` 为 `null` 表示快照读取完成；增量接口的 `hasMore` 明确表示是否应立即继续使用 `nextCursor` 拉取。两者名称不同是为了区分临时分页状态与持久同步进度。

### 完整快照

首次启用同步、账户切换或增量游标失效时执行完整快照：

```http
GET /api/v1/notes/sync/snapshot?pageToken=<opaque>&limit=100
```

| 参数 | 位置 | 类型 | 必需 | 说明 |
|------|------|------|------|------|
| `pageToken` | query | string | 否 | 首次请求省略；后续页原样回传 |
| `limit` | query | integer | 否 | 每页资源数，`1..500`，默认 100 |

```json
{
  "code": 0,
  "data": {
    "notes": [],
    "tags": [],
    "nextPageToken": "opaque-or-null",
    "cursor": "opaque-snapshot-cursor"
  },
  "message": "ok"
}
```

`notes` 包含完整 Markdown 和附件元数据；`tags` 包含完整标签。两类资源共用 `limit`，服务器可在任一页返回其中一个空数组。

服务器 MUST 在首次请求时固定快照的账户变更序号，并让同一分页链的 `cursor` 保持不变。每个资源行记录其最后变更序号；快照分页只返回最后变更序号不大于快照序号的当前资源。分页期间被再次修改而移出快照的资源，MUST 通过该 `cursor` 之后的增量变化返回，因此不会漏同步。客户端只有在 `nextPageToken` 为 `null`、全部页面成功落盘后才能保存该 `cursor`，然后立即拉取该游标之后的增量变化。

完整快照只包含当前有效资源，不包含删除记录。它对“没有本地待上传变更”的本地资源具有权威性：服务端快照中不存在的此类本地资源应被删除；带有本地待上传变更的资源必须保留并进入冲突检查。

### 增量变化

```http
GET /api/v1/notes/sync/changes?cursor=<opaque>&limit=100
```

| 参数 | 位置 | 类型 | 必需 | 说明 |
|------|------|------|------|------|
| `cursor` | query | string | 是 | 上一次完整快照或增量响应返回的游标 |
| `limit` | query | integer | 否 | `1..500`，默认 100 |

```json
{
  "code": 0,
  "data": {
    "changes": [
      {
        "type": "note",
        "operation": "upsert",
        "note": {
          "noteId": "0d998630-e4cb-4ef3-8b27-dc451f55b86f",
          "title": "周末安排",
          "markdown": "# 周末安排",
          "tagIds": [],
          "attachments": [],
          "revision": 6,
          "createdAt": "2026-09-10T05:00:00Z",
          "updatedAt": "2026-09-12T05:00:00Z"
        }
      },
      {
        "type": "tag",
        "operation": "delete",
        "tagId": "c712c0b5-3938-44c3-a3ef-7f09f86745f9",
        "revision": 3
      }
    ],
    "nextCursor": "opaque-next-cursor",
    "hasMore": false
  },
  "message": "ok"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | string | `note` 或 `tag` |
| `operation` | string | `upsert` 或 `delete` |
| `note` / `tag` | object | `upsert` 时存在，包含查询时的当前完整资源 |
| `noteId` / `tagId` | UUID v4 | `delete` 时存在 |
| `revision` | integer | `delete` 产生的新资源版本 |
| `nextCursor` | string | 已覆盖本页所有事件的新游标；即使 `changes` 为空也 MUST 保存 |
| `hasMore` | boolean | 是否还有紧随其后的变化 |

变更按账户变更序号严格递增返回。服务器 MAY 合并同一资源的连续变化；`upsert` 返回查询时的当前资源，因此其 `revision` 可以高于触发该条变更的版本。客户端 MUST 按顺序应用一页并原子保存 `nextCursor`，然后在 `hasMore=true` 时继续拉取。重复收到已经应用的 `revision` 必须安全忽略。

服务器可压缩旧变更日志。游标已失效时返回 `6009 sync cursor expired`，客户端保留本地待上传修改并重新执行完整快照。

### 写入与冲突

客户端本地使用 `baseRevision` 记录编辑所基于的版本。更新请求在 JSON 请求体中发送该值，删除请求通过 query 参数发送该值。服务器当前 `revision` 与其相同才可写入；否则返回 HTTP `412 Precondition Failed` 和 `6002 revision conflict`，不得进行最后写入者覆盖。

笔记冲突时客户端使用以下三份内容做三方合并：

| 版本 | 来源 |
|------|------|
| 共同祖先 | 最近一次成功同步后保存的完整笔记 |
| 本地版本 | 当前离线或未上传的完整笔记 |
| 云端版本 | `GET /api/v1/notes/:noteId` 返回的当前完整笔记 |

Markdown 使用文本三方合并；标题、`tagIds` 和 `attachmentIds` 分别相对共同祖先合并。附件内容不可变，合并只处理附件 ID 集合。可无歧义合并时，客户端以云端当前 `revision` 作为新的 `baseRevision` 再提交；同一字段被双方改为不同值、或正文出现重叠文本冲突时，MUST 同时保留本地和云端内容，由用户选择使用本地、使用云端、编辑合并结果或另存为新笔记。客户端不得静默丢弃任一版本。

云端已删除而本地仍有待上传编辑时，客户端 MUST 保留本地内容并提示用户放弃本地修改或使用新 `noteId` 另存为新笔记。客户端不得用旧 `noteId` 隐式恢复已删除笔记。删除请求遇到云端新版本时同样返回版本冲突，由用户确认后再基于最新版本删除。

标题、Markdown、标签集合和附件集合构成一次原子笔记更新。标签重命名冲突按标签 `revision` 处理，不涉及 Markdown 三方合并。

### 无效引用恢复

笔记写入返回 `6008 invalid note reference` 时，表示请求中的标签或附件已经删除、不属于当前账户或不可用。客户端 MUST：

1. 拉取增量变化，并重新获取当前有效标签及相关附件元数据。
2. 从待上传笔记中移除已经删除的标签。附件缺失且本地文件仍存在时，使用新的 `attachmentId` 重新上传；本地文件也不存在时，移除对应的 Markdown 引用和 `attachmentIds` 项并提示用户。
3. 若同步期间云端笔记 `revision` 已改变，先执行正常三方合并。
4. 使用最新版本对应的 `baseRevision` 重新提交，不得反复提交同一个无效引用。

### 建议同步时机

客户端 SHOULD 在以下时机执行增量拉取：

- 应用启动且认证恢复后；
- 云端连接恢复后；
- 用户主动刷新时；
- 应用保持运行期间按合理间隔进行周期同步。

本地编辑 MUST 先持久化到本地，再进入上传队列。客户端发出写请求前 MUST 保存资源 ID、`baseRevision` 和准备写入的完整内容，直到确认服务器状态后才能移除该本地任务。

### 请求结果不确定时的处理

请求超时或连接中断时，客户端不得直接认定写入失败，也不得生成新的资源 ID。客户端先查询服务器当前状态，再按以下规则处理：

| 操作 | 查询结果 | 处理方式 |
|------|----------|----------|
| 创建笔记 | `noteId` 不存在 | 使用原 `noteId` 重新创建 |
| 创建笔记 | `noteId` 已存在 | 获取当前笔记；内容相同则视为成功，内容不同则进入冲突处理 |
| 创建标签 | `tagId` 不存在 | 使用原 `tagId` 重新创建 |
| 创建标签 | `tagId` 已存在 | 名称相同则视为成功，名称不同则作为 ID 冲突处理；同名标签使用已有标签合并规则 |
| 上传附件 | `attachmentId` 不存在 | 使用原 `attachmentId` 重新上传 |
| 上传附件 | `attachmentId` 已存在 | `kind`、`size`、`sha256` 相同则视为成功，否则作为 ID 冲突处理 |
| 更新笔记或标签 | 当前 `revision` 等于 `baseRevision` | 原写入未生效，使用原内容和原 `baseRevision` 重试 |
| 更新笔记或标签 | 当前内容等于准备写入的内容 | 视为原写入已经成功，保存服务器当前 `revision` |
| 更新笔记或标签 | `revision` 已增加且内容不同 | 按正常版本冲突处理 |
| 删除笔记或标签 | 资源已不存在 | 视为删除成功 |
| 删除笔记或标签 | 当前 `revision` 等于 `baseRevision` | 使用原 `baseRevision` 重试删除 |
| 删除笔记或标签 | 当前 `revision` 已增加 | 进入删除冲突处理，不得直接删除新版本 |

内容比较只比较客户端可写字段，不比较 `createdAt`、`updatedAt` 等服务器生成字段。
