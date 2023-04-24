/*:
* @plugindesc R1.01||Provides fixes in features that may be less utilized.
* @author AceOfAces
* 
* @param engine
* @text Engine Settings
*
* @param renderingMode
* @text Rendering Mode
* @parent engine
* @desc Select the Renderer for the game.
* @type select
* @option Automatic
* @value auto
* @option WebGL
* @value webgl
* @option Canvas
* @value canvas
* @default auto
*
* @param visuals
* @text Visuals
*
* @param removeVideoCheckOnTouch
* @parent visuals
* @text Remove check for video onTouchEnd.
* @desc Removes a check that happens onTouchEnd for video. Enable this if you don't want to use video.
* @type boolean
* @default false
* @on Don't Check
* @off Check
* 
* @param removeBackgroundBlurOnMenus
* @parent visuals
* @text Remove Background Blur
* @desc Remove the blur from the menus. This may remove some of the lag when they open.
* @type boolean
* @default false
* @on Remove
* @off Keep
* 
* @param gameplay
* @text Game Play
* 
* @param dontInitFollowers
* @parent gameplay
* @type boolean 
* @text Don't initialize followers
* @desc If you aren't using followers, turn this on to prevent initialization.
* @default false
* @on Don't
* @off Do
* 
* @help
* >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
* Engine Tuner
* Developed by AceOfAces
* Licensed under the MIT license. Can be used for both Non-commercial and
* commercial games.
* Please credit me as AceOfAces when you use this plugin.
* >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
* This plugin implements performance improvements to the engine, alongside
* adding additional tuning options.
* >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
* Installation
* >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
* Put this plugin above every plugin in the plugin manager (except the Sentry
*   integration plugin). After turning it on, adjust the
* settings depending on your needs.
* >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
* Engine Tweaks
* >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
* Rendering Mode: This forces the game to use a specific renderer. Use this if
* you need to force a specific renderer.
* Remove check for video onTouchEnd: During interaction with touch and/or
* mouse, an event is raised where the engine checks if the video is
* visible, locked or paused. If it is, it will play the video. You
* can enable this to remove this check. It is reccomended for those who
* don't use videos in game.
* Remove Background Blur: When the menu is created, it will blur the
* background. You can enable this to remove the blur, which can
* make the menu less laggy.
* Don't initialize followers: If you aren't using followers in game,
* you can enable this to remove the initialization code.
* >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
* Engine Changes
* >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
* - Removed unnecessary checks in Sprite._renderCnavas/_renderWebGL
* - Simplified a check in TilingSprite.prototype._refresh.
* - Replaced the deprecated VoidFilter with AlphaFilter.
* - Half tile size is only calculated when when Tilemap is initialized.
* - Replaced calls to RegExp.$1 in the WebAudio._readMetadata.
* - Re-worked parts of the decryption to improve compatibility.
* - Ported bug fixes and improvements from corescript 1.3.
*/

var FirehawkADK = FirehawkADK || {};
FirehawkADK.ParamDeck = FirehawkADK.ParamDeck || {};
var paramdeck = PluginManager.parameters('FSDK_EngineTuner');

FirehawkADK.ParamDeck.RemoveVideoOnTouchEnd = String(paramdeck['removeVideoCheckOnTouch']).trim().toLowerCase() === 'true';
FirehawkADK.ParamDeck.DontInitializeFollowers = String(paramdeck['removeBackgroundBlurOnMenus']).trim().toLowerCase() === 'true';
FirehawkADK.ParamDeck.DontBlurMenuBackground = String(paramdeck['dontInitFollowers']).trim().toLowerCase() === 'true';
FirehawkADK.ParamDeck.PreferedRenderer = String(paramdeck['renderingMode']).toLowerCase();

SceneManager.preferableRendererType = function() {
    if (Utils.isOptionValid('canvas')) {
        return 'canvas';
    } else if (Utils.isOptionValid('webgl')) {
        return 'webgl';
    } else switch (FirehawkADK.ParamDeck.PreferedRenderer){
        case 'webgl':
            return 'webgl';
        case 'canvas':
            return 'canvas';
        default:
            return 'auto';
    }
};

Sprite.prototype._renderCanvas = function(renderer) {
    if (this.bitmap) {
        this.bitmap.touch();
    }
    if(this.bitmap && !this.bitmap.isReady()){
        return;
    }
        this._renderCanvas_PIXI(renderer);
};

