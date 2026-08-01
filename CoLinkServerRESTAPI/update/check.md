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
| platform | string | yes | `android`, `windows`, or `linux` (query parameter) |
| arch | string | yes for non-legacy clients | Client architecture (query parameter), such as `arm64-v8a`, `x86_64`, or `x64`. |
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
          "downloadUrl": "/api/v1/update/download/android/1.2.0/app-release.apk",
          "sha256": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
        }
      ]
    }
  },
  "message": "ok"
}
```

When `hasUpdate` is `false`, `latest` is `null`.

`sha256` is optional. When present, it is the lowercase hexadecimal SHA-256 digest of the exact bytes returned by `downloadUrl`. Clients that receive no `sha256` field MUST skip SHA-256 verification for backward compatibility. Clients that download the asset themselves and receive the field MUST verify the downloaded bytes before installing or using the asset.

## Errors

| Code | Message | Description |
|------|---------|-------------|
| 5001 | platform not supported | Unsupported platform value |
