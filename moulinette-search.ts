import MoulinettePlugin from "main";
import { MoulinetteClient } from "moulinette-client";
import { MoulinetteAsset, MoulinetteCreator, MoulinetteImage, MoulinetteSound, MoulinetteText } from "moulinette-entities";
import { MoulinetteAssetResult } from "moulinette-results";
import { MoulinetteUtils } from "moulinette-utils";
import { App, MarkdownView, Notice, SuggestModal } from "obsidian";

interface FilterTag {
  id: string
  value: string
}

class MoulinetteFilters {
  static ASSET_TYPE_ANY    = 0
  static ASSET_TYPE_IMAGES = 1 // "!i"
  static ASSET_TYPE_SOUNDS = 2 // "!s"
  static ASSET_TYPE_TEXT   = 3 // "!t"
  
  assetType: number
  tags: FilterTag[]
  terms: string[]

  constructor(query: string) {
    this.assetType = MoulinetteFilters.ASSET_TYPE_ANY
    this.tags = []
    this.terms = []
    
    const terms = query.split(" ")
    for(const t of terms) {
      // ignore extra spaces
      if(t.length == 0) continue
      // ignore empty type
      else if(t == "!") continue
      // filter by type
      else if(t == "!i" || t == "i!") this.assetType = MoulinetteFilters.ASSET_TYPE_IMAGES
      else if(t == "!s" || t == "s!") this.assetType = MoulinetteFilters.ASSET_TYPE_SOUNDS
      else if(t == "!t" || t == "t!") this.assetType = MoulinetteFilters.ASSET_TYPE_TEXT
      // filter by tag
      else if(t.startsWith("#")) {
        const tag = t.substring(1).split(":")
        if(tag.length == 2) {
          this.tags.push({ id: tag[0], value: tag[1]})
        }
      }
      // filter by text
      else {
        this.terms.push(t)
      }
    }
  }

  matches(asset: MoulinetteAsset) {
    // check type
    if(this.assetType == MoulinetteFilters.ASSET_TYPE_IMAGES && !(asset instanceof MoulinetteImage)) return false
    if(this.assetType == MoulinetteFilters.ASSET_TYPE_SOUNDS && !(asset instanceof MoulinetteSound)) return false
    if(this.assetType == MoulinetteFilters.ASSET_TYPE_TEXT && !(asset instanceof MoulinetteText)) return false
    // check tags
    if(this.tags.length > 0) {
      if(!(asset instanceof MoulinetteText)) return false
      for(const t of this.tags) {
        if(t.id == "type" && asset.type != t.value) return false
        if(t.id == "subtype" && asset.subtype != t.value) return false
      }
    }
    // check terms
    for(const t of this.terms) {
      // match in path
      if(asset.path && asset.path.toLocaleLowerCase().indexOf(t.toLocaleLowerCase()) >= 0) continue
      // match in descrition
      if(asset instanceof MoulinetteText && asset.description && asset.description.toLocaleLowerCase().indexOf(t.toLocaleLowerCase()) >= 0) continue
      // not match for that terme
      return false
    }
    return true
  }
}

export class MoulinetteSearchModal extends SuggestModal<MoulinetteAssetResult> {

  static MAX_RESULTS = 100
  
  plugin: MoulinettePlugin
  creators: MoulinetteCreator[];

  constructor(plugin: MoulinettePlugin, creators: MoulinetteCreator[]) {
    super(plugin.app);
    this.plugin = plugin
    this.creators = creators
  }

  // Returns all available suggestions.
  getSuggestions(query: string): MoulinetteAssetResult[] {
    const filters = new MoulinetteFilters(query)
    
    const results: MoulinetteAssetResult[] = []
    for(const c of this.creators) {
      for(const p of c.packs) {
        for(const a of p.assets) {
          if(filters.matches(a)) {
            const result = MoulinetteAssetResult.fromEntity(a, p, c)
            if(result) {
              results.push(result)
              if(results.length >= MoulinetteSearchModal.MAX_RESULTS) {
                return results
              }
            }
          }
        }
      }
    }
    return results
  }

  // Renders each suggestion item.
  renderSuggestion(res: MoulinetteAssetResult, el: HTMLElement) {
    res.renderHTML(this, el)
  }

  // Perform action on the selected suggestion.
  onChooseSuggestion(res: MoulinetteAssetResult, evt: MouseEvent | KeyboardEvent) {
    new Notice(`Selected ${res.name}`);
    // Download & insert image
    if(res.url.startsWith(MoulinetteClient.REMOTE_BASE)) {
      MoulinetteUtils.downloadFile(this.plugin.app.vault, res.url).then( (imgPath) => {
        const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
        // Make sure the user is editing a Markdown file.
        if (imgPath && view) {
          view.editor.replaceSelection(`![[${imgPath}]]`)
        }
      })
    }
    // Download & insert markdown
    else {
      MoulinetteUtils.downloadMarkdown(this.plugin, res.url).then( (mdText) => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        // Make sure the user is editing a Markdown file.
        if (mdText && view) {
          view.editor.replaceSelection(mdText)
        }
      })
    }
  }

  applyFilter(tagName: string, tagValue: string) {
    // if tag already exists (replace it!)
    const query = this.inputEl.value
    const idx = query.indexOf(`#${tagName}:`)
    if(idx >= 0) {
      let newQuery = query.substring(0, idx) + `#${tagName}:${tagValue}`
      const idE = query.indexOf(" ", idx+1)
      if(idE >= 0) {
        newQuery += query.substring(idE)
      }
    } else {
      this.inputEl.setRangeText(` #${tagName}:${tagValue}`)
    }
    // put input cursor at the end and trigger event
    this.inputEl.selectionStart = this.inputEl.selectionEnd = this.inputEl.value.length;
    this.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  }
}