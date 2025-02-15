/* Wick - (c) 2017 Zach Rispoli, Luca Damasco, and Josh Rispoli */

/*  This file is part of Wick. 
    
    Wick is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Wick is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Wick.  If not, see <http://www.gnu.org/licenses/>. */

class WickProject {
    constructor() {

        // Create the root object. The editor is always editing the root
        // object or its sub-objects and cannot ever leave the root object.
        this.createNewRootObject();

        // Only used by the editor. Keeps track of current object editor is editing.
        this.currentObject = this.rootObject;
        this.rootObject.currentFrame = 0;

        this.library = new AssetLibrary();

        this.name = "New Project";

        this.onionSkinning = false;
        this.smallFramesMode = false;
        
        this.width = 720;
        this.height = 480;

        this.backgroundColor = "#FFFFFF";
        this.transparent = false;

        this.pixelPerfectRendering = false;

        this.framerate = 12;

        this.uuid = random.uuid4();

        this._selection = [];

        if(window.wickVersion) this.wickVersion = window.wickVersion;

    }

    createNewRootObject() {
        const rootObject = new WickObject();
        rootObject.isSymbol = true;
        rootObject.isRoot = true;
        rootObject.playheadPosition = 0;
        rootObject.currentLayer = 0;
        const firstLayer = new WickLayer();
        firstLayer.identifier = "Layer 1";
        rootObject.layers = [firstLayer];
        rootObject.x = 0;
        rootObject.y = 0;
        rootObject.opacity = 1.0;
        this.rootObject = rootObject;
        this.rootObject.generateParentObjectReferences();
    }

    getAsJSON(callback, format) {

        const self = this;

        // Encode scripts/text to avoid JSON format problems
        self.rootObject.encodeStrings();
        self.library.encodeStrings();

        // Add some browser/OS/wick editor version info for debugging other ppl's projects
        self.metaInfo = getBrowserAndOSInfo();
        self.metaInfo.wickVersion = wickEditor.version;
        self.metaInfo.dateSaved = new Date().toGMTString();

        const JSONProject = JSON.stringify(self, WickProject.Exporter.JSONReplacer, format);
        
        // Decode scripts back to human-readble and eval()-able format
        self.rootObject.decodeStrings();
        self.library.decodeStrings();

        callback(JSONProject);

    }

    getCopyData() {
        const objectJSONs = [];
        const objects = this.getSelectedObjects();
        objects.forEach(obj => {
            if(obj instanceof WickObject)
                obj._tempZIndex = wickEditor.project.getCurrentFrame().wickObjects.indexOf(obj);
        })
        objects.sort(({_tempZIndex}, {_tempZIndex}) => {
            return _tempZIndex - _tempZIndex;
        });
        for(let i = 0; i < objects.length; i++) {
            objectJSONs.push(objects[i].getAsJSON());
        }
        const clipboardObject = {
            groupPosition: {x : 0,
                            y : 0},
            wickObjectArray: objectJSONs
        };
        return JSON.stringify(clipboardObject);
    }

    getCurrentObject() {
        return this.currentObject;
    }

    getCurrentLayer() {
        return this.getCurrentObject().getCurrentLayer();
    }

    getCurrentFrame() {
        return this.getCurrentObject().getCurrentLayer().getCurrentFrame();
    }

    getCurrentFrames() {
        return this.getCurrentObject().getCurrentFrames();
    }

    getAllObjects() {
        const allObjectsInProject = this.rootObject.getAllChildObjectsRecursive();
        return allObjectsInProject;
    }

    getAllFrames() {
        let frames = [];

        const allObjectsInProject = this.getAllObjects();
        allObjectsInProject.forEach(obj => {
            frames = frames.concat(obj.getAllFrames());
        });

        return frames;
    }

    getObjectByUUID(uuid) {
        const allObjectsInProject = this.rootObject.getAllChildObjectsRecursive();
        allObjectsInProject.push(this.rootObject);

        let foundObj = null;
        allObjectsInProject.forEach(object => {
            if(foundObj) return;
            if(object.uuid === uuid) {
                foundObj = object;
            }
        });

        return foundObj;
    }

