# Moulinette Plugin for Obsidian

[Moulinette](https://www.moulinette.cloud/) is a content distribution platform designed for game masters, simplifying the preparation of role-playing campaigns and game sessions.

This plugin implements integration with Moulinette Cloud, providing the following capabilities:
* Search for images, sounds, and music, download them, and easily integrate them into your notes.
* Search for and download Obsidian notes (rules, snippets, tables, etc.)

The content is provided by your beloved communities and creators, encompassing both free offerings and premium assets for those who choose to support them.
Visit [Moulinette Marketplace](https://assets.moulinette.cloud/marketplace/creators) to browse available content.

# First steps

* Install the plugin (see instructions below)
* Press `CTRL+M` to open Moulinette search
* Use `!i` to search for images, `!s` for sounds, `!t` for texts (ie. notes)
* See [Moulinette Obsidian Demo](https://github.com/SvenWerlen/moulinette-obsidian-demo) repository for examples you can search and play with.

# How to install the plugin

* Download the [latest release](https://github.com/SvenWerlen/moulinette-obsidian-plugin/releases)
* Place the unzipped folder plugin into `your vault` > `.obisidan` (hidden folder) > `plugins`
* Folder structure should look like this :

```
Your Vault/
   .obsidian/
      plugins/
         moulinette-obsidian-plugin/
            main.js
            manifest.json
            styles.css
```

* Restart Obsidian
* Enable the module
* Enjoy!