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
| platform | string | `android`, `windows`, or `linux` (path parameter) |
| version | string | Release version (path parameter) |
| filename | string | Asset file name (path parameter) |

## Response

Returns the asset as a binary file.

```
Content-Type: application/octet-stream
Content-Disposition: attachment
```

## Errors

See [Error Codes](../error-codes.md#update-5xxx).