    getObject(name) {
        return this.getObjectByName(name);
    }

    getObjectByName(name) {
        const allObjectsInProject = this.rootObject.getAllChildObjectsRecursive();
        allObjectsInProject.push(this.rootObject);

        let foundObj = null;
        allObjectsInProject.forEach(object => {
            if(foundObj) return;
            if(object.name === name) {
                foundObj = object;
            }
        });

        return foundObj;
    }

    getFrameByUUID(uuid) {
        const allObjectsInProject = this.rootObject.getAllChildObjectsRecursive();
        allObjectsInProject.push(this.rootObject);

        let foundFrame = null;
        allObjectsInProject.forEach(({isSymbol, layers}) => {
            if(!isSymbol) return;
            layers.forEach(({frames}) => {
                frames.forEach(frame => {
                    if(frame.uuid === uuid) {
                        foundFrame = frame;
                    }   
                });
            })
        });

        return foundFrame;
    }

    addObject(wickObject, zIndex, ignoreSymbolOffset, frame) {

        var frame = frame || this.getCurrentFrame();

        if(!ignoreSymbolOffset) {
            const insideSymbolOffset = this.currentObject.getAbsolutePosition();
            wickObject.x -= insideSymbolOffset.x;
            wickObject.y -= insideSymbolOffset.y;
        }

        if(!wickObject.uuid) wickObject.uuid = random.uuid4();
        
        if(zIndex === undefined || zIndex === null) {
            frame.wickObjects.push(wickObject);
        } else {
            frame.wickObjects.splice(zIndex, 0, wickObject);
        }

        this.rootObject.generateParentObjectReferences();

    }

    getNextAvailableName(baseName) {

        const nextName = baseName;
        let number = 0;

        this.getAllObjects().forEach(({name}) => {
            if(!name) return;
            const nameSuffix = name.split(baseName)[1];

            if(nameSuffix === "") {
                if(number === 0)
                    number = 1;
            } else {
                const prefixNumber = parseInt(nameSuffix);
                if(!isNaN(prefixNumber) && prefixNumber > number) 
                    number = prefixNumber;
            }
        });

        if(number === 0) {
            return baseName;
        } else {
            return `${baseName} ${number+1}`;
        }

    }

    jumpToObject(obj) {

        const that = this;

        this.rootObject.getAllChildObjectsRecursive().forEach(({uuid, parentObject}) => {
            if(uuid === obj.uuid) {
                that.currentObject = parentObject;
            }
        });

        const currentObject = this.currentObject;
        const frameWithChild = currentObject.getFrameWithChild(obj);
        const playheadPositionWithChild = frameWithChild.playheadPosition;
        currentObject.playheadPosition = playheadPositionWithChild;

    }

    jumpToFrame(frame) {

        const that = this;

        const allObjectsInProject = this.rootObject.getAllChildObjectsRecursive();
        allObjectsInProject.push(this.rootObject);
        allObjectsInProject.forEach(child => {
            if(!child.isSymbol) return;
            child.layers.forEach(({frames}) => {
                frames.forEach(currframe => {
                    if(frame === currframe) {
                        that.currentObject = child;
                    }
                })
            })
        });

        const currentObject = this.currentObject;
        const frameWithChild = frame;
        const playheadPositionWithChild = frameWithChild.playheadPosition;
        currentObject.playheadPosition = playheadPositionWithChild;
    }

    hasSyntaxErrors() {

        let projectHasSyntaxErrors = false;

        this.rootObject.getAllChildObjectsRecursive().forEach(child => {
            child.getAllFrames().forEach(({scriptError}) => {
                if(scriptError && scriptError.type === 'syntax') {
                    projectHasSyntaxErrors = true;
                }
            });

            if(child.scriptError && child.scriptError.type === 'syntax') {
                projectHasSyntaxErrors = true;
            }
        });

        return projectHasSyntaxErrors;

    }

