/*:
* @plugindesc R1.00||Enables the new save/load algorithm.
* @author AceOfAces
* @help
* >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
* Opt in Patch for new Save Algorithm
* Developed by AceOfAces
* Licensed under the MIT license. Can be used for both Non-commercial and
* commercial games.
* Please credit me as AceOfAces when you use this plugin.
* >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
* In version 1.3 of corescript, they introduced a new algorithm for
* saving and loading data (mainly Global Data) and improved
* logic for calculating gameplay time. Due to this,
* saves made from the older version disappeared, since it couldn't
* read the new global data file. For this reason, this patch
* is spun off to its own patch plugin. If the game is already
* released, it's not recommended to install this, unless
* you are willing to implement this. It is best to be
* used for newer games that are still in development.
* >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
* Installation
* >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
* - Put this plugin on js/plugins folder.
* - In the Plugin Manager, put this above everything (including the Sentry
* integration plugin).
* >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
*/

Game_System.prototype.initialize = function() {
    this._saveEnabled = true;
    this._menuEnabled = true;
    this._encounterEnabled = true;
    this._formationEnabled = true;
    this._battleCount = 0;
    this._winCount = 0;
    this._escapeCount = 0;
    this._saveCount = 0;
    this._frameCount = 0;
    this._versionId = 0;
    this._framesOnSave = 0;
    this._bgmOnSave = null;
    this._bgsOnSave = null;
    this._windowTone = null;
    this._battleBgm = null;
    this._victoryMe = null;
    this._defeatMe = null;
    this._savedBgm = null;
    this._walkingBgm = null;
};

Game_System.prototype.frameCount = function() {
    return this._frameCount;
};

Game_System.prototype.onFrameUpdate = function() {
    this._frameCount++;
};

Game_System.prototype.playtime = function() {
    return Math.floor(this._frameCount / 60);
};

Scene_Base.prototype.update = function() {
    $gameSystem.onFrameUpdate();
    this.updateFade();
    this.updateChildren();
};

Game_System.prototype.onAfterLoad = function() {
    if (!this._frameCount) {
        this._frameCount = this._framesOnSave;
    }
    Graphics.frameCount = this._framesOnSave;
    AudioManager.playBgm(this._bgmOnSave);
    AudioManager.playBgs(this._bgsOnSave);
};

DataManager.loadGlobalInfo = function() {
    if (this._globalInfo) {
        return this._globalInfo;
    }
    var json;
    try {
        json = StorageManager.load(0);
    } catch (e) {
        console.error(e);
        return this._globalInfo = [];
    }
    if (json) {
        this._globalInfo = JSON.parse(json);
        for (var i = 1; i <= this.maxSavefiles(); i++) {
            if (!StorageManager.exists(i)) {
                delete this._globalInfo[i];
            }
        }
        return this._globalInfo;
    } else {
        return this._globalInfo = [];
    }
};

DataManager.saveGlobalInfo = function(info) {
    this._globalInfo = null;
    StorageManager.save(0, JSON.stringify(info));
};

DataManager.loadGameWithoutRescue = function(savefileId) {
    if (this.isThisGameFile(savefileId)) {
        var json = StorageManager.load(savefileId);
        this.createGameObjects();
        this.extractSaveContents(JsonEx.parse(json));
        this._lastAccessedId = savefileId;
        return true;
    } else {
        return false;
    }
};