import { MoulinetteAsset, MoulinetteCreator, MoulinetteImage, MoulinettePack, MoulinetteSound, MoulinetteText } from "moulinette-entities";
import { MoulinetteSearchModal } from "moulinette-search";
import { MoulinetteUtils } from "moulinette-utils";

export class MoulinetteAssetResult {

  // https://upload.wikimedia.org/wikipedia/commons/4/48/Markdown-mark.svg
  // https://yoksel.github.io/url-encoder/
  static TEXT_ICON = `data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="208" height="128" viewBox="0 0 208 128"><rect width="198" height="118" x="5" y="5" ry="10" stroke="%23FFF" stroke-width="10" fill="%23FFF"/><path d="M30 98V30h20l20 25 20-25h20v68H90V59L70 84 50 59v39zm125 0l-30-33h20V30h20v35h20z"/></svg>`
  static AUDIO_ICON = `data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 75 75"><path d="M39.389,13.769 L22.235,28.606 L6,28.606 L6,47.699 L21.989,47.699 L39.389,62.75 L39.389,13.769z" style="stroke:%23FFF;stroke-width:5;stroke-linejoin:round;fill:%23FFF;"/><path d="M48,27.6a19.5,19.5 0 0 1 0,21.4M55.1,20.5a30,30 0 0 1 0,35.6M61.6,14a38.8,38.8 0 0 1 0,48.6" style="fill:none;stroke:%23FFF;stroke-width:5;stroke-linecap:round"/></svg>`

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
      res.url = `${p.path}/${a.path}?${p.sas ? p.sas : ""}`
      res.thumbUrl = `${p.path}/${a.path.split('.').slice(0, -1).join('.')}_thumb.webp?${p.sas ? p.sas : ""}`
    }
    else if(a instanceof MoulinetteSound) {
      res.url = `${p.path}/${a.path}?${p.sas ? p.sas : ""}`
    }
    else if(a instanceof MoulinetteText) {
      res.url = `/assets/download-asset/SESSIONID/${p.id}?file=${a.path}&ms=${new Date().getTime()}`
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
      case "MoulinetteSound": img.setAttribute('src', MoulinetteAssetResult.AUDIO_ICON); break;
      case "MoulinetteText": img.setAttribute('src', MoulinetteAssetResult.TEXT_ICON); break;
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