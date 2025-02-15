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

class WickFrame {
    constructor() {
        // Identifier so we can do e.g. movePlayheadTo("menu") 
        this.name = "New Frame";

        // Store all objects in frame. 
        this.wickObjects = [];

        this.tweens = [];

        // All path data of the frame (Stored as SVG)
        this.pathData = null;

        // Where this frame exists on the timeline
        this.playheadPosition = null;

        // Frame length for long frames
        this.length = 1;

        // Should the frame reset on being entered?
        this.alwaysSaveState = false;

        // Generate unique id
        this.uuid = random.uuid4();

        // The layer that this frame belongs to
        this.parentLayer = null;

        // Set script to default
        this.wickScript = "";

        this.audioAssetUUID = null;
    }

    tick() {
        const self = this;
        
        // Inactive -> Inactive
        // Do nothing, frame is still inactive
        if (!this._wasActiveLastTick && !this._active) {

        }
        // Inactive -> Active
        // Frame just became active! It's fresh!
        else if (!this._wasActiveLastTick && this._active) {
            if(this.hasScript()) {
                (wickPlayer || wickEditor).project.initScript(this);
                
                (wickPlayer || wickEditor).project.runScript(this, 'load');
                (wickPlayer || wickEditor).project.runScript(this, 'update');
            }

            if(this.hasSound()) {
                this._wantsToPlaySound = true;
            }
        }
        // Active -> Active
        // Frame is still active!
        else if (this._wasActiveLastTick && this._active) {
            if(this.hasScript()) {
                (wickPlayer || wickEditor).project.runScript(this, 'update');
            }
        }    
        // Active -> Inactive
        // Frame just stopped being active. Clean up!
        else if (this._wasActiveLastTick && !this._active) {
            if(this.hasSound()) {
                this._wantsToStopSound = true;
            }
        }

        if(this.hasScript()) {
            if(this._wasClicked) {
                (wickPlayer || wickEditor).project.runScript(this, 'mousePressed');
                this._wasClicked = false;
            }

            if(this._beingClicked) {
                (wickPlayer || wickEditor).project.runScript(this, 'mouseDown');
            }

            if(this._wasHoveredOver) {
                (wickPlayer || wickEditor).project.runScript(this, 'mouseHover');
                this._wasHoveredOver = false;
            }

            if(this._mouseJustLeft) {
                (wickPlayer || wickEditor).project.runScript(this, 'mouseLeave');
                this._mouseJustLeft = false;
            }

            if(this._wasClickedOff) {
                (wickPlayer || wickEditor).project.runScript(this, 'mouseReleased');
                this._wasClickedOff = false;
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
        }

        this.wickObjects.forEach(wickObject => {
            wickObject.tick();
        });
    }

    isActive() {
        const parent = this.parentLayer.parentWickObject;

        //if(parent.isRoot) console.log(parent.playheadPosition)

        /*console.log("---")
        console.log("ph "+(parent.playheadPosition))
        console.log("s  "+(this.playheadPosition))
        console.log("e  "+(this.playheadPosition+this.length))
        console.log("---")*/

        return parent.playheadPosition >= this.playheadPosition
            && parent.playheadPosition < this.playheadPosition+this.length
            && parent.isActive();
    }

    hasScript() {
        return this.wickScript !== "";
    }

    // Extend our frame to encompass more frames. 
    extend(length) {
        this.length += length; 
    }

    // Reduce the number of frames this WickFrame Occupies. 
    shrink(length) {
        // Never "shrink" by a negative amount. 
        if (length <= 0) {
            return;
        }

        originalLength = this.length; 
        this.length -= length; 

        // determine and return the actual change in frames. 
        if (this.length <= 0) {
            this.length = 1;
            return originalLength - 1;
        } else {
            return length; 
        }
    }

    copy() {

        const copiedFrame = new WickFrame();

        copiedFrame.name = this.name;
        copiedFrame.playheadPosition = this.playheadPosition;
        copiedFrame.length = this.length;
        copiedFrame.wickScript = this.wickScript;
        copiedFrame.uuid = random.uuid4();
        copiedFrame.sourceUUID = this.uuid;

        this.wickObjects.forEach(wickObject => {
            copiedFrame.wickObjects.push(wickObject.copy());
        })

        this.tweens.forEach(tween => {
            copiedFrame.tweens.push(tween.copy());
        })

        return copiedFrame;

    }

    remove() {
        this.parentLayer.removeFrame(this);
    }

    getFramesDistance(frame) {
        const A = this;
        const B = frame;

        if(A._beingMoved || B._beingMoved) return false;

        const AStart = A.playheadPosition;
        const AEnd = A.playheadPosition + A.length;

        const BStart = B.playheadPosition;
        const BEnd = B.playheadPosition + B.length;

        const distA = BStart-AEnd;
        const distB = BEnd-AStart;

        return {
            distA,
            distB
        };
    }

    touchesFrame(frame) {
        const framesDist = this.getFramesDistance(frame);
        return framesDist.distA < 0 && framesDist.distB > 0;
    }

    encodeStrings() {

        if(this.wickScripts) {
            for (const key in this.wickScripts) {
                this.wickScripts[key] = WickProject.Compressor.encodeString(this.wickScripts[key]);
            }
        }
        if(this.wickScript) {
            this.wickScript = WickProject.Compressor.encodeString(this.wickScript);
        }

        if(this.pathData) this.pathData = WickProject.Compressor.encodeString(this.pathData);

    }

    decodeStrings() {

        if(this.wickScripts) {
            for (const key in this.wickScripts) {
                this.wickScripts[key] = WickProject.Compressor.decodeString(this.wickScripts[key]);
            }
        }
        if(this.wickScript) {
            this.wickScript = WickProject.Compressor.decodeString(this.wickScript);
        }

        if(this.pathData) this.pathData = WickProject.Compressor.decodeString(this.pathData);

    }

    getFrameEnd() {
        return this.playheadPosition + this.length; 
    }

    getObjectByUUID() {

        let foundWickObject;

        this.wickObjects.forEach(wickObject => {
            if(wickObject.uuid === uuid) {
                foundWickObject = wickObject;
            }
        });

        return foundWickObject;

    }

    getAsJSON() {
        this.wickObjects.forEach(wickObject => {
            wickObject.encodeStrings();
        });

        const frameJSON = JSON.stringify(this, WickProject.Exporter.JSONReplacerObject);

        this.wickObjects.forEach(wickObject => {
            wickObject.decodeStrings();
        });

        return frameJSON;
    }

    getNextOpenPlayheadPosition() {
        return this.parentLayer.getNextOpenPlayheadPosition(this.playheadPosition);
    }

    addTween(newTween) {
        const self = this;

        let replacedTween = false;
        self.tweens.forEach(tween => {
            if (tween.playheadPosition === newTween.playheadPosition) {
                self.tweens[self.tweens.indexOf(tween)] = newTween;
                replacedTween = true;
            }
        });

        if(!replacedTween)
            self.tweens.push(newTween);
    }

    removeTween(tweenToDelete) {
        const self = this;

        let deleteTweenIndex = null;
        self.tweens.forEach(tween => {
            if(deleteTweenIndex) return;
            if (tweenToDelete === tween) {
                deleteTweenIndex = self.tweens.indexOf(tween);
            }
        });

        if(deleteTweenIndex !== null) {
            self.tweens.splice(deleteTweenIndex, 1);
        }
    }

    getCurrentTween() {
        return this.getTweenAtFrame(this.parentObject.playheadPosition-this.playheadPosition)
    }

    getTweenAtPlayheadPosition(playheadPosition) {
        let foundTween;
        this.tweens.forEach(tween => {
            if(foundTween) return;
            if(tween.playheadPosition === playheadPosition) foundTween = tween;
        })
        return foundTween;
    }

    hasTweenAtFrame() {
        const playheadPosition = this.parentObject.playheadPosition-this.playheadPosition;

        let foundTween = false;
        this.tweens.forEach(tween => {
            if(foundTween) return;
            if(tween.playheadPosition === playheadPosition) foundTween = true;
        })
        return foundTween;
    }

    getTweenAtFrame(playheadPosition) {
        var playheadPosition = this.parentObject.playheadPosition-this.playheadPosition;
        
        let foundTween;
        this.tweens.forEach(tween => {
            if(foundTween) return;
            if(tween.playheadPosition === playheadPosition) foundTween = tween;
        })
        return foundTween;
    }

    getFromTween() {
        let foundTween = null;

        const relativePlayheadPosition = this.parentObject.playheadPosition-this.playheadPosition;

        let seekPlayheadPosition = relativePlayheadPosition;
        while (!foundTween && seekPlayheadPosition >= 0) {
            this.tweens.forEach(tween => {
                if(tween.playheadPosition === seekPlayheadPosition) {
                    foundTween = tween;
                }
            });
            seekPlayheadPosition--;
        }

        return foundTween;
    }

    getToTween() {
        let foundTween = null;

        const relativePlayheadPosition = this.parentObject.playheadPosition-this.playheadPosition;

        let seekPlayheadPosition = relativePlayheadPosition;
        const parentFrameLength = this.length;
        while (!foundTween && seekPlayheadPosition < parentFrameLength) {
            this.tweens.forEach(tween => {
                if(tween.playheadPosition === seekPlayheadPosition) {
                    foundTween = tween;
                }
            });
            seekPlayheadPosition++;
        }

        return foundTween;
    }

    applyTween() {

        const self = this;

        let tweenToApply;

        if(self.tweens.length === 1) {
            tweenToApply = self.tweens[0];
        } else if (self.tweens.length > 1) {
            const tweenFrom = self.getFromTween();
            const tweenTo = self.getToTween();

            if (tweenFrom && tweenTo) {
                const A = tweenFrom.playheadPosition;
                const B = tweenTo.playheadPosition;
                const L = B-A;
                const P = (this.parentObject.playheadPosition-this.playheadPosition)-A;
                let T = P/L;
                if(B-A === 0) T = 1;
                
                tweenToApply = WickTween.interpolateTweens(tweenFrom, tweenTo, T);
            }
            if (!tweenFrom && tweenTo) {
                tweenToApply = tweenTo;
            }
            if (!tweenTo && tweenFrom) {
                tweenToApply = tweenFrom;
            }
        }

        if(!tweenToApply) return;
        self.wickObjects.forEach(wickObject => {
            tweenToApply.applyTweenToWickObject(wickObject);
        });

    }

    hasSound() {
        return this.audioAssetUUID;
    }
}

WickFrame.fromJSON = frameJSON => {
    const frame = JSON.parse(frameJSON);
    frame.__proto__ = WickFrame.prototype;
    if(frame.tweens) {
        frame.tweens.forEach(tween => {
            tween.__proto__ = WickTween.prototype;
        });
    }
    frame.uuid = random.uuid4();
    frame.wickObjects.forEach(wickObject => {
        WickObject.addPrototypes(wickObject);
        wickObject.generateParentObjectReferences();
        wickObject.decodeStrings();
        wickObject.uuid = random.uuid4();
    })
    return frame;
}

WickFrame.fromJSONArray = ({wickObjectArray}) => {
    const frames = [];

    const framesJSONArray = wickObjectArray;
    framesJSONArray.forEach(frameJSON => {
        const newframe = WickFrame.fromJSON(frameJSON);
        frames.push(newframe)
    });

    return frames;
}
