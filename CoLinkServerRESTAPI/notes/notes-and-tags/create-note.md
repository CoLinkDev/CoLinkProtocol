# 创建笔记

## Endpoint

```http
POST /api/v1/notes
```

## Request

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `noteId` | UUID v4 | 是 | 客户端生成；同一账户内不得重复 |
| `title` | string | 是 | 可为空 |
| `markdown` | string | 是 | Markdown 原文 |
| `tagIds` | UUID v4[] | 是 | 完整标签集合，可为空 |
| `attachmentIds` | UUID v4[] | 是 | 完整附件集合，可为空；附件必须已上传并属于当前账户 |

```json
{
  "noteId": "0d998630-e4cb-4ef3-8b27-dc451f55b86f",
  "title": "周末安排",
  "markdown": "# 周末安排\n\n![路线](colink-attachment://a559d4df-24a8-49ff-8aa5-0fab74be7402)",
  "tagIds": ["c712c0b5-3938-44c3-a3ef-7f09f86745f9"],
  "attachmentIds": ["a559d4df-24a8-49ff-8aa5-0fab74be7402"]
}
```

## Response

成功返回完整 [`Note`](README.md#note)，初始 `revision` 为 1。

若同一 `noteId` 已存在，返回 `4002 invalid parameter`。

请求结果不确定时，客户端按照[同步协议](README.md#请求结果不确定时的处理)查询该 `noteId`，不得使用新的 ID 重复创建。
