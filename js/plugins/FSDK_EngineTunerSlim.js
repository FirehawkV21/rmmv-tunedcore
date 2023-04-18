/*:
* @plugindesc Provides fixes in features that may be less utilized.
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
* @text Don't initialize followers.
* @desc If you aren't using followers, turn this on to prevent initialization.
* @default false
* @on Don't
* @off Do
* 
*/

var FirehawkADK = FirehawkADK || {};
FirehawkADK.ParamDeck = FirehawkADK.ParamDeck || {};
var paramdeck = PluginManager.parameters('FSDK_EngineTunerSlim');

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