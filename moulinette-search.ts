import { MoulinetteCreator } from "moulinette-entities";
import { MoulinetteFileUtils } from "moulinette-utils";
import { App, MarkdownView, Notice, SuggestModal } from "obsidian";

class AssetResult {
  name: string;
  pack: string;
  creator: string;
  thumb: string;
  url: string;
}

export class MoulinetteSearchModal extends SuggestModal<AssetResult> {

  static MAX_RESULTS = 20
  
  // https://upload.wikimedia.org/wikipedia/commons/4/48/Markdown-mark.svg
  // https://yoksel.github.io/url-encoder/
  static MARKDOWN_ICON = `data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="208" height="128" viewBox="0 0 208 128"><rect width="198" height="118" x="5" y="5" ry="10" stroke="%23FFF" stroke-width="10" fill="%23FFF"/><path d="M30 98V30h20l20 25 20-25h20v68H90V59L70 84 50 59v39zm125 0l-30-33h20V30h20v35h20z"/></svg>`

  creators: MoulinetteCreator[];

  constructor(app: App, creators: MoulinetteCreator[]) {
    super(app);
    this.app = app
    this.creators = creators
  }

  // Returns all available suggestions.
  getSuggestions(query: string): AssetResult[] {
    if(query.length == 0) return []
    const terms = query.split(" ")
    const results: AssetResult[] = []
    for(const c of this.creators) {
      for(const p of c.packs) {
        for(const a of p.assets) {
          let match = true
          for(const t of terms) {
            if(!a.path || a.path.toLocaleLowerCase().indexOf(t.toLocaleLowerCase()) < 0) {
              match = false
              break
            }
          }
          if(match) {
            const name = MoulinetteFileUtils.beautifyName(a.path.split("/").pop() || "")
            let url, thumb
            if(a.path.endsWith(".webp")) {
              url = `${p.path}/${a.path}?${p.sas ? p.sas : ""}`
              thumb = `${p.path}/${a.path.split('.').slice(0, -1).join('.')}_thumb.webp?${p.sas ? p.sas : ""}`
            } else if(a.path.endsWith(".md")) {
              url = `${MoulinetteFileUtils.MOULINETTE_BASEURL}/assets/download/YgDeJIhUG6Gjdxhz9Z3fkSeQpT/7057?file=${a.path}`
              thumb = "#MD"
            } else {
              continue
            }

            results.push({ name: name, thumb: thumb, pack: p.name, creator: c.name, url: url })
            if(results.length >= MoulinetteSearchModal.MAX_RESULTS) {
              return results
            }
          }
        }
      }
    }
    return results
  }

  // Renders each suggestion item.
  renderSuggestion(res: AssetResult, el: HTMLElement) {
    const asset = el.createEl("div", { cls: "asset" });
    const img = asset.createEl("img");
    img.setAttribute('src', res.thumb == "#MD" ? MoulinetteSearchModal.MARKDOWN_ICON : res.thumb);
    const info = asset.createEl("div", { cls: "info" });
    info.createEl("div", { text: res.name, cls: "title" })
    info.createEl("div", { text: res.pack, cls: "pack" })
    info.createEl("div", { text: res.creator, cls: "creator" })
    //el.createEl("small", { text: book.author });
  }

  // Perform action on the selected suggestion.
  onChooseSuggestion(res: AssetResult, evt: MouseEvent | KeyboardEvent) {
    new Notice(`Selected ${res.name}`);
    // Download & insert image
    if(res.url.startsWith(MoulinetteFileUtils.REMOTE_BASE)) {
      MoulinetteFileUtils.downloadFile(this.app.vault, res.url).then( (imgPath) => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        // Make sure the user is editing a Markdown file.
        if (imgPath && view) {
          view.editor.replaceSelection(`![[${imgPath}]]`)
        }
      })
    }
    // Download & insert markdown
    else if(res.url.startsWith(MoulinetteFileUtils.MOULINETTE_BASEURL)) {
      MoulinetteFileUtils.downloadMarkdown(this.app.vault, res.url).then( (mdText) => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        // Make sure the user is editing a Markdown file.
        if (mdText && view) {
          view.editor.replaceSelection(mdText)
        }
      })
    }
  }
}