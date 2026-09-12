# List Notes

## Endpoint

```http
GET /api/v1/notes?tagId=<uuid>&pageToken=<opaque>&limit=100
```

## Request

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `tagId` | query | UUID v4 | No | Return only notes that contain this tag |
| `pageToken` | query | string | No | Opaque pagination token issued by the server; the client MUST return it unchanged |
| `limit` | query | integer | No | `1..500`; defaults to 100 |

Notes are stably sorted by `updatedAt` in descending order and then by `noteId` in ascending order. This endpoint is intended for UI browsing; clients MUST use the snapshot endpoint for initial synchronization. A `pageToken` is bound to the filters of the first request and MUST NOT be reused after changing `tagId` or `limit`. A nonexistent `tagId` returns `6003 tag not found`.

## Response

```json
{
  "code": 0,
  "data": {
    "notes": [
      {
        "noteId": "0d998630-e4cb-4ef3-8b27-dc451f55b86f",
        "title": "Weekend Plans",
        "tagIds": ["c712c0b5-3938-44c3-a3ef-7f09f86745f9"],
        "attachmentCount": 2,
        "revision": 6,
        "createdAt": "2026-09-10T05:00:00Z",
        "updatedAt": "2026-09-12T05:00:00Z"
      }
    ],
    "nextPageToken": null
  },
  "message": "ok"
}
```

Each item in the `notes` array is a [`NoteSummary`](README.md#notesummary).
