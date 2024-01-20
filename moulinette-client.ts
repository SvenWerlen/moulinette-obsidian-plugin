import { MoulinetteCreator } from "moulinette-entities";

/**
 * Client for Moulinette server
 */
export class MoulinetteClient {
  
  //static SERVER_URL = "https://assets.moulinette.cloud"
  static SERVER_URL = "http://127.0.0.1:5000"
  static HEADERS = { 'Accept': 'application/json', 'Content-Type': 'application/json' }
  static CLIENT_ID = "K3ofcL8XyaObRrO_5VPuzXEPnOVCIW3fbLIt6Vygt_YIM6IKxA404ZQ0pZbZ0VkB"
  static REMOTE_BASE = "https://mttecloudstorage.blob.core.windows.net"
  
  /*
   * Sends a request to server and returns the response
   */
  static async fetch(URI: string, method: string, data: object | null) {
    let params = data ? { method: method, headers: MoulinetteClient.HEADERS, body: JSON.stringify(data) } : { method: method, headers: MoulinetteClient.HEADERS }

    const response = await fetch(`${MoulinetteClient.SERVER_URL}${URI}`, params).catch(function(e) {
      console.log(`MoulinetteClient | Cannot establish connection to server ${MoulinetteClient.SERVER_URL}`, e)
    });
    return response
  }
  
  /*
   * Sends a request to server and return the response or null (if server unreachable)
   */
  static async send(URI: string, method: string, data: object | null) {
    const response = await this.fetch(URI, method, data)
    if(!response) {
      return null;
    }
    return { 'status': response.status, 'data': await response.json() }
  }
  
  static async get(URI: string) { return MoulinetteClient.send(URI, "GET", null) }
  static async post(URI: string, data: object) { return this.send(URI, "POST", data) }


  /** ================================================================ */
  
  /**
   * Retrieves user details (name, tiers, etc.)
   */
  static async getUser(userId: string, forceRefresh = false) {
    console.log("Moulinette | Retrieving user details")
    const noCache = "?ms=" + new Date().getTime()
    const refresh = forceRefresh ? "force=1" : ""
    return await MoulinetteClient.get(`/user/${userId}${noCache}&${refresh}`)
  }

  /**
   * Retrieves user assets (images, markdowns, etc.)
   */
  static async getUserAssets(userId: string): Promise<MoulinetteCreator[]> {
    userId = userId && userId.length == 26 ? userId : "demouser"
    const result = await MoulinetteClient.get(`/assets/${userId}`)
    if(result && result.status == 200) {
      return MoulinetteCreator.importCreators(result.data)
    } else {
      return []
    }
  }
}

