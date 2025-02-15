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

class WickObject {
    constructor() {

    // Internals

        // Unique id
        this.uuid = random.uuid4();

        // Name is optional, added by user
        this.name = undefined;

    // Positioning

        this.x = 0;
        this.y = 0;
        this.width = undefined;
        this.height = undefined;
        this.scaleX = 1;
        this.scaleY = 1;
        this.rotation = 0;
        this.flipX = false;
        this.flipY = false;
        this.opacity = 1;

    // Common
        
        //this.wickScript = "function load() {\n\t\n}\n\nfunction update() {\n\t\n}\n";
        this.wickScript = "";

    // Static

        this.assetUUID = null;
        this.loop = false;

    // Text

        this.isText = false;

    // Images

        this.isImage = false;

    // Symbols

        this.isSymbol = false;
        this.isButton = false;
        this.isGroup = false;

        // Used to keep track of what frame is being edited
        this.playheadPosition = null;
        this.currentLayer = null;

        // List of layers, only used by symbols
        this.layers = undefined;

    // Render
        
        this._renderDirty = false;  // Tell the renderer if this object has changed. 

    }

    copy() {

        const copiedObject = new WickObject();

        copiedObject.name = this.name;
        copiedObject.x = this.x;
        copiedObject.y = this.y;
        copiedObject.width = this.width;
        copiedObject.height = this.height;
        copiedObject.scaleX = this.scaleX;
        copiedObject.scaleY = this.scaleY;
        copiedObject.rotation = this.rotation;
        copiedObject.flipX = this.flipX;
        copiedObject.flipY = this.flipY;
        copiedObject.opacity = this.opacity;
        copiedObject.uuid = random.uuid4();
        copiedObject.sourceUUID = this.uuid;
        copiedObject.assetUUID = this.assetUUID;
        copiedObject.svgX = this.svgX;
        copiedObject.svgY = this.svgY;
        copiedObject.pathData = this.pathData;
        copiedObject.isImage = this.isImage;
        copiedObject.isPath = this.isPath;
        copiedObject.isText = this.isText;
        copiedObject.isButton = this.isButton;
        copiedObject.isGroup = this.isGroup;
        copiedObject.cachedAbsolutePosition = this.getAbsolutePosition();
        copiedObject.svgStrokeWidth = this.svgStrokeWidth;

        if(this.isText)
            copiedObject.textData = JSON.parse(JSON.stringify(this.textData));

        copiedObject.wickScript = this.wickScript

        if(this.isSymbol) {
            copiedObject.isSymbol = true;

            copiedObject.playheadPosition = 0;
            copiedObject.currentLayer = 0;

            copiedObject.layers = [];
            this.layers.forEach(layer => {
                copiedObject.layers.push(layer.copy());
            });
        } else {
            copiedObject.isSymbol = false;
        }

        return copiedObject;

    }

    getAsJSON() {
        const oldX = this.x;
        const oldY = this.y;

        const absPos = this.getAbsolutePosition();
        this.x = absPos.x;
        this.y = absPos.y;

        // Encode scripts to avoid JSON format problems
        this.encodeStrings();

        const JSONWickObject = JSON.stringify(this, WickProject.Exporter.JSONReplacerObject);

        // Put prototypes back on object ('class methods'), they don't get JSONified on project export.
        WickObject.addPrototypes(this);

        // Decode scripts back to human-readble and eval()-able format
        this.decodeStrings();

        this.x = oldX;
        this.y = oldY;

        return JSONWickObject;
    }

    downloadAsFile() {

        const filename = this.name || "wickobject";

        if(this.isSymbol) {
            const blob = new Blob([this.getAsJSON()], {type: "text/plain;charset=utf-8"});
            saveAs(blob, `${filename}.json`);
            return;
        }

        const asset = wickEditor.project.library.getAsset(this.assetUUID);

        if(asset.type === 'image') {
            const ext = asset.getData().split("/")[1].split(';')[0];
            saveAs(dataURItoBlob(asset.getData()), `${filename}.${ext}`);
            return;
        }

        console.error("export not supported for this type of wickobject yet");

    }