    handleWickError(e, objectCausedError) {

        objectCausedError = window.errorCausingObject
        if(objectCausedError.objectClonedFrom) {
            objectCausedError = objectCausedError.objectClonedFrom
        }

        if (window.wickEditor) {
            //if(!wickEditor.builtinplayer.running) return;

            console.log(`Exception thrown while running script of WickObject: ${this.name}`);
            console.log(e);
            let lineNumber = null;
            if(e.stack) {
                e.stack.split('\n').forEach(line => {
                    if(lineNumber) return;
                    if(!line.includes("<anonymous>:")) return;

                    lineNumber = parseInt(line.split("<anonymous>:")[1].split(":")[0]);
                });
            }
            if(lineNumber) lineNumber -= 12;

            //console.log(e.stack.split("\n")[1].split('<anonymous>:')[1].split(":")[0]);
            //console.log(e.stack.split("\n"))
            //if(wickEditor.builtinplayer.running) wickEditor.builtinplayer.stopRunningProject()
            
            wickEditor.builtinplayer.stopRunningProject()

            wickEditor.scriptingide.displayError(objectCausedError, {
                message: e,
                line: lineNumber,
                type: 'runtime'
            });

            objectCausedError.scriptError = {
                message: e,
                line: lineNumber,
                type: 'runtime'
            }

        } else {
            alert("An exception was thrown while running a WickObject script. See console!");
            console.log(e);
        }
    }

    isObjectSelected(obj) {
        let selected = false;

        this._selection.forEach(uuid => {
            if(obj.uuid === uuid) selected = true;
        });

        return selected;
    }

    isTypeSelected(type) {
        const self = this;
        let selected = false;

        this._selection.forEach(uuid => {
            const obj = self.getObjectByUUID(uuid) 
                   || self.getFrameByUUID(uuid);
            if(obj instanceof type) selected = true;
        });

        return selected;
    }

    getSelectedObject() {
        const selectedObjects = this.getSelectedObjects();
        if(selectedObjects.length !== 1) {
            return null;
        } else {
            return selectedObjects[0];
        }
    }

    getSelectedObjectByType(type) {
        const selectedObjects = this.getSelectedObjects();
        returnObject = null;
        
        selectedObjects.forEach(obj => {
            if(obj instanceof type) {
                returnObject = obj;
            }
        })

        return returnObject;
    }

    getSelectedObjectsByType(type) {
        let selectedObjects = this.getSelectedObjects();
        
        selectedObjects = selectedObjects.filter(obj => {
            return (obj instanceof type);
        })

        return selectedObjects;
    }

    getSelectedObjects() {
        const self = this;

        const objs = [];
        this._selection.forEach(uuid => {
            const obj = self.getObjectByUUID(uuid) 
                   || self.getFrameByUUID(uuid);
                   //|| self.getTweenByUUID(uuid);
            if(obj) objs.push(obj);
        });

        return objs;
    }

    getSelectedWickObjects() {
        const self = this;

        const objs = [];
        this._selection.forEach(uuid => {
            const obj = self.getObjectByUUID(uuid);
            if(obj) objs.push(obj);
        });

        return objs;
    }

    getSelectedObjectsUUIDs() {
        const self = this;

        const objs = [];
        this._selection.forEach(uuid => {
            const obj = self.getObjectByUUID(uuid) 
                   || self.getFrameByUUID(uuid);
            if(obj) objs.push(obj.uuid);
        });

        return objs;
    }

    getNumSelectedObjects(obj) {
        return this.getSelectedObjects().length;
    }

    selectObject({uuid}) {
        wickEditor.inspector.clearSpecialMode();
        if(!this._selection.includes(uuid))
            this._selection.push(uuid);
    }

    selectObjectByUUID(uuid) {
        wickEditor.inspector.clearSpecialMode();
        if(!this._selection.includes(uuid))
            this._selection.push(uuid);
    }

