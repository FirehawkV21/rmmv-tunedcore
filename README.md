# rmmv-tunedcore
An optimized version of the RPG Maker MV core scripts

# Changes versus the stock core scripts
- Removed an unnecessary check (`this.texture.frame.width > 0 && this.texture.frame.height > 0`) in Sprite.prototype._renderWebGL/_renderCanvas.
- The calculation for the character speed is pre-calculated (includes a fallback for non-standard speeds).
- Half tile size is only calculated when when Tilemap is initialized.
- Simplified a check in TilingSprite.prototype._refresh.
- Updated to Pixi.js 4.8.9.
- Replaced the deprecated VoidFilter with AlphaFilter.
- Removed calls to RegExp.$1 in the WebAudio._readMetadata.
- Removed styles.type. It implies text/css anyway.
- Removed a legacy call specific with Safari (body.style.webkitUserSelect).