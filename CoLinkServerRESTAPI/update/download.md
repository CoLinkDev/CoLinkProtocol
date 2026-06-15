# Download App Update

Download a cached update asset by platform, version, and file name.

## Endpoint

```
GET /api/v1/update/download/:platform/:version/:filename
```

## Request

No authentication required.

| Field | Type | Description |
|-------|------|-------------|
| platform | string | `android` or `windows` (path parameter) |
| version | string | Release version (path parameter) |
| filename | string | Asset file name (path parameter) |

## Response

Returns the asset as a binary file.

```
Content-Type: application/octet-stream
Content-Disposition: attachment
```

## Errors

| Code | Message | Description |
|------|---------|-------------|
| 5001 | platform not supported | Unsupported platform value |
| 5002 | release not found | Release does not exist for the platform and version |
| 5003 | asset not found | Asset does not exist or cached file is missing |
