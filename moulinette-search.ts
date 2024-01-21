import MoulinettePlugin from "main";
import { MoulinetteClient } from "moulinette-client";
import { MoulinetteCreator, MoulinetteImage, MoulinetteSound, MoulinetteText } from "moulinette-entities";
import { MoulinetteAssetResult } from "moulinette-results";
import { MoulinetteUtils } from "moulinette-utils";
import { App, MarkdownView, Notice, SuggestModal } from "obsidian";


export class MoulinetteSearchModal extends SuggestModal<MoulinetteAssetResult> {

  static MAX_RESULTS = 100
  static ASSET_TYPE_ANY    = 0
  static ASSET_TYPE_IMAGES = 1 // "!i"
  static ASSET_TYPE_SOUNDS = 2 // "!s"
  static ASSET_TYPE_TEXT   = 3 // "!t"
  
  plugin: MoulinettePlugin
  creators: MoulinetteCreator[];

  constructor(plugin: MoulinettePlugin, creators: MoulinetteCreator[]) {
    super(plugin.app);
    this.plugin = plugin
    this.creators = creators
  }

  // Returns all available suggestions.
  getSuggestions(query: string): MoulinetteAssetResult[] {
    const instr = query.split(" ").filter((t) => t.startsWith("!"))
    const terms = query.split(" ").filter((t) => !t.startsWith("!"))
    
    let assetType = MoulinetteSearchModal.ASSET_TYPE_ANY
    if(instr.includes("!i")) assetType = MoulinetteSearchModal.ASSET_TYPE_IMAGES
    else if(instr.includes("!s")) assetType = MoulinetteSearchModal.ASSET_TYPE_SOUNDS
    else if(instr.includes("!t")) assetType = MoulinetteSearchModal.ASSET_TYPE_TEXT
    
    const results: MoulinetteAssetResult[] = []
    for(const c of this.creators) {
      for(const p of c.packs) {
        for(const a of p.assets) {
          // match type
          if(assetType == MoulinetteSearchModal.ASSET_TYPE_IMAGES && !(a instanceof MoulinetteImage)) continue
          if(assetType == MoulinetteSearchModal.ASSET_TYPE_SOUNDS && !(a instanceof MoulinetteSound)) continue
          if(assetType == MoulinetteSearchModal.ASSET_TYPE_TEXT && !(a instanceof MoulinetteText)) continue

          // match terms
          let match = true
          for(const t of terms) {
            if(!a.path || a.path.toLocaleLowerCase().indexOf(t.toLocaleLowerCase()) < 0) {
              match = false
              break
            }
          }
          if(match) {
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
    res.renderHTML(el)
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
}