    /* Encodes scripts and strings to avoid JSON format problems */
    encodeStrings() {

        if(this.wickScript) {
            this.wickScript = WickProject.Compressor.encodeString(this.wickScript);
        }

        if(this.textData) {
            this.textData.text = WickProject.Compressor.encodeString(this.textData.text);
        }

        if(this.pathData) {
            this.pathData = WickProject.Compressor.encodeString(this.pathData);
        }

        if(this.isSymbol) {
            this.getAllFrames().forEach(frame => {
                frame.encodeStrings();
            });

            this.getAllChildObjects().forEach(child => {
                child.encodeStrings();
            });
        }

    }

    /* Decodes scripts and strings back to human-readble and eval()-able format */
    decodeStrings() {
        
        if(this.wickScript) {
            this.wickScript = WickProject.Compressor.decodeString(this.wickScript);
        }

        if(this.textData) {
            this.textData.text = WickProject.Compressor.decodeString(this.textData.text);
        }

        if(this.pathData) {
            this.pathData = WickProject.Compressor.decodeString(this.pathData);
        }

        if(this.isSymbol) {
            this.getAllFrames().forEach(frame => {
                frame.decodeStrings();
            });

            this.getAllChildObjects().forEach(child => {
                child.decodeStrings();
            });
        }

    }

    generateParentObjectReferences() {

        const self = this;

        if(!self.isSymbol) return;

        self.layers.forEach(layer => {
            layer.parentWickObject = self;

            layer.frames.forEach(frame => {
                frame.parentLayer = layer;
                frame.parentObject = self;

                frame.wickObjects.forEach(wickObject => {
                    wickObject.parentObject = self;
                    wickObject.parentFrame = frame;

                    wickObject.generateParentObjectReferences();
                });
            });
        });

    }

    generateObjectNameReferences() {

        const that = this;

        this.getAllChildObjects().forEach(child => {
            that[child.name] = child;

            if(child.isSymbol) {
                child.generateObjectNameReferences();
            }
        });
        this.getAllActiveChildObjects().forEach(child => {
            that[child.name] = child;
        });

    }

    getCurrentLayer() {
        return this.layers[this.currentLayer];
    }

    addLayer(layer) {
        let currentLayerNum = 0;

        this.layers.forEach(({identifier}) => {
            const splitName = identifier.split("Layer ");
            if(splitName && splitName.length > 1) {
                layerNum = parseInt(splitName[1]);
                if(layerNum > currentLayerNum) {
                    currentLayerNum = layerNum;
                }
            }
        });

        layer.identifier = `Layer ${currentLayerNum+1}`;

        this.layers.push(layer);
    }

    removeLayer(layer) {
        const that = this;
        this.layers.forEach(currLayer => {
            if(layer === currLayer) {
                that.layers.splice(that.layers.indexOf(layer), 1);
            }
        });
    }

    getTotalTimelineLength() {
        let longestLayerLength = 0;

        this.layers.forEach(layer => {
            const layerLength = layer.getTotalLength();
            if(layerLength > longestLayerLength) {
                longestLayerLength = layerLength;
            }
        });

        return longestLayerLength;

    }

    updateFrameTween(relativePlayheadPosition) {
        const frame = this.parentFrame;
        const tween = frame.getTweenAtFrame(relativePlayheadPosition);

        if(tween) {
            tween.updateFromWickObjectState(this);
        }
    }

    getActiveFrames() {
        if(!this.isSymbol) {
            return [];
        }
        
        const activeFrames = [];

        this.layers.forEach(layer => {
            const frame = layer.getCurrentFrame();
            if(frame)
                activeFrames.push(frame);
        });

        return activeFrames;
    }

    /* Return all child objects of a parent object */
    getAllChildObjects() {

        if (!this.isSymbol) {
            return [];
        }

        const children = [];
        for(let l = this.layers.length-1; l >= 0; l--) {
            const layer = this.layers[l];
            for(let f = 0; f < layer.frames.length; f++) {
                const frame = layer.frames[f];
                for(let o = 0; o < frame.wickObjects.length; o++) {
                    children.push(frame.wickObjects[o]);
                }
            }
        }
        return children;
    }

