/*:
* @plugindesc R1.00||Provides fixes in features that may be less utilized.
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