Sprite.prototype._renderWebGL = function(renderer) {
    if (this.bitmap) {
        this.bitmap.touch();
    }
    if(this.bitmap && !this.bitmap.isReady()){
        return;
    }
        if (this._bitmap) {
            this._bitmap.checkDirty();
        }

        //copy of pixi-v4 internal code
        this.calculateVertices();

        if (this.pluginName === 'sprite' && this._isPicture) {
            // use heavy renderer, which reduces artifacts and applies corrent blendMode,
            // but does not use multitexture optimization
            this._speedUpCustomBlendModes(renderer);
            renderer.setObjectRenderer(renderer.plugins.picture);
            renderer.plugins.picture.render(this);
        } else {
            // use pixi super-speed renderer
            renderer.setObjectRenderer(renderer.plugins[this.pluginName]);
			renderer.plugins[this.pluginName].render(this);
        }
};

/**
 * Draws the small text big once and resize it because modern broswers are poor at drawing small text.
 *
 * @method drawSmallText
 * @param {String} text The text that will be drawn
 * @param {Number} x The x coordinate for the left of the text
 * @param {Number} y The y coordinate for the top of the text
 * @param {Number} maxWidth The maximum allowed width of the text
 * @param {Number} lineHeight The height of the text line
 * @param {String} align The alignment of the text
 */

Bitmap.prototype.drawText = function(text, x, y, maxWidth, lineHeight, align) {
    // Note: Firefox has a bug with textBaseline: Bug 737852
    //       So we use 'alphabetic' here.
    if (text !== undefined) {
        if (this.fontSize < Bitmap.minFontSize) {
            this.drawSmallText(text, x, y, maxWidth, lineHeight, align);
            return;
        }
        var tx = x;
        var ty = y + lineHeight - Math.round(lineHeight - this.fontSize * 0.7) / 2;
        var context = this._context;
        var alpha = context.globalAlpha;
        maxWidth = maxWidth || 0xffffffff;
        if (align === 'center') {
            tx += maxWidth / 2;
        }
        if (align === 'right') {
            tx += maxWidth;
        }
        context.save();
        context.font = this._makeFontNameText();
        context.textAlign = align;
        context.textBaseline = 'alphabetic';
        context.globalAlpha = 1;
        this._drawTextOutline(text, tx, ty, maxWidth);
        context.globalAlpha = alpha;
        this._drawTextBody(text, tx, ty, maxWidth);
        context.restore();
        this._setDirty();
    }
};
Bitmap.prototype.drawSmallText = function(text, x, y, maxWidth, lineHeight, align) {
    var minFontSize = Bitmap.minFontSize;
    var bitmap = Bitmap.drawSmallTextBitmap;
    bitmap.fontFace = this.fontFace;
    bitmap.fontSize = minFontSize;
    bitmap.fontItalic = this.fontItalic;
    bitmap.textColor = this.textColor;
    bitmap.outlineColor = this.outlineColor;
    bitmap.outlineWidth = this.outlineWidth * minFontSize / this.fontSize;
    maxWidth = maxWidth || 816;
    var scaledMaxWidth = maxWidth * minFontSize / this.fontSize;
    if (scaledMaxWidth > bitmap.width) {
        bitmap.width *= 2;
    }
    bitmap.drawText(text, 0, 0, scaledMaxWidth, minFontSize, align);
    this.blt(bitmap, 0, 0, scaledMaxWidth, minFontSize, x, y + (lineHeight - this.fontSize) / 2, maxWidth, this.fontSize);
    bitmap.clear();
};

Bitmap.prototype.checkDirty = function() {
    if (this._dirty) {
        this._baseTexture.update();
        var baseTexture = this._baseTexture;
        setTimeout(function() {
            baseTexture.update();
        }, 0);
        this._dirty = false;
    }
};

Bitmap.prototype._requestImage = function (url) {
    if (Bitmap._reuseImages.length !== 0) {
        this._image = Bitmap._reuseImages.pop();
    } else {
        this._image = new Image();
    }
    if (this._decodeAfterRequest && !this._loader) {
        this._loader = ResourceHandler.createLoader(url, this._requestImage.bind(this, url), this._onError.bind(this));
    }
    this._url = url;
    this._loadingState = 'requesting';

    if (!Decrypter.checkImgIgnore(url) && Decrypter.hasEncryptedImages) {
        this._loadingState = 'decrypting';
        Decrypter.decryptImg(url, this);
    } else {
        this._image.src = url;
        this._image.addEventListener('load', this._loadListener = Bitmap.prototype._onLoad.bind(this));
        this._image.addEventListener('error', this._errorListener = this._loader || Bitmap.prototype._onError.bind(this));
    }
};