    /* Return all child objects in the parent objects current frame. */
    getAllActiveChildObjects() {

        if (!this.isSymbol) {
            return [];
        }

        const children = [];
        for (let l = this.layers.length-1; l >= 0; l--) {
            const layer = this.layers[l];
            const frame = layer.getFrameAtPlayheadPosition(this.playheadPosition);
            if(frame) {
                frame.wickObjects.forEach(obj => {
                    children.push(obj);
                });
            }
        }
        return children;
    }

    /* Return all child objects of a parent object (and their children) */
    getAllChildObjectsRecursive() {

        if (!this.isSymbol) {
            return [this];
        }

        let children = [this];
        this.layers.forEachBackwards(({frames}) => {
            frames.forEach(({wickObjects}) => {
                wickObjects.forEach(wickObject => {
                    children = children.concat(wickObject.getAllChildObjectsRecursive());
                });
            });
        });
        return children;
    }

    /* Return all active child objects of a parent object (and their children) */
    getAllActiveChildObjectsRecursive(includeParents) {

        if (!this.isSymbol) {
            return [];
        }

        let children = [];
        for (let l = this.layers.length-1; l >= 0; l--) {
            const frame = this.layers[l].getFrameAtPlayheadPosition(this.playheadPosition);
            if(frame) {
                for(let o = 0; o < frame.wickObjects.length; o++) {
                    const obj = frame.wickObjects[o];
                    if(includeParents || !obj.isSymbol) children.push(obj);
                    children = children.concat(obj.getAllActiveChildObjectsRecursive(includeParents));
                }
            }
        }
        return children;

    }

    /* Return all child objects in the parent objects current layer. */
    getAllActiveLayerChildObjects() {

        if (!this.isSymbol) {
            return [];
        }

        const children = [];
        const layer = this.getCurrentLayer();
        const frame = layer.getFrameAtPlayheadPosition(this.playheadPosition);
        if(frame) {
            frame.wickObjects.forEach(obj => {
                children.push(obj);
            });
        }
        return children;
    }

    // Use this to get objects on other layers
    getAllInactiveSiblings() {

        if(!this.parentObject) {
            return [];
        }

        const that = this;
        let siblings = [];
        this.parentObject.getAllActiveChildObjects().forEach(child => {
            if(child !== that) {
                siblings.push(child);
            }
        });
        siblings = siblings.concat(this.parentObject.getAllInactiveSiblings());

        return siblings;

    }

    // Use this for onion skinning
    getNearbyObjects(numFramesBack, numFramesForward) {

        // Get nearby frames

        const nearbyFrames = [];

        const startPlayheadPosition = Math.max(0, this.playheadPosition - numFramesBack);
        const endPlayheadPosition = this.playheadPosition + numFramesForward;
        let tempPlayheadPosition = startPlayheadPosition;

        while(tempPlayheadPosition <= endPlayheadPosition) {
            const frame = this.getCurrentLayer().getFrameAtPlayheadPosition(tempPlayheadPosition);

            if(frame && tempPlayheadPosition !== this.playheadPosition && !nearbyFrames.includes(frame)) {
                nearbyFrames.push(frame);
            }
            
            tempPlayheadPosition ++;
        }

        // Get objects in nearby frames

        let nearbyObjects = [];

        nearbyFrames.forEach(({wickObjects}) => {
            nearbyObjects = nearbyObjects.concat(wickObjects);
        });

        return nearbyObjects;

    }

    //
    getObjectsOnFirstFrame() {

        const objectsOnFirstFrame = [];

        this.layers.forEach(({frames}) => {
            frames[0].wickObjects.forEach(wickObj => {
                objectsOnFirstFrame.push(wickObj);
            });
        });

        return objectsOnFirstFrame;

    }

    getParents() {
        if(!this.isSymbol) {
            return [];
        } else if(this.isRoot) {
            return [this];
        } else {
            return this.parentObject.getParents().concat([this]);
        }
    }

    /* Excludes children of children */
    getTotalNumChildren() {
        let count = 0;
        for(let l = 0; l < this.layers.length; l++) {
            for(let f = 0; f < this.layers[l].frames.length; f++) {
                for(let o = 0; o < this.layers[l].frames[f].wickObjects.length; o++) {
                    count++;
                }
            }
        }
        return count;
    }

