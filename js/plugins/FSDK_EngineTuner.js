/*:
* @plugindesc R1.02||Provides fixes in features that may be less utilized.
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
* @param accuratePlayTime
* @parent gameplay
* @type boolean
* @text Accurate Play Time Calculation
* @desc Eanbles a patch that uses a new algorithm for calulating play time. Turn this off if you are using a plugin to fix this.
* @default true
* @on Yes
* @off No
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
FirehawkADK.ParamDeck.CalcAccuratePlaytimePatch = String(paramdeck['accuratePlaytime']).toLowerCase() === 'true';

SceneManager.preferableRendererType = function () {
    if (Utils.isOptionValid('canvas')) {
        return 'canvas';
    } else if (Utils.isOptionValid('webgl')) {
        return 'webgl';
    } else switch (FirehawkADK.ParamDeck.PreferedRenderer) {
        case 'webgl':
            return 'webgl';
        case 'canvas':
            return 'canvas';
        default:
            return 'auto';
    }
};

Sprite.prototype._renderCanvas = function (renderer) {
    if (this.bitmap) {
        this.bitmap.touch();
    }
    if (this.bitmap && !this.bitmap.isReady()) {
        return;
    }
    this._renderCanvas_PIXI(renderer);
};

Sprite.prototype._renderWebGL = function (renderer) {
    if (this.bitmap) {
        this.bitmap.touch();
    }
    if (this.bitmap && !this.bitmap.isReady()) {
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

Bitmap.prototype.drawText = function (text, x, y, maxWidth, lineHeight, align) {
    // Note: Firefox has a bug with textBaseline: Bug 737852
    //       So we use 'alphabetic' here.
    if (text !== undefined) {
        if (this.fontSize < Bitmap.minFontSize) {
            this.drawSmallText(text, x, y, maxWidth, lineHeight, align);
            return;
        }
        var tx = x;
        var ty = y + lineHeight - Math.round((lineHeight - this.fontSize * 0.7) / 2);
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

Bitmap.prototype.drawSmallText = function (text, x, y, maxWidth, lineHeight, align) {
    var minFontSize = Bitmap.minFontSize;
    var bitmap = Bitmap.drawSmallTextBitmap;
    bitmap.fontFace = this.fontFace;
    bitmap.fontSize = minFontSize;
    bitmap.fontItalic = this.fontItalic;
    bitmap.textColor = this.textColor;
    bitmap.outlineColor = this.outlineColor;
    bitmap.outlineWidth = this.outlineWidth * minFontSize / this.fontSize;
    maxWidth = maxWidth || 816;
    var height = this.fontSize * 1.5;
    var scaledMaxWidth = maxWidth * minFontSize / this.fontSize;
    var scaledMaxWidthWithOutline = scaledMaxWidth + bitmap.outlineWidth * 2;
    var scaledHeight = height * minFontSize / this.fontSize;
    var scaledHeightWithOutline = scaledHeight + bitmap.outlineWidth * 2;

    var bitmapWidth = bitmap.width;
    var bitmapHeight = bitmap.height;
    while (scaledMaxWidthWithOutline > bitmapWidth) bitmapWidth *= 2;
    while (scaledHeightWithOutline > bitmapHeight) bitmapHeight *= 2;
    if (bitmap.width !== bitmapWidth || bitmap.height !== bitmapHeight) bitmap.resize(bitmapWidth, bitmapHeight);

    bitmap.drawText(text, bitmap.outlineWidth, bitmap.outlineWidth, scaledMaxWidth, minFontSize, align);
    this.blt(bitmap, 0, 0, scaledMaxWidthWithOutline, scaledHeightWithOutline,
        x - this.outlineWidth, y - this.outlineWidth + (lineHeight - this.fontSize) / 2, maxWidth + this.outlineWidth * 2, height + this.outlineWidth * 2);
    bitmap.clear();
};

Bitmap.prototype.checkDirty = function () {
    if (this._dirty) {
        this._baseTexture.update();
        var baseTexture = this._baseTexture;
        setTimeout(function () {
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

TouchInput._setupEventHandlers = function () {
    var isSupportPassive = Utils.isSupportPassiveEvent();
    document.addEventListener('mousedown', this._onMouseDown.bind(this));
    document.addEventListener('mousemove', this._onMouseMove.bind(this));
    document.addEventListener('mouseup', this._onMouseUp.bind(this));
    document.addEventListener('wheel', this._onWheel.bind(this));
    document.addEventListener('touchstart', this._onTouchStart.bind(this), isSupportPassive ? { passive: false } : false);
    document.addEventListener('touchmove', this._onTouchMove.bind(this), isSupportPassive ? { passive: false } : false);
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
TouchInput._onLostFocus = function () {
    this.clear();
};

Sprite.prototype._executeTint = function (x, y, w, h) {
    var context = this._context;
    var tone = this._colorTone;
    var color = this._blendColor;
    context.globalCompositeOperation = 'copy';
    context.drawImage(this._bitmap.canvas, x, y, w, h, 0, 0, w, h);

    if (tone[0] || tone[1] || tone[2] || tone[3]) {
        if (Graphics.canUseSaturationBlend()) {
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

WebAudio.prototype._readOgg = function (array) {
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

Tilemap.prototype.initialize = function () {
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

ShaderTilemap.prototype._drawShadow = function (layer, shadowBits, dx, dy) {
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

TilingSprite.prototype._refresh = function () {
    var frame = this._frame.clone();
    if (frame.width === 0 && this._bitmap) {
        frame.width = this._bitmap.width;
        frame.height = this._bitmap.height;
    }
    this.texture.frame = frame;
    this.texture._updateID++;
    this.tilingTexture = null;
};

Game_CharacterBase.prototype.distancePerFrame = function () {
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

Game_Followers.prototype.initialize = function () {
    this._visible = $dataSystem.optFollowers;
    this._gathering = false;
    this._data = [];
    if (!FirehawkADK.ParamDeck.DontInitializeFollowers) {
        for (var i = 1; i < $gameParty.maxBattleMembers(); i++) {
            this._data.push(new Game_Follower(i));
        }
    }
};

SceneManager.snapForBackground = function () {
    this._backgroundBitmap = this.snap();
    if (!FirehawkADK.ParamDeck.DontBlurMenuBackground) this._backgroundBitmap.blur();
};

Graphics._onTouchEnd = function (event) {
    if (!FirehawkADK.ParamDeck.RemoveVideoOnTouchEnd) {
        if (!this._videoUnlocked) {
            this._video.play();
            this._videoUnlocked = true;
        }
        if (this._isVideoVisible() && this._video.paused) {
            this._video.play();
        }
    }
};

StorageManager.localFileDirectoryPath = function () {
    var path = require('path');

    var base = path.dirname(process.mainModule.filename);
    if (this.canMakeWwwSaveDirectory()) {
        return path.join(base, 'save/');
    } else {
        return path.join(path.dirname(base), 'save/');
    }
};

StorageManager.canMakeWwwSaveDirectory = function () {
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

SceneManager.onError = function (e) {
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

SceneManager.updateMain = function () {
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

BattleManager.inputtingAction = function () {
    var actor = this.actor();
    return actor ? actor.inputtingAction() : null;
};

BattleManager.selectNextCommand = function () {
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

BattleManager.selectPreviousCommand = function () {
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

Scene_Map.prototype.updateMainMultiply = function () {
    this.updateMain();
    if (this.isFastForward()) {
        if (!this.isMapTouchOk()) {
            this.updateDestination();
        }
        this.updateMain();
    }
};

Scene_ItemBase.prototype.action = function () {
    var action = new Game_Action(this.user());
    action.setItemObject(this.item());
    return action;
};

Scene_ItemBase.prototype.determineItem = function () {
    var action = this.action();
    if (action.isForFriend()) {
        this.showSubWindow(this._actorWindow);
        this._actorWindow.selectForItem(this.item());
    } else {
        this.useItem();
        this.activateItemWindow();
    }
};

Scene_ItemBase.prototype.itemTargetActors = function () {
    var action = this.action();
    if (!action.isForFriend()) {
        return [];
    } else if (action.isForAll()) {
        return $gameParty.members();
    } else {
        return [$gameParty.members()[this._actorWindow.index()]];
    }
};

Scene_ItemBase.prototype.isItemEffectsValid = function () {
    var action = this.action();
    return this.itemTargetActors().some(function (target) {
        return action.testApply(target);
    }, this);
};

Scene_ItemBase.prototype.applyItem = function () {
    var action = this.action();
    var targets = this.itemTargetActors();
    targets.forEach(function (battler) {
        var repeats = action.numRepeats();
        for (var i = 0; i < repeats; i++) {
            action.apply(battler);
        }
    });
    action.applyGlobal();
};

Scene_ItemBase.prototype.canUse = function () {
    var user = this.user();
    if (user) {
        return user.canUse(this.item()) && this.isItemEffectsValid();
    }
    return false;
};

Window_Base.prototype.drawCharacter = function (characterName, characterIndex, x, y) {
    var bitmap = ImageManager.loadCharacter(characterName);
    var big = ImageManager.isBigCharacter(characterName);
    var pw = bitmap.width / (big ? 3 : 12);
    var ph = bitmap.height / (big ? 4 : 8);
    var n = big ? 0 : characterIndex;
    var sx = (n % 4 * 3 + 1) * pw;
    var sy = (Math.floor(n / 4) * 4) * ph;
    this.contents.blt(bitmap, sx, sy, pw, ph, x - pw / 2, y - ph);
};

Window_Options.prototype.drawItem = function (index) {
    var rect = this.itemRectForText(index);
    var statusWidth = this.statusWidth();
    var titleWidth = rect.width - statusWidth;
    this.resetTextColor();
    this.changePaintOpacity(this.isCommandEnabled(index));
    this.drawText(this.commandName(index), rect.x, rect.y, titleWidth, 'left');
    this.drawText(this.statusText(index), rect.x + titleWidth, rect.y, statusWidth, 'right');
};

Spriteset_Base.prototype.createWebGLToneChanger = function () {
    var margin = 48;
    var width = Graphics.width + margin * 2;
    var height = Graphics.height + margin * 2;
    this._toneFilter = new ToneFilter();
    this._toneFilter.enabled = false;
    this._baseSprite.filters = [this._toneFilter];
    this._baseSprite.filterArea = new Rectangle(-margin, -margin, width, height);
};

Spriteset_Base.prototype.updateWebGLToneChanger = function () {
    var tone = this._tone;
    this._toneFilter.reset();
    if (tone[0] || tone[1] || tone[2] || tone[3]) {
        this._toneFilter.enabled = true;
        this._toneFilter.adjustTone(tone[0], tone[1], tone[2]);
        this._toneFilter.adjustSaturation(-tone[3]);
    } else {
        this._toneFilter.enabled = false;
    }
};

Graphics.printLoadingError = function (url) {
    if (this._errorPrinter && !this._errorShowed) {
        this._updateErrorPrinter();
        this._errorPrinter.innerHTML = this._makeErrorHtml('Loading Error', 'Failed to load: ' + url);
        this._errorPrinter.style.userSelect = 'text';
        this._errorPrinter.style.webkitUserSelect = 'text';
        this._errorPrinter.style.msUserSelect = 'text';
        this._errorPrinter.style.mozUserSelect = 'text';
        this._errorPrinter.oncontextmenu = null;    // enable context menu
        var button = document.createElement('button');
        button.innerHTML = 'Retry';
        button.style.fontSize = '24px';
        button.style.color = '#ffffff';
        button.style.backgroundColor = '#000000';
        button.addEventListener('touchstart', function (event) {
            event.stopPropagation();
        });
        button.addEventListener('click', function (event) {
            ResourceHandler.retry();
        });
        this._errorPrinter.appendChild(button);
        this._loadingCount = -Infinity;
    }
};

Graphics.eraseLoadingError = function () {
    if (this._errorPrinter && !this._errorShowed) {
        this._errorPrinter.innerHTML = '';
        this._errorPrinter.style.userSelect = 'none';
        this._errorPrinter.style.webkitUserSelect = 'none';
        this._errorPrinter.style.msUserSelect = 'none';
        this._errorPrinter.style.mozUserSelect = 'none';
        this._errorPrinter.oncontextmenu = function () { return false; };
        this.startLoading();
    }
};

// The following code is partly borrowed from triacontane.
/**
 * Displays the error text to the screen.
 *
 * @static
 * @method printError
 * @param {String} name The name of the error
 * @param {String} message The message of the error
 */
