import MoulinettePlugin from 'main';
import { MoulinetteAsset, MoulinetteCreator, MoulinetteImage, MoulinettePack, MoulinetteSound, MoulinetteText } from "moulinette-entities";
import { MoulinetteUtils } from "moulinette-utils";
import { App, MarkdownView, Modal, Notice, setIcon } from "obsidian";

export class MoulinetteBrowserFilters {
  creator: number = -1
  packs: number[] = []
  type: number = 0
  terms: string = ''
}

export class MoulinetteBrowser extends Modal {
  
  static MAX_ASSETS = 100
  static SEARCH_DELAY = 600

  plugin: MoulinettePlugin
  creators: MoulinetteCreator[]     // list of all creators
  filters: MoulinetteBrowserFilters 
  assetsEl: HTMLElement             // HTML div for rendering assets
  ignoreScroll: boolean             // flag to ignore scroll
  page: number                      // rendered page (pagination)
  keyUpTimerRef: number             // timer to delay keyup event
  
  constructor(plugin: MoulinettePlugin, creators: MoulinetteCreator[], filters: MoulinetteBrowserFilters) {
    super(plugin.app);
    this.plugin = plugin
    this.creators = creators.sort((a,b) => a.name.toLocaleLowerCase().localeCompare(b.name.toLocaleLowerCase()))
    this.filters = filters ? filters : new MoulinetteBrowserFilters()
    this.keyUpTimerRef = 0
  }

  onOpen() {
    let { contentEl } = this;
    contentEl.parentElement?.addClass("browser")
    
    //contentEl.createEl("h3", { text: "Moulinette Browser" });
    const headerEl = contentEl.createEl("div", { cls: "searchbar" });
    const searchEl = headerEl.createEl("input", { value: this.filters.terms, placeholder: "Search ..."})
    searchEl.addEventListener("keyup", () => { 
      if(this.keyUpTimerRef) window.clearTimeout(this.keyUpTimerRef)
      this.keyUpTimerRef = window.setTimeout( () => {
        this.filters.terms = searchEl.value;
        this.updateData(true)
      }, MoulinetteBrowser.SEARCH_DELAY)
    })
    searchEl.addEventListener("mousedown", (ev) => {
      if (ev.button === 2) {
        ev.preventDefault();
        searchEl.value = '';
        this.filters.terms = '';
        this.updateData(true);
      }
    });

    const creatorsEl = headerEl.createEl("select", { })
    creatorsEl.createEl("option", { value: '-1', text: `-- Creators --` })
    this.creators.forEach((c, idx) => {
      const count = c.packs.reduce((acc, objet) => acc + objet.assets.length, 0);
      const option = creatorsEl.createEl("option", { value: '' + idx, text: `${c.name} (${count.toLocaleString()})` })
      if(this.filters.creator == idx) {
        option.setAttribute('selected', 'selected')
      }
    })
    const packsEl = headerEl.createEl("select", { })
    packsEl.createEl("option", { value: '', text: `-- Pack --` })

    creatorsEl.addEventListener("change", (ev) => {
      this.filters.creator = Number((ev.target as HTMLSelectElement).value);
      this.filters.packs = []
      this.onSelectCreator(packsEl)
      this.updateData(true)
    });

    creatorsEl.addEventListener("mousedown", (ev) => {
      if (ev.button === 2) {
        ev.preventDefault();
        creatorsEl.value = '-1';
        this.filters.creator = -1;
        this.filters.packs = [];
        this.onSelectCreator(packsEl);
        this.updateData(true);
      }
    });

    packsEl.addEventListener("change", (ev) => {
      const selPacksValue = (ev.target as HTMLSelectElement).value;
      this.filters.packs = selPacksValue.length == 0 ? [] : selPacksValue.split(',').map(function(item) {
        return parseInt(item, 10);
      });
      this.updateData(true)
    });

    packsEl.addEventListener("mousedown", (ev) => {
      if (ev.button === 2) {
        ev.preventDefault();
        this.filters.packs = []
        this.onSelectCreator(packsEl)
        this.updateData(true);
      }
    });

    const imageButton = headerEl.createEl("button", { cls: this.filters.type == MoulinetteAsset.TYPE_IMAGE ? "highlight" : ""})
    setIcon(imageButton, "image")
    const audioButton = headerEl.createEl("button", { cls: this.filters.type == MoulinetteAsset.TYPE_AUDIO ? "highlight" : ""})
    setIcon(audioButton, "music")
    const mdButton = headerEl.createEl("button", { cls: this.filters.type == MoulinetteAsset.TYPE_TEXT ? "highlight" : ""})
    setIcon(mdButton, "file-text")
    
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

    // footer
    const footer = contentEl.createDiv({ cls: "footer"})
    const icon = footer.createDiv("div")
    setIcon(icon, "info")
    footer.createSpan({text: "Hold CTRL/Command key to download multiple assets."})

    // init filters
    this.onSelectCreator(packsEl)
    this.updateData(true)
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
    this.plugin.lastFilters = this.filters
    if(this.keyUpTimerRef) window.clearTimeout(this.keyUpTimerRef)
  }

