// @ts-nocheck

/**
 * Moulinette asset
 */
export class MoulinetteAsset {
  path: string

  static fromDict(obj: object): MoulinetteAsset {
    const asset = new MoulinetteAsset()
    if(typeof obj === "string" || obj instanceof String) {
      asset.path = obj.toString()
      if(asset.path.endsWith(".webp") || asset.path.endsWith(".md")) {
      //if(asset.path.endsWith(".md")) {
        return asset
      }
    }
    return null
  }
}

export class MoulinettePack {
  id: Number
  name: string
  path: string
  sas: string
  packId: string
  assets: [MoulinetteAsset]

  static fromDict(obj: object): MoulinettePack {
    const pack = new MoulinettePack()
    if(obj.id) {
      pack.id = obj.id
    }
    if(obj.name) {
      pack.name = obj.name
    }
    if(obj.path) {
      pack.path = obj.path
      if(obj.path.endsWith(".git")) {
        pack.packId = obj.path.split('/').pop().slice(0, -4);
      }
    }
    if(obj.sas) {
      pack.sas = obj.sas
    }
    if(obj.assets) {
      pack.assets = []
      for(const a of obj.assets) {
        const asset = MoulinetteAsset.fromDict(a)
        if(asset) {
          pack.assets.push(asset)
        }
      }
    }
    return pack
  }
}

export class MoulinetteCreator {
  name: string
  packs: [MoulinettePack]

  static fromDict(obj: object): MoulinetteCreator {
    const creator = new MoulinetteCreator()
    if(obj.publisher) {
      creator.name = obj.publisher
    }
    if(obj.packs) {
      creator.packs = []
      for(const p of obj.packs) {
        creator.packs.push(MoulinettePack.fromDict(p))
      }
    }
    return creator
  }

  static importCreators(obj: object): MoulinetteCreator[] {
    if(!obj) return []
    const creators = []
    for(const c of obj) {
      creators.push(MoulinetteCreator.fromDict(c))
    }
    return creators
  }
}