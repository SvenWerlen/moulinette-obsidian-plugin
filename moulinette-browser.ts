import Fuse from 'fuse.js'
import MoulinettePlugin from 'main';
import { MoulinetteAsset, MoulinetteCreator, MoulinetteImage, MoulinettePack, MoulinetteSound, MoulinetteText } from "moulinette-entities";
import { MoulinetteAssetResult } from 'moulinette-results';
import { MoulinetteUtils } from "moulinette-utils";
import { App, MarkdownView, Modal, Notice } from "obsidian";

export class MoulinetteBrowser extends Modal {
  
  static MAX_ASSETS = 100
  static SEARCH_DELAY = 600

  plugin: MoulinettePlugin
  creators: MoulinetteCreator[] // list of all creators
  selCreator: number            // selected creator (combo)
  selPack: number               // selected pack (combo)
  selType: number               // selected type
  searchEl: HTMLInputElement    // HTML div for search (input)
  assetsEl: HTMLElement         // HTML div for rendering assets
  ignoreScroll: boolean         // flag to ignore scroll
  page: number                  // rendered page (pagination)
  
  constructor(plugin: MoulinettePlugin, creators: MoulinetteCreator[]) {
    super(plugin.app);
    this.plugin = plugin
    this.creators = creators.sort((a,b) => a.name.toLocaleLowerCase().localeCompare(b.name.toLocaleLowerCase()))
  }

  onOpen() {
    let { contentEl } = this;
    contentEl.parentElement?.addClass("browser")
    
    //contentEl.createEl("h3", { text: "Moulinette Browser" });
    const headerEl = contentEl.createEl("div", { cls: "searchbar" });
    this.searchEl = headerEl.createEl("input", { value: "", placeholder: "Search ..."})
    this.searchEl.addEventListener("keyup", MoulinetteUtils.delay(() => { this.updateData(true)}, MoulinetteBrowser.SEARCH_DELAY))
    const creatorsEl = headerEl.createEl("select", { })
    creatorsEl.createEl("option", { value: '-1', text: `-- Creators --` })
    this.creators.forEach((c, idx) => {
      const count = c.packs.reduce((acc, objet) => acc + objet.assets.length, 0);
      creatorsEl.createEl("option", { value: '' + idx, text: `${c.name} (${count.toLocaleString()})` })
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
        const packs = this.creators[this.selCreator].packs.sort((a,b) => a.name.toLocaleLowerCase().localeCompare(b.name.toLocaleLowerCase()))
        for(const p of packs) {
          packsEl.createEl("option", { value: '' + p.id, text: `${p.name} (${p.assets.length.toLocaleString()})` })
        }
      }
      this.updateData(true)
    });

    packsEl.addEventListener("change", (ev) => {
      const selectedValue = (ev.target as HTMLSelectElement).value;
      this.selPack = Number(selectedValue)
      this.updateData(true)
    });

    const imageButton = headerEl.createEl("button", {})
    imageButton.createEl("img").setAttribute('src', MoulinetteUtils.IMAGE_ICON);
    const audioButton = headerEl.createEl("button", {})
    audioButton.createEl("img").setAttribute('src', MoulinetteUtils.AUDIO_ICON);
    const mdButton = headerEl.createEl("button", {})
    mdButton.createEl("img").setAttribute('src', MoulinetteUtils.TEXT_ICON);

    // filter by asset type
    imageButton.addEventListener("click", (ev) => this.applyTypeFilter(MoulinetteAsset.TYPE_IMAGE, imageButton, audioButton, mdButton))
    audioButton.addEventListener("click", (ev) => this.applyTypeFilter(MoulinetteAsset.TYPE_AUDIO, imageButton, audioButton, mdButton))
    mdButton.addEventListener("click", (ev) => this.applyTypeFilter(MoulinetteAsset.TYPE_TEXT, imageButton, audioButton, mdButton))

    this.assetsEl = contentEl.createDiv("assets")

