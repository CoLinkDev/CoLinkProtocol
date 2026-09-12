# 更新标签

## Endpoint

```http
PUT /api/v1/note-tags/:tagId
```

## Request

| 参数 | 位置 | 类型 | 必需 | 说明 |
|------|------|------|------|------|
| `tagId` | path | UUID v4 | 是 | 要重命名的标签 ID |

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `baseRevision` | integer | 是 | 本次重命名所基于的标签版本 |
| `name` | string | 是 | 完整的新名称，去除首尾空白后不得为空 |

## Response

版本不匹配返回 `5002 revision conflict`。成功时返回 `revision + 1` 的完整 [`Tag`](README.md#tag)。

两台离线设备以不同 `tagId` 创建规范化后同名的标签时，后提交的一方收到 `5004 tag name conflict`。该客户端 MUST 从标签列表中找到已有标签，将本地待同步笔记引用改为已有 `tagId`，并放弃重复的本地标签。
