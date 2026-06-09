# Check App Update

Check whether a newer app version is available for a given platform.

## Endpoint

```
GET /api/v1/update/check
```

## Request

No authentication required.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| platform | string | yes | `android` or `windows` (query parameter) |
| version | string | no | Current client version (query parameter). `v1.2.3` and `1.2.3` are both accepted. |

If `version` is omitted, the latest release for the platform is returned when one exists.

## Response

```json
{
  "code": 0,
  "data": {
    "hasUpdate": true,
    "latest": {
      "version": "1.2.0",
      "releaseNotes": "Fixes and improvements",
      "publishedAt": "2026-06-09T12:00:00Z",
      "assets": [
        {
          "name": "app-release.apk",
          "size": 52428800,
          "downloadUrl": "/api/v1/update/download/android/1.2.0/app-release.apk"
        }
      ]
    }
  },
  "message": "ok"
}
```

When `hasUpdate` is `false`, `latest` is `null`.

## Errors

| Code | Message | Description |
|------|---------|-------------|
| 5001 | platform not supported | Unsupported platform value |
