// @ts-nocheck

/**
 * Moulinette asset
 */
export abstract class MoulinetteAsset {
  path: string

  constructor(path) {
    this.path = path
  }

  static fromDict(obj: object): MoulinetteAsset {
    const asset = new MoulinetteAsset()
    if(typeof obj === "string" || obj instanceof String) {
      asset.path = obj.toString()
      const ext = asset.path.split(".").pop()
      if(["webp"].includes(ext)) {
        return new MoulinetteImage(asset.path)
      }
      else if(["ogg", "mp3"].includes(ext)) {
        return new MoulinetteSound(asset.path)
      }
      else if(["md"].includes(ext)) {
        return new MoulinetteText(asset.path)
      }
    } 
    // complex type
    else if(["snd", "md"].includes(obj.type) && obj.path) {
      switch(obj.type) {
        case "snd":
          const sound = new MoulinetteSound(obj.path)
          sound.duration = obj.duration
          return sound
        case "md":
          const markdown = new MoulinetteText(obj.path)
          if(obj.meta && obj.meta.description) markdown.description = obj.meta.description
          if(obj.meta && obj.meta.type) markdown.type = obj.meta.type
          if(obj.meta && obj.meta.subtype) markdown.subtype = obj.meta.subtype
          return markdown
      }
    }
    return null
  }
}

export class MoulinetteImage extends MoulinetteAsset {
}

export class MoulinetteSound extends MoulinetteAsset {
  duration: number
}

export class MoulinetteText extends MoulinetteAsset {
  description: string
  type: string
  subtype: string
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
        const pack = MoulinettePack.fromDict(p)
        if(pack.assets.length > 0) {
          creator.packs.push(pack)
        }
      }
    }
    return creator
  }

  static importCreators(obj: object): MoulinetteCreator[] {
    if(!obj) return []
    const creators = []
    for(const c of obj) {
      const creator = MoulinetteCreator.fromDict(c)
      if(creator.packs.length > 0) {
        creators.push(creator)
      }
    }
    return creators
  }
}