# Note Synchronization Snapshot

Returns a consistent point-in-time snapshot of all currently active notes and tags for the account. Clients perform a full snapshot when synchronization is first enabled, the account changes, or an incremental cursor expires.

## Endpoint

```http
GET /api/v1/notes/sync/snapshot?pageToken=<opaque>&limit=100
```

## Request

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `pageToken` | query | string | No | Omit from the first request; return unchanged for subsequent pages |
| `limit` | query | integer | No | Resources per page, `1..500`; defaults to 100 |

## Response

```json
{
  "code": 0,
  "data": {
    "notes": [
      {
        "noteId": "0d998630-e4cb-4ef3-8b27-dc451f55b86f",
        "title": "Weekend Plans",
        "markdown": "# Weekend Plans\n\n![Route](colink-attachment://a559d4df-24a8-49ff-8aa5-0fab74be7402)",
        "tagIds": [
          "c712c0b5-3938-44c3-a3ef-7f09f86745f9"
        ],
        "attachments": [
          {
            "attachmentId": "a559d4df-24a8-49ff-8aa5-0fab74be7402",
            "kind": "image",
            "fileName": "route.png",
            "mediaType": "image/png",
            "size": 123456,
            "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            "createdAt": "2026-09-10T05:00:00Z"
          }
        ],
        "revision": 6,
        "createdAt": "2026-09-10T05:00:00Z",
        "updatedAt": "2026-09-12T05:00:00Z"
      }
    ],
    "tags": [
      {
        "tagId": "c712c0b5-3938-44c3-a3ef-7f09f86745f9",
        "name": "Work",
        "revision": 2,
        "createdAt": "2026-09-10T05:00:00Z",
        "updatedAt": "2026-09-12T05:00:00Z"
      }
    ],
    "nextPageToken": null,
    "cursor": "opaque-snapshot-cursor"
  },
  "message": "ok"
}
```

`notes` contains complete Markdown and attachment metadata; `tags` contains complete tags. Both resource types share the `limit`, and the server may return an empty array for either type on any page.

On the first request, the server MUST fix the current account's latest committed change sequence number for the snapshot and keep the `cursor` unchanged throughout the same pagination chain. The snapshot boundary MUST be account-scoped and MUST NOT advance because of changes committed for another account. Each resource row records its most recent change sequence number. Snapshot pagination returns only current resources whose most recent change sequence number is no greater than the snapshot sequence number. A resource modified again during pagination and thereby moved outside the snapshot MUST be returned through incremental changes after that `cursor`, preventing synchronization gaps. The client MUST save the `cursor` only after `nextPageToken` is `null` and every page has been persisted successfully, then immediately fetch incremental changes after that cursor.

The full snapshot contains only currently active resources and no deletion records. It is authoritative for local resources with no pending local changes: such local resources absent from the server snapshot should be deleted. Resources with pending local changes must be retained and enter conflict checking.

## Errors

| Code | Message | HTTP Status | Description |
|------|---------|-------------|-------------|
| 4002 | invalid parameter | 400 | `limit` is not an integer in `1..500` or `pageToken` is malformed/invalid |
| 6009 | sync cursor expired | 410 | The fixed snapshot sequence or cursor has expired due to log compaction |

See [Error Codes](../../error-codes.md#notes-6xxx).
