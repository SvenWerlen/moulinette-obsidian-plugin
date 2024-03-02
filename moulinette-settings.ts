import { App, ButtonComponent, ExtraButtonComponent, Setting } from 'obsidian';
import MoulinettePlugin from "main"
import { PluginSettingTab } from "obsidian";
import { randomUUID } from 'crypto';
import { MoulinetteClient } from 'moulinette-client';
import { MoulinetteUtils } from 'moulinette-utils';


export class MoulinetteSettingTab extends PluginSettingTab {
	
  plugin: MoulinettePlugin;
  timer: NodeJS.Timer;
  timerIter: number;

	constructor(app: App, plugin: MoulinettePlugin) {
		super(app, plugin);
		this.plugin = plugin;
    this.timerIter = 0;
	}

  /**
   * Extra cleanup : make sure no authentication in progress
   */
  hide() {
    if(this.timer) {
      clearInterval(this.timer);
    }
  }

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

    //containerEl.createEl("h2", { text: "Moulinette Settings"})

    new Setting(containerEl)
			.setName('Download folder')
			.setDesc('Name of the directory where the files will be downloaded.')
			.addText(text => text
				.setPlaceholder('moulinette')
				.setValue(this.plugin.settings.downloadFolder)
				.onChange(async (value) => {
					this.plugin.settings.downloadFolder = value && value.length > 0 ? value : "moulinette";
          MoulinetteUtils.PREFIX = this.plugin.settings.downloadFolder + "/"
					await this.plugin.saveSettings();
				}));

    containerEl.createEl("h2", { text: "Moulinette Cloud integration"})

    this.refreshCloudIntegration(containerEl.createDiv({cls: "setting-item"}))

