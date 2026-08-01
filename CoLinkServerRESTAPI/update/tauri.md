# Check Tauri Desktop Update

Returns a Tauri Updater dynamic manifest for signed Windows desktop updates.

## Endpoint

```
GET /api/v1/update/tauri/:target/:arch/:currentVersion
```

## Request

No authentication required.

| Field | Type | Description |
|-------|------|-------------|
| target | string | Target operating system. Only `windows` is currently supported. |
| arch | string | Target architecture. Only `x86_64` is currently supported. |
| currentVersion | string | Current desktop version in semantic version format. |

## Response

This endpoint returns the Tauri Updater manifest directly. It does not use the standard REST response envelope.

```json
{
  "version": "1.2.0",
  "notes": "Fixes and improvements",
  "pub_date": "2026-07-24T12:00:00Z",
  "url": "https://example.com/api/v1/update/download/windows/1.2.0/CoLink_1.2.0_x64-setup.nsis.zip",
  "signature": "base64-signature",
  "sha256": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
}
```

`url` MUST be an absolute HTTPS URL in production. `signature` is the trimmed text content of the matching `.nsis.zip.sig` asset.
`sha256` is optional and, when present, is the lowercase hexadecimal SHA-256 digest of the exact bytes returned by `url`. Clients that receive no `sha256` field MUST skip SHA-256 verification for backward compatibility; clients that receive it MUST verify the bytes before installation.

## Tauri Updater Requirements

This endpoint implements the [Tauri Updater dynamic update server specification](https://v2.tauri.app/plugin/updater/#dynamic-update-server).

## No Update

The endpoint returns `204 No Content` when there is no newer version, the target is unsupported, or the release does not contain a complete cached `.nsis.zip` and `.nsis.zip.sig` pair.

## Errors

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | 4002 | `currentVersion` is not a valid semantic version. |
| 500 | -1 | Failed to query release metadata or read cached update artifacts. |
