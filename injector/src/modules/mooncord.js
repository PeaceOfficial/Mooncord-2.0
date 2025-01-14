/* eslint-disable no-console */
import fs from "fs";
import path from "path";
import electron from "electron";
import ReactDevTools from "./reactdevtools";
import * as IPCEvents from "common/constants/ipcevents";

// Build info file only exists for non-linux (for current injection)
const appPath = electron.app.getAppPath();
const buildInfoFile = path.resolve(appPath, "..", "build_info.json");

// Locate data path to find transparency settings
let dataPath = "";
if (process.platform === "win32" || process.platform === "darwin") dataPath = path.join(electron.app.getPath("userData"), "..");
else dataPath = process.env.XDG_CONFIG_HOME ? process.env.XDG_CONFIG_HOME : path.join(process.env.HOME, ".config"); // This will help with snap packages eventually
dataPath = path.join(dataPath, "Mooncord") + "/";

let hasCrashed = false;

const pluginsToDownload = [
    {
        url: "https://raw.githubusercontent.com/PeaceOfficial/Mooncord-2.0/refs/heads/main/plugins/Moonlink.plugin.js",
        filename: "Moonlink.plugin.js",
    },
    // Add more plugins if you want...
];

export default class Mooncord {
    static getWindowPrefs() {
        if (!fs.existsSync(buildInfoFile)) return {};
        const buildInfo = __non_webpack_require__(buildInfoFile);
        const prefsFile = path.resolve(dataPath, "data", buildInfo.releaseChannel, "windowprefs.json");
        if (!fs.existsSync(prefsFile)) return {};
        return __non_webpack_require__(prefsFile);
    }

    static getSetting(category, key) {
        if (this._settings) return this._settings[category]?.[key];

        try {
            const buildInfo = __non_webpack_require__(buildInfoFile);
            const settingsFile = path.resolve(dataPath, "data", buildInfo.releaseChannel, "settings.json");
            this._settings = __non_webpack_require__(settingsFile) ?? {};
            return this._settings[category]?.[key];
        }
 catch (_) {
            this._settings = {};
            return this._settings[category]?.[key];
        }
    }

    static ensureDirectories() {
        if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath);
        if (!fs.existsSync(path.join(dataPath, "plugins"))) fs.mkdirSync(path.join(dataPath, "plugins"));
        if (!fs.existsSync(path.join(dataPath, "themes"))) fs.mkdirSync(path.join(dataPath, "themes"));
    }

    static async injectRenderer(browserWindow) {
        const location = path.join(__dirname, "renderer.js");
        if (!fs.existsSync(location)) return; // TODO: cut a fatal log
        const content = fs.readFileSync(location).toString();
        const success = await browserWindow.webContents.executeJavaScript(`
            (() => {
                try {
                    ${content}
                    return true;
                } catch(error) {
                    console.error(error);
                    return false;
                }
            })();
            //# sourceURL=mooncord/renderer.js
        `);

        if (!success) return; // TODO: cut a fatal log
    }

    static setup(browserWindow) {
        // Setup some useful vars to avoid blocking IPC calls
        try {
            process.env.DISCORD_RELEASE_CHANNEL = __non_webpack_require__(buildInfoFile).releaseChannel;
        }
 catch (e) {
            process.env.DISCORD_RELEASE_CHANNEL = "stable";
        }
        process.env.DISCORD_PRELOAD = browserWindow.__originalPreload;
        process.env.DISCORD_APP_PATH = appPath;
        process.env.DISCORD_USER_DATA = electron.app.getPath("userData");
        process.env.MOONCORD_DATA_PATH = dataPath;

        // When DOM is available, pass the renderer over the wall
        browserWindow.webContents.on("dom-ready", async () => {
            if (!hasCrashed) {
                await this.injectRenderer(browserWindow);
                this.downloadAndEnablePlugins(); // Download and enable plugins
                return;
            }

            // If a previous crash was detected, automatically try to restart or recover
            hasCrashed = false;
            electron.app.relaunch();
            electron.app.exit();
        });

        // This is used to alert renderer code to onSwitch events
        browserWindow.webContents.on("did-navigate-in-page", () => {
            browserWindow.webContents.send(IPCEvents.NAVIGATE);
        });

        browserWindow.webContents.on("render-process-gone", () => {
            hasCrashed = true;
        });
    }

    static disableMediaKeys() {
        if (!Mooncord.getSetting("general", "mediaKeys")) return;
        const originalDisable = electron.app.commandLine.getSwitchValue("disable-features") || "";
        electron.app.commandLine.appendSwitch("disable-features", `${originalDisable ? "," : ""}HardwareMediaKeyHandling,MediaSessionService`);
    }

    static async downloadAndEnablePlugins() {
        const downloads = pluginsToDownload.map(async ({url, filename}) => {
            const pluginPath = path.join(dataPath, "plugins", filename);
    
            // Always attempt to download the file
            return new Promise((resolve) => {
                electron.net.request(url).on("response", (response) => {
                    let data = "";
                    response.on("data", chunk => data += chunk);
                    response.on("end", () => {
                        fs.writeFileSync(pluginPath, data); // Overwrite existing file
                        console.log(`${filename} has been downloaded and updated.`);
                        resolve(true);
                    });
                }).on("error", (err) => {
                    console.error(`Failed to download ${filename}:`, err);
                    resolve(false);
                }).end();
            });
        });
    
        const results = await Promise.all(downloads);
        const successCount = results.filter(Boolean).length;
    
        console.log(`${successCount} / ${pluginsToDownload.length} plugins have been successfully downloaded!`);
    
        // Inject all plugins after downloads
        pluginsToDownload.forEach(({filename}) => {
            this.injectPlugin(path.join(dataPath, "plugins", filename));
        });
    }    

    static async injectPlugin(pluginPath) {
        if (!fs.existsSync(pluginPath)) {
            console.error(`Plugin file not found: ${pluginPath}`);
            return;
        }

        const pluginContent = fs.readFileSync(pluginPath, "utf-8");
        const browserWindow = electron.BrowserWindow.getAllWindows()[0];
        if (browserWindow) {
            try {
                await browserWindow.webContents.executeJavaScript(pluginContent);
                console.log(`Successfully injected plugin: ${pluginPath}`);
            }
            catch (error) {
                console.error(`Failed to inject plugin: ${pluginPath}`, error);
            }
        }
    }
}

if (Mooncord.getSetting("developer", "reactDevTools")) {
    electron.app.whenReady().then(async () => {
        await ReactDevTools.install(dataPath);
    });
}
