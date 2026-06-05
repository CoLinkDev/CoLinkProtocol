# Lyrics Sync

Synchronize lyrics display across devices in real-time.

## Overview

A source device detects music playback and pushes track metadata, lyrics, and playback progress to connected devices. Receivers render lyrics synchronized to the current playback position.

- Source pushes progress at a fixed interval (recommended: 100ms)

## Message Types

| Type               | Direction        | Description                    |
|--------------------|------------------|--------------------------------|
| `music.v1.track`    | source → receiver | Current track metadata         |
| `music.v1.lyric`    | source → receiver | Lyrics content for current track |
| `music.v1.progress` | source → receiver | Playback progress update       |
| `music.v1.alive`    | receiver → source | Receiver presence heartbeat    |
| `music.v1.request`  | receiver → source | Request current full state      |

---

## music.v1.track

Sent when the playing track changes or playback stops.

```json
{
  "type": "music.v1.track",
  "payload": {
    "trackId": "abc123",
    "title": "Song Title",
    "artists": ["Artist A", "Artist B"],
    "album": "Album Name",
    "coverUrl": "https://example.com/cover.jpg",
    "coverData": "iVBORw0KGgo...",
    "duration": 234500
  }
}
```

| Field     | Type         | Description                          |
|-----------|--------------|--------------------------------------|
| trackId   | string/null  | Unique identifier for the track (source-defined). `null` indicates playback stopped. |
| title     | string/null  | Track title                          |
| artists   | string[]/null | Artist names                        |
| album     | string/null  | Album name                           |
| coverUrl  | string/null  | Album cover image URL                |
| coverData | string/null  | Base64 encoded cover image           |
| duration  | number/null  | Track duration in milliseconds       |

When `trackId` is `null`, all other fields should be `null`. Receivers should clear all lyrics and progress state upon receiving this.

---

## music.v1.lyric

Sent after a track change, once lyrics are available. May arrive after `music.v1.track` if lyrics require async fetching.

```json
{
  "type": "music.v1.lyric",
  "payload": {
    "trackId": "abc123",
    "lines": [
      { "time": 12500, "text": "First line of lyrics" },
      { "time": 15300, "text": "Second line of lyrics" }
    ],
    "translatedLines": [
      { "time": 12500, "text": "歌词第一行" },
      { "time": 15300, "text": "歌词第二行" }
    ]
  }
}
```

| Field           | Type         | Description                          |
|-----------------|--------------|--------------------------------------|
| trackId         | string       | Must match current track             |
| lines           | LyricLine[]/null | Primary lyrics (original language) |
| translatedLines | LyricLine[]/null | Translated lyrics                 |

**LyricLine**

| Field | Type   | Description                            |
|-------|--------|----------------------------------------|
| time  | number | Timestamp in milliseconds from track start |
| text  | string | Lyric text for this line               |

### Notes

- `lines` sorted ascending by `time`
- `translatedLines`, when present, should have timestamps aligned with `lines`
- If `lines` is `null`, the track has no lyrics available
- Receivers should discard lyric messages whose `trackId` does not match the current track

---

## music.v1.progress

Sent periodically by the source to synchronize playback position.

```json
{
  "type": "music.v1.progress",
  "payload": {
    "trackId": "abc123",
    "progress": 45200,
    "paused": false
  }
}
```

| Field    | Type    | Description                              |
|----------|---------|------------------------------------------|
| trackId  | string  | Must match current track                 |
| progress | number  | Current playback position in milliseconds |
| paused   | boolean | Whether playback is currently paused     |

### Notes

- Source should push at a fixed interval while playing (recommended: 100ms)
- When `paused` becomes `true`, source may reduce or stop sending progress updates until playback resumes
- When `paused` changes from `true` to `false`, source should immediately send a progress message to allow receivers to re-sync
- Receivers should discard progress messages whose `trackId` does not match the current track

---

## music.v1.alive

Sent periodically by receivers to indicate they are still interested in receiving music sync data.

```json
{
  "type": "music.v1.alive",
  "payload": {}
}
```

No payload fields required.

### Notes

- Receivers should send at a fixed interval (recommended: 5s)
- Source should stop pushing data if no `alive` message is received from any receiver within a timeout period (recommended: 15s)
- Source should resume pushing when a new `alive` message arrives

---

## music.v1.request

Sent by a receiver to request the current full playback state from the source.

```json
{
  "type": "music.v1.request",
  "payload": {}
}
```

No payload fields required.

### Notes

- Source should respond by immediately pushing three messages in order: `music.v1.track`, `music.v1.lyric`, and `music.v1.progress`
- If no track is currently playing, source should respond with a `music.v1.track` message where `trackId` is `null`
- Typical use case: receiver first connects or reconnects and needs to sync