    clearSelection() {
        let thingsWereCleared = false;
        if(this._selection.length > 0)  thingsWereCleared = true;
        this._selection = [];
        return thingsWereCleared;
    }

    deselectObject(obj) {
        wickEditor.inspector.clearSpecialMode();
        for ( let i = 0; i < this._selection.length; i++ ) {
            const uuid = this._selection[i];
            if(obj.uuid === uuid) {
                this._selection[i] = null;
            }
        }
    }

    deselectObjectType(type) {
        let deselectionHappened = false;
        
        for ( let i = 0; i < this._selection.length; i++ ) {
            const uuid = this._selection[i];
            const obj = this.getObjectByUUID(uuid) 
                   || this.getFrameByUUID(uuid);
            if(obj instanceof type) {
                this._selection[i] = null;
                deselectionHappened = true;
            }
        }

        this._selection = this._selection.filter(obj => {
            return obj !== null;
        });

        return deselectionHappened;
    }

    loadBuiltinFunctions(contextObject) {

        if(contextObject.wickScript === '') return;

        let objectScope = null;
        if(contextObject instanceof WickObject) {
            objectScope = contextObject.parentObject;
        } else if (contextObject instanceof WickFrame) {
            objectScope = contextObject.parentLayer.parentWickObject;
        }

        window.project = wickPlayer.project || wickEditor.project;
        window.parentObject = contextObject.parentObject;
        window.root = project.rootObject;

        window.play           = () => { objectScope.play(); }
        window.stop           = () => { objectScope.stop(); }
        window.movePlayheadTo = frame => { objectScope.movePlayheadTo(frame); }
        window.gotoAndStop    = frame => { objectScope.gotoAndStop(frame); }
        window.gotoAndPlay    = frame => { objectScope.gotoAndPlay(frame); }
        window.gotoNextFrame  = () => { objectScope.gotoNextFrame(); }
        window.gotoPrevFrame  = () => { objectScope.gotoPrevFrame(); }

        window.keyIsDown      = keyString => { return wickPlayer.inputHandler.keyIsDown(keyString); };
        window.keyJustPressed = keyString => { return wickPlayer.inputHandler.keyJustPressed(keyString); }
        window.mouseX = wickPlayer.inputHandler.getMouse().x;
        window.mouseY = wickPlayer.inputHandler.getMouse().y;
        window.mouseMoveX = wickPlayer.inputHandler.getMouseDiff().x;
        window.mouseMoveY = wickPlayer.inputHandler.getMouseDiff().y;
        window.hideCursor = () => { wickPlayer.inputHandler.hideCursor(); };
        window.showCursor = () => { wickPlayer.inputHandler.showCursor(); };

        // WickObjects in same frame (scope) are accessable without using root./parent.
        if(objectScope) {
            objectScope.getAllChildObjects().forEach(child => {
                if(child.name) window[child.name] = child;
            });
        }
        if(objectScope) {
            objectScope.getAllActiveChildObjects().forEach(child => {
                if(child.name) window[child.name] = child;
            });
        }

    }

    loadScriptOfObject({wickScript, uuid}) {

        if(wickScript === '') return;

        if(!window.cachedWickScripts) window.cachedWickScripts = {};

        let dummyInitScript = "";
        let dummyLoaderScript = "";
        WickObjectBuiltins.forEach(builtinName => {
            dummyInitScript += `function ${builtinName} (){return;};\n`;
            dummyLoaderScript += `\nthis.${builtinName}=${builtinName};`;
        });

        const evalScriptTag = `<script>\nwindow.cachedWickScripts["${uuid}"] = function () {\n${dummyInitScript}${wickScript}${dummyLoaderScript}\n}\n</script>`;
        $('head').append(evalScriptTag);
    }

