import { App, Modal, setIcon } from "obsidian";

export class MoulinetteProgress extends Modal {

  constructor(app: App) {
    super(app);
  }

  onOpen() {
    let { contentEl } = this;
    contentEl.parentElement?.addClass("progress")
    contentEl.addClass("message")
    const icon = contentEl.createDiv("div")
    setIcon(icon, "hourglass")
    contentEl.createDiv({ text: "Downloading Moulinette's index... please wait!"})
  }
 
}