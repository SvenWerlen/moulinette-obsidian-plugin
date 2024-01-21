import MoulinettePlugin from 'main';
import { MoulinetteClient } from 'moulinette-client';
import { MoulinetteCreator } from 'moulinette-entities';
import { Vault, normalizePath } from 'obsidian';

/**
 * Moulinette asset
 */
export class MoulinetteUtils {
  
  static PREFIX = "moulinette/"
  
  /**
   * Improves name (originally a filepath) by replacing separators
   */
  static beautifyName(name: string) {
    name = name.replace(/[_-]/g, ' ')
    name = name.indexOf(".") > 0 ? name.substring(0, name.indexOf(".")) : name // remover file extension (if any)
    // uppercase first letter of each word
    name = name.split(" ").map((word) => { 
      return word.length < 2 ? word : word[0].toUpperCase() + word.substring(1); 
    }).join(" ");
    return name
  }

  /**
   * This utility function downloads a remote image (from Moulinette Cloud)
   * Into a specific folder (under /moulinette)
   * 
   * @param vault current Vault
   * @param url image URL
   * @returns image path within the vault
   */
  static async downloadFile(vault: Vault, url: string) {
    
    let imagePath = url

    // URL for Azure
    if(url.startsWith(MoulinetteClient.REMOTE_BASE)) {
      imagePath = MoulinetteUtils.PREFIX + url.substring(MoulinetteClient.REMOTE_BASE.length + 1, url.lastIndexOf("?"))
    } 
    // URL for moulinette.cloud
    else if(url.startsWith(MoulinetteClient.SERVER_URL)) {
      const idx = url.lastIndexOf("?file=")
      if(idx > 0) {
        imagePath = MoulinetteUtils.PREFIX + url.split("?file=")[1]
      } else {
        console.log("Invalid URL", url)
        return null
      }
    }

    const folderPath = imagePath.substring(0, imagePath.lastIndexOf("/"))  

    // create folder structure
    if(!(await vault.adapter.exists(normalizePath(folderPath)))) {
      vault.createFolder(folderPath)
    }
    
    // download file
    if(!(await vault.adapter.exists(normalizePath(imagePath)))) {
      await fetch(url)
        .then(response => {
          if (!response.ok) { throw new Error(`HTTP ${response.status} - ${response.statusText}`) }
          return response.arrayBuffer();
        })
        .then(buffer => {
          vault.createBinary(imagePath, buffer)
      })
      .catch(err => {
        console.error("Moulinette | Couldn't download the image!", err)
        return null
      });
    } else {
      console.warn("Moulinette | File already exists. ", imagePath)
    }

    return imagePath
  }

  /**
   * This utility function downloads a markdown content (from Moulinette Cloud)
   * 
   * @param vault current vault
   * @param creators cached creators
   * @param url markdown URL
   * @returns markdown content
   */
  static async downloadMarkdown(plugin: MoulinettePlugin, uri: string) {
    let markdownContent = ""
    const sessionId = plugin.settings.sessionID ? plugin.settings.sessionID : "demo-user"
    await MoulinetteClient.fetch(uri.replace("SESSIONID", sessionId), "get", null)
      .then(response => {
        if (!response) { throw new Error(`Error during request`) }
        if (!response.ok) { throw new Error(`HTTP ${response.status} - ${response.statusText}`) }
        return response.text();
      })
      .then(text => {
        markdownContent = text
    })
    .catch(err => {
      console.error("Moulinette | Couldn't download the markdown!", err)
    });
    
    return await MoulinetteUtils.downloadDependencies(plugin, markdownContent)
  }

  /**
   * Checks the entire markdown content for references ![[some URL]]
   * Download the references if exist on Moulinette
   * 
   * @param vault current vault
   * @param creators  cached creators
   * @param markdown markdown content
   */
  static async downloadDependencies(plugin: MoulinettePlugin, markdown: string): Promise<string> {
    let newMarkdown = markdown
    const matches = markdown.matchAll(/(\!?)\[\[([^\]]+)\]\]/g)
    for (const match of matches) {
      const refMark = match[1]
      let assetPath = match[2]

      const creators = await plugin.getCreators()
      // A) reference is external (starts with moulinette/)
      if(assetPath.startsWith(MoulinetteUtils.PREFIX)) {
        assetPath = assetPath.substring(MoulinetteUtils.PREFIX.length)
        const creatorPath = assetPath.split("/")[0]
        const pack = assetPath.split("/")[1]
        const baseURL = `${creatorPath}/${pack}`
        for(const c of creators) {
          const pack = c.packs.find(p => p.path.endsWith(baseURL))
          if(pack) {
            if(refMark == "!") {
              // download asset (from Azure Storage)
              const url = `${pack.path}${assetPath.replace(baseURL, "")}?${pack.sas ? pack.sas : ""}`
              await MoulinetteUtils.downloadFile(plugin.app.vault, url)
            }
          }
        }
      }
      // B) reference is specific to a Markdown pack (starts with <module-id>/)
      else {
        const packId = assetPath.split("/")[0]
        for(const c of creators) {
          const pack = c.packs.find(p => p.packId == packId)
          if(pack) {
            let path = null
            
            // download embeded assets (from GIT)
            if(refMark == "!") {
              const sessionId = plugin.settings.sessionID ? plugin.settings.sessionID : "demo-user"
              const url = `${MoulinetteClient.SERVER_URL}/assets/download/${sessionId}/${pack.id}?file=${assetPath}`
              path = await MoulinetteUtils.downloadFile(plugin.app.vault, url)
            }
            // don't download pages automatically (add prefix in from of reference)
            else {
              path = MoulinetteUtils.PREFIX + ( assetPath.startsWith("/") ? assetPath.substring(1) : assetPath )
            }
            
            if(path) {
              // replace references
              newMarkdown = newMarkdown.replace(match[0], `${refMark}[[${path}]]`)
              break
            }
          }
        }
      }
    }
    return newMarkdown
  }

  /**
   * Converts a duration into a string representation
   * @param duration duration as number of seconds
   * @returns string representation of the duration (65 sec = 1:05)
   */
  static formatDuration(duration: number): string {
    const durHr = Math.floor(duration / (3600))
    const durMin = Math.floor((duration - 3600*durHr)/60)
    const durSec = duration % 60
    return (durHr > 0 ? `${durHr}:${durMin.toString().padStart(2,'0')}` : durMin.toString()) + ":" + durSec.toString().padStart(2,'0')
  }
}