Graphics.printError = function (name, message) {
    this._errorShowed = true;
    this._hideProgress();
    this.hideFps();
    if (this._errorPrinter) {
        this._updateErrorPrinter();
        this._errorPrinter.innerHTML = this._makeErrorHtml(name, message);
        this._errorPrinter.style.userSelect = 'text';
        this._errorPrinter.style.webkitUserSelect = 'text';
        this._errorPrinter.style.msUserSelect = 'text';
        this._errorPrinter.style.mozUserSelect = 'text';
        this._errorPrinter.oncontextmenu = null;    // enable context menu
        if (this._errorMessage) {
            this._makeErrorMessage();
        }
    }
    this._applyCanvasFilter();
    this._clearUpperCanvas();
};

/**
 * Shows the detail of error.
 *
 * @static
 * @method printErrorDetail
 */
Graphics.printErrorDetail = function (error) {
    if (this._errorPrinter && this._showErrorDetail) {
        var eventInfo = this._formatEventInfo(error);
        var eventCommandInfo = this._formatEventCommandInfo(error);
        var info = eventCommandInfo ? eventInfo + ", " + eventCommandInfo : eventInfo;
        var stack = this._formatStackTrace(error);
        this._makeErrorDetail(info, stack);
    }
};

/**
 * Sets the error message.
 *
 * @static
 * @method setErrorMessage
 */