    initScript(obj) {
        window.errorCausingObject = obj;

        if(!window.cachedWickScripts) window.cachedWickScripts = {};
        
        if(!obj.cachedWickScript) {
            if(obj.sourceUUID) {
                obj.cachedWickScript = window.cachedWickScripts[obj.sourceUUID];
            } else {
                obj.cachedWickScript = window.cachedWickScripts[obj.uuid];
            }
        }

        if(obj.cachedWickScript) {
            this.loadBuiltinFunctions(obj);
            try {
                obj.cachedWickScript();
            } catch (e) {
                this.handleWickError(e,obj);
            }
        }
    }

    runScript(obj, fnName, arg1, arg2, arg3) {

        window.errorCausingObject = obj;

        try {
            if(obj[fnName]) {
                this.loadBuiltinFunctions(obj);
                obj[fnName](arg1, arg2, arg3);
            }
        } catch (e) {
            this.handleWickError(e,obj);
        }

    }

    regenAssetReferences() {

        const self = this;

        self.getAllObjects().forEach(obj => {
            obj.asset = self.library.getAsset(obj.assetUUID);
        });

    }

    loadFonts(callback) {
        const self = this;
        const fontsInProject = [];
        self.getAllObjects().forEach(({isText, textData}) => {
            if(isText && textData.fontFamily !== 'Arial' && textData.fontFamily !== 'arial' && fontsInProject.indexOf(textData.fontFamily))
                fontsInProject.push(textData.fontFamily);
        });
        if(fontsInProject.length === 0 && callback) {
            callback()
        } else {
            loadGoogleFonts(fontsInProject, () => {
                if(window.wickEditor) {
                    wickEditor.canvas.getInteractiveCanvas().needsUpdate = true;
                    wickEditor.syncInterfaces();
                }
                if(callback) {
                    callback();
                }
            });
        }   
    }

    prepareForPlayer() {
        const self = this;

        self.regenAssetReferences();

        self.rootObject.prepareForPlayer();
        if(window.WickEditor) self.loadFonts();

        self.getAllObjects().forEach(obj => {
            self.loadScriptOfObject(obj);
        });
        self.getAllFrames().forEach(obj => {
            self.loadScriptOfObject(obj);
        });
    }

    tick() {
        const allObjectsInProject = this.rootObject.getAllChildObjectsRecursive();

        // Make sure all playhead positions are up to date 
        // (this is deferred to outside the main tick code so timeline changes happen all at once right here)
        allObjectsInProject.forEach(obj => {
            if(obj._newPlayheadPosition !== undefined)
                obj.playheadPosition = obj._newPlayheadPosition;
        });

        allObjectsInProject.forEach(obj => {
            obj._newPlayheadPosition = undefined;
        });
        allObjectsInProject.forEach(obj => {
            obj.getAllFrames().forEach(frame => {
                frame._wasActiveLastTick = frame._active;
                frame._active = frame.isActive();
            });
        });
        allObjectsInProject.forEach(obj => {
            obj._wasActiveLastTick = obj._active;
            obj._active = obj.isActive();
        });
        
        this.rootObject.tick();
        this.updateCamera();
        this.applyTweens();
    }

    applyTweens() {
        this.getAllFrames().forEach(frame => {
            frame.applyTween();
        });
    }

    updateCamera() {
        const camera = window.camera;
        if(!camera) return;

        camera.update();

        const camPos = camera.getPosition();
        this.rootObject.x = -camPos.x+this.width/2;
        this.rootObject.y = -camPos.y+this.height/2;
    }
}

WickProject.fromFile = (file, callback) => {

    const reader = new FileReader();
    reader.onload = ({target}) => {
        if (file.type === "text/html") {
            callback(WickProject.fromWebpage(target.result));
        } else if (file.type === "application/json") {
            callback(WickProject.fromJSON(target.result));
        }
    };
    reader.readAsText(file);

}

WickProject.fromZIP = (file, callback) => {
      JSZip.loadAsync(file).then(zip => {
          return zip.file("index.html").async("text");
        }).then(txt => {
          callback(WickProject.fromWebpage(txt));
        });
}

