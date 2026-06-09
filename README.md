# Project Classicats

A local rebuild of the C.A.T.S. (Crash Arena Turbo Stars) web game client, with a complete PHP/SQLite backend and WebSocket server for offline or self-hosted play.

## Overview

The original C.A.T.S. web client was a C++ game compiled to asm.js via Emscripten, running in an HTML5 canvas. This project preserves that client and provides a fully functional local backend so the game can run without the original servers.

**What works:**
- Game client loads and renders
- Player registration and login (HTTP + WebSocket)
- Player profile, currency, and inventory management
- Virtual purchases (simulated — no real payments)
- Matchmaking and battle simulation
- Gang/team creation and chat
- Full request logging for reverse engineering unknown protocol messages

**What's simulated:**
- All purchases are virtual (no real payment processing)
- Opponents are bots (no real multiplayer)
- Battle outcomes are pre-determined (player always wins)

## Prerequisites

- **PHP 7.4+** with `pdo_sqlite` extension
- **PHP `sockets` extension** for the WebSocket server
- **SQLite3** (usually bundled with PHP)
- A modern web browser (Chrome/Edge/Firefox)

**Check your PHP installation:**
```bash
php -v                    # Should be 7.4+
php -m | findstr sqlite   # Should list pdo_sqlite, sqlite3
php -m | findstr sockets  # Should list sockets
```

## Quick Start

### 1. Initialize the Database

The database is auto-created on first API request, but you can initialize it manually:

```bash
cd C:\path\to\project-classicats
php -r "
  \$pdo = new PDO('sqlite:storage/classicats.sqlite');
  \$pdo->exec(file_get_contents('sql/schema.sql'));
  \$pdo->exec(file_get_contents('sql/seed.sql'));
  echo 'Database initialized.\n';
"
```

### 2. Start the HTTP Server

```bash
php -S 127.0.0.1:8000 router.php
```

This starts the PHP built-in development server on port 8000.

### 3. Start the WebSocket Server

Open a **new terminal** and run:

```bash
php server/websocket/server.php
```

The WebSocket server listens on port 8080.

### 4. Play the Game

Open your browser and navigate to:

```
http://127.0.0.1:8000/game/
```

The game should load, connect to the WebSocket server, and register a new player automatically.

## Architecture

```
project-classicats/
├── game/                  # Recovered and patched game client
│   ├── index.html         # Game entry point with CLASSICATS_CONFIG
│   ├── gamepix-loader.js  # GamePix compatibility loader
│   ├── js/game.js         # Main game JS (Emscripten module config)
│   ├── wbin-standalone.js # Emscripten WebSocket bridge
│   ├── sw-game.js         # Service worker (caches offline.html only)
│   ├── bin*.js            # Compiled game data packages
│   └── vendor/            # Third-party libraries
├── server/
│   ├── php/
│   │   ├── index.php      # Full API router
│   │   ├── database.php   # SQLite connection helper
│   │   └── helpers.php    # Shared utilities
│   ├── websocket/
│   │   └── server.php     # WebSocket server (binary + text)
│   └── logs/              # API and WS request logs (gitignored)
├── sql/
│   ├── schema.sql         # Database schema
│   └── seed.sql           # Default data
├── storage/               # Runtime data (SQLite DB, logs)
├── gamepix.js             # GamePix compatibility shim (browser)
├── router.php             # PHP dev server router
├── index.php              # Root router (for Apache/etc)
├── .htaccess              # Apache rewrite rules
└── README.md              # This file
```

## API Endpoints

All API endpoints are served at `/api/*` and return JSON.

### Authentication

#### `POST /api/login`
Authenticate or create a player session.

**Request:**
```json
{
  "id": "player1",
  "name": "MyName",
  "guest": true
}
```

**Response:**
```json
{
  "ok": true,
  "player": {
    "id": "player1",
    "name": "MyName",
    "currency_gold": 10000,
    "currency_gems": 500,
    "level": 1,
    "xp": 0,
    "gang_id": "classicats-default",
    "inventory": [...]
  },
  "token": "...",
  "server_time": 1717950000,
  "server_version": "project-classicats-1.0"
}
```

### Player Data

#### `GET /api/profile/{playerId}`
Load player data.

#### `POST /api/save/{playerId}`
Save player data (full state sync).

**Request:**
```json
{
  "currency_gold": 9500,
  "currency_gems": 550,
  "level": 2,
  "xp": 150,
  "inventory": [...],
  "save": { ... }
}
```