    getAllFrames() {

        if(!this.isSymbol) return [];

        const allFrames = [];

        this.layers.forEach(({frames}) => {
            frames.forEach(frame => {
                allFrames.push(frame);
            });
        });

        return allFrames;
    }

    getAllFramesWithSound() {
        return this.getAllFrames().filter(frame => {
            return frame.hasSound();
        });
    }

    getFrameWithChild({uuid}) {

        let foundFrame = null;

        this.layers.forEach(({frames}) => {
            frames.forEach(frame => {
                frame.wickObjects.forEach(({uuid}) => {
                    if(uuid === uuid) {
                        foundFrame = frame;
                    }
                });
            });
        });

        return foundFrame;
    }

    getLayerWithChild(child) {

        let foundLayer = null;

        this.layers.forEach(layer => {
            layer.frames.forEach(({wickObjects}) => {
                if(wickObjects.includes(child)) {
                    foundLayer = layer;
                }
            });
        });

        return foundLayer;
    }

    remove() {
        this.parentObject.removeChild(this);
    }

    removeChild(childToRemove) {

        if(!this.isSymbol) {
            return;
        }

        const that = this;
        this.getAllChildObjects().forEach(child => {
            if(child == childToRemove) {
                const index = child.parentFrame.wickObjects.indexOf(child);
                child.parentFrame.wickObjects.splice(index, 1);
            }
        });
    }

    getZIndex() {
        return this.parentFrame.wickObjects.indexOf(this);
    }

    /* Get the absolute position of this object (the position not relative to the parents) */
    getAbsolutePosition() {
        if(this.isRoot) {
            return {
                x: this.x,
                y: this.y
            };
        } else if (!this.parentObject) {
            return this.cachedAbsolutePosition;
        } else {
            const parent = this.parentObject;
            const parentPosition = parent.getAbsolutePosition();
            return {
                x: this.x + parentPosition.x,
                y: this.y + parentPosition.y
            };
        }
    }

    /* Get the absolute position of this object taking into account the scale of the parent */
    getAbsolutePositionTransformed() {
        if(this.isRoot) {
            return {
                x: this.x,
                y: this.y
            };
        } else {
            const parent = this.parentObject;
            const parentPosition = parent.getAbsolutePositionTransformed();
            const parentScale = parent.getAbsoluteScale();
            const parentFlip = parent.getAbsoluteFlip();
            let rotatedPosition = {x:this.x*parentScale.x, y:this.y*parentScale.y};
            if(parentFlip.x) rotatedPosition.x *= -1;
            if(parentFlip.y) rotatedPosition.y *= -1;
            rotatedPosition = rotate_point(rotatedPosition.x, rotatedPosition.y, 0, 0, parent.getAbsoluteRotation());
            return {
                x: rotatedPosition.x + parentPosition.x,
                y: rotatedPosition.y + parentPosition.y
            };
        }
    }

    getAbsoluteScale() {
        if(this.isRoot) {
            return {
                x: this.scaleX,
                y: this.scaleY
            };
        } else {
            const parentScale = this.parentObject.getAbsoluteScale();
            return {
                x: this.scaleX * parentScale.x,
                y: this.scaleY * parentScale.y
            };
        }
    }

    getAbsoluteRotation() {
        if(this.isRoot) {
            return this.rotation;
        } else {
            const parentRotation = this.parentObject.getAbsoluteRotation();
            return this.rotation + parentRotation;
        }
    }

    getAbsoluteOpacity() {
        if(this.isRoot) {
            return this.opacity;
        } else {
            const parentOpacity = this.parentObject.getAbsoluteOpacity();
            return this.opacity * parentOpacity;
        }
    }

    getAbsoluteFlip() {
        if(this.isRoot) {
            return {
                x: this.flipX,
                y: this.flipY
            };
        } else {
            const parentFlip = this.parentObject.getAbsoluteFlip();
            return {
                x: this.flipX !== parentFlip.x,
                y: this.flipY !== parentFlip.y
            };
        }
    }

