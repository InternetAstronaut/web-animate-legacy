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

class WickLayer {
    constructor() {
        this.frames = [new WickFrame()];
        this.frames[0].playheadPosition = 0;

        this.identifier = "Layer 1"
        this.locked = false;
        this.hidden = false;

        this.parentWickObject = null; // The WickObject that this layer belongs to
    }

    getTotalLength() {
        let length = 0;

        this.frames.forEach(frame => {
            const frameEnd = frame.playheadPosition + frame.length;
            if(frameEnd > length) length = frameEnd;
        });

        return length;
    }

    getFrameAtPlayheadPosition(playheadPosition) {
        let foundFrame = null;

        this.frames.forEach(frame => {
            if(foundFrame) return;
            if(playheadPosition >= frame.playheadPosition && playheadPosition < frame.playheadPosition+frame.length) {
                foundFrame = frame;
            }
        });

        return foundFrame;
    }

    getCurrentFrame() {
        return this.getFrameAtPlayheadPosition(this.parentWickObject.playheadPosition);
    }

    addFrame(newFrame) {
        this.frames.push(newFrame);
    }

    removeFrame(frame) {
        const i = this.frames.indexOf(frame);
        this.frames.splice(i, 1);
    }

    copy() {

        const copiedLayer = new WickLayer();
        copiedLayer.frames = [];

        this.frames.forEach(frame => {
            copiedLayer.frames.push(frame.copy());
        })

        return copiedLayer;

    }

    getFrameByIdentifier(id) {

        let foundFrame = null;

        this.frames.forEach(frame => {
            if(frame.identifier === id) {
                foundFrame = frame;
            }
        });

        return foundFrame;

    }

    getRelativePlayheadPosition({parentFrame}, args) {

        let playheadRelativePosition = this.playheadPosition - parentFrame.playheadPosition;

        if(args && args.normalized) playheadRelativePosition /= parentFrame.length-1;

        return playheadRelativePosition;

    }

    getFramesAtPlayheadPosition(pos, args) {
        const frames = [];

        let counter = 0;
        for(let f = 0; f < this.frames.length; f++) {
            const frame = this.frames[f];
            for(let i = 0; i < frame.length; i++) {
                if(counter == pos) {
                    frames.push(frame);
                }
                counter++;
            }
        }

        return frames;
    }

    getNextOpenPlayheadPosition(startPosition) {
        let targetPosition = startPosition;

        while(this.getFrameAtPlayheadPosition(targetPosition)) {
            targetPosition ++;
        }

        return targetPosition;
    }

    getLastFrame(playheadPosition) {
        let lastFrame = null;

        if(!playheadPosition) playheadPosition = 0;

        // Look backwards
        this.frames.forEach(frame => {
            if(!lastFrame) lastFrame = frame;
            if(frame.playheadPosition > lastFrame.playheadPosition && frame.playheadPosition < playheadPosition) {
                lastFrame = frame;
            }
        });

        if(lastFrame.playheadPosition > playheadPosition) return null;

        return lastFrame;
    }

    containsWickObject(o) {
        
    }
}
