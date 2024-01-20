import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { MoulinetteSearchModal } from 'moulinette-search';
import { MoulinetteAsset, MoulinetteCreator, MoulinettePack } from 'moulinette-entities';
import { MoulinetteUtils } from 'moulinette-utils';
import { MoulinetteSettingTab } from 'moulinette-settings';
import { MoulinetteClient } from 'moulinette-client';


interface MoulinetteSettings {
	sessionID: string;
}

const DEFAULT_SETTINGS: MoulinetteSettings = {
	sessionID: ''
}

export default class MoulinettePlugin extends Plugin {
	
	static CACHE_TIMEOUT = 1000 * 60 * 60 * 23 		// cache must be refreshed before 24 hours

	settings: MoulinetteSettings;
	creators: MoulinetteCreator[];	// asset list (in cache)
	creatorsDate: number;           // date when assets have been downloaded

	async onload() {
		await this.loadSettings();
		await this.getCreators()

		this.registerEvent(this.app.vault.on('create', async (file) => {
			if(file.name.endsWith(".md")) {
				//this.app.vault.rename(file, file.path.substring(0, file.path.length - 3) + "OK.md")
				const packId = file.path.split("/")[0]
				// look for a matching pack
				const creators = await this.getCreators()
				for(const c of creators) {
					const pack = c.packs.find(p => p.packId == packId)
					if(pack) {
						console.log("Pack found : ", pack)
						const md = `${file.path}.md`
						const a = pack.assets.find((a) => a.path == file.path || a.path == md)
						if(a) {
							//const url = `${pack.path}/${a.path}?${pack.sas ? pack.sas : ""}`
							const url = `${MoulinetteUtils.MOULINETTE_BASEURL}/assets/download/8c9e0b6b50694fd5a23090a59b/${pack.id}?file=${a.path}`
							MoulinetteUtils.downloadMarkdown(this.app.vault, url).then( (mdText) => {
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


		// 
		this.addCommand({
			id: 'moulinette-clear-cache',
			name: 'Clear cache',
			callback: () => {
				this.clearCache()
			}
		});

		this.addCommand({
			id: 'moulinette-search',
			name: 'Search on Moulinette Cloud',
			hotkeys: [{ key: 'M', modifiers: ['Ctrl']}],
			callback: () => {
				this.getCreators().then((creators) => new MoulinetteSearchModal(this.app, creators).open())
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new MoulinetteSettingTab(this.app, this));
	}

	onunload() {
		this.clearCache()
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * @returns list of assets
	 */
	async getCreators() {
		const start = Date.now();
		if(this.creators && (start-this.creatorsDate < MoulinettePlugin.CACHE_TIMEOUT)) {
			return this.creators
		} else {
			this.creators = await MoulinetteClient.getUserAssets(this.settings.sessionID)
			this.creatorsDate = start
			console.log(`Moulinette | ${Object.keys(this.creators).length} creators loaded in ${(Date.now() - start)} ms!`)
			console.log(this.creators)
			return this.creators
		}
	}

	/**
	 * clear all caches
	 */
	clearCache() {
		this.creators = []
		this.creatorsDate = 0
		new Notice('Moulinette Cache cleared!');
	}
}