Graphics.setErrorMessage = function (message) {
    this._errorMessage = message;
};

/**
 * Sets whether shows the detail of error.
 *
 * @static
 * @method setShowErrorDetail
 */
Graphics.setShowErrorDetail = function (showErrorDetail) {
    this._showErrorDetail = showErrorDetail;
};

Graphics._makeErrorHtml = function (name, message) {
    return ('<font color="yellow"><b>' + name + '</b></font><br>' +
        '<font color="white">' + decodeURIComponent(message) + '</font><br>');
};

Graphics._updateErrorPrinter = function () {
    this._errorPrinter.width = this._width * 0.9;
    if (this._errorShowed && this._showErrorDetail) {
        this._errorPrinter.height = this._height * 0.9;
    } else if (this._errorShowed && this._errorMessage) {
        this._errorPrinter.height = 100;
    } else {
        this._errorPrinter.height = 40;
    }
    this._errorPrinter.style.textAlign = 'center';
    this._errorPrinter.style.textShadow = '1px 1px 3px #000';
    this._errorPrinter.style.fontSize = '20px';
    this._errorPrinter.style.zIndex = 99;
    this._centerElement(this._errorPrinter);
};

/**
 * @static
 * @method _makeErrorMessage
 * @private
 */
Graphics._makeErrorMessage = function () {
    var mainMessage = document.createElement('div');
    var style = mainMessage.style;
    style.color = 'white';
    style.textAlign = 'left';
    style.fontSize = '18px';
    mainMessage.innerHTML = '<hr>' + this._errorMessage;
    this._errorPrinter.appendChild(mainMessage);
};

/**
 * @static
 * @method _makeErrorDetail
 * @private
 */
Graphics._makeErrorDetail = function (info, stack) {
    var detail = document.createElement('div');
    var style = detail.style;
    style.color = 'white';
    style.textAlign = 'left';
    style.fontSize = '18px';
    detail.innerHTML = '<br><hr>' + info + '<br><br>' + stack;
    this._errorPrinter.appendChild(detail);
};

/**
 * @static
 * @method _formatEventInfo
 * @private
 */
Graphics._formatEventInfo = function (error) {
    switch (String(error.eventType)) {
        case "map_event":
            return "MapID: %1, MapEventID: %2, page: %3, line: %4".format(error.mapId, error.mapEventId, error.page, error.line);
        case "common_event":
            return "CommonEventID: %1, line: %2".format(error.commonEventId, error.line);
        case "battle_event":
            return "TroopID: %1, page: %2, line: %3".format(error.troopId, error.page, error.line);
        case "test_event":
            return "TestEvent, line: %1".format(error.line);
        default:
            return "No information";
    }
};

/**
 * @static
 * @method _formatEventCommandInfo
 * @private
 */
Graphics._formatEventCommandInfo = function (error) {
    switch (String(error.eventCommand)) {
        case "plugin_command":
            return "◆Plugin Command: " + error.content;
        case "script":
            return "◆Script: " + error.content;
        case "control_variables":
            return "◆Control Variables: Script: " + error.content;
        case "conditional_branch_script":
            return "◆If: Script: " + error.content;
        case "set_route_script":
            return "◆Set Movement Route: ◇Script: " + error.content;
        case "auto_route_script":
            return "Autonomous Movement Custom Route: ◇Script: " + error.content;
        case "other":
        default:
            return "";
    }
};

