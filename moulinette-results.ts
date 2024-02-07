import { MoulinetteAsset, MoulinetteCreator, MoulinetteImage, MoulinettePack, MoulinetteSound, MoulinetteText } from "moulinette-entities";
import { MoulinetteSearchModal } from "moulinette-search";
import { MoulinetteUtils } from "moulinette-utils";

export class MoulinetteAssetResult {

  name: string;         // asset's name
  pack: string;         // pack's name
  creator: string;      // creator's name
  type: string;         // type of asset
  thumbUrl: string;     // thumb URL
  url: string;          // asset URL
  ref: MoulinetteAsset; // additional metadata

  /**
   * Generates a Result instance from a given entity
   */
  static fromEntity(a : MoulinetteAsset, p : MoulinettePack, c : MoulinetteCreator) {
    const res = new MoulinetteAssetResult()
    
    res.name = MoulinetteUtils.beautifyName(a.path.split("/").pop() || "")
    res.pack = p.name
    res.creator = c.name
    res.ref = a

    if(a instanceof MoulinetteImage) {
      res.url = a.getUrl(p)
      res.thumbUrl = `${p.path}/${a.path.split('.').slice(0, -1).join('.')}_thumb.webp?${p.sas ? p.sas : ""}`
    }
    else if(a instanceof MoulinetteSound) {
      res.url = a.getUrl(p)
    }
    else if(a instanceof MoulinetteText) {
      res.url = a.getUrl(p)
    } else {
      return null
    }
    return res
  }

  /**
   * Generates a View for this result
   */
  renderHTML(modal : MoulinetteSearchModal, containerEl : Element) {
    const asset = containerEl.createEl("div", { cls: "asset" });
    const img = asset.createEl("img");
    
    switch(this.ref.constructor.name) {
      case "MoulinetteImage": img.setAttribute('src', this.thumbUrl); break;
      case "MoulinetteSound": img.setAttribute('src', MoulinetteUtils.AUDIO_ICON); break;
      case "MoulinetteText": img.setAttribute('src', MoulinetteUtils.TEXT_ICON); break;
    }
    
    const info = asset.createEl("div", { cls: "info" });
    info.createEl("div", { text: this.name, cls: "title" })
    info.createEl("div", { text: `${this.pack} (${this.creator})`, cls: "pack" })

    if(this.ref instanceof MoulinetteText) {
      if(this.ref.description) {
        info.createEl("div", { text: this.ref.description, cls: "desc" })  
      }
      if(this.ref.type) {
        const tags = info.createDiv("meta")
        const typeVal = this.ref.type
        tags.createEl("div", { text: typeVal, cls: "tag", title: "Type" }).addEventListener("click", (ev) => { 
          ev.stopPropagation();
          modal.applyFilter("type", typeVal)
        })
        if(this.ref.subtype) {
          const subtypeVal = this.ref.subtype
          tags.createEl("div", { text: subtypeVal, cls: "tag", title: "Subtype" }).addEventListener("click", (ev) => { 
            ev.stopPropagation();
            modal.applyFilter("subtype", subtypeVal)
          })

        }
      }
    }
    //info.createEl("div", { text: MoulinetteUtils.formatDuration(Number(this.meta.duration)), cls: "duration" })
  }
}