    getAbsoluteTransformations() {
        return {
            position: this.getAbsolutePositionTransformed(),
            scale: this.getAbsoluteScale(),
            rotation: this.getAbsoluteRotation(),
            opacity: this.getAbsoluteOpacity(),
            flip: this.getAbsoluteFlip(),
        }
    }

    isOnActiveLayer(activeLayer) {

        return this.parentFrame.parentLayer === activeLayer;

    }

    play() {

        this._playing = true;
    }

    stop() {

        this._playing = false;
    }

    getFrameById(identifier) {
        let foundFrame = null;

        this.getAllFrames().forEach(frame => {
            if(frame.name === identifier) {
                foundFrame = frame;
            }
        });

        return foundFrame;
    }

    getFrameByPlayheadPosition(php) {
        let foundFrame = null;

        this.getAllFrames().forEach(frame => {
            if(frame.playheadPosition === php) {
                foundFrame = frame;
            }
        });

        return foundFrame;
    }

    gotoAndStop(frame) {
        this.movePlayheadTo(frame);
        this.stop();
    }

    gotoAndPlay(frame) {
        this.movePlayheadTo(frame);
        this.play();
    }

    movePlayheadTo(frame) {

        const oldFrame = this.getCurrentLayer().getCurrentFrame();

        // Frames are zero-indexed internally but start at one in the editor GUI, so you gotta subtract 1.
        if (typeof frame === 'number') {
            const actualFrame = frame-1;

            const endOfFrames = this.getFramesEnd(); 
            // Only navigate to an integer frame if it is nonnegative and a valid frame
            if(actualFrame < endOfFrames) {
                this._newPlayheadPosition = actualFrame;
            } else {
                throw (new Error(`Failed to navigate to frame '${actualFrame}': is not a valid frame.`));
            }

        } else if (typeof frame === 'string') {

            const foundFrame = this.getFrameById(frame);

            if (foundFrame) {
                if(this.playheadPosition < foundFrame.playheadPosition || this.playheadPosition >= foundFrame.playheadPosition+foundFrame.length-1) {
                    this._newPlayheadPosition = foundFrame.playheadPosition;
                }
            } else {
                throw (new Error(`Failed to navigate to frame. '${frame}' is not a valid frame.`));
            }

        }

    }

    gotoNextFrame() {

        let nextFramePos = this.playheadPosition+1;
        const totalLength = this.getTotalTimelineLength();
        if(nextFramePos >= totalLength) {
            nextFramePos = 0;
        }

        this._newPlayheadPosition = nextFramePos;

    }

    gotoPrevFrame() {

        let nextFramePos = this.playheadPosition-1;
        if(nextFramePos < 0) {
            nextFramePos = this.layers[this.currentLayer].getTotalLength()-1;
        }

        this._newPlayheadPosition = nextFramePos;

    }

    getFramesEnd() {
        endFrame = 0; 

        this.layers.forEach(({frames}) => {
            frames.forEach( frame => {
                endFrame = Math.max (frame.getFrameEnd(), endFrame); 
            })
        });

        return endFrame;

    }

    hitTest(otherObj) {
        this.regenBounds();
        otherObj.regenBounds();

        return intersectRect(this.bounds, otherObj.bounds);
    }

    regenBounds() {
        const self = this;
        if(this.isSymbol) {
            this.bounds = {
                left: Infinity,
                right: -Infinity,
                top: Infinity,
                bottom: -Infinity,
            }
            this.getAllActiveChildObjects().forEach(child => {
                child.regenBounds();
                self.bounds.left = Math.min(child.bounds.left, self.bounds.left)
                self.bounds.right = Math.max(child.bounds.right, self.bounds.right)
                self.bounds.top = Math.min(child.bounds.top, self.bounds.top)
                self.bounds.bottom = Math.max(child.bounds.bottom, self.bounds.bottom)
            });
        } else {
            const absPos = this.getAbsolutePosition();
            this.bounds = {
                left: absPos.x - this.width/2,
                right: absPos.x + this.width/2,
                top: absPos.y - this.height/2,
                bottom: absPos.y + this.height/2,
            };
        }
    }

