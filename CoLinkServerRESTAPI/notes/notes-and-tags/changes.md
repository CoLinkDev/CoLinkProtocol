# Note Synchronization Incremental Changes

Returns account-scoped note and tag change events that occurred after the provided `cursor`.

## Endpoint

```http
GET /api/v1/notes/sync/changes?cursor=<opaque>&limit=100
```

## Request

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `cursor` | query | string | Yes | Cursor returned by the previous full snapshot or incremental response |
| `limit` | query | integer | No | `1..500`; defaults to 100 |

## Response

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
          "title": "Weekend Plans",
          "markdown": "# Weekend Plans",
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

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | `note` or `tag` |
| `operation` | string | `upsert` or `delete` |
| `note` / `tag` | object | Present for `upsert`; contains the complete current resource at query time (`Note` when `type == "note"`, `Tag` when `type == "tag"`) |
| `noteId` / `tagId` | UUID v4 | Present for `delete`; identifier of the deleted resource (`noteId` when `type == "note"`, `tagId` when `type == "tag"`) |
| `revision` | integer | Present for `delete`; new resource revision produced by `delete` |
| `nextCursor` | string | New cursor covering every event on this page; MUST be saved even when `changes` is empty |
| `hasMore` | boolean | Whether immediately subsequent changes remain |

Changes are returned in strictly increasing account change sequence order. Resource mutations and their change-log entries MUST commit atomically, and events within one account MUST become visible in their sequence order. Note and tag IDs remain permanently reserved after deletion and MUST NOT be reused. The server MAY coalesce consecutive changes to the same resource.

An `upsert` returns the current resource at query time, so its `revision` may be higher than the revision that triggered the change entry. If the resource has been deleted by query time, the server MUST suppress that stale `upsert` rather than returning an entry with a missing or null resource. Its later `delete` entry remains in the stream and provides convergence to the current state.

Pagination limits the underlying change-log events inspected, before coalescing or stale-upsert suppression. Consequently, `changes` MAY contain fewer than `limit` entries and MAY be empty even when `hasMore=true`. `nextCursor` still covers every inspected event. The client MUST apply each page in order, atomically save `nextCursor` even for an empty `changes` array, and continue fetching whenever `hasMore=true`. A revision that has already been applied MUST be ignored safely if received again.

The server may compact old change-log entries. When a cursor has expired, the server returns `6009 sync cursor expired`; the client retains pending local changes and performs another full snapshot.

## Errors

| Code | Message | HTTP Status | Description |
|------|---------|-------------|-------------|
| 4002 | invalid parameter | 400 | `cursor` is missing, malformed, or `limit` is outside `1..500` |
| 6009 | sync cursor expired | 410 | Incremental sync cursor has expired; client must perform a full snapshot sync |

See [Error Codes](../../error-codes.md#notes-6xxx).
