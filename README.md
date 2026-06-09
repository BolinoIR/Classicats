# Project Classicats

Project Classicats is a local/hosted rebuild scaffold for the recovered legacy C.A.T.S. web client in `game/`.

Hosting targets:

- Game: `https://catsthegame.bolino.ir/game`
- API: `https://catsthegame.bolino.ir/api`
- WebSocket: `wss://catsthegame.bolino.ir:8080`

## Layout

- `game/` - patched recovered client shell, runtime, manifests, service worker, and embedded data packages.
- `gamepix.js` - local GamePix compatibility shim that creates a guest player and starts the game.
- `api/` - small deployment bridge for `/api`, forwarding to `server/php/index.php`.
- `server/php/` - tolerant PHP/SQLite compatibility API.
- `server/websocket/` - long-running PHP WebSocket logger/compatibility server.
- `sql/` - schema and seed data.
- `storage/` - SQLite database and logs generated at runtime.
- `router.php` - optional PHP built-in server router for local testing.

## Requirements

- PHP 7.4+ with `pdo_sqlite`.
- PHP `sockets` extension for the WebSocket server.
- A web server that serves the repo root and routes `/api` to `api/index.php`.

## Local Run

From the repository root:

```bash
php -S 127.0.0.1:8000 router.php
php server/websocket/server.php
```

Then open:

```text
http://127.0.0.1:8000/game/
```

For production, serve `game/` at `/game`, serve `api/index.php` at `/api`, and run `server/websocket/server.php` behind a TLS reverse proxy for `wss://catsthegame.bolino.ir:8080`.

## Implemented API Surface

The client revealed `GET /prices`, purchase` URLs shaped like `/purchase/{playerId}/{currency}/{productId}`, and a large compiled request enum inside `game/bin-standalone.js`. The PHP API currently supports:

- player login/create/register
- player load/save/profile/inventory/currency updates
- virtual prices and simulated purchases
- matchmaking, battle, gangs/team compatibility responses
- generic event logging
- tolerant unknown-route responses

Real payments are not processed. Purchases are logged and treated as simulated virtual transactions only.

## WebSocket

The patched client points to `wss://catsthegame.bolino.ir:8080`. The PHP WebSocket server accepts text and binary frames, logs every packet, responds to ping frames, and sends JSON acknowledgements for text packets.

The recovered client appears to use a binary/protobuf protocol for core gameplay. Unknown binary packets are preserved in `storage/logs/websocket.log` and the `websocket_packets` table for further reverse engineering.

## Verification Notes

JavaScript syntax was checked with Node for:

- `gamepix.js`
- `game/js/game.js`
- `game/gamepix-loader.js`
- `game/wbin-standalone.js`

PHP could not be linted in this workspace because `php` is not installed in `PATH`.
