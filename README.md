# rmmv-tunedcore
An optimized version of the RPG Maker MV core scripts

# Changes versus the stock core scripts
- Removed unnecessary checks when rendering.
- Optimized the logic.
 - The calculation for the character speed is pre-calculated (included a fallback for non-standard speeds).
 - Half tile size is only calculated once.
- Updated to Pixi.js 4.8.9.
 - Replaced the deprecated VoidFilter with AlphaFilter.
- Removed or re-worked code that used deprecated features.
 - Removed calls to RegExp.$1
 - Removed styles.type. It implies text/css anyway.
 - Removed a legacy call specific with Safari.