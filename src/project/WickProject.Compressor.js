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

WickProject.Compressor = (() => {

    const projectCompressor = { };

    const printFilesize = false;

    const compressionRoutines = {
        'LZSTRING-BASE64': {
            compress:LZString.compressToBase64, 
            decompress:LZString.decompressFromBase64
        },
        'LZSTRING-UTF16': {
            compress:LZString.compressToUTF16, 
            decompress:LZString.decompressFromUTF16
        }
    };

    projectCompressor.compressProject = (projectJSON, compressionRoutineName) => {
        if(printFilesize) console.log(`Compressing project of size ${projectJSON.length}`);

        const compressionRoutine = compressionRoutines[compressionRoutineName];
        const compressedProjectJSON = compressionRoutineName+compressionRoutine.compress(projectJSON);

        if(printFilesize) console.log(`Done! Result size ${compressedProjectJSON.length}`);
        return compressedProjectJSON;
    }

    projectCompressor.decompressProject = compressedProjectJSON => {
        if(printFilesize) console.log("Decompressing project...")

        let projectJSON = compressedProjectJSON;

        for (const compressionRoutineName in compressionRoutines) {
            if(compressedProjectJSON.startsWith(compressionRoutineName)) {
                console.log(`Project compressed with ${compressionRoutineName}`)
                const compressionRoutine = compressionRoutines[compressionRoutineName];
                const rawCompressedProjectJSON = compressedProjectJSON.substring(compressionRoutineName.length, compressedProjectJSON.length);
                projectJSON = compressionRoutine.decompress(rawCompressedProjectJSON);
            }
        }

        if(printFilesize) console.log("Done!");
        return projectJSON;
    }
    
    projectCompressor.encodeString = str => {
        let newStr = str;
        newStr = encodeURI(str);
        newStr = newStr.replace(/'/g, "%27");
        return newStr;
    }

    projectCompressor.decodeString = str => {
        let newStr = str;
        newStr = newStr.replace(/%27/g, "'");
        newStr = decodeURI(str);
        return newStr;
    }

    return projectCompressor;

})();