    isPointInside({x, y}) {

        const objects = this.getAllActiveChildObjectsRecursive(false);
        if(!this.isSymbol) {
            objects.push(this);
        }

        let hit = false;

        objects.forEach(object => {
            if(hit) return;

            const transformedPosition = object.getAbsolutePositionTransformed();
            let transformedPoint = {x, y};
            const transformedScale = object.getAbsoluteScale();
            const transformedWidth = (object.width+object.svgStrokeWidth)*transformedScale.x;
            const transformedHeight = (object.height+object.svgStrokeWidth)*transformedScale.y;

            transformedPoint = rotate_point(
                transformedPoint.x, 
                transformedPoint.y, 
                transformedPosition.x, 
                transformedPosition.y,
                -object.getAbsoluteRotation()
            );

            // Bounding box check
            if ( transformedPoint.x >= transformedPosition.x - transformedWidth /2 &&
                 transformedPoint.y >= transformedPosition.y - transformedHeight/2 &&
                 transformedPoint.x <= transformedPosition.x + transformedWidth /2 &&
                 transformedPoint.y <= transformedPosition.y + transformedHeight/2 ) {

                if(!object.alphaMask) {
                    hit = true;
                    return;
                }

                const relativePoint = {
                    x: transformedPoint.x - transformedPosition.x + transformedWidth /2,
                    y: transformedPoint.y - transformedPosition.y + transformedHeight/2
                };

                // Alpha mask check
                const objectAlphaMaskIndex =
                    (Math.floor(relativePoint.x/transformedScale.x)%Math.floor(object.width+object.svgStrokeWidth)) +
                    (Math.floor(relativePoint.y/transformedScale.y)*Math.floor(object.width+object.svgStrokeWidth));
                if(!object.alphaMask[(objectAlphaMaskIndex)] && 
                   objectAlphaMaskIndex < object.alphaMask.length &&
                   objectAlphaMaskIndex >= 0) {
                    hit = true;
                    return;
                }
            }
        });

        return hit;
    }

    clone(args) {
        return wickPlayer.cloneObject(this, args);
    }

    delete() {
        return wickPlayer.deleteObject(this);
    }

    setCursor(cursor) {
        this.cursor = cursor;
    }

    isHoveredOver() {
        return this.hoveredOver;
    }

    prepareForPlayer() {
        // Set all playhead vars
        if(this.isSymbol) {
            // Set this object to it's first frame
            this.playheadPosition = 0;

            this.clones = [];

            // Start the object playing
            this._playing = true;
            this._active = false;
            this._wasActiveLastTick = false;

            this.layers.forEach(layer => {
                layer.hidden = false;
            })

            this.getAllFrames().forEach(frame => {
                //frame.prepareForPlayer();
            });
            this.getAllChildObjects().forEach(o => {
                o.prepareForPlayer();
            })
        }

        // Reset the mouse hovered over state flag
        this.hoveredOver = false;
    }

    /* Generate alpha mask for per-pixel hit detection */
    generateAlphaMask(imageData) {

        const that = this;

        const alphaMaskSrc = imageData || that.asset.getData();
        if(!alphaMaskSrc) return;

        //window.open(alphaMaskSrc)

        ImageToCanvas(alphaMaskSrc, ({width, height}, ctx) => {
            //if(window.wickPlayer) window.open(canvas.toDataURL())
            const w = width;
            const h = height;
            const rgba = ctx.getImageData(0,0,w,h).data;
            that.alphaMask = [];
            for (let y = 0; y < h; y ++) {
                for (let x = 0; x < w; x ++) {
                    const alphaMaskIndex = x+y*w;
                    that.alphaMask[alphaMaskIndex] = rgba[alphaMaskIndex*4+3] <= 10;
                }
            }
        }, {width:Math.floor(that.width+that.svgStrokeWidth), height:Math.floor(that.height+that.svgStrokeWidth)} );

    }

    getCurrentFrames() {
        const currentFrames = [];

        this.layers.forEach(layer => {
            const frame = layer.getCurrentFrame();
            if(frame) currentFrames.push(frame)
        });

        return currentFrames;
    }

