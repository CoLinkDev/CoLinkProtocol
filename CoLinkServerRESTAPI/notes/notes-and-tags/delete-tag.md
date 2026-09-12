# 删除标签

## Endpoint

```http
DELETE /api/v1/note-tags/:tagId?baseRevision=<revision>
```

## Request

| 参数 | 位置 | 类型 | 必需 | 说明 |
|------|------|------|------|------|
| `tagId` | path | UUID v4 | 是 | 标签 ID |
| `baseRevision` | query | integer | 是 | 删除所基于的标签版本 |

删除标签 MUST 在同一事务内完成以下操作：锁定标签及所有关联笔记、软删除标签、移除关联笔记中的该 `tagId`、增加每篇受影响笔记的 `revision`，并为标签和每篇受影响笔记分别写入增量变更事件。这样任何笔记响应中的 `tagIds` 发生变化时，其 `revision` 也一定发生变化。

标签删除与笔记更新 MUST 通过数据库行锁或等价的串行化机制确定先后顺序。使用行锁时，所有相关写事务 MUST 先按 `tagId` 升序锁定标签，再按 `noteId` 升序锁定笔记，不得采用相反顺序。删除提交后，任何仍包含已删除标签的笔记写入 MUST 返回 `5008 invalid note reference`；客户端恢复流程见[同步协议](README.md#无效引用恢复)。

## Response

```json
{
  "code": 0,
  "data": {
    "tagId": "c712c0b5-3938-44c3-a3ef-7f09f86745f9",
    "revision": 3,
    "deletedAt": "2026-09-12T06:00:00Z"
  },
  "message": "ok"
}
```
