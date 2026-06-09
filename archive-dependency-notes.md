# Archive Dependency Notes

Project rule: archive.org, Wayback, Internet Archive, and archived asset URLs are source references only, not production dependencies.

## Replaced Or Removed

- Removed Wayback wrapper code/comments from recovered JavaScript files in `game/`, `js/helper.js`, and `sw-index.js`.
- Replaced the recovered GamePix dependency with the local `gamepix.js` compatibility shim.
- Replaced old backend usage with `https://catsthegame.bolino.ir/api`.
- Replaced WebSocket derivation with `wss://catsthegame.bolino.ir:8080`.
- Rewrote `assets/style.css` archive asset references to local `/assets/...` paths.

## Download Status

Core game boot assets are already present in the recovered Emscripten data packages under `game/`.

Attempts to fetch non-critical shell assets from archive.org/Wayback timed out from this environment. Those files are not required for the Emscripten game runtime to load, and the user explicitly allowed unimportant main-page images to be added later.

## Remaining Local Asset Placeholders

`assets/style.css` may still refer to local image/font paths that are not yet present. These should be restored as local files when polishing the landing/loading shell. They should not be restored as runtime links to archive.org.
