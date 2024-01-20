import { MoulinetteClient } from 'moulinette-client';
import { Vault, normalizePath } from 'obsidian';

/**
 * Moulinette asset
 */
export class MoulinetteUtils {
  
  static PREFIX = "/moulinette"
  
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
    if(!url.startsWith(MoulinetteClient.REMOTE_BASE)) {
      console.log("Moulinette | URL not supported.", url)
      return null
    }

    // create folder structure
    const imagePath = MoulinetteUtils.PREFIX + url.substring(MoulinetteClient.REMOTE_BASE.length, url.lastIndexOf("?"))
    let folderPath = imagePath.substring(0, imagePath.lastIndexOf("/"))
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
   * @param vault current Vault
   * @param url Markdown URL
   * @returns markdown content
   */
  static async downloadMarkdown(vault: Vault, url: string) {
    if(!url.startsWith(MoulinetteClient.SERVER_URL)) {
      console.log("Moulinette | URL not supported.", url)
      return null
    }

    let markdownContent = ""
    await fetch(url)
      .then(response => {
        if (!response.ok) { throw new Error(`HTTP ${response.status} - ${response.statusText}`) }
        return response.text();
      })
      .then(text => {
        markdownContent = text
    })
    .catch(err => {
      console.error("Moulinette | Couldn't download the markdown!", err)
    });
    
    return markdownContent
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