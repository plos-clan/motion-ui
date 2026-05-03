# Motion UI

A modern interface for Motion camera live view and archived clips.

## Configuration

Set the required environment variables before starting the server.

```sh
LIVE_URL=http://127.0.0.1:1845/
ARCHIVE_DIR=/data/Camera
```

The archive reader expects clips in `YYYY-MM-DD/HH-MM-SS.mp4` folders.

## Development

```sh
bun install
bun run dev
```

## Production

```sh
bun run build
HTTP_HOST=127.0.0.1 HTTP_PORT=3000 bun run start
```

Single binary can be produced by `bun run build`:

```sh
bun run compile
```