    tick() {
        var self = this;

        if(this.isSymbol) {
            this.layers.forEach(({frames}) => {
                frames.forEach(frame => {
                    frame.tick();
                });
            });
        }

        if(this.isButton) {
            this.stop();
            if(this._beingClicked) {
                if(this.getFrameByPlayheadPosition(2))
                    this.movePlayheadTo(3);
            } else if (this.hoveredOver) {
                if(this.getFrameByPlayheadPosition(1))
                    this.movePlayheadTo(2);
            } else {
                if(this.getFrameByPlayheadPosition(0))
                    this.movePlayheadTo(1);
            }
        }

        if(this.isSymbol) {
            if(true) {
                if(this._wasClicked) {
                    (wickPlayer || wickEditor).project.runScript(this, 'mousePressed');
                    this._wasClicked = false;
                }

                if(this._beingClicked) {
                    (wickPlayer || wickEditor).project.runScript(this, 'mouseDown');
                    this._wasClicked = false;
                }

                if(this._wasClickedOff) {
                    (wickPlayer || wickEditor).project.runScript(this, 'mouseReleased');
                    this._wasClickedOff = false;
                }

                if(this.isHoveredOver()) {
                    (wickPlayer || wickEditor).project.runScript(this, 'mouseHover');
                }

                if(this._wasHoveredOver) {
                    (wickPlayer || wickEditor).project.runScript(this, 'mouseEnter');
                    this._wasHoveredOver = false;
                }

                if(this._mouseJustLeft) {
                    (wickPlayer || wickEditor).project.runScript(this, 'mouseLeave');
                    this._mouseJustLeft = false;
                }

                wickPlayer.inputHandler.getAllKeysJustReleased().forEach(key => {
                    (wickPlayer || wickEditor).project.runScript(self, 'keyReleased', key);
                });

                wickPlayer.inputHandler.getAllKeysJustPressed().forEach(key => {
                    (wickPlayer || wickEditor).project.runScript(self, 'keyPressed', key);
                });

                wickPlayer.inputHandler.getAllKeysDown().forEach(key => {
                    (wickPlayer || wickEditor).project.runScript(self, 'keyDown', key);
                });

                // Inactive -> Inactive
                if (!this._wasActiveLastTick && !this._active) {
                    
                }
                // Inactive -> Active
                else if (!this._wasActiveLastTick && this._active) {
                    (wickPlayer || wickEditor).project.initScript(this);

                    (wickPlayer || wickEditor).project.runScript(this, 'load');
                    (wickPlayer || wickEditor).project.runScript(this, 'update');

                    // Force playhead update on first tick to fix:
                    // https://github.com/zrispo/wick-editor/issues/810
                    if(this._newPlayheadPosition) {
                        this.playheadPosition = this._newPlayheadPosition;
                        this._newPlayheadPosition = undefined;
                    }
                }
                // Active -> Active
                else if (this._wasActiveLastTick && this._active) {
                    (wickPlayer || wickEditor).project.runScript(this, 'update');
                }
                // Active -> Inactive
                else if (this._wasActiveLastTick && !this._active) {
                    if(!this.parentFrame.alwaysSaveState) {
                        wickPlayer.resetStateOfObject(this);
                    }
                }
            }

            if(this.isSymbol) {
                if(this._active) {
                    this.advanceTimeline();
                }
            
                this.currentFrameNumber = this.playheadPosition+1;
                var self = this;
                this.getActiveFrames().forEach(({name}) => {
                    self.currentFrameName = name;
                });
            }
        }

    }

    advanceTimeline() {
        if(this._playing && this.isSymbol && this._newPlayheadPosition === undefined) {
            this._newPlayheadPosition = this.playheadPosition+1;
            if(this._newPlayheadPosition >= this.getTotalTimelineLength()) {
                this._newPlayheadPosition = 0;
            }
        }
    }

    isActive() {
        if(this.isRoot) return true;

        return this.parentFrame._active;
    }

    setText(text) {
        this.textData.text = String(text); // Convert to a string, just in case.
        this._renderDirty = true;  
    }

    moveUp(d) {
        this.y -= d === undefined ? 1 : d;
    }

    moveDown(d) {
        this.y += d === undefined ? 1 : d;
    }

    moveLeft(d) {
        this.x -= d === undefined ? 1 : d;
    }

    moveRight(d) {
        this.x += d === undefined ? 1 : d;
    }

