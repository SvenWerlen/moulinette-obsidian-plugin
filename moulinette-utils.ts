import { Vault, normalizePath } from 'obsidian';

/**
 * Moulinette asset
 */
export class MoulinetteFileUtils {
  
  static PREFIX = "/moulinette"
  static REMOTE_BASE = "https://mttecloudstorage.blob.core.windows.net"

  /**
   * Improves name (originally a filepath) by replacing separators
   */
  static beautifyName(name: string) {
    name = name.replace(/[_-]/g, ' ')
    name = name.indexOf(".") > 0 ? name.substring(0, name.indexOf(".")) : name // remover file extension (if any)
    // uppercase first letter of each word
    name = name.split(" ").map((word) => { 
      return word[0].toUpperCase() + word.substring(1); 
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
    if(!url.startsWith(MoulinetteFileUtils.REMOTE_BASE)) {
      console.log("Moulinette | URL not supported.", url)
      return null
    }

    // create folder structure
    const imagePath = MoulinetteFileUtils.PREFIX + url.substring(MoulinetteFileUtils.REMOTE_BASE.length, url.lastIndexOf("?"))
    let folderPath = imagePath.substring(0, imagePath.lastIndexOf("/"))
    if(!(await vault.adapter.exists(normalizePath(folderPath)))) {
      vault.createFolder(folderPath)
    }
    
    // download file
    if(!(await vault.adapter.exists(normalizePath(imagePath)))) {
      fetch(url)
        .then(response => {
          if (!response.ok) { throw new Error(`HTTP ${response.status} - ${response.statusText}`) }
          return response.arrayBuffer();
        })
        .then(buffer => {
          console.log(imagePath)
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

  
}