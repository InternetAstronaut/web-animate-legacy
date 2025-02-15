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
    
WickProject.Exporter = (() => {

    const projectExporter = { };

    projectExporter.generatePlayer = () => {

        if(window.cachedPlayer) return window.cachedPlayer;
        
        let fileOut = "";

        // Add the player webpage (need to download the empty player)
        const emptyPlayerPath = "src/player/emptyplayer.htm";
        fileOut += `${FileDownloader.downloadFile(emptyPlayerPath)}\n`;

        // All libs needed by the player. 
        const requiredLibFiles = [
            "https://cdnjs.cloudflare.com/ajax/libs/pixi.js/4.5.6/pixi.min.js",
            "https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js",
            //"https://cdnjs.cloudflare.com/ajax/libs/stats.js/r16/Stats.min.js",
            "lib/lz-string.min.js",
            "lib/polyfills.js",
            "lib/keyCharToCode.js",
            "lib/fpscounter.js",
            "lib/base64-arraybuffer.js",
            "lib/canvasutils.js",
            "lib/random.js",
            "lib/SAT.js",
            "lib/jquery.min.js",
            "lib/Tween.js",
            "lib/lerp.js",
            "lib/bowser.js",
            "lib/howler.min.js",
            "lib/URLParameterUtils.js",
            "lib/stats.min.js",
            "lib/localstoragewrapper.js",
            "src/project/WickTween.js",
            "src/project/WickFrame.js",
            "src/project/WickLayer.js",
            "src/project/WickObject.js",
            "src/project/WickAsset.js",
            "src/project/WickProject.js",
            "src/project/WickCamera.js",
            "src/project/WickProject.AssetLibrary.js",
            "src/project/WickProject.Compressor.js",
            "src/player/WickPlayer.PixiRenderer.js",
            "src/player/WickPlayer.HowlerAudioPlayer.js",
            "src/player/WickPlayer.InputHandler.js",
            "src/player/WickPlayer.js",
        ];

        let totalSize = 0;
        requiredLibFiles.forEach(filename => {
            const script = FileDownloader.downloadFile(filename);
            //console.log(script.length + " used for " + filename);

            //var scriptCompressed = LZString.compressToBase64(script)
            //console.log(scriptCompressed.length + " compressed: " + filename);

            totalSize += script.length;
            fileOut += `<script>${script}</script>\n`;
        });
        //console.log(totalSize + " total");

        window.cachedPlayer = fileOut;
        return fileOut;

    }

    projectExporter.exportPlayer = () => {
        const emptyplayerString = projectExporter.generatePlayer();
        const blob = new Blob([emptyplayerString], {type: "text/plain;charset=utf-8"});
        saveAs(blob, "player.html")
    }

    projectExporter.bundleProjectToHTML = (wickProject, callback) => {

        let fileOut = projectExporter.generatePlayer();

        // Bundle the JSON project
        wickProject.getAsJSON(JSONProject => {

            wickProject.library.getAllAssets('script').forEach(asset => {
                fileOut += `<script>${asset.getData()}</script>`;
            });

            fileOut += `<script>var wickPlayer = new WickPlayer(); wickPlayer.runProject('${JSONProject}', document.getElementById('playerCanvasContainer'));</script>\n`;
            callback(fileOut);
        });

    }

    projectExporter.exportProject = (wickProject, args) => {

        if(args && args.wick) {
            wickProject.getAsJSON(JSONProject => {
                const byteArray = LZString.compressToUint8Array(JSONProject);
                
                const blob1 = new Blob([byteArray], {type: "application/octet-stream"});

                saveAs(blob1, `${wickProject.name}-${timeStamp()}.wick`);
            });
            return;
        }

        if(args && args.json) {
            wickProject.getAsJSON(JSONProject => {
                const blob = new Blob([JSONProject], {type: "text/plain;charset=utf-8"});
                saveAs(blob, `${wickProject.name}-${timeStamp()}.json`);
            }, '\t');
            return;
        }

        projectExporter.bundleProjectToHTML(wickProject, fileOut => {
            const filename = wickProject.name || "project";
            if(args && args.zipped) {
                const zip = new JSZip();
                zip.file("index.html", fileOut);
                zip.generateAsync({type:"blob"}).then(content => {
                    saveAs(content, `${filename}-${timeStamp()}.zip`);
                });
            } else {
                if(args && args.asNewWindow) {
                    const x=window.open('','',`width=${wickProject.width}, height=${wickProject.height}`);
                    x.document.open().write(fileOut);
                } else {
                    const blob = new Blob([fileOut], {type: "text/plain;charset=utf-8"});
                    saveAs(blob, `${filename}-${timeStamp()}.html`);
                }
            }
        });

    }

    projectExporter.autosaveProject = (wickProject, args) => {
        wickProject.getAsJSON(projectJSON => {
            console.log(`Project size: ${projectJSON.length}`)
            idbKeyval.set('AutosavedWickProject', projectJSON)
              .then(() => {
                wickEditor.alertbox.showProjectSavedMessage();
                wickProject.unsaved = false;
                wickEditor.syncInterfaces();
              })
              .catch(err => console.log('idbKeyval failed to save. ', err));
        });
    }

    projectExporter.getAutosavedProject = callback => {
        idbKeyval.get('AutosavedWickProject').then(val => {
            if(!val) {
                callback(new WickProject());
            } else {
                if(localStorage.alwaysLoadAutosavedProject === 'true' || window.confirm("There is an autosaved project. Would you like to recover it?")) {
                    const project = WickProject.fromJSON(val);
                    callback(project);
                    return;
                } else {
                    callback(new WickProject());
                    return;
                }
            }
        });
    }

    const dontJSONVars = [
        "thumbnail",
        "clones",
        "currentObject",
        "parentObject",
        "causedAnException",
        "parentFrame",
        "alphaMask",
        "cachedImageData",
        "parentWickObject",
        "parentLayer",
        "asset",
        "paper",
        "unsaved",
        "_renderDirty",
        "_selection",
        "smallFramesMode",
        "_soundDataForPreview",
        "_wasClicked",
        "_wasClickedOff",
        "_wasHoveredOver",
        "_beingClicked",
        "_pixiTextureCached",
        "_hitBox",
        "sourceUUID",
        "_renderAsBGObject",
        "howl",
        "tweenClipboardData",
    ];

    projectExporter.JSONReplacer = (key, value) => {
        if (dontJSONVars.includes(key)) {
            return undefined;
        } else {
            return value;
        }
    }

    projectExporter.JSONReplacerObject = (key, value) => {
        if (key === "uuid" || dontJSONVars.includes(key)) {
            return undefined;
        } else {
            return value;
        }
    }

    return projectExporter;

})();
