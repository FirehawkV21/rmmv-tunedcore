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
* saving and loading data (mainly Global Data). Due to this,
* saves made from the older version disappeared, since it couldn't
* read the new global data file. For this reason, this patch
* is spun off to its own patch plugin. If the game is already
* released, it's not recommended to install this, unless
* you are willing to implement this. It is best to be
* used for newer games that are still in development.
* >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
*/

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