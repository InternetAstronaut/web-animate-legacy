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

class AssetLibrary {
    constructor() {

        this.assets = {};

    }

    addAsset(asset) {

        if(asset.uuid) {
            this.assets[asset.uuid] = asset;
        } else {
            const uuid = random.uuid4();
            this.assets[uuid] = asset;
            asset.uuid = uuid;

            return uuid;
        }

        wickEditor.library.dirty = true;

    }

    deleteAsset(uuid) {

        this.assets[uuid] = null;
        delete this.assets[uuid];
        
        wickEditor.library.dirty = true;

    }

    getAsset(uuid) {

        return this.assets[uuid];

    }

    getAllAssets(type) {

        const allAssets = [];

        for (assetUUID in this.assets) {
            const asset = this.assets[assetUUID];
            if(!type || asset.type === type) {
                allAssets.push(asset);
            }
        }

        return allAssets;

    }

    getAssetByName(filename) {

        let foundAsset = null;
        this.getAllAssets().forEach(asset => {
            if (asset.filename === filename)
                foundAsset = asset;
        });
        return foundAsset

    }

    /* For backwards compatibility... */
    regenAssetUUIDs() {

        for (assetUUID in this.assets) {
            const asset = this.assets[assetUUID];
            asset.uuid = assetUUID;
        }

    }

    printInfo() {

        let totalSize = 0;
        for (assetUUID in this.assets) {
            const asset = this.assets[assetUUID];
            totalSize += asset.data.length;

            console.log(`Filename: ${asset.filename}`);
            console.log(`Type: ${asset.type}`);
            console.log(`Size: ${asset.data.length}`);
            console.log("---")
        }
        console.log(`Total library size: ${totalSize}`)

    }

    encodeStrings() {
        this.getAllAssets().forEach(asset => {
            asset.filename = WickProject.Compressor.encodeString(asset.filename);
        });
    }

    decodeStrings() {
        this.getAllAssets().forEach(asset => {
            asset.filename = WickProject.Compressor.decodeString(asset.filename);
        });
    }
}

AssetLibrary.addPrototypes = ({assets}) => {

    for (assetUUID in assets) {
        assets[assetUUID].__proto__ = WickAsset.prototype;
    }

}
