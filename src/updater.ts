import { app, ipcMain, shell, dialog } from "electron";
import { _t } from "./language-helper.js";

const UPDATE_POLL_INTERVAL_MS = 60 * 60 * 1000;
const INITIAL_UPDATE_DELAY_MS = 30 * 1000;

async function pollForUpdates(): Promise<void> {
    try {
        const response = await fetch("https://gist.githubusercontent.com/rriosgiris/d3df448ca5dd29be6b4a5e71f224d4ab/raw/c3627dbbb0bf7ea74c7a28016a8415c593739912/skiris-version.json");
        const data = await response.json() as { version: string; url: string; notes?: string };
        const currentVersion = app.getVersion();

        if (data.version !== currentVersion) {
            const { response: buttonIndex } = await dialog.showMessageBox({
                type: "info",
                buttons: ["Plus tard", "Télécharger"],
                defaultId: 1,
                title: "Mise à jour Skiris",
                message: `Une nouvelle version (${data.version}) est disponible.`,
                detail: data.notes || "Voulez-vous télécharger la nouvelle version ?"
            });

            if (buttonIndex === 1) {
                shell.openExternal(data.url); 
            }
        }
    } catch (e) {
        console.error("Erreur updater:", e);
    }
}

/**
 * Initialise le cycle de vérification.
 * @param updateBaseUrl Conservé pour la compatibilité avec electron-main.ts
 */
export async function start(updateBaseUrl: string): Promise<void> {
    console.log("Skiris Update Notifier activé.");

    setTimeout(pollForUpdates, INITIAL_UPDATE_DELAY_MS);

    setInterval(pollForUpdates, UPDATE_POLL_INTERVAL_MS);
}

async function available(): Promise<boolean> {
    return true; 
}

ipcMain.on("check_updates", pollForUpdates);

ipcMain.on("install_update", (event, url: string) => {
    if (url) {
        shell.openExternal(url);
    }
});

function ipcChannelSendUpdateStatus(status: boolean | string | object): void {
    global.mainWindow?.webContents.send("check_updates", status);
}
