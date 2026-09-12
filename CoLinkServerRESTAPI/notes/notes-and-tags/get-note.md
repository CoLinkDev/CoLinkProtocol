# Get Note

## Endpoint

```http
GET /api/v1/notes/:noteId
```

## Request

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `noteId` | path | UUID v4 | Yes | Note ID |

## Response

The `data` in a successful response is a complete [`Note`](README.md#note). A deleted note returns `6001 note not found`.