### Prices & Purchases

#### `GET /api/prices`
Returns the product pricing map. The game client reads this to populate the shop.

**Response:**
```json
{
  "com.zeptolab.cats.gems1": {
    "USD": "1.99",
    "EUR": "1.99",
    ...
  },
  ...
}
```

#### `POST /api/purchase/{playerId}/{currency}/{productId}`
Process a simulated purchase. Deducts gems if applicable.

### Inventory

#### `GET /api/inventory/{playerId}`
Get player inventory items.

#### `POST /api/inventory/{playerId}`
Update player inventory.

### Gangs

#### `GET /api/gangs`
List all gangs.

#### `GET /api/gangs/{gangId}`
Get gang details with member list.

#### `POST /api/gangs/{gangId}/join`
Join a gang.

**Request:**
```json
{ "player_id": "player1" }
```

#### `POST /api/gangs/create`
Create a new gang.

**Request:**
```json
{
  "name": "My Gang",
  "description": "A cool gang",
  "leader_id": "player1"
}
```

### Configuration

#### `GET /api/config`
Return game tuning parameters.

### Events

#### `POST /api/events`
Log a game event (used by gamepix.js ping/hook).

### Legacy Compatibility

The API also supports these legacy routes for backward compatibility:

- `POST /api/players/login` — same as `/api/login`
- `GET /api/players/{id}` — same as `/api/profile/{id}`
- `POST /api/players/{id}/save` — same as `/api/save/{id}`
- `GET /api/save?id=player1` — quick save load
- `POST /api/matchmaking` — matchmaking simulation
- `POST /api/battle` — battle simulation

## WebSocket Protocol

The WebSocket server runs on `ws://hostname:8080` and supports two protocol modes:

### Binary Mode (C.A.T.S. Protobuf)

The game client uses a binary protobuf protocol. Each message is:
1. A varint length prefix
2. A protobuf message with a single field identifying the command type

**Client → Server message types (by protobuf field number):**

| Field | Type | Description |
|-------|------|-------------|
| 4 | register | Player registration |
| 5 | find_league_match | Start matchmaking |
| 6 | find_bot_match | Fight a bot |
| 7 | get_my_profile | Request player profile |
| 8 | start_match | Begin a battle |
| 9 | save_match_result | Submit battle result |
| 13 | login | Player login |
| 14 | get_config | Request game config |
| 33 | heartbeat | Keepalive ping |
| 48 | get_vehicles_and_inventory | Request inventory |
| 106 | get_team | Request gang data |
| 107 | create_team | Create a gang |
| 108 | join_team | Join a gang |

**Server → Client response types (by message field):**

| Field | Type | Description |
|-------|------|-------------|
| 3 | register_result | Registration result |
| 4 | opponent | Matchmaking opponent |
| 5 | ack_response | Generic acknowledgment |
| 6 | my_profile | Player profile data |
| 8 | match_result | Battle outcome |
| 9 | config | Game configuration |
| 10 | login_response | Login result |
| 26 | no_change | No data change |
| 43 | team | Gang data |

### Text Mode (JSON)

For debugging and custom clients, the server also accepts JSON text messages:

```json
{ "type": "auth", "player_id": "player1" }
{ "type": "matchmaking/start", "rating": 1000 }
{ "type": "battle/start" }
{ "type": "battle/action", "action": "attack" }
{ "type": "battle/end", "result": "win" }
{ "type": "gang/message", "message": "Hello!" }
{ "type": "ping" }
```

**Server responses:**
```json
{ "type": "auth_result", "ok": true, "player_id": "player1" }
{ "type": "matchmaking/found", "opponent": {...} }
{ "type": "battle/started", "ok": true }
{ "type": "pong", "server_time": 1717950000 }
```

## Database Schema

The project uses SQLite with these main tables:

| Table | Purpose |
|-------|---------|
| `players` | Player accounts, currency, profile, inventory |
| `inventory` | Individual inventory items per player |
| `gangs` | Gang/team definitions |
| `gang_members` | Player-gang membership with roles |
| `battles` | Battle history |
| `matchmaking_queue` | Players waiting for matches |
| `purchases` | Virtual purchase transactions |
| `api_logs` | HTTP request log |
| `ws_logs` | WebSocket message log |
| `websocket_packets` | Detailed binary packet log |
| `events` | Game event log |