WickProject.fromWebpage = webpageString => {

    let extractedProjectJSON;

    const webpageStringLines = webpageString.split('\n');
    webpageStringLines.forEach(line => {
        if(line.startsWith("<script>var wickPlayer = new WickPlayer(); wickPlayer.runProject(")) {
            extractedProjectJSON = line.split("'")[1];
        }
    });

    if(!extractedProjectJSON) {
        // Oh no, something went wrong
        console.error("Bundled JSON project not found in specified HTML file (webpageString). The HTML supplied might not be a Wick project, or zach might have changed the way projects are bundled. See WickProject.Exporter.js!");
        return null;
    } else {
        // Found a bundled project's JSON, let's load it!
        return WickProject.fromJSON(extractedProjectJSON);
    }
}

WickProject.fromJSON = (rawJSONProject, uncompressed) => {

    const JSONString = uncompressed ? rawJSONProject : WickProject.Compressor.decompressProject(rawJSONProject);

    // Replace current project with project in JSON
    const projectFromJSON = JSON.parse(JSONString);

    // Put prototypes back on object ('class methods'), they don't get JSONified on project export.
    projectFromJSON.__proto__ = WickProject.prototype;
    WickObject.addPrototypes(projectFromJSON.rootObject);

    WickProject.fixForBackwardsCompatibility(projectFromJSON);
    projectFromJSON.library.__proto__ = AssetLibrary.prototype;
    AssetLibrary.addPrototypes(projectFromJSON.library);

    // Decode scripts back to human-readble and eval()-able format
    projectFromJSON.rootObject.decodeStrings();
    projectFromJSON.library.decodeStrings();

    // Add references to wickobject's parents (optimization)
    projectFromJSON.rootObject.generateParentObjectReferences();
    projectFromJSON.regenAssetReferences();

    // Start at the first from of the root object
    projectFromJSON.currentObject = projectFromJSON.rootObject;
    projectFromJSON.rootObject.playheadPosition = 0;
    projectFromJSON.currentObject.currentLayer = 0;

    projectFromJSON.currentObject = projectFromJSON.rootObject;

    return projectFromJSON;
}

// Backwards compatibility for old Wick projects
WickProject.fixForBackwardsCompatibility = project => {

    const allObjectsInProject = project.rootObject.getAllChildObjectsRecursive();
    allObjectsInProject.push(project.rootObject);
    allObjectsInProject.forEach(wickObj => {
        // Tweens belong to frames now
        if(wickObj.tweens) wickObj.tweens = null;

        if(!wickObj.isSymbol) return
        wickObj.layers.forEach(layer => {
            if(!layer.locked) layer.locked = false;
            if(!layer.hidden) layer.hidden = false;
            layer.frames.forEach(frame => {
                if(!frame.tweens) frame.tweens = [];
                // Make sure tweens have rotations now
                frame.tweens.forEach(tween => {
                    if(!tween.rotations) tween.rotations = 0;
                });
            });
        });
    });

    // Selection is handled in the project now
    if(!project._selection){
        project._selection = [];
    }

    // Data for sounds and images is stored in the asset library now
    if(!project.library) {
        project.library = new AssetLibrary();

        allObjectsInProject.forEach(wickObject => {
            if(wickObject.imageData) {
                var asset = new WickAsset(wickObject.imageData, 'image', 'untitled');
                wickObject.assetUUID = project.library.addAsset(asset);
                wickObject.isImage = true;
                wickObject.imageData = null;
                wickObject.name = 'untitled';
            } else if(wickObject.audioData) {
                var asset = new WickAsset(wickObject.imageData, 'audio', 'untitled');
                const assetUUID = project.library.addAsset(asset);
            }
        })
    }

    project.library.__proto__ = AssetLibrary.prototype;
    project.library.regenAssetUUIDs();

}

var WickObjectBuiltins = [
    'load',
    'update',
    'mousePressed',
    'mouseDown',
    'mouseReleased',
    'mouseHover',
    'mouseEnter',
    "mouseLeave",
    "keyPressed",
    "keyDown",
    "keyReleased",
];
