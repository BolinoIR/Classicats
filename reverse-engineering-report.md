# Reverse Engineering Report

## Client Entrypoints

- `game/index.html` is the browser entrypoint.
- `game/gamepix-loader.js` is the recovered loader glue.
- `game/js/game.js` configures the Emscripten module and loads the game data/runtime.
- `game/wbin-standalone.js` contains the WebSocket/Emscripten socket bridge.
- `game/bin-standalone.js` contains the compiled game logic.
- `game/bin.data.*.js` and `game/bin.hd.data.*.js` mount startup/rest assets into the virtual filesystem.
- `game/manifest-game.json` and `game/sw-game.js` are the game PWA/service-worker files.

## Runtime Assets

The core game assets required for boot are embedded through the Emscripten file packages. These include protobuf descriptors/data, raw binary data, XML, fonts, and runtime resources mounted by the package scripts.

The top-level `assets/` folder is used by the surrounding web shell/loading page. The user added `assets/style.css`; non-critical shell images can be restored later without blocking the game runtime.

## Network Configuration Found

Recovered values:

- Old backend: `https://cat-server-standalone-we.azurewebsites.net:443`
- Prices endpoint: `/prices`
- Purchase URL shape: `/purchase/{playerId}/{currency}/{productId}`
- WebSocket server was derived from query string or `Module.backend` by `wbin-standalone.js`

Patched values:

- Game: `https://catsthegame.bolino.ir/game`
- API: `https://catsthegame.bolino.ir/api`
- WebSocket: `wss://catsthegame.bolino.ir:8080`

## Compiled Request Names

The following request names were visible in `game/bin-standalone.js`:

`kRegister`, `kFindLeagueMatch`, `kFindBotMatch`, `kGetMyProfile`, `kStartMatch`, `kSaveMatchResult`, `kGetLeaderboard`, `kLogin`, `kGetMyLeaderboardPosition`, `kInappPurchase`, `kPurchaseCoins`, `kClearInventoryBadges`, `kGetRatingLeaderboard`, `kGetTestMatchOpponent`, `kSaveBigFightResult`, `kSaveBetFightResult`, `kGetVehiclesAndInventory`, `kGetPrestigePointsLeaderboard`, `kGacha`, `kSpeedupGachaBoxUnlock`, `kStartGachaBoxUnlock`, `kStorePurchase`, `kForceLoadFromFacebook`, `kGetProfileLite`, `kGachaBoxSpeedupAdWatched`, `kGetProfileLiteWithVehicle`, `kKickPlayerFromTeam`, `kGetTeamBoxInfo`, `kGetTeamBoxLeaderboard`, `kSaveTeamTowerMatchResult`, `kRefillInventory`.

The exact protobuf payload schemas still need live capture and decoding. The server therefore logs unknown HTTP routes and every WebSocket packet.

## Backend Scaffold

`server/php/index.php` uses SQLite and creates its database from `sql/schema.sql`. It implements tolerant compatibility responses for player creation/login, save/load, inventory/currency/profile, shop/prices, simulated purchases, matchmaking, battles, gangs/team, and event logging.

Unknown routes are stored as events and return `ok: true` so the client can continue booting while missing protocol details are discovered.

## WebSocket Scaffold

`server/websocket/server.php` is a long-running PHP socket server on port `8080`. It performs WebSocket handshakes, supports ping/pong, logs text and binary frames, and acknowledges text packets with JSON.

Binary frames are not guessed. They are logged as hex and, when printable, text for later protocol reconstruction.

## Archive Dependency Handling

Wayback wrapper code and archive comments were removed from recovered client files. Runtime archive URLs were replaced with local paths or local compatibility shims. No runtime-critical archive.org dependency remains in the patched client scan.

Archive download attempts from this environment timed out, and the remaining missing shell images are non-critical for game boot. They are tracked in `archive-dependency-notes.md`.