    const refreshSetting = containerEl.createDiv({cls: "setting-item"})
    const authInfo = refreshSetting.createDiv({cls: "setting-item-info"})
    authInfo.createDiv({cls: "setting-item-name", text: `Refresh assets`})
    authInfo.createDiv({cls: "setting-item-description", text: "The list of assets you have access to is cached. Click the 'Refresh' button to force a data refresh without the need to restart Obsidian."})
    const actions = refreshSetting.createDiv({cls: "setting-item-control"}).createDiv("actions")
    const refreshButton = new ButtonComponent(actions)
      .setButtonText("Refresh")
      .onClick(async () => {
        refreshButton.setButtonText("✓ refreshed!")
        refreshButton.setDisabled(true)
        refreshButton.setClass("success")
        this.plugin.clearCache()
    })
	}


  /**
   * Updates the cloud integration settings section
   * 
   * @param settingDIV DIV element to update
   */
  async refreshCloudIntegration(settingDIV : Element, force=false) {
  
    settingDIV.innerHTML = ""
    const authInfo = settingDIV.createDiv({cls: "setting-item-info"})
    
    if(this.plugin.settings.sessionID && this.plugin.settings.sessionID.length == 26) {
      // get user info
      const user = await MoulinetteClient.getUser(this.plugin.settings.sessionID, force)
      if(user && user.status == 200) {
        // GUID has been updated (after 24 hours, for security reasons)
        if(user.data.guid) {
          this.plugin.settings.sessionID = user.data.guid
          await this.plugin.saveSettings();
          delete user.data.guid
        }

        if(user.data.patron) {
          authInfo.createDiv({cls: "setting-item-name", text: `Authenticated as '${user.data.fullName}' (#${user.data.id}) and supporting Moulinette ♥`})
          const descr = authInfo.createDiv({cls: "setting-item-description"})
          descr.createSpan({ text: "Tiers :"})
          const ul = descr.createEl("ul")
          for(const pledge of user.data.pledges) {
            const li = ul.createEl("li")
            li.createDiv({ text : `${pledge.vanity}: ${pledge.pledge}` })
          }
          const authCtrl = settingDIV.createDiv({cls: "setting-item-control"})
          const actions = authCtrl.createDiv("actions")
          new ButtonComponent(actions)
            .setButtonText("Refresh tiers")
            .onClick(async () => {
              this.plugin.clearCache()
              this.refreshCloudIntegration(settingDIV, true)
            })
          new ButtonComponent(actions)
            .setButtonText("Logout")
            .onClick(async () => {
              this.plugin.settings.sessionID = ''
              await this.plugin.saveSettings();
              this.plugin.clearCache()
              this.refreshCloudIntegration(settingDIV)
            })
        } else {
          authInfo.createDiv({cls: "setting-item-name", text: `Authenticated as '${user.data.fullName}' (#${user.data.id}), not a Moulinette member`})
          const descr = authInfo.createDiv({cls: "setting-item-description"})
          descr.createSpan({ text: "Moulinette support is required for accessing cloud features. Nevertheless, you can still utilize the module with the available demo data."})
          const actions = settingDIV.createDiv({cls: "setting-item-control"}).createDiv("actions")
          new ButtonComponent(actions)
            .setButtonText("Join Moulinette")
            .onClick(async () => {
              window.open("https://www.patreon.com/join/moulinette", "_blank")
            })
          new ButtonComponent(actions)
            .setButtonText("Refresh tiers")
            .onClick(async () => {
              this.plugin.clearCache()
              this.refreshCloudIntegration(settingDIV, true)
            })
          new ButtonComponent(actions)
            .setButtonText("Logout")
            .onClick(async () => {
              this.plugin.settings.sessionID = ''
              this.plugin.clearCache()
              await this.plugin.saveSettings();
              this.refreshCloudIntegration(settingDIV)
            })
        }
      }
      
      //descr.createEl("span", { text: "By linking your Vault to Moulinette, you will be able to easily search and download content from creators and communities."} )
      //descr.createEl("a", { href: "https://www.moulinette.cloud/", text: "Learn more about Moulinette"} )
      //const warn = descr.createDiv({ cls: "setting-warning", text: "Authentication in progress in your web browser. You have 2 minutes to complete the process!"} )
    }
    else {
      const newGUID = randomUUID().replace(/-/g, '').substring(0, 26)
      const callback = `${MoulinetteClient.SERVER_URL}/patreon/callback`
      const patreonURL = `https://www.patreon.com/oauth2/authorize?response_type=code&client_id=${MoulinetteClient.CLIENT_ID}&redirect_uri=${callback}&scope=identity identity.memberships&state=${newGUID}`
      
      authInfo.createDiv({cls: "setting-item-name", text: "Your Vault is not linked to Moulinette yet"})
      const descr = authInfo.createDiv({cls: "setting-item-description"})
      descr.createEl("span", { text: "By linking your Vault to Moulinette, you will be able to easily search and download content from creators and communities. "} )
      descr.createEl("a", { href: "https://www.moulinette.cloud/", text: "Learn more about Moulinette"} )
      const warn = descr.createDiv({ cls: "setting-warning", text: "Authentication in progress in your web browser. You have 2 minutes to complete the process!"} )
      
      const authCtrl = settingDIV.createDiv({cls: "setting-item-control"})
      const button = new ButtonComponent(authCtrl.createDiv("actions"))
        .setButtonText("Authenticate")
        .onClick(async () => {
          window.open(patreonURL, "_blank")
          warn.style.display = "block" // show warning (process in progress)
          
          this.timerIter = 120
          this.timer = setInterval( async() => {
            // stop after 2 minutes maximum
            if(this.timerIter <= 0) {
              button.setButtonText(`Timed out!`)
              return clearInterval(this.timer);
            }
            this.timerIter--;
            button.setButtonText(`${this.timerIter} sec`)
            
            if(this.timerIter % 2) {
              const ready = await MoulinetteClient.get(`/user/${newGUID}/ready?patreon=1`)
              if(ready && ready.status == 200 && ready.data.status == "yes") {
                clearInterval(this.timer);
                // update settings
                this.plugin.settings.sessionID = newGUID
                await this.plugin.saveSettings();
                this.plugin.clearCache()
                this.refreshCloudIntegration(settingDIV)
              }
            }    
          }, 1000);
      });
    }
  }
}
