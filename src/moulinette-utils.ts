import MoulinettePlugin from 'main';
import { MoulinetteClient } from 'moulinette-client';
import { MoulinetteCreator, MoulinettePack } from 'moulinette-entities';
import { Vault, normalizePath, requestUrl } from 'obsidian';

/**
 * Moulinette asset
 */
export class MoulinetteUtils {
  
  static PREFIX = "moulinette/"

  // https://upload.wikimedia.org/wikipedia/commons/4/48/Markdown-mark.svg
  // https://yoksel.github.io/url-encoder/
  //static IMAGE_ICON = `data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path fill="%23FFF" d="M448 80c8.8 0 16 7.2 16 16V415.8l-5-6.5-136-176c-4.5-5.9-11.6-9.3-19-9.3s-14.4 3.4-19 9.3L202 340.7l-30.5-42.7C167 291.7 159.8 288 152 288s-15 3.7-19.5 10.1l-80 112L48 416.3l0-.3V96c0-8.8 7.2-16 16-16H448zM64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64zm80 192a48 48 0 1 0 0-96 48 48 0 1 0 0 96z"/></svg>`
  //static TEXT_ICON = `data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="208" height="128" viewBox="0 0 208 128"><rect width="198" height="118" x="5" y="5" ry="10" stroke="%23FFF" stroke-width="10" fill="%23FFF"/><path d="M30 98V30h20l20 25 20-25h20v68H90V59L70 84 50 59v39zm125 0l-30-33h20V30h20v35h20z"/></svg>`
  //static AUDIO_ICON = `data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 75 75"><path d="M39.389,13.769 L22.235,28.606 L6,28.606 L6,47.699 L21.989,47.699 L39.389,62.75 L39.389,13.769z" style="stroke:%23FFF;stroke-width:5;stroke-linejoin:round;fill:%23FFF;"/><path d="M48,27.6a19.5,19.5 0 0 1 0,21.4M55.1,20.5a30,30 0 0 1 0,35.6M61.6,14a38.8,38.8 0 0 1 0,48.6" style="fill:none;stroke:%23FFF;stroke-width:5;stroke-linecap:round"/></svg>`
  
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
        console.warn(`Invalid URL: ${url}`)
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
      await requestUrl(url)
        .then(response => {
          if (response.status != 200) { throw new Error(`HTTP ${response.status} - ${response.text}`) }
          return response.arrayBuffer;
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
    await MoulinetteClient.requestServer(uri.replace("SESSIONID", sessionId), "get", null)
      .then(response => {
        if (!response) { throw new Error(`Error during request`) }
        if (response.status != 200) { throw new Error(`HTTP ${response.status} - ${response.text}`) }
        return response.text;
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
              const url = `${MoulinetteClient.SERVER_URL}/assets/download-asset/${sessionId}/${pack.id}?file=${assetPath}&ms=${new Date().getTime()}`
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
    const durHr = Math.round(Math.floor(duration / (3600)))
    const durMin = Math.round(Math.floor((duration - 3600*durHr)/60))
    const durSec = Math.round(duration % 60)
    return (durHr > 0 ? `${durHr}:${durMin.toString().padStart(2,'0')}` : durMin.toString()) + ":" + durSec.toString().padStart(2,'0')
  }

  /**
   * Merge packs with same name
   */
  static combinePacks(packs: MoulinettePack[]): { [id: string] : MoulinettePack[] } {
    let newPacks: { [id: string] : MoulinettePack[] } = {};
    for(const p of packs) {
      let name = p.name.trim()
      // remove HD / 4K in names
      if(name.endsWith("HD") || name.endsWith("4K")) {
        name = name.slice(0, -2).trim()
      }
      // remove (...) if any
      name = name.replace(/\([^\)]+\)/g, '').trim();
      // add to list
      if(name in newPacks) {
        newPacks[name].push(p)
      }
      else {
        newPacks[name] = [p]
      }
    }
    return newPacks
  }

}