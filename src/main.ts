import { MarkdownView, Notice, Platform, Plugin, TAbstractFile } from 'obsidian';
import { MoulinetteSearchModal } from 'moulinette-search';
import { MoulinetteCreator } from 'moulinette-entities';
import { MoulinetteUtils } from 'moulinette-utils';
import { MoulinetteSettingTab } from 'moulinette-settings';
import { MoulinetteClient } from 'moulinette-client';
import { MoulinetteBrowser, MoulinetteBrowserFilters } from 'moulinette-browser';
import { MoulinetteProgress } from 'moulinette-progress';


interface MoulinetteSettings {
	sessionID: string;
	downloadFolder: string;
}

const DEFAULT_SETTINGS: MoulinetteSettings = {
	sessionID: '',
	downloadFolder: 'moulinette'
}

export default class MoulinettePlugin extends Plugin {

	static CACHE_TIMEOUT = 1000 * 60 * 60 * 23 		// cache must be refreshed before 24 hours

	settings: MoulinetteSettings;
	creators: MoulinetteCreator[];	        // asset list (in cache)
	creatorsDate: number;                   // date when assets have been downloaded
	lastFilters: MoulinetteBrowserFilters;  // last-used filters

	async onload() {
		await this.loadSettings();
		this.lastFilters = new MoulinetteBrowserFilters()

		this.registerEvent(this.app.vault.on('create', async (file) => {
			this.downloadPage(file)
		}));

		MoulinetteUtils.PREFIX = this.settings.downloadFolder + "/"

		// This creates an icon in the left ribbon.
		this.addRibbonIcon('hammer', 'Moulinette Browser', (evt: MouseEvent) => {
			this.getCreators().then((creators) => new MoulinetteBrowser(this, creators, this.lastFilters).open())
		});

		this.addCommand({
			id: 'browser',
			name: 'Open Moulinette Browser',
			//hotkeys: [{ key: 'M', modifiers: ['Ctrl', 'Shift'] }],
			callback: () => {
				this.getCreators().then((creators) => new MoulinetteBrowser(this, creators, this.lastFilters).open())
			}
		});

		this.addCommand({
			id: 'clear-cache',
			name: 'Clear cache',
			callback: () => {
				this.clearCache()
			}
		});

		this.addCommand({
			id: 'reload-page',
			name: 'Re-download page',
			callback: () => {
				const curView = this.app.workspace.getActiveViewOfType(MarkdownView)
				if (curView && curView.file) {
					const lastline = curView.editor.lastLine();
					const lastCh = curView.editor.getLine(lastline).length;
					curView.editor.setSelection({ line: 0, ch: 0 }, { line: lastline, ch: lastCh });
					this.downloadPage(curView.file)
				}
			}
		});

		this.addCommand({
			id: 'search',
			name: 'Open Quick Search',
			//hotkeys: [{ key: 'M', modifiers: ['Ctrl'] }],
			callback: () => {
				this.getCreators().then((creators) => new MoulinetteSearchModal(this, creators).open())
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new MoulinetteSettingTab(this.app, this));

		// Support local paths in <img>
		// Inspired by : https://github.com/talengu/obsidian-local-img-plugin/blob/master/main.ts
		this.registerMarkdownPostProcessor((element, ctx) => {
			const targetLinks = Array.from(element.getElementsByTagName("img"))
			for (const link of targetLinks) {
				let clean_link = link.src.replace('app://obsidian.md/', '').replace('capacitor://localhost/', '')
				let full_link = this.app.vault.adapter.getResourcePath(clean_link)
				link.src = full_link
			}
		});
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
		if (this.creators && (start - this.creatorsDate < MoulinettePlugin.CACHE_TIMEOUT)) {
			return this.creators
		} else {
			const progress = new MoulinetteProgress(this.app)
			progress.open()
			this.creators = await MoulinetteClient.getUserAssets(this.settings.sessionID)
			progress.close()
			this.creatorsDate = start
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

	/**
	 * download file from server (if exists)
	 */
	async downloadPage(file: TAbstractFile) {
		if (file.name.endsWith(".md") && file.path.startsWith(MoulinetteUtils.PREFIX)) {
			const packId = file.path.split("/")[1]
			// look for a matching pack
			const creators = await this.getCreators()
			for (const c of creators) {
				const pack = c.packs.find(p => p.packId == packId)
				const filepath = file.path.replace(MoulinetteUtils.PREFIX, "")
				if (pack) {
					const a = pack.assets.find((a) => a.path == filepath)
					if (a) {
						const sessionId = this.settings.sessionID ? this.settings.sessionID : "demo-user"
						const url = `/assets/download-asset/${sessionId}/${pack.id}?file=${a.path}&ms=${new Date().getTime()}`
						MoulinetteUtils.downloadMarkdown(this, url).then((mdText) => {
							const view = this.app.workspace.getActiveViewOfType(MarkdownView);
							// Make sure the user is editing a Markdown file.
							if (mdText && view) {
								view.editor.replaceSelection(mdText)
							}
						})
						break
					} else {
						new Notice(`No Moulinette match found for ${file.name}!`);
					}
				}
			}
		}
	}

}