  /**
   * Updates the packs list
   * @param packsEl HTML select list
   */
  onSelectCreator(packsEl: HTMLSelectElement) {
    // update packs
    packsEl.empty()
    packsEl.createEl("option", { value: '', text: `-- Packs --` })
    if(this.filters.creator >= 0) {
      const packs = MoulinetteUtils.combinePacks(this.creators[this.filters.creator].packs)
      const sortedNames = Object.keys(packs).sort((a,b) => a.toLocaleLowerCase().localeCompare(b.toLocaleLowerCase()))
      const selected = this.filters.packs.join()
      for(const sn of sortedNames) {
        const values = packs[sn].map((p) => p.id).join()
        const count = packs[sn].reduce((acc, cur) => acc + cur.assets.length, 0)
        const option = packsEl.createEl("option", { value: values, text: `${sn} (${count.toLocaleString()})` })
        if(selected == values) {
          option.setAttribute('selected', 'selected')
        }
      }
    }
  }

  applyTypeFilter(type: number, imageButton: HTMLButtonElement, audioButton: HTMLButtonElement, mdButton: HTMLButtonElement) {
    this.filters.type = this.filters.type == type ? 0 : type
    if(this.filters.type == MoulinetteAsset.TYPE_IMAGE) {
      imageButton.addClass("highlight")
    } else {
      imageButton.removeClass("highlight")
    }
    if(this.filters.type == MoulinetteAsset.TYPE_AUDIO) {
      audioButton.addClass("highlight")
    } else {
      audioButton.removeClass("highlight")
    }
    if(this.filters.type == MoulinetteAsset.TYPE_TEXT) {
      mdButton.addClass("highlight")
    } else {
      mdButton.removeClass("highlight")
    }
    this.updateData(true) 
  }

  generateAssetHTML(pack: MoulinettePack, asset: MoulinetteAsset, assetId: Number) {
    
    if(asset instanceof MoulinetteImage) {
      const url = `${pack.path}/${asset.path}`.split('.').slice(0, -1).join('.') + "_thumb.webp" + (pack.sas ? "?" + pack.sas : "")
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
          if(!ev.ctrlKey) {
            this.close()
          } else {
            new Notice(`Image ${imgPath?.split("/").pop()} downloaded`);
          }
        })
      })
    }
    else if(asset instanceof MoulinetteSound) {
      const assetEl = this.assetsEl.createDiv({ cls: "snd" })
      assetEl.setAttribute("title", asset.path)
      const thumb = assetEl.createDiv()
      setIcon(thumb, "music")
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
          if(!ev.ctrlKey) {
            this.close()
          } else {
            new Notice(`Sound ${sndPath?.split("/").pop()} downloaded`);
          }
        })
      })
    }
    else if(asset instanceof MoulinetteText) {
      const assetEl = this.assetsEl.createDiv({ cls: "md" })
      assetEl.setAttribute("title", asset.path)
      const thumb = assetEl.createDiv()
      setIcon(thumb, "file-text")
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
              new Notice("No active view. Text copied into clipboard");
            })
            .catch(() => {
              new Notice("No active view AND cannot write into clipboard");
            });
          }
          if(!ev.ctrlKey) {
            this.close()
          } else {
            new Notice(`Text ${asset.path} downloaded`);
          }
        })
      })
    }

  }

  updateData(clear: boolean) {
    if(clear) {
      this.assetsEl.empty()
      this.page = 0
    }

    let assetIdx = 0
    let noAddition = true
    const terms = this.filters.terms.length > 0 ? this.filters.terms.toLocaleLowerCase().split(' ') : null
    
    const creators = this.filters.creator >= 0 ? [this.creators[this.filters.creator]] : this.creators
    for(const c of creators) {
      for(const p of c.packs) {
        if(this.filters.packs.length > 0 && !this.filters.packs.includes(p.id)) continue
  
        let assets = p.assets
        // filter by type
        if(this.filters.type) {
          assets = assets.filter((a) => this.filters.type == a.getType() )
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