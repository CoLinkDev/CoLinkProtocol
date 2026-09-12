# 删除未关联的笔记附件

删除一个尚未关联或已解除关联的附件。

## Endpoint

```http
DELETE /api/v1/note-attachments/:attachmentId
```

## Request

| 参数 | 位置 | 类型 | 必需 | 说明 |
|------|------|------|------|------|
| `attachmentId` | path | UUID v4 | 是 | 要删除的附件 ID |

## Response

```json
{
  "code": 0,
  "data": null,
  "message": "ok"
}
```

附件仍被笔记引用时返回 `6006 attachment in use`。客户端可调用[查询附件引用 API](references.md)获取需要解除关联的 `noteId`。附件不存在或不属于当前账户时返回 `6005 attachment not found`。

服务器 MUST 将附件删除和笔记附件关联更新串行化，并在删除事务内再次检查引用关系。删除提交后，任何尝试关联该附件的笔记写入返回 `6008 invalid note reference`。

移除笔记附件的正确顺序是：先更新笔记的 `markdown` 和 `attachmentIds`，成功后再删除附件。客户端也可不显式删除，等待服务器在未关联附件保留期结束后清理。

删除成功后，服务器 MUST 保留该 `attachmentId` 的永久墓碑。同一账户不得再次上传或关联该 ID，具体规则见[附件生命周期](README.md#生命周期)。
