import { MoulinetteAsset, MoulinetteCreator, MoulinetteImage, MoulinettePack } from "moulinette-entities";
import { MoulinetteUtils } from "moulinette-utils";
import { App, MarkdownView, Modal, Notice } from "obsidian";

export class MoulinetteBrowser extends Modal {
  
  static MAX_ASSETS = 100

  creators: MoulinetteCreator[] // list of all creators
  selCreator: number            // selected creator (combo)
  selPack: number               // selected pack (combo)
  assetsEl: HTMLElement         // HTML div for rendering assets
  ignoreScroll: boolean         // flag to ignore scroll
  page: number                  // rendered page (pagination)
  
  constructor(app: App, creators: MoulinetteCreator[]) {
    super(app);
    this.creators = creators.sort((a,b) => a.name.toLocaleLowerCase().localeCompare(b.name.toLocaleLowerCase()))
  }

  onOpen() {
    let { contentEl } = this;
    contentEl.parentElement?.addClass("browser")
    
    //contentEl.createEl("h3", { text: "Moulinette Browser" });
    const headerEl = contentEl.createEl("div", { cls: "searchbar" });
    headerEl.createEl("input", { value: "", placeholder: "Search ..."})
    const creatorsEl = headerEl.createEl("select", { })
    creatorsEl.createEl("option", { value: '-1', text: `-- Creators --` })
    this.creators.forEach((c, idx) => {
      const count = c.packs.reduce((acc, objet) => acc + objet.assets.length, 0);
      creatorsEl.createEl("option", { value: '' + idx, text: `${c.name} (${count})` })
    })
    const packsEl = headerEl.createEl("select", { })
    packsEl.createEl("option", { value: '-1', text: `-- Pack --` })

    creatorsEl.addEventListener("change", (ev) => {
      const selectedValue = (ev.target as HTMLSelectElement).value;
      this.selCreator = Number(selectedValue)
      // update packs
      packsEl.innerHTML = ""
      this.selPack = -1
      packsEl.createEl("option", { value: '-1', text: `-- Packs --` })
      if(this.selCreator >= 0) {
        for(const p of this.creators[this.selCreator].packs) {
          packsEl.createEl("option", { value: '' + p.id, text: `${p.name} (${p.assets.length})` })
        }
      }
      this.assetsEl.innerHTML = ""
      this.page = 0
      this.updateData()
    });

    packsEl.addEventListener("change", (ev) => {
      const selectedValue = (ev.target as HTMLSelectElement).value;
      this.selPack = Number(selectedValue)
      this.assetsEl.innerHTML = ""
      this.page = 0
      this.updateData()
    });

    this.assetsEl = contentEl.createDiv("assets")

    this.assetsEl.addEventListener("scroll", (ev) => {
      if(this.ignoreScroll) return;
      const bottom = this.assetsEl.scrollHeight - this.assetsEl.scrollTop
      const height = this.assetsEl.clientHeight
      if(bottom - 20 < height) {
        this.ignoreScroll = true // avoid multiple events to occur while scrolling
        if(this.page >= 0) {
          this.page++
          this.updateData()
        }
        this.ignoreScroll = false
      }      
    });

  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }

  generateAssetHTML(pack: MoulinettePack, asset: MoulinetteAsset, assetId: Number) {
    if(asset instanceof MoulinetteImage) {
      const url = `${pack.path}/${asset.path}`.replace(".webp", "_thumb.webp") + (pack.sas ? "?" + pack.sas : "")
      const thumb = this.assetsEl.createEl("img")
      thumb.setAttribute("src", url)
      thumb.setAttribute("data-pid", '' + pack.id)
      thumb.setAttribute("data-aid", '' + assetId)
      thumb.setAttribute("title", asset.path)
      thumb.addEventListener("click", (ev) => {
        const targetElement = ev.target as HTMLElement;
        const packId = Number(targetElement.dataset.pid)
        const assetIdx = Number(targetElement.dataset.aid)
        let assetPack = null
        for(const c of this.creators) {
          for(const p of c.packs) {
            if(p.id == packId) {
              assetPack = p
            }
          }
        }
        if(assetPack && assetIdx >= 0 && assetIdx < assetPack.assets.length) {
          const assetURL = `${pack.path}/${asset.path}?` + (pack.sas ? pack.sas : "")
          MoulinetteUtils.downloadFile(this.app.vault, assetURL).then( (imgPath) => {
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            // Make sure the user is editing a Markdown file.
            if (imgPath && view) {
              view.editor.replaceSelection(`![[${imgPath}]]`)
            }
            else {
              navigator.clipboard.writeText(`![[${imgPath}]]`).then(() => {
                new Notice("No active view. Path copied into clipboard");
              })
              .catch(() => {
                new Notice("No active view AND cannot write into clipboard");
              });
            }
            this.close()
          })
        }
      })
    }
  }

  updateData() {
    let assetIdx = 0
    let noAddition = true
    if(this.selCreator >= 0) {
      for(const p of this.creators[this.selCreator].packs) {
        if(this.selPack >= 0 && p.id != this.selPack) continue
        p.assets.forEach((a, idx) => {
          if(assetIdx >= MoulinetteBrowser.MAX_ASSETS * this.page && assetIdx < (this.page+1) * MoulinetteBrowser.MAX_ASSETS) {
            this.generateAssetHTML(p, a, idx)
            noAddition = false
          }
          assetIdx++
        })
      }
    }
    if(noAddition) {
      this.page = -1
    }
  }
}