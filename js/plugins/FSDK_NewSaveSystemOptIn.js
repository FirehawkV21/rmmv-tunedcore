/*:
* @plugindesc R1.01||Enables the new save/load algorithm.
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

DataManager.setupNewGame = function() {
    this.createGameObjects();
    this.selectSavefileForNewGame();
    $gameParty.setupStartingMembers();
    $gamePlayer.reserveTransfer($dataSystem.startMapId,
        $dataSystem.startX, $dataSystem.startY);
    Graphics.frameCount = 0;
    SceneManager.resetFrameCount();
};

SceneManager._frameCount = 0;

SceneManager.frameCount = function() {
    return this._frameCount;
};

SceneManager.setFrameCount = function(frameCount) {
    this._frameCount = frameCount;
};

SceneManager.resetFrameCount = function() {
    this._frameCount = 0;
};

SceneManager.updateScene = function() {
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

SceneManager.updateFrameCount = function() {
    this._frameCount++;
};

Game_System.prototype.initialize = function() {
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

Game_System.prototype.onBeforeSave = function() {
    this._saveCount++;
    this._versionId = $dataSystem.versionId;
    this._framesOnSave = Graphics.frameCount;
    this._sceneFramesOnSave = SceneManager.frameCount();
    this._bgmOnSave = AudioManager.saveBgm();
    this._bgsOnSave = AudioManager.saveBgs();
};

Game_System.prototype.onAfterLoad = function() {
    Graphics.frameCount = this._framesOnSave;
    SceneManager.setFrameCount(this._sceneFramesOnSave || this._framesOnSave);
    AudioManager.playBgm(this._bgmOnSave);
    AudioManager.playBgs(this._bgsOnSave);
};

Game_System.prototype.playtime = function() {
    return Math.floor(SceneManager.frameCount() / 60);
};

Scene_Base.prototype.update = function() {
    this.updateFade();
    this.updateChildren();
};