Graphics._cssFontLoading = document.fonts && document.fonts.ready && document.fonts.ready.then;

Graphics.render = function (stage) {
    if (this._skipCount <= 0) {
        var startTime = Date.now();
        if (stage) {
            this._renderer.render(stage);
            if (this._renderer.gl && this._renderer.gl.flush) {
                this._renderer.gl.flush();
            }
        }
        var endTime = Date.now();
        var elapsed = endTime - startTime;
        this._skipCount = Math.min(Math.floor(elapsed / 15), this._maxSkip);
        this._rendered = true;
    } else {
        this._skipCount--;
        this._rendered = false;
    }
    this.frameCount++;
};

Graphics._isFullScreen = function () {
    return document.fullscreenElement ||
           document.mozFullScreen || 
           document.webkitFullscreenElement ||
           document.msFullscreenElement;
};

Graphics._cancelFullScreen = function () {
    if (document.exitFullscreen) { 
        document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.webkitCancelFullScreen) {
        document.webkitCancelFullScreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
};

TouchInput._setupEventHandlers = function() {
    var isSupportPassive = Utils.isSupportPassiveEvent();
    document.addEventListener('mousedown', this._onMouseDown.bind(this));
    document.addEventListener('mousemove', this._onMouseMove.bind(this));
    document.addEventListener('mouseup', this._onMouseUp.bind(this));
    document.addEventListener('wheel', this._onWheel.bind(this));
    document.addEventListener('touchstart', this._onTouchStart.bind(this), isSupportPassive ? {passive: false} : false);
    document.addEventListener('touchmove', this._onTouchMove.bind(this), isSupportPassive ? {passive: false} : false);
    document.addEventListener('touchend', this._onTouchEnd.bind(this));
    document.addEventListener('touchcancel', this._onTouchCancel.bind(this));
    document.addEventListener('pointerdown', this._onPointerDown.bind(this));
    window.addEventListener('blur', this._onLostFocus.bind(this));
};

/**
 * @static
 * @method _onLostFocus
 * @private
 */
TouchInput._onLostFocus = function() {
    this.clear();
};

Sprite.prototype._executeTint = function(x, y, w, h) {
    var context = this._context;
    var tone = this._colorTone;
    var color = this._blendColor;
    context.globalCompositeOperation = 'copy';
    context.drawImage(this._bitmap.canvas, x, y, w, h, 0, 0, w, h);

    if (tone[0] || tone[1] || tone[2] || tone[3]) {
        if (Graphics.canUseDifferenceBlend()) {
            var gray = Math.max(0, tone[3]);
            context.globalCompositeOperation = 'saturation';
            context.fillStyle = 'rgba(255,255,255,' + gray / 255 + ')';
            context.fillRect(0, 0, w, h);
        }

        var r1 = Math.max(0, tone[0]);
        var g1 = Math.max(0, tone[1]);
        var b1 = Math.max(0, tone[2]);
        context.globalCompositeOperation = 'lighter';
        context.fillStyle = Utils.rgbToCssColor(r1, g1, b1);
        context.fillRect(0, 0, w, h);

        if (Graphics.canUseDifferenceBlend()) {
            context.globalCompositeOperation = 'difference';
            context.fillStyle = 'white';
            context.fillRect(0, 0, w, h);

            var r2 = Math.max(0, -tone[0]);
            var g2 = Math.max(0, -tone[1]);
            var b2 = Math.max(0, -tone[2]);
            context.globalCompositeOperation = 'lighter';
            context.fillStyle = Utils.rgbToCssColor(r2, g2, b2);
            context.fillRect(0, 0, w, h);

            context.globalCompositeOperation = 'difference';
            context.fillStyle = 'white';
            context.fillRect(0, 0, w, h);
        }
    }

    var r3 = Math.max(0, color[0]);
    var g3 = Math.max(0, color[1]);
    var b3 = Math.max(0, color[2]);
    var a3 = Math.max(0, color[3]);
    context.globalCompositeOperation = 'source-atop';
    context.fillStyle = Utils.rgbToCssColor(r3, g3, b3);
    context.globalAlpha = a3 / 255;
    context.fillRect(0, 0, w, h);
    context.globalCompositeOperation = 'destination-in';
    context.globalAlpha = 1;
    context.drawImage(this._bitmap.canvas, x, y, w, h, 0, 0, w, h);
};

WindowLayer.prototype._maskWindow = function (window, shift) {
    this._windowMask._currentBounds = null;
    this._windowMask.boundsDirty = true;
    var rect = this._windowRect;
    rect.x = this.x + shift.x + window.x;
    rect.y = this.y + shift.y + window.y + window.height / 2 * (1 - window._openness / 255);
    rect.width = window.width;
    rect.height = window.height * window._openness / 255;
};

WebAudio.prototype._readOgg = function(array) {
    var index = 0;
    while (index < array.length) {
        if (this._readFourCharacters(array, index) === 'OggS') {
            index += 26;
            var vorbisHeaderFound = false;
            var numSegments = array[index++];
            var segments = [];
            for (var i = 0; i < numSegments; i++) {
                segments.push(array[index++]);
            }
            for (i = 0; i < numSegments; i++) {
                if (this._readFourCharacters(array, index + 1) === 'vorb') {
                    var headerType = array[index];
                    if (headerType === 1) {
                        this._sampleRate = this._readLittleEndian(array, index + 12);
                    } else if (headerType === 3) {
                        var size = 0;
                        for (; i < numSegments; i++) {
                            size += segments[i];
                            if (segments[i] < 255) {
                                break;
                            }
                        }
                        this._readMetaData(array, index, size);
                    }
                    vorbisHeaderFound = true;
                }
                index += segments[i];
            }
            if (!vorbisHeaderFound) {
                break;
            }
        } else {
            break;
        }
    }
};

Tilemap.prototype.initialize = function() {
    PIXI.Container.call(this);

    this._margin = 20;
    this._width = Graphics.width + this._margin * 2;
    this._height = Graphics.height + this._margin * 2;
    this._tileWidth = 48;
    this._tileWidthHalf = this._tileWidth / 2;
    this._tileHeight = 48;
    this._tileHeightHalf = this._tileHeight / 2;
    this._mapWidth = 0;
    this._mapHeight = 0;
    this._mapData = null;
    this._layerWidth = 0;
    this._layerHeight = 0;
    this._lastTiles = [];

    /**
     * The bitmaps used as a tileset.
     *
     * @property bitmaps
     * @type Array
     */
    this.bitmaps = [];

    /**
     * The origin point of the tilemap for scrolling.
     *
     * @property origin
     * @type Point
     */
    this.origin = new Point();

    /**
     * The tileset flags.
     *
     * @property flags
     * @type Array
     */
    this.flags = [];

    /**
     * The animation count for autotiles.
     *
     * @property animationCount
     * @type Number
     */
    this.animationCount = 0;

    /**
     * Whether the tilemap loops horizontal.
     *
     * @property horizontalWrap
     * @type Boolean
     */
    this.horizontalWrap = false;

    /**
     * Whether the tilemap loops vertical.
     *
     * @property verticalWrap
     * @type Boolean
     */
    this.verticalWrap = false;

    this._createLayers();
    this.refresh();
};

Tilemap.prototype._drawAutotile = function (bitmap, tileId, dx, dy) {
    var autotileTable = Tilemap.FLOOR_AUTOTILE_TABLE;
    var kind = Tilemap.getAutotileKind(tileId);
    var shape = Tilemap.getAutotileShape(tileId);
    var tx = kind % 8;
    var ty = Math.floor(kind / 8);
    var bx = 0;
    var by = 0;
    var setNumber = 0;
    var isTable = false;

    if (Tilemap.isTileA1(tileId)) {
        var waterSurfaceIndex = [0, 1, 2, 1][this.animationFrame % 4];
        setNumber = 0;
        if (kind === 0) {
            bx = waterSurfaceIndex * 2;
            by = 0;
        } else if (kind === 1) {
            bx = waterSurfaceIndex * 2;
            by = 3;
        } else if (kind === 2) {
            bx = 6;
            by = 0;
        } else if (kind === 3) {
            bx = 6;
            by = 3;
        } else {
            bx = Math.floor(tx / 4) * 8;
            by = ty * 6 + Math.floor(tx / 2) % 2 * 3;
            if (kind % 2 === 0) {
                bx += waterSurfaceIndex * 2;
            }
            else {
                bx += 6;
                autotileTable = Tilemap.WATERFALL_AUTOTILE_TABLE;
                by += this.animationFrame % 3;
            }
        }
    } else if (Tilemap.isTileA2(tileId)) {
        setNumber = 1;
        bx = tx * 2;
        by = (ty - 2) * 3;
        isTable = this._isTableTile(tileId);
    } else if (Tilemap.isTileA3(tileId)) {
        setNumber = 2;
        bx = tx * 2;
        by = (ty - 6) * 2;
        autotileTable = Tilemap.WALL_AUTOTILE_TABLE;
    } else if (Tilemap.isTileA4(tileId)) {
        setNumber = 3;
        bx = tx * 2;
        by = Math.floor((ty - 10) * 2.5 + (ty % 2 === 1 ? 0.5 : 0));
        if (ty % 2 === 1) {
            autotileTable = Tilemap.WALL_AUTOTILE_TABLE;
        }
    }

    var table = autotileTable[shape];
    var source = this.bitmaps[setNumber];

    if (table && source) {
        var w1 = this._tileWidthHalf;
        var h1 = this._tileHeightHalf;
        for (var i = 0; i < 4; i++) {
            var qsx = table[i][0];
            var qsy = table[i][1];
            var sx1 = (bx * 2 + qsx) * w1;
            var sy1 = (by * 2 + qsy) * h1;
            var dx1 = dx + (i % 2) * w1;
            var dy1 = dy + Math.floor(i / 2) * h1;
            if (isTable && (qsy === 1 || qsy === 5)) {
                var qsx2 = qsx;
                var qsy2 = 3;
                if (qsy === 1) {
                    qsx2 = [0, 3, 2, 1][qsx];
                }
                var sx2 = (bx * 2 + qsx2) * w1;
                var sy2 = (by * 2 + qsy2) * h1;
                bitmap.bltImage(source, sx2, sy2, w1, h1, dx1, dy1, w1, h1);
                dy1 += h1 / 2;
                bitmap.bltImage(source, sx1, sy1, w1, h1 / 2, dx1, dy1, w1, h1 / 2);
            } else {
                bitmap.bltImage(source, sx1, sy1, w1, h1, dx1, dy1, w1, h1);
            }
        }
    }
};

Tilemap.prototype._drawTableEdge = function (bitmap, tileId, dx, dy) {
    if (Tilemap.isTileA2(tileId)) {
        var autotileTable = Tilemap.FLOOR_AUTOTILE_TABLE;
        var kind = Tilemap.getAutotileKind(tileId);
        var shape = Tilemap.getAutotileShape(tileId);
        var tx = kind % 8;
        var ty = Math.floor(kind / 8);
        var setNumber = 1;
        var bx = tx * 2;
        var by = (ty - 2) * 3;
        var table = autotileTable[shape];

        if (table) {
            var source = this.bitmaps[setNumber];
            var w1 = this._tileWidthHalf;
            var h1 = this._tileHeightHalf;
            for (var i = 0; i < 2; i++) {
                var qsx = table[2 + i][0];
                var qsy = table[2 + i][1];
                var sx1 = (bx * 2 + qsx) * w1;
                var sy1 = (by * 2 + qsy) * h1 + h1 / 2;
                var dx1 = dx + (i % 2) * w1;
                var dy1 = dy + Math.floor(i / 2) * h1;
                bitmap.bltImage(source, sx1, sy1, w1, h1 / 2, dx1, dy1, w1, h1 / 2);
            }
        }
    }
};

Tilemap.prototype._drawShadow = function (bitmap, shadowBits, dx, dy) {
    if (shadowBits & 0x0f) {
        var w1 = this._tileWidthHalf;
        var h1 = this._tileHeightHalf;
        var color = 'rgba(0,0,0,0.5)';
        for (var i = 0; i < 4; i++) {
            if (shadowBits & (1 << i)) {
                var dx1 = dx + (i % 2) * w1;
                var dy1 = dy + Math.floor(i / 2) * h1;
                bitmap.fillRect(dx1, dy1, w1, h1, color);
            }
        }
    }
};

ShaderTilemap.prototype._drawAutotile = function (layer, tileId, dx, dy) {
    var autotileTable = Tilemap.FLOOR_AUTOTILE_TABLE;
    var kind = Tilemap.getAutotileKind(tileId);
    var shape = Tilemap.getAutotileShape(tileId);
    var tx = kind % 8;
    var ty = Math.floor(kind / 8);
    var bx = 0;
    var by = 0;
    var setNumber = 0;
    var isTable = false;
    var animX = 0, animY = 0;

    if (Tilemap.isTileA1(tileId)) {
        setNumber = 0;
        if (kind === 0) {
            animX = 2;
            by = 0;
        } else if (kind === 1) {
            animX = 2;
            by = 3;
        } else if (kind === 2) {
            bx = 6;
            by = 0;
        } else if (kind === 3) {
            bx = 6;
            by = 3;
        } else {
            bx = Math.floor(tx / 4) * 8;
            by = ty * 6 + Math.floor(tx / 2) % 2 * 3;
            if (kind % 2 === 0) {
                animX = 2;
            }
            else {
                bx += 6;
                autotileTable = Tilemap.WATERFALL_AUTOTILE_TABLE;
                animY = 1;
            }
        }
    } else if (Tilemap.isTileA2(tileId)) {
        setNumber = 1;
        bx = tx * 2;
        by = (ty - 2) * 3;
        isTable = this._isTableTile(tileId);
    } else if (Tilemap.isTileA3(tileId)) {
        setNumber = 2;
        bx = tx * 2;
        by = (ty - 6) * 2;
        autotileTable = Tilemap.WALL_AUTOTILE_TABLE;
    } else if (Tilemap.isTileA4(tileId)) {
        setNumber = 3;
        bx = tx * 2;
        by = Math.floor((ty - 10) * 2.5 + (ty % 2 === 1 ? 0.5 : 0));
        if (ty % 2 === 1) {
            autotileTable = Tilemap.WALL_AUTOTILE_TABLE;
        }
    }

    var table = autotileTable[shape];
    var w1 = this._tileWidthHalf;
    var h1 = this._tileHeightHalf;
    for (var i = 0; i < 4; i++) {
        var qsx = table[i][0];
        var qsy = table[i][1];
        var sx1 = (bx * 2 + qsx) * w1;
        var sy1 = (by * 2 + qsy) * h1;
        var dx1 = dx + (i % 2) * w1;
        var dy1 = dy + Math.floor(i / 2) * h1;
        if (isTable && (qsy === 1 || qsy === 5)) {
            var qsx2 = qsx;
            var qsy2 = 3;
            if (qsy === 1) {
                //qsx2 = [0, 3, 2, 1][qsx];
                qsx2 = (4 - qsx) % 4;
            }
            var sx2 = (bx * 2 + qsx2) * w1;
            var sy2 = (by * 2 + qsy2) * h1;
            layer.addRect(setNumber, sx2, sy2, dx1, dy1, w1, h1, animX, animY);
            layer.addRect(setNumber, sx1, sy1, dx1, dy1 + h1 / 2, w1, h1 / 2, animX, animY);
        } else {
            layer.addRect(setNumber, sx1, sy1, dx1, dy1, w1, h1, animX, animY);
        }
    }
};

ShaderTilemap.prototype._drawTableEdge = function (layer, tileId, dx, dy) {
    if (Tilemap.isTileA2(tileId)) {
        var autotileTable = Tilemap.FLOOR_AUTOTILE_TABLE;
        var kind = Tilemap.getAutotileKind(tileId);
        var shape = Tilemap.getAutotileShape(tileId);
        var tx = kind % 8;
        var ty = Math.floor(kind / 8);
        var setNumber = 1;
        var bx = tx * 2;
        var by = (ty - 2) * 3;
        var table = autotileTable[shape];
        var w1 = this._tileWidthHalf;
        var h1 = this._tileHeightHalf;
        for (var i = 0; i < 2; i++) {
            var qsx = table[2 + i][0];
            var qsy = table[2 + i][1];
            var sx1 = (bx * 2 + qsx) * w1;
            var sy1 = (by * 2 + qsy) * h1 + h1 / 2;
            var dx1 = dx + (i % 2) * w1;
            var dy1 = dy + Math.floor(i / 2) * h1;
            layer.addRect(setNumber, sx1, sy1, dx1, dy1, w1, h1 / 2);
        }
    }
};

ShaderTilemap.prototype._drawShadow = function(layer, shadowBits, dx, dy) {
    if (shadowBits & 0x0f) {
        var w1 = this._tileWidthHalf;
        var h1 = this._tileHeightHalf;
        for (var i = 0; i < 4; i++) {
            if (shadowBits & (1 << i)) {
                var dx1 = dx + (i % 2) * w1;
                var dy1 = dy + Math.floor(i / 2) * h1;
                layer.addRect(-1, 0, 0, dx1, dy1, w1, h1);
            }
        }
    }
};

TilingSprite.prototype._refresh = function() {
    var frame = this._frame.clone();
    if (frame.width === 0 && this._bitmap) {
        frame.width = this._bitmap.width;
        frame.height = this._bitmap.height;
    }
    this.texture.frame = frame;
    this.texture._updateID++;
    this.tilingTexture = null;
};

Game_CharacterBase.prototype.distancePerFrame = function() {
    switch (this.realMoveSpeed()) {
        case 1:
            return 0.0078125;
        case 2:
            return 0.015625;
        case 3:
            return 0.03125;
        case 4:
            return 0.0625;
        case 5:
            return 0.125;
        case 6:
            return 0.25;
        default:
            return Math.pow(2, this.realMoveSpeed()) / 256;
    }
};

WebAudio.prototype._readMetaData = function (array, index, size) {
    for (var i = index; i < index + size - 10; i++) {
        if (this._readFourCharacters(array, i) === 'LOOP') {
            var text = '';
            while (array[i] > 0) {
                text += String.fromCharCode(array[i++]);
            }
            var loopstartmatch = text.match(/LOOPSTART=(\d+)/);
            var looplengthmatch = text.match(/LOOPLENGTH=(\d+)/);
            if (loopstartmatch) {
                this._loopStart = parseInt(loopstartmatch[1]);
            }
            if (looplengthmatch) {
                this._loopLength = parseInt(looplengthmatch[1]);
            }
            if (text == 'LOOPSTART' || text == 'LOOPLENGTH') {
                var text2 = '';
                i += 16;
                while (array[i] > 0) {
                    text2 += String.fromCharCode(array[i++]);
                }
                if (text == 'LOOPSTART') {
                    this._loopStart = parseInt(text2);
                } else {
                    this._loopLength = parseInt(text2);
                }
            }
        }
    }
};

Decrypter.decryptArrayBuffer = function (arrayBuffer) {
    if (!arrayBuffer) return null;
    var header = new Uint8Array(arrayBuffer, 0, this._headerlength);
    var i;
    var ref = this.SIGNATURE + this.VER + this.REMAIN;
    var refBytes = new Uint8Array(16);
    for (i = 0; i < this._headerlength; i++) {
        refBytes[i] = parseInt("0x" + ref.substring(i * 2, (i + 1) * 2), 16);
    }
    for (i = 0; i < this._headerlength; i++) {
        if (header[i] !== refBytes[i]) {
            throw new Error("Header is wrong");
        }
    }

    arrayBuffer = this.cutArrayHeader(arrayBuffer, Decrypter._headerlength);
    var view = new DataView(arrayBuffer);
    this.readEncryptionkey();

    if (arrayBuffer) {
        var byteArray = new Uint8Array(arrayBuffer);
        for (i = 0; i < this._headerlength; i++) {
            byteArray[i] = byteArray[i] ^ parseInt(Decrypter._encryptionKey[i], 16);
            view.setUint8(i, byteArray[i]);
        }
    }

    return arrayBuffer;
};

Game_Followers.prototype.initialize = function() {
    this._visible = $dataSystem.optFollowers;
    this._gathering = false;
    this._data = [];
    if (!FirehawkADK.ParamDeck.DontInitializeFollowers){
        for (var i = 1; i < $gameParty.maxBattleMembers(); i++) {
            this._data.push(new Game_Follower(i));
        }
    }
};

SceneManager.snapForBackground = function() {
    this._backgroundBitmap = this.snap();
    if (!FirehawkADK.ParamDeck.DontBlurMenuBackground) this._backgroundBitmap.blur();
};

Graphics._onTouchEnd = function(event) {
if (!FirehawkADK.ParamDeck.RemoveVideoOnTouchEnd){
    if (!this._videoUnlocked) {
        this._video.play();
        this._videoUnlocked = true;
    }
    if (this._isVideoVisible() && this._video.paused) {
        this._video.play();
    }
}
};

StorageManager.localFileDirectoryPath = function() {
    var path = require('path');

    var base = path.dirname(process.mainModule.filename);
    if (this.canMakeWwwSaveDirectory()) {
        return path.join(base, 'save/');
    } else {
        return path.join(path.dirname(base), 'save/');
    }
};

StorageManager.canMakeWwwSaveDirectory = function() {
    if (this._canMakeWwwSaveDirectory === undefined) {
        var fs = require('fs');
        var path = require('path');
        var base = path.dirname(process.mainModule.filename);
        var testPath = path.join(base, 'testDirectory/');
        try {
            fs.mkdirSync(testPath);
            fs.rmdirSync(testPath);
            this._canMakeWwwSaveDirectory = true;
        } catch (e) {
            this._canMakeWwwSaveDirectory = false;
        }
    }
    return this._canMakeWwwSaveDirectory;
};

SceneManager.onError = function(e) {
    console.error(e.message);
    if (e.filename || e.lineno) {
        console.error(e.filename, e.lineno);
        try {
            this.stop();
            Graphics.printError('Error', e.message);
            AudioManager.stopAll();
        } catch (e2) {
        }
    }
};

SceneManager.updateMain = function() {
    if (Utils.isMobileSafari()) {
        this.changeScene();
        this.updateScene();
    } else {
        var newTime = this._getTimeInMsWithoutMobileSafari();
        if (this._currentTime === undefined) { this._currentTime = newTime; }
        var fTime = (newTime - this._currentTime) / 1000;
        if (fTime > 0.25) { fTime = 0.25; }
        this._currentTime = newTime;
        this._accumulator += fTime;
        while (this._accumulator >= this._deltaTime) {
            this.updateInputData();
            this.changeScene();
            this.updateScene();
            this._accumulator -= this._deltaTime;
        }
    }
    this.renderScene();
    this.requestUpdate();
};

BattleManager.inputtingAction = function() {
    var actor = this.actor();
    return actor ? actor.inputtingAction() : null;
};

BattleManager.selectNextCommand = function() {
    do {
        var actor = this.actor();
        if (!actor || !actor.selectNextCommand()) {
            this.changeActor(this._actorIndex + 1, 'waiting');
            if (this._actorIndex >= $gameParty.size()) {
                this.startTurn();
                break;
            }
        }
    } while (!this.actor().canInput());
};

BattleManager.selectPreviousCommand = function() {
    do {
        var actor = this.actor();
        if (!actor || !actor.selectPreviousCommand()) {
            this.changeActor(this._actorIndex - 1, 'undecided');
            if (this._actorIndex < 0) {
                return;
            }
        }
    } while (!this.actor().canInput());
};

Scene_Map.prototype.updateMainMultiply = function() {
    this.updateMain();
    if (this.isFastForward()) {
        if (!this.isMapTouchOk()) {
            this.updateDestination();
        }
        this.updateMain();
    }
};

Scene_ItemBase.prototype.canUse = function() {
    var user = this.user();
    if(user){
        return user.canUse(this.item()) && this.isItemEffectsValid();
    }
    return false;
};

Window_Base.prototype.drawCharacter = function(characterName, characterIndex, x, y) {
    var bitmap = ImageManager.loadCharacter(characterName);
    var big = ImageManager.isBigCharacter(characterName);
    var pw = bitmap.width / (big ? 3 : 12);
    var ph = bitmap.height / (big ? 4 : 8);
    var n = big ? 0: characterIndex;
    var sx = (n % 4 * 3 + 1) * pw;
    var sy = (Math.floor(n / 4) * 4) * ph;
    this.contents.blt(bitmap, sx, sy, pw, ph, x - pw / 2, y - ph);
};

Window_Options.prototype.drawItem = function(index) {
    var rect = this.itemRectForText(index);
    var statusWidth = this.statusWidth();
    var titleWidth = rect.width - statusWidth;
    this.resetTextColor();
    this.changePaintOpacity(this.isCommandEnabled(index));
    this.drawText(this.commandName(index), rect.x, rect.y, titleWidth, 'left');
    this.drawText(this.statusText(index), rect.x + titleWidth, rect.y, statusWidth, 'right');
};