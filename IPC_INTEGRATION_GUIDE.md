# Skiris Electron IPC Integration Guide

## Overview
This guide explains the renderer process (web application) entry points and how to add global IPC listeners in Skiris.

## Architecture

Skiris Desktop has two main processes:

1. **Main Process (Electron)** - Runs in `src/electron-main.ts`
2. **Renderer Process (Web)** - Runs in the bundled webapp from Element Web

The communication between them happens via Electron IPC (Inter-Process Communication).

## Key Files for IPC Integration

### 1. **Preload Bridge** - `src/preload.cts`
**Location:** [src/preload.cts](src/preload.cts)

This file is the **security gateway** between the renderer and main process. It:
- Exposes only whitelisted IPC channels to the renderer
- Provides the `window.electron` API to the web app
- Must be updated when adding new IPC channels

**Current exposed channels:**
```typescript
const CHANNELS = [
    "app_onAction",
    "before-quit",
    "check_updates",
    "install_update",
    "ipcCall",
    "ipcReply",
    "loudNotification",
    "preferences",
    "seshat",
    "seshatReply",
    "setBadgeCount",
    "update-downloaded",
    "userDownloadCompleted",
    "userDownloadAction",
    "openDesktopCapturerSourcePicker",
    "userAccessToken",
    "homeserverUrl",
    "serverSupportedVersions",
    "showToast",
];
```

### 2. **Main Process IPC Handlers** - `src/ipc.ts`
**Location:** [src/ipc.ts](src/ipc.ts)

This file contains all IPC listeners on the **main process side**. Examples:
- `ipcMain.on("loudNotification", ...)` - Handles notification window flashing
- `ipcMain.on("app_onAction", ...)` - Handles app actions like call state
- `ipcMain.on("ipcCall", ...)` - General IPC call handler

### 3. **Renderer Web Application Entry Point**
**Location:** `webapp/` (built assets)

The renderer process runs Element Web, which is bundled into `webapp/`. The actual source code is in a separate `element-web` repository.

**How the renderer connects:**
- Loads at `vector://vector/webapp/` (custom protocol)
- Uses `window.electron.on()` and `window.electron.send()` to communicate
- Calls `window.electron.initialise()` on startup

## How to Add a New IPC Listener

### Step 1: Add Channel to Preload Whitelist
Edit [src/preload.cts](src/preload.cts) and add your channel to the `CHANNELS` array:

```typescript
const CHANNELS = [
    // ... existing channels ...
    "my_custom_channel",  // ← Add here
];
```

### Step 2: Add Handler in Main Process
Edit [src/ipc.ts](src/ipc.ts) and add your listener. For example:

```typescript
// Listen for renderer process signal
ipcMain.on("my_custom_channel", function (ev: IpcMainEvent, data) {
    console.log("Received from renderer:", data);
    // Do something in the main process
    global.mainWindow?.webContents.send("my_custom_channel_response", { result: "success" });
});
```

Or use `ipcMain.handle()` for request-response pattern:

```typescript
ipcMain.handle("my_custom_channel", async (ev, data) => {
    console.log("Received from renderer:", data);
    return { result: "success" }; // Renderer receives this
});
```

### Step 3: Use from Renderer Process
In the Element Web code (element-web repository), use:

```typescript
// Listen for messages from main process
window.electron.on("my_custom_channel_response", (event, data) => {
    console.log("Response from main:", data);
});

// Send to main process
window.electron.send("my_custom_channel", { message: "hello" });

// Or use request-response pattern
const response = await window.electron.invoke("my_custom_channel", { data: "test" });
```

## Key Files Reference

| File | Purpose | Edit For |
|------|---------|----------|
| [src/preload.cts](src/preload.cts) | Security gateway for IPC | Whitelisting new channels |
| [src/ipc.ts](src/ipc.ts) | Main process IPC handlers | Adding listeners/handlers |
| [src/electron-main.ts](src/electron-main.ts) | Electron app entry point | Setting up window, initialization |
| [webapp/](webapp/) | Built web app assets | (Use element-web source instead) |

## Important Notes

1. **Preload Script Injection** - The preload script is injected into the renderer process at [src/electron-main.ts](src/electron-main.ts#L462):
   ```typescript
   webPreferences: {
       preload: preloadScript,
       contextIsolation: true,  // Important for security
   }
   ```

2. **Existing IPC Patterns** - Study the existing patterns in [src/ipc.ts](src/ipc.ts) for reference:
   - `loudNotification` - Simple event handler
   - `app_onAction` - Payload-based routing
   - Power save blocker integration

3. **Testing** - When the app initializes, the renderer calls `window.electron.initialise()` which confirms the IPC bridge is working.

4. **Source Code Location** - The renderer process code (Element Web) needs to be modified in the separate `element-web` repository, not in this desktop wrapper.

## Example: Adding a Simple Custom Signal

To add a "theme-changed" signal from main to renderer:

### 1. Whitelist the channel (`src/preload.cts`):
```typescript
const CHANNELS = [
    // ... existing ...
    "theme-changed",
];
```

### 2. Send from main process (`src/ipc.ts` or `src/electron-main.ts`):
```typescript
// In src/electron-main.ts or when theme preference changes
global.mainWindow?.webContents.send("theme-changed", { theme: "dark" });
```

### 3. Listen in renderer (element-web):
```typescript
window.electron.on("theme-changed", (event, data) => {
    applyTheme(data.theme);
});
```

---

**Next Steps:** Look at [src/ipc.ts](src/ipc.ts) to see the existing IPC patterns and understand how signals are currently handled.
