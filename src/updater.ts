import { app, dialog, shell } from "electron";

const INITIAL_UPDATE_DELAY_MS = 5 * 1000; // 30 secondes après le boot
const UPDATE_POLL_INTERVAL_MS = 60 * 60 * 1000; // Toutes les heures

async function pollForUpdates(): Promise<void> {
    try {
        // REMPLACE CETTE URL par ton lien "Raw" GitHub Gist ou ton serveur
        const UPDATE_JSON_URL = "https://gist.githubusercontent.com/rriosgiris/d3df448ca5dd29be6b4a5e71f224d4ab/raw/skiris-version.json";
        
        const response = await fetch(UPDATE_JSON_URL);
        if (!response.ok) throw new Error("Serveur injoignable");

        const data = await response.json() as { version: string; notes?: string; url: string };
        const currentVersion = app.getVersion();

        console.log(`Vérification Skiris : Local ${currentVersion} / Serveur ${data.version}`);

        if (data.version !== currentVersion) {
            // Affichage de la vraie popup de mise à jour
            const { response: buttonIndex } = await dialog.showMessageBox({
                type: "info",
                title: "Mise à jour Skiris",
                message: `Une nouvelle version de Skiris est disponible !`,
                detail: `Version : ${data.version}\nNotes : ${data.notes || "Améliorations générales"}`,
                buttons: ["Plus tard", "Télécharger la mise à jour"],
                defaultId: 1,
                cancelId: 0,
            });

            // Si l'utilisateur clique sur "Télécharger"
            if (buttonIndex === 1) {
                shell.openExternal(data.url);
            }
        }
    } catch (e) {
        console.error("Erreur lors de la vérification Skiris:", e);
    }
}

export async function start(updateBaseUrl: string): Promise<void> {
    console.log("Système de mise à jour Skiris activé.");
    
    // Premier check après 30s
    setTimeout(pollForUpdates, INITIAL_UPDATE_DELAY_MS);
    
    // Puis check régulier
    setInterval(pollForUpdates, UPDATE_POLL_INTERVAL_MS);
}

// Fonctions vides pour la compatibilité avec le reste du wrapper
export async function pollForUpdatesManual(): Promise<void> { pollForUpdates(); }