/**
 * @static
 * @method _formatStackTrace
 * @private
 */
Graphics._formatStackTrace = function (error) {
    return decodeURIComponent((error.stack || '')
        .replace(/file:.*js\//g, '')
        .replace(/http:.*js\//g, '')
        .replace(/https:.*js\//g, '')
        .replace(/chrome-extension:.*js\//g, '')
        .replace(/\n/g, '<br>'));
};

JsonEx._encode = function (value, circular, depth) {
    depth = depth || 0;
    if (++depth >= this.maxDepth) {
        throw new Error('Object too deep');
    }
    var type = Object.prototype.toString.call(value);
    if (type === '[object Object]' || type === '[object Array]') {
        value['@c'] = JsonEx._generateId();
        var constructorName = this._getConstructorName(value);
        if (constructorName !== 'Object' && constructorName !== 'Array') {
            value['@'] = constructorName;
        }
        for (var key in value) {
            if ((!value.hasOwnProperty || value.hasOwnProperty(key)) && !key.match(/^@./)) {
                if (value[key] && typeof value[key] === 'object') {
                    if (value[key]['@c']) {
                        circular.push([key, value, value[key]]);
                        value[key] = { '@r': value[key]['@c'] };
                    } else {
                        value[key] = this._encode(value[key], circular, depth + 1);
                        if (value[key] instanceof Array) {
                            //wrap array
                            circular.push([key, value, value[key]]);
                            value[key] = {
                                '@c': value[key]['@c'],
                                '@a': value[key]
                            };
                        }
                    }
                } else {
                    value[key] = this._encode(value[key], circular, depth + 1);
                }
            }
        }
    }
    depth--;
    return value;
};

JsonEx._decode = function (value, circular, registry) {
    var type = Object.prototype.toString.call(value);
    if (type === '[object Object]' || type === '[object Array]') {
        registry[value['@c']] = value;

        if (value['@'] === null) {
            value = this._resetPrototype(value, null);
        } else if (value['@']) {
            var constructor = window[value['@']];
            if (constructor) {
                value = this._resetPrototype(value, constructor.prototype);
            }
        }
        for (var key in value) {
            if (!value.hasOwnProperty || value.hasOwnProperty(key)) {
                if (value[key] && value[key]['@a']) {
                    //object is array wrapper
                    var body = value[key]['@a'];
                    body['@c'] = value[key]['@c'];
                    value[key] = body;
                }
                if (value[key] && value[key]['@r']) {
                    //object is reference
                    circular.push([key, value, value[key]['@r']])
                }
                value[key] = this._decode(value[key], circular, registry);
            }
        }
    }
    return value;
};

JsonEx._getConstructorName = function (value) {
    if (!value.constructor) {
        return null;
    }
    var name = value.constructor.name;
    if (name === undefined) {
        var func = /^\s*function\s*([A-Za-z0-9_$]*)/;
        name = func.exec(value.constructor)[1];
    }
    return name;
};

ImageManager.loadNormalBitmap = function(path, hue) {
    var key = this._generateCacheKey(path, hue);
    var bitmap = this._imageCache.get(key);
    if (!bitmap) {
        bitmap = Bitmap.load(path);
        this._callCreationHook(bitmap);

        bitmap.addLoadListener(function() {
            bitmap.rotateHue(hue);
        });
        this._imageCache.add(key, bitmap);
    }else if(!bitmap.isReady()){
        bitmap.decode();
    }
    return bitmap;
};

ImageManager.requestNormalBitmap = function(path, hue){
    var key = this._generateCacheKey(path, hue);
    var bitmap = this._imageCache.get(key);
    if(!bitmap){
        bitmap = Bitmap.request(path);
        this._callCreationHook(bitmap);

        bitmap.addLoadListener(function(){
            bitmap.rotateHue(hue);
        });
        this._imageCache.add(key, bitmap);
        this._requestQueue.enqueue(key, bitmap);
    }else{
        this._requestQueue.raisePriority(key);
    }
    return bitmap;
};

ImageManager.setCreationHook = function(hook){
    this._creationHook = hook;
};

ImageManager._callCreationHook = function(bitmap){
    if(this._creationHook) this._creationHook(bitmap);
};

AudioManager.createBuffer = function(folder, name) {
    var ext = this.audioFileExt();
    var url = this._path + folder + '/' + encodeURIComponent(name) + ext;
    if (this.shouldUseHtml5Audio() && folder === 'bgm') {
        if(this._blobUrl) Html5Audio.setup(this._blobUrl);
        else Html5Audio.setup(url);
        return Html5Audio;
    } else {
        var audio = new WebAudio(url);
        this._callCreationHook(audio);
        return audio;
    }
};

AudioManager.setCreationHook = function(hook){
    this._creationHook = hook;
};

AudioManager._callCreationHook = function(audio){
    if(this._creationHook) this._creationHook(audio);
};

SceneManager.catchException = function(e) {
    if (e instanceof Error) {
        Graphics.printError(e.name, e.message);
        Graphics.printErrorDetail(e);
        console.error(e.stack);
    } else {
        Graphics.printError('UnknownError', e);
    }
    AudioManager.stopAll();
    this.stop();
};

Game_Temp.prototype.reservedCommonEventId = function() {
    return this._commonEventId;
};

Game_Troop.prototype.setupBattleEvent = function() {
    if (!this._interpreter.isRunning()) {
        if (this._interpreter.setupReservedCommonEvent()) {
            return;
        }
        var pages = this.troop().pages;
        for (var i = 0; i < pages.length; i++) {
            var page = pages[i];
            if (this.meetsConditions(page) && !this._eventFlags[i]) {
                this._interpreter.setup(page.list);
                this._interpreter.setEventInfo({ eventType: 'battle_event', troopId: this._troopId, page: i + 1 });
                if (page.span <= 1) {
                    this._eventFlags[i] = true;
                }
                break;
            }
        }
    }
};

Game_Map.prototype.setupTestEvent = function() {
    if ($testEvent) {
        this._interpreter.setup($testEvent, 0);
        this._interpreter.setEventInfo({ eventType: 'test_event' });
        $testEvent = null;
        return true;
    }
    return false;
};

Game_Map.prototype.setupStartingMapEvent = function() {
    var events = this.events();
    for (var i = 0; i < events.length; i++) {
        var event = events[i];
        if (event.isStarting()) {
            event.clearStartingFlag();
            this._interpreter.setup(event.list(), event.eventId());
            this._interpreter.setEventInfo(event.getEventInfo());
            return true;
        }
    }
    return false;
};

Game_Map.prototype.setupAutorunCommonEvent = function() {
    for (var i = 0; i < $dataCommonEvents.length; i++) {
        var event = $dataCommonEvents[i];
        if (event && event.trigger === 1 && $gameSwitches.value(event.switchId)) {
            this._interpreter.setup(event.list);
            this._interpreter.setEventInfo({ eventType: 'common_event', commonEventId: i });
            return true;
        }
    }
    return false;
};

Game_CommonEvent.prototype.update = function() {
    if (this._interpreter) {
        if (!this._interpreter.isRunning()) {
            this._interpreter.setup(this.list());
            this._interpreter.setEventInfo({ eventType: 'common_event', commonEventId: this._commonEventId });
        }
        this._interpreter.update();
    }
};

Game_Character.prototype.initMembers = function() {
    Game_CharacterBase.prototype.initMembers.call(this);
    this._moveRouteForcing = false;
    this._moveRoute = null;
    this._moveRouteIndex = 0;
    this._originalMoveRoute = null;
    this._originalMoveRouteIndex = 0;
    this._waitCount = 0;
    this._callerEventInfo = null;
};

Game_Character.prototype.restoreMoveRoute = function() {
    this._moveRoute          = this._originalMoveRoute;
    this._moveRouteIndex     = this._originalMoveRouteIndex;
    this._originalMoveRoute  = null;
    this._callerEventInfo    = null;
};

Game_Character.prototype.setCallerEventInfo = function(callerEventInfo) {
    this._callerEventInfo = callerEventInfo;
};

Game_Character.prototype.processMoveCommand = function(command) {
    var gc = Game_Character;
    var params = command.parameters;
    switch (command.code) {
    case gc.ROUTE_END:
        this.processRouteEnd();
        break;
    case gc.ROUTE_MOVE_DOWN:
        this.moveStraight(2);
        break;
    case gc.ROUTE_MOVE_LEFT:
        this.moveStraight(4);
        break;
    case gc.ROUTE_MOVE_RIGHT:
        this.moveStraight(6);
        break;
    case gc.ROUTE_MOVE_UP:
        this.moveStraight(8);
        break;
    case gc.ROUTE_MOVE_LOWER_L:
        this.moveDiagonally(4, 2);
        break;
    case gc.ROUTE_MOVE_LOWER_R:
        this.moveDiagonally(6, 2);
        break;
    case gc.ROUTE_MOVE_UPPER_L:
        this.moveDiagonally(4, 8);
        break;
    case gc.ROUTE_MOVE_UPPER_R:
        this.moveDiagonally(6, 8);
        break;
    case gc.ROUTE_MOVE_RANDOM:
        this.moveRandom();
        break;
    case gc.ROUTE_MOVE_TOWARD:
        this.moveTowardPlayer();
        break;
    case gc.ROUTE_MOVE_AWAY:
        this.moveAwayFromPlayer();
        break;
    case gc.ROUTE_MOVE_FORWARD:
        this.moveForward();
        break;
    case gc.ROUTE_MOVE_BACKWARD:
        this.moveBackward();
        break;
    case gc.ROUTE_JUMP:
        this.jump(params[0], params[1]);
        break;
    case gc.ROUTE_WAIT:
        this._waitCount = params[0] - 1;
        break;
    case gc.ROUTE_TURN_DOWN:
        this.setDirection(2);
        break;
    case gc.ROUTE_TURN_LEFT:
        this.setDirection(4);
        break;
    case gc.ROUTE_TURN_RIGHT:
        this.setDirection(6);
        break;
    case gc.ROUTE_TURN_UP:
        this.setDirection(8);
        break;
    case gc.ROUTE_TURN_90D_R:
        this.turnRight90();
        break;
    case gc.ROUTE_TURN_90D_L:
        this.turnLeft90();
        break;
    case gc.ROUTE_TURN_180D:
        this.turn180();
        break;
    case gc.ROUTE_TURN_90D_R_L:
        this.turnRightOrLeft90();
        break;
    case gc.ROUTE_TURN_RANDOM:
        this.turnRandom();
        break;
    case gc.ROUTE_TURN_TOWARD:
        this.turnTowardPlayer();
        break;
    case gc.ROUTE_TURN_AWAY:
        this.turnAwayFromPlayer();
        break;
    case gc.ROUTE_SWITCH_ON:
        $gameSwitches.setValue(params[0], true);
        break;
    case gc.ROUTE_SWITCH_OFF:
        $gameSwitches.setValue(params[0], false);
        break;
    case gc.ROUTE_CHANGE_SPEED:
        this.setMoveSpeed(params[0]);
        break;
    case gc.ROUTE_CHANGE_FREQ:
        this.setMoveFrequency(params[0]);
        break;
    case gc.ROUTE_WALK_ANIME_ON:
        this.setWalkAnime(true);
        break;
    case gc.ROUTE_WALK_ANIME_OFF:
        this.setWalkAnime(false);
        break;
    case gc.ROUTE_STEP_ANIME_ON:
        this.setStepAnime(true);
        break;
    case gc.ROUTE_STEP_ANIME_OFF:
        this.setStepAnime(false);
        break;
    case gc.ROUTE_DIR_FIX_ON:
        this.setDirectionFix(true);
        break;
    case gc.ROUTE_DIR_FIX_OFF:
        this.setDirectionFix(false);
        break;
    case gc.ROUTE_THROUGH_ON:
        this.setThrough(true);
        break;
    case gc.ROUTE_THROUGH_OFF:
        this.setThrough(false);
        break;
    case gc.ROUTE_TRANSPARENT_ON:
        this.setTransparent(true);
        break;
    case gc.ROUTE_TRANSPARENT_OFF:
        this.setTransparent(false);
        break;
    case gc.ROUTE_CHANGE_IMAGE:
        this.setImage(params[0], params[1]);
        break;
    case gc.ROUTE_CHANGE_OPACITY:
        this.setOpacity(params[0]);
        break;
    case gc.ROUTE_CHANGE_BLEND_MODE:
        this.setBlendMode(params[0]);
        break;
    case gc.ROUTE_PLAY_SE:
        AudioManager.playSe(params[0]);
        break;
    case gc.ROUTE_SCRIPT:
        try {
            eval(params[0]);
        } catch (error) {
            if (this._callerEventInfo) {
                for (var key in this._callerEventInfo) {
                    error[key] = this._callerEventInfo[key];
                }
                error.line += this._moveRouteIndex + 1;
                error.eventCommand = "set_route_script";
                error.content = command.parameters[0];
            } else {
                error.eventType = "map_event";
                error.mapId = this._mapId;
                error.mapEventId = this._eventId;
                error.page = this._pageIndex + 1;
                error.line = this._moveRouteIndex + 1;
                error.eventCommand = "auto_route_script";
                error.content = command.parameters[0];
            }
            throw error;
        }
        break;
    }
};

Game_Event.prototype.updateParallel = function() {
    if (this._interpreter) {
        if (!this._interpreter.isRunning()) {
            this._interpreter.setup(this.list(), this._eventId);
            this._interpreter.setEventInfo(this.getEventInfo());
        }
        this._interpreter.update();
    }
};

Game_Event.prototype.getEventInfo = function() {
    return { eventType: "map_event", mapId: this._mapId, mapEventId: this._eventId, page: this._pageIndex + 1 };
};

Game_Interpreter.prototype.clear = function() {
    this._mapId = 0;
    this._eventId = 0;
    this._list = null;
    this._index = 0;
    this._waitCount = 0;
    this._waitMode = '';
    this._comments = '';
    this._eventInfo = null;
    this._character = null;
    this._childInterpreter = null;
};

Game_Interpreter.prototype.setEventInfo = function(eventInfo) {
    this._eventInfo = eventInfo;
};

Game_Interpreter.prototype.setupReservedCommonEvent = function() {
    if ($gameTemp.isCommonEventReserved()) {
        this.setup($gameTemp.reservedCommonEvent().list);
        this.setEventInfo({ eventType: 'common_event', commonEventId: $gameTemp.reservedCommonEventId() });
        $gameTemp.clearCommonEvent();
        return true;
    } else {
        return false;
    }
};

Game_Interpreter.prototype.executeCommand = function() {
    var command = this.currentCommand();
    if (command) {
        this._params = command.parameters;
        this._indent = command.indent;
        var methodName = 'command' + command.code;
        if (typeof this[methodName] === 'function') {
            try {
                if (!this[methodName]()) {
                    return false;
                }
            } catch (error) {
                for (var key in this._eventInfo) {
                    error[key] = this._eventInfo[key];
                }
                error.eventCommand = error.eventCommand || "other";
                error.line = error.line || this._index + 1;
                throw error;
            }
        }
        this._index++;
    } else {
        this.terminate();
    }
    return true;
};

Game_Interpreter.prototype.command111 = function() {
    var result = false;
    switch (this._params[0]) {
        case 0:  // Switch
            result = ($gameSwitches.value(this._params[1]) === (this._params[2] === 0));
            break;
        case 1:  // Variable
            var value1 = $gameVariables.value(this._params[1]);
            var value2;
            if (this._params[2] === 0) {
                value2 = this._params[3];
            } else {
                value2 = $gameVariables.value(this._params[3]);
            }
            switch (this._params[4]) {
                case 0:  // Equal to
                    result = (value1 === value2);
                    break;
                case 1:  // Greater than or Equal to
                    result = (value1 >= value2);
                    break;
                case 2:  // Less than or Equal to
                    result = (value1 <= value2);
                    break;
                case 3:  // Greater than
                    result = (value1 > value2);
                    break;
                case 4:  // Less than
                    result = (value1 < value2);
                    break;
                case 5:  // Not Equal to
                    result = (value1 !== value2);
                    break;
            }
            break;
        case 2:  // Self Switch
            if (this._eventId > 0) {
                var key = [this._mapId, this._eventId, this._params[1]];
                result = ($gameSelfSwitches.value(key) === (this._params[2] === 0));
            }
            break;
        case 3:  // Timer
            if ($gameTimer.isWorking()) {
                if (this._params[2] === 0) {
                    result = ($gameTimer.seconds() >= this._params[1]);
                } else {
                    result = ($gameTimer.seconds() <= this._params[1]);
                }
            }
            break;
        case 4:  // Actor
            var actor = $gameActors.actor(this._params[1]);
            if (actor) {
                var n = this._params[3];
                switch (this._params[2]) {
                    case 0:  // In the Party
                        result = $gameParty.members().contains(actor);
                        break;
                    case 1:  // Name
                        result = (actor.name() === n);
                        break;
                    case 2:  // Class
                        result = actor.isClass($dataClasses[n]);
                        break;
                    case 3:  // Skill
                        result = actor.hasSkill(n);
                        break;
                    case 4:  // Weapon
                        result = actor.hasWeapon($dataWeapons[n]);
                        break;
                    case 5:  // Armor
                        result = actor.hasArmor($dataArmors[n]);
                        break;
                    case 6:  // State
                        result = actor.isStateAffected(n);
                        break;
                }
            }
            break;
        case 5:  // Enemy
            var enemy = $gameTroop.members()[this._params[1]];
            if (enemy) {
                switch (this._params[2]) {
                    case 0:  // Appeared
                        result = enemy.isAlive();
                        break;
                    case 1:  // State
                        result = enemy.isStateAffected(this._params[3]);
                        break;
                }
            }
            break;
        case 6:  // Character
            var character = this.character(this._params[1]);
            if (character) {
                result = (character.direction() === this._params[2]);
            }
            break;
        case 7:  // Gold
            switch (this._params[2]) {
                case 0:  // Greater than or equal to
                    result = ($gameParty.gold() >= this._params[1]);
                    break;
                case 1:  // Less than or equal to
                    result = ($gameParty.gold() <= this._params[1]);
                    break;
                case 2:  // Less than
                    result = ($gameParty.gold() < this._params[1]);
                    break;
            }
            break;
        case 8:  // Item
            result = $gameParty.hasItem($dataItems[this._params[1]]);
            break;
        case 9:  // Weapon
            result = $gameParty.hasItem($dataWeapons[this._params[1]], this._params[2]);
            break;
        case 10:  // Armor
            result = $gameParty.hasItem($dataArmors[this._params[1]], this._params[2]);
            break;
        case 11:  // Button
            result = Input.isPressed(this._params[1]);
            break;
        case 12:  // Script
            try {
                result = !!eval(this._params[1]);
            } catch (error) {
                error.eventCommand = "conditional_branch_script";
                error.content = this._params[1];
                throw error;
            }
            break;
        case 13:  // Vehicle
            result = ($gamePlayer.vehicle() === $gameMap.vehicle(this._params[1]));
            break;
    }
    this._branch[this._indent] = result;
    if (this._branch[this._indent] === false) {
        this.skipBranch();
    }
    return true;
};

Game_Interpreter.prototype.setupChild = function(list, eventId) {
    this._childInterpreter = new Game_Interpreter(this._depth + 1);
    this._childInterpreter.setup(list, eventId);
    this._childInterpreter.setEventInfo({ eventType: 'common_event', commonEventId: this._params[0] });
};

Game_Interpreter.prototype.command122 = function() {
    var value = 0;
    switch (this._params[3]) { // Operand
        case 0: // Constant
            value = this._params[4];
            break;
        case 1: // Variable
            value = $gameVariables.value(this._params[4]);
            break;
        case 2: // Random
            value = this._params[5] - this._params[4] + 1;
            for (var i = this._params[0]; i <= this._params[1]; i++) {
                this.operateVariable(i, this._params[2], this._params[4] + Math.randomInt(value));
            }
            return true;
            break;
        case 3: // Game Data
            value = this.gameDataOperand(this._params[4], this._params[5], this._params[6]);
            break;
        case 4: // Script
            try {
                value = eval(this._params[4]);
            } catch (error) {
                error.eventCommand = "control_variables";
                error.content = this._params[4];
                throw error;
            }
            break;
    }
    for (var i = this._params[0]; i <= this._params[1]; i++) {
        this.operateVariable(i, this._params[2], value);
    }
    return true;
};

Game_Interpreter.prototype.command205 = function() {
    $gameMap.refreshIfNeeded();
    this._character = this.character(this._params[0]);
    if (this._character) {
        this._character.forceMoveRoute(this._params[1]);
        var eventInfo = JsonEx.makeDeepCopy(this._eventInfo);
        eventInfo.line = this._index + 1;
        this._character.setCallerEventInfo(eventInfo);
        if (this._params[1].wait) {
            this.setWaitMode('route');
        }
    }
    return true;
};

Game_Interpreter.prototype.command355 = function() {
    var startLine = this._index + 1;
    var script = this.currentCommand().parameters[0] + '\n';
    while (this.nextEventCode() === 655) {
        this._index++;
        script += this.currentCommand().parameters[0] + '\n';
    }
    var endLine = this._index + 1;
    try {
        eval(script);
    } catch (error) {
        error.line = startLine + "-" + endLine;
        error.eventCommand = "script";
        error.content = script;
        throw error;
    }
    return true;
};

Game_Interpreter.prototype.command356 = function() {
    var args = this._params[0].split(" ");
    var command = args.shift();
    try {
        this.pluginCommand(command, args);
    } catch (error) {
        error.eventCommand = "plugin_command";
        error.content = this._params[0];
        throw error;
    }
    return true;
};

Game_Interpreter.requestImagesByPluginCommand = function(command,args){
};

Game_Interpreter.requestImagesForCommand = function(command){
    var params = command.parameters;
    switch(command.code){
        // Show Text
        case 101:
            ImageManager.requestFace(params[0]);
            break;

        // Change Party Member
        case 129:
            var actor = $gameActors.actor(params[0]);
            if (actor && params[1] === 0) {
                var name = actor.characterName();
                ImageManager.requestCharacter(name);
            }
            break;

        // Set Movement Route
        case 205:
            if(params[1]){
                params[1].list.forEach(function(command){
                    var params = command.parameters;
                    if(command.code === Game_Character.ROUTE_CHANGE_IMAGE){
                        ImageManager.requestCharacter(params[0]);
                    }
                });
            }
            break;

        // Show Animation, Show Battle Animation
        case 212: case 337:
            if(params[1]) {
                var animation = $dataAnimations[params[1]];
                var name1 = animation.animation1Name;
                var name2 = animation.animation2Name;
                var hue1 = animation.animation1Hue;
                var hue2 = animation.animation2Hue;
                ImageManager.requestAnimation(name1, hue1);
                ImageManager.requestAnimation(name2, hue2);
            }
            break;

        // Change Player Followers
        case 216:
            if (params[0] === 0) {
                $gamePlayer.followers().forEach(function(follower) {
                    var name = follower.characterName();
                    ImageManager.requestCharacter(name);
                });
            }
            break;

        // Show Picture
        case 231:
            ImageManager.requestPicture(params[1]);
            break;

        // Change Tileset
        case 282:
            var tileset = $dataTilesets[params[0]];
            tileset.tilesetNames.forEach(function(tilesetName){
                ImageManager.requestTileset(tilesetName);
            });
            break;

        // Change Battle Back
        case 283:
            if ($gameParty.inBattle()) {
                ImageManager.requestBattleback1(params[0]);
                ImageManager.requestBattleback2(params[1]);
            }
            break;

        // Change Parallax
        case 284:
            if (!$gameParty.inBattle()) {
                ImageManager.requestParallax(params[0]);
            }
            break;

        // Change Actor Images
        case 322:
            ImageManager.requestCharacter(params[1]);
            ImageManager.requestFace(params[3]);
            ImageManager.requestSvActor(params[5]);
            break;

        // Change Vehicle Image
        case 323:
            var vehicle = $gameMap.vehicle(params[0]);
            if(vehicle){
                ImageManager.requestCharacter(params[1]);
            }
            break;

        // Enemy Transform
        case 336:
            var enemy = $dataEnemies[params[1]];
            var name = enemy.battlerName;
            var hue = enemy.battlerHue;
            if ($gameSystem.isSideView()) {
                ImageManager.requestSvEnemy(name, hue);
            } else {
                ImageManager.requestEnemy(name, hue);
            }
            break;
        // Plugin Command
        case 356:
            var args = params[0].split(" ");
            var commandName = args.shift();
            Game_Interpreter.requestImagesByPluginCommand(commandName,args);
        break;

    }
};

Game_Interpreter.requestImagesByChildEvent = function(command,commonList){
    var params =command.parameters;
    var commonEvent = $dataCommonEvents[params[0]];
    if (commonEvent) {
        if (!commonList) {
            commonList = [];
        }
        if (!commonList.contains(params[0])) {
            commonList.push(params[0]);
            Game_Interpreter.requestImages(commonEvent.list, commonList);
        }
    }
};

Game_Interpreter.requestImages = function(list, commonList){
    if(!list){return;}
    var len = list.length;
    for(var i=0; i<len; i+=1 ){
        var command = list[i];
        // Common Event
        if(command.code ===117){
            Game_Interpreter.requestImagesByChildEvent(command,commonList);
        }else{
            Game_Interpreter.requestImagesForCommand(command);            
        }
    }
};

if (FirehawkADK.ParamDeck.CalcAccuratePlaytimePatch) {
    DataManager.setupNewGame = function () {
        this.createGameObjects();
        this.selectSavefileForNewGame();
        $gameParty.setupStartingMembers();
        $gamePlayer.reserveTransfer($dataSystem.startMapId,
            $dataSystem.startX, $dataSystem.startY);
        Graphics.frameCount = 0;
        SceneManager.resetFrameCount();
    };

    SceneManager._frameCount = 0;

    SceneManager.frameCount = function () {
        return this._frameCount;
    };

    SceneManager.setFrameCount = function (frameCount) {
        this._frameCount = frameCount;
    };

    SceneManager.resetFrameCount = function () {
        this._frameCount = 0;
    };

    SceneManager.updateScene = function () {
        if (this._scene) {
            if (!this._sceneStarted && this._scene.isReady()) {
                this._scene.start();
                this._sceneStarted = true;
                this.onSceneStart();
            }
            if (this.isCurrentSceneStarted()) {
                this.updateFrameCount();
                this._scene.update();
            }
        }
    };

    SceneManager.updateFrameCount = function () {
        this._frameCount++;
    };

    Game_System.prototype.initialize = function () {
        this._saveEnabled = true;
        this._menuEnabled = true;
        this._encounterEnabled = true;
        this._formationEnabled = true;
        this._battleCount = 0;
        this._winCount = 0;
        this._escapeCount = 0;
        this._saveCount = 0;
        this._versionId = 0;
        this._framesOnSave = 0;
        this._sceneFramesOnSave = 0;
        this._bgmOnSave = null;
        this._bgsOnSave = null;
        this._windowTone = null;
        this._battleBgm = null;
        this._victoryMe = null;
        this._defeatMe = null;
        this._savedBgm = null;
        this._walkingBgm = null;
    };

    Game_System.prototype.onBeforeSave = function () {
        this._saveCount++;
        this._versionId = $dataSystem.versionId;
        this._framesOnSave = Graphics.frameCount;
        this._sceneFramesOnSave = SceneManager.frameCount();
        this._bgmOnSave = AudioManager.saveBgm();
        this._bgsOnSave = AudioManager.saveBgs();
    };

    Game_System.prototype.onAfterLoad = function () {
        Graphics.frameCount = this._framesOnSave;
        SceneManager.setFrameCount(this._sceneFramesOnSave || this._framesOnSave);
        AudioManager.playBgm(this._bgmOnSave);
        AudioManager.playBgs(this._bgsOnSave);
    };

    Game_System.prototype.playtime = function () {
        return Math.floor(SceneManager.frameCount() / 60);
    };

    Scene_Base.prototype.update = function () {
        this.updateFade();
        this.updateChildren();
    };
}