    pointTo(x2, y2) {
        const dx = this.x - x2;
        const dy = this.y - y2;

        this.rotation = Math.atan2(dy,dx) * 180 / Math.PI - 90;
    }
}

WickObject.fromJSON = jsonString => {
    // Parse JSON
    const newWickObject = JSON.parse(jsonString);

    // Put prototypes back on object ('class methods'), they don't get JSONified on project export.
    WickObject.addPrototypes(newWickObject);

    // Decode scripts back to human-readble and eval()-able format
    newWickObject.decodeStrings();

    return newWickObject;
}

WickObject.fromJSONArray = ({wickObjectArray, groupPosition}) => {
    const newWickObjects = [];

    const wickObjectJSONArray = wickObjectArray;
    for (let i = 0; i < wickObjectJSONArray.length; i++) {
        
        const newWickObject = WickObject.fromJSON(wickObjectJSONArray[i]);
        
        if(wickObjectJSONArray.length > 1) {
            newWickObject.x += groupPosition.x;
            newWickObject.y += groupPosition.y;
        }

        newWickObjects.push(newWickObject);
    }

    return newWickObjects;
}

WickObject.createPathObject = svg => {
    const obj = new WickObject();
    obj.isPath = true;
    obj.pathData = svg;

    return obj;
}

WickObject.createTextObject = text => {
    const obj = new WickObject();

    obj.isText = true;
    obj.width = 400;
    obj.textData = {
        fontFamily: 'Arial',
        fontSize: 40,
        fontStyle: 'normal',
        fontWeight: 'normal',
        lineHeight: 1.0,
        fill: '#000000',
        textAlign: 'left',
        text
    };

    return obj;
}

WickObject.createNewSymbol = name => {

    const symbol = new WickObject();

    symbol.isSymbol = true;
    symbol.playheadPosition = 0;
    symbol.currentLayer = 0;
    symbol.layers = [new WickLayer()];
    symbol.name = name;

    return symbol;

}

// Create a new symbol and add every object in wickObjects as children
WickObject.createSymbolFromWickObjects = wickObjects => {

    const symbol = WickObject.createNewSymbol();

    // Calculate center of all WickObjects
    const topLeft = {x:Number.MAX_SAFE_INTEGER, y:Number.MAX_SAFE_INTEGER};
    const bottomRight = {x:-Number.MAX_SAFE_INTEGER,y:-Number.MAX_SAFE_INTEGER};
    wickObjects.forEach(({x, width, y, height}) => {
        topLeft.x = Math.min(topLeft.x, x - width /2);
        topLeft.y = Math.min(topLeft.y, y - height/2);
        bottomRight.x = Math.max(bottomRight.x, x + width /2);
        bottomRight.y = Math.max(bottomRight.y, y + height/2);
    });

    const center = {
        x: topLeft.x + (bottomRight.x - topLeft.x)/2,
        y: topLeft.y + (bottomRight.y - topLeft.y)/2
    };
    symbol.x = center.x;
    symbol.y = center.y;

    const firstFrame = symbol.layers[0].frames[0];
    for(let i = 0; i < wickObjects.length; i++) {
        firstFrame.wickObjects[i] = wickObjects[i];

        firstFrame.wickObjects[i].x = wickObjects[i].x - symbol.x;
        firstFrame.wickObjects[i].y = wickObjects[i].y - symbol.y;
    }

    symbol.width  = firstFrame.wickObjects[0].width;
    symbol.height = firstFrame.wickObjects[0].height;

    return symbol;

}

WickObject.addPrototypes = obj => {

    // Put the prototype back on this object
    obj.__proto__ = WickObject.prototype;

    if(obj.isSymbol) {
        obj.layers.forEach(layer => {
            layer.__proto__ = WickLayer.prototype;
            layer.frames.forEach(frame => {
                frame.__proto__ = WickFrame.prototype;

                if(frame.tweens) {
                    frame.tweens.forEach(tween => {
                        tween.__proto__ = WickTween.prototype;
                    });
                }
            });
        });

        obj.getAllChildObjects().forEach(currObj => {
            WickObject.addPrototypes(currObj);
        });
    }
}
