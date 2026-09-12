# Cloud Notes Protocol

## Documents

| Document | Description |
|----------|-------------|
| [`notes-and-tags`](notes-and-tags/) | Note and tag data structures, CRUD APIs, and synchronization protocol |
| [`attachments`](attachments/) | Upload and on-demand download APIs for images and other attachments |
| [`storage.md`](storage.md) | API for querying account Notes storage usage and quotas |

## Common Request Conventions

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `Authorization` | string | Yes | `Bearer <token>` |

## Limits and Pagination

The protocol does not prescribe limits on the number of notes, tags, or attachments, or on the lengths of titles, Markdown content, tag names, file names, or individual attachments. Server implementations manage the applicable quotas and limits and return their current values through [`GET /api/v1/notes/storage`](storage.md). Exceeding a current server limit returns `6007 note storage limit reached`.

Titles and tag names MUST be valid UTF-8 and MUST NOT contain control characters. A tag name MUST NOT be empty after trimming leading and trailing whitespace.

When rendering Markdown, clients MUST disable script execution and safely filter raw HTML, external URLs, and dangerous URI schemes. The `colink-attachment` scheme permits only the UUID URI form defined by this protocol.

## Module Error Codes

See [Error Codes](../error-codes.md#notes-6xxx).

To avoid disclosing whether a resource exists in another account, cross-account access MUST return the same error as a nonexistent resource.