    this.assetsEl.addEventListener("scroll", (ev) => {
      if(this.ignoreScroll) return;
      const bottom = this.assetsEl.scrollHeight - this.assetsEl.scrollTop
      const height = this.assetsEl.clientHeight
      if(bottom - 20 < height) {
        this.ignoreScroll = true // avoid multiple events to occur while scrolling
        if(this.page >= 0) {
          this.page++
          this.updateData(false)
        }
        this.ignoreScroll = false
      }      
    });

  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }

  applyTypeFilter(type: number, imageButton: HTMLButtonElement, audioButton: HTMLButtonElement, mdButton: HTMLButtonElement) {
    this.selType = this.selType == type ? 0 : type
    if(this.selType == MoulinetteAsset.TYPE_IMAGE) {
      imageButton.addClass("highlight")
    } else {
      imageButton.removeClass("highlight")
    }
    if(this.selType == MoulinetteAsset.TYPE_AUDIO) {
      audioButton.addClass("highlight")
    } else {
      audioButton.removeClass("highlight")
    }
    if(this.selType == MoulinetteAsset.TYPE_TEXT) {
      mdButton.addClass("highlight")
    } else {
      mdButton.removeClass("highlight")
    }
    this.updateData(true) 
  }

  generateAssetHTML(pack: MoulinettePack, asset: MoulinetteAsset, assetId: Number) {
    
    if(asset instanceof MoulinetteImage) {
      const url = `${pack.path}/${asset.path}`.replace(".webp", "_thumb.webp") + (pack.sas ? "?" + pack.sas : "")
      const thumb = this.assetsEl.createEl("img")
      thumb.setAttribute("src", url)
      thumb.setAttribute("title", asset.path)
      thumb.addEventListener("click", (ev) => {
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
      })
    }
    else if(asset instanceof MoulinetteSound) {
      const assetEl = this.assetsEl.createDiv({ cls: "snd" })
      const thumb = assetEl.createEl("img")
      thumb.setAttribute("src", MoulinetteUtils.AUDIO_ICON)
      thumb.setAttribute("title", asset.path)
      const filename = asset.path.split("/").pop()?.split(".")[0]
      assetEl.createEl("div", { cls: "dur", text: MoulinetteUtils.formatDuration(asset.duration) })
      assetEl.createEl("div", { text: filename })
      assetEl.addEventListener("click", (ev) => {
        const assetURL = asset.getUrl(pack)
        MoulinetteUtils.downloadFile(this.app.vault, assetURL).then( (sndPath) => {
          const view = this.app.workspace.getActiveViewOfType(MarkdownView);
          // Make sure the user is editing a Markdown file.
          if (sndPath && view) {
            view.editor.replaceSelection(`![[${sndPath}]]`)
          }
          else {
            navigator.clipboard.writeText(`![[${sndPath}]]`).then(() => {
              new Notice("No active view. Path copied into clipboard");
            })
            .catch(() => {
              new Notice("No active view AND cannot write into clipboard");
            });
          }
          this.close()
        })
      })
    }
    else if(asset instanceof MoulinetteText) {
      const assetEl = this.assetsEl.createDiv({ cls: "md" })
      const thumb = assetEl.createEl("img")
      thumb.setAttribute("src", MoulinetteUtils.TEXT_ICON)
      thumb.setAttribute("title", asset.path)
      const filename = asset.path.split("/").pop()
      assetEl.createEl("div", { text: filename?.endsWith(".md") ? filename.slice(0, -3) : filename })
      assetEl.addEventListener("click", (ev) => {
        const assetURL = asset.getUrl(pack)
        MoulinetteUtils.downloadMarkdown(this.plugin, assetURL).then( (mdText) => {
          const view = this.app.workspace.getActiveViewOfType(MarkdownView);
          // Make sure the user is editing a Markdown file.
          if (mdText && view) {
            view.editor.replaceSelection(mdText)
          }
          else {
            navigator.clipboard.writeText(mdText).then(() => {
              new Notice("No active view. Path copied into clipboard");
            })
            .catch(() => {
              new Notice("No active view AND cannot write into clipboard");
            });
          }
          this.close()
        })
      })
    }

  }

  updateData(clear: boolean) {
    if(clear) {
      this.assetsEl.innerHTML = ""
      this.page = 0
    }

    let assetIdx = 0
    let noAddition = true
    const terms = this.searchEl.value.length > 0 ? this.searchEl.value.toLocaleLowerCase().split(' ') : null
    
    const creators = this.selCreator >= 0 ? [this.creators[this.selCreator]] : this.creators
    for(const c of creators) {
      for(const p of c.packs) {
        if(this.selPack >= 0 && p.id != this.selPack) continue
  
        const fuseOptions = {
          // isCaseSensitive: false,
          // includeScore: false,
          // shouldSort: true,
          // includeMatches: false,
          // findAllMatches: false,
          // minMatchCharLength: 1,
          // location: 0,
          // threshold: 0.6,
          // distance: 100,
          // useExtendedSearch: false,
          // ignoreLocation: false,
          // ignoreFieldNorm: false,
          // fieldNormWeight: 1,
          keys: [
            "path",
          ]
        };
        let assets = p.assets
        // filter by type
        if(this.selType) {
          assets = assets.filter((a) => this.selType == a.getType() )
        }
        if(terms) {
          // TOO SLOW!!
          //const fuse = new Fuse(p.assets, fuseOptions);
          //const assets = fuse.search(this.searchEl.value)
          assets = assets.filter((a) => terms.filter((t) => a.path.toLocaleLowerCase().indexOf(t) >= 0).length == terms.length)
          assets.forEach((a, idx) => {
            if(assetIdx >= MoulinetteBrowser.MAX_ASSETS * this.page && assetIdx < (this.page+1) * MoulinetteBrowser.MAX_ASSETS) {
              this.generateAssetHTML(p, a, idx)
              noAddition = false
            }
            assetIdx++
          })
        }
        else {
          assets.forEach((a, idx) => {
            if(assetIdx >= MoulinetteBrowser.MAX_ASSETS * this.page && assetIdx < (this.page+1) * MoulinetteBrowser.MAX_ASSETS) {
              this.generateAssetHTML(p, a, idx)
              noAddition = false
            }
            assetIdx++
          })
        }
      }
    }
    if(noAddition) {
      this.page = -1
    }

    // no result
    if(assetIdx == 0) {
      this.assetsEl.createDiv({ text: "No results round" })
    }
  }
}