**Seed data includes:**
- Player "Player1" with 10,000 gold and 500 gems
- 5 starter inventory items (body, wheels, weapons)
- Default gang "Classicats Gang" with Player1 as leader
- Bot opponent "Classicats Bot" for matchmaking

## Production Deployment

### Apache

1. Point your Apache vhost to the project root
2. Ensure `mod_rewrite` is enabled
3. The `.htaccess` file handles routing

### Nginx

Add this to your server block:

```nginx
server {
    listen 80;
    server_name catsthegame.example.com;
    root /path/to/project-classicats;

    # API routing
    location /api/ {
        try_files $uri /server/php/index.php$is_args$args;
    }

    # GamePix shim
    location = /gamepix.js {
        try_files $uri =404;
    }

    # Game files
    location /game/ {
        try_files $uri $uri/ /game/index.html;
    }

    # Root redirect
    location = / {
        return 302 /game/;
    }

    # Block access to sensitive dirs
    location ~ /(sql|storage|server/logs)/ {
        return 403;
    }

    # PHP processing
    location ~ \.php$ {
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

### WebSocket with TLS

For `wss://` support, put the WebSocket server behind a reverse proxy:

```nginx
location /ws/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```

## Asset Notes

### Present
- All JavaScript runtime files (`game.js`, `wbin-standalone.js`, `bin*.js`)
- Game data packages (`bin.data.*.js`, `bin.hd.data.*.js`)
- Memory initialization files (`bin.mem.js`, `bin-standalone.mem.js`)
- Favicon and manifest
- Service worker (`sw-game.js`)
- GamePix compatibility shim (`gamepix.js`)
- Silence MP3 (`storage/classicats-silence.mp3`) for audio placeholder

### Missing / Replaced
- **Audio files**: The original game had audio assets. A silence MP3 placeholder exists. If audio files are referenced by the WASM, they'll fail silently.
- **Original server**: The original ZeptoLab backend is not available. All server logic is simulated.
- **Real multiplayer**: No actual player-vs-player. All opponents are bots.
- **Original GamePix SDK**: Replaced with a local compatibility shim (`gamepix.js`) that creates a guest player and starts the game.
- **IAP (In-App Purchases)**: All purchases are virtual/simulated. No real payment processing.

### Client Patches Applied
- `game/js/game.js`: Fallback URLs changed from `catsthegame.bolino.ir` to local server paths
- `game/index.html`: Uses `CLASSICATS_CONFIG` with dynamic host detection (already patched)
- No archive.org URLs remain in runtime code

## Logging

All API and WebSocket messages are logged for debugging and reverse engineering:

- **API logs**: `server/logs/api.log` (file) + `api_logs` table
- **WebSocket logs**: `server/logs/ws.log` (file) + `websocket_packets` table + `ws_logs` table
- **Game events**: `events` table

To tail the API log:
```bash
Get-Content server\logs\api.log -Wait -Tail 20
```

To tail the WebSocket log:
```bash
Get-Content server\logs\ws.log -Wait -Tail 20
```

## Troubleshooting

### Game doesn't load
- Make sure the PHP HTTP server is running (`php -S 127.0.0.1:8000 router.php`)
- Check browser console for errors
- Verify `/api/prices` returns JSON: `curl http://127.0.0.1:8000/api/prices`

### WebSocket connection fails
- Make sure the WebSocket server is running (`php server/websocket/server.php`)
- Check if port 8080 is available: `netstat -an | findstr 8080`
- The game tries to connect to `ws://hostname:8080` — make sure this matches

### Database errors
- Delete `storage/classicats.sqlite` and restart the HTTP server — it will be recreated
- Check file permissions on the `storage/` directory

### PHP not found
- Make sure PHP is in your PATH
- On Windows, you may need to add PHP to your system PATH

## Known Limitations

1. **No real multiplayer** — All opponents are bots
2. **Binary protocol is partially mapped** — Unknown protobuf messages get logged and acknowledged generically
3. **No audio** — Original audio assets are not available
4. **Battle simulation is simple** — No physics, player always wins
5. **Single-process WebSocket** — The PHP WebSocket server handles one connection at a time in the main loop (with non-blocking I/O)
6. **No authentication** — Anyone can access any player's data
7. **No rate limiting** — Not suitable for public deployment without additional security

## License

This project is for educational and preservation purposes only. The original C.A.T.S. game is © ZeptoLab. (yeah fuck you Nazara Publishing) This project does not distribute the original game assets; it provides a compatibility layer for running the recovered web client locally.
