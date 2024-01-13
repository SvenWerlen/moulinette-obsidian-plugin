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

export class ExampleModal extends SuggestModal<AssetResult> {

  static MAX_RESULTS = 20

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
            if(!a.path || a.path.indexOf(t) < 0) {
              match = false
              break
            }
          }
          if(match) {
            const name = MoulinetteFileUtils.beautifyName(a.path.split("/").pop() || "")
            const url = `${p.path}/${a.path}?${p.sas ? p.sas : ""}`
            const thumb = `${p.path}/${a.path.split('.').slice(0, -1).join('.')}_thumb.webp?${p.sas ? p.sas : ""}`
            results.push({ name: name, thumb: thumb, pack: p.name, creator: c.name, url: url })
            if(results.length >= ExampleModal.MAX_RESULTS) {
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
    img.setAttribute('src', res.thumb);
    img.setAttribute('alt', 'na');
    const info = asset.createEl("div", { cls: "info" });
    info.createEl("div", { text: res.name, cls: "title" })
    info.createEl("div", { text: res.pack, cls: "pack" })
    info.createEl("div", { text: res.creator, cls: "creator" })
    //el.createEl("small", { text: book.author });
  }

  // Perform action on the selected suggestion.
  onChooseSuggestion(res: AssetResult, evt: MouseEvent | KeyboardEvent) {
    new Notice(`Selected ${res.name}`);
    MoulinetteFileUtils.downloadFile(this.app.vault, res.url).then( (imgPath) => {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      // Make sure the user is editing a Markdown file.
      if (imgPath && view) {
        view.editor.replaceSelection(`![[${imgPath}]]`)
      }
    })
  }
}