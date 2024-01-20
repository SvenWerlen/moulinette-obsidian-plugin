import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { MoulinetteSearchModal } from 'moulinette-search';
import { MoulinetteAsset, MoulinetteCreator, MoulinettePack } from 'moulinette-entities';
import { MoulinetteFileUtils } from 'moulinette-utils';
import { MoulinetteSettingTab } from 'moulinette-settings';

// Remember to rename these classes and interfaces!

interface MoulinetteSettings {
	sessionID: string;
}

const DEFAULT_SETTINGS: MoulinetteSettings = {
	sessionID: ''
}

export default class MoulinettePlugin extends Plugin {
	settings: MoulinetteSettings;
	cache: {}

	async onload() {
		await this.loadSettings();

		//const data = await fetch("http://127.0.0.1:5000/static/test/dummy.json")
		//const data = await fetch("http://127.0.0.1:5000/assets/8c9e0b6b50694fd5a23090a59b")
		const creators = [] //MoulinetteCreator.importCreators(await data.json()) 
		console.log("Loaded")

		this.registerEvent(this.app.vault.on('create', (file) => {
			if(file.name.endsWith(".md")) {
				//this.app.vault.rename(file, file.path.substring(0, file.path.length - 3) + "OK.md")
				const packId = file.path.split("/")[0]
				// look for a matching pack
				for(const c of creators) {
					const pack = c.packs.find(p => p.packId == packId)
					if(pack) {
						console.log("Pack found : ", pack)
						const md = `${file.path}.md`
						const a = pack.assets.find((a) => a.path == file.path || a.path == md)
						if(a) {
							//const url = `${pack.path}/${a.path}?${pack.sas ? pack.sas : ""}`
							const url = `${MoulinetteFileUtils.MOULINETTE_BASEURL}/assets/download/8c9e0b6b50694fd5a23090a59b/${pack.id}?file=${a.path}`
							MoulinetteFileUtils.downloadMarkdown(this.app.vault, url).then( (mdText) => {
								const view = this.app.workspace.getActiveViewOfType(MarkdownView);
								// Make sure the user is editing a Markdown file.
								if (mdText && view) {
									view.editor.replaceSelection(mdText)
								}
							})

							break
						} else {
							console.log("Asset not found : ", md)
						}
					}
				}
			}      

			return false
    }));

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice from Moulinette!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app,).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		this.addCommand({
			id: 'search-on-moulinette',
			name: 'Search on Moulinette Cloud',
			callback: () => {
				new MoulinetteSearchModal(this.app, creators).open();
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new MoulinetteSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		/*
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});*/

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

