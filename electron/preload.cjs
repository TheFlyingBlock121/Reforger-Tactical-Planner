const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  minimize: () => ipcRenderer.send("window:minimize"),
  maximize: () => ipcRenderer.send("window:maximize"),
  close: () => ipcRenderer.send("window:close"),
  copyText: (value) => ipcRenderer.invoke("clipboard:writeText", value),

  getOverlayState: () => ipcRenderer.invoke("overlay:get"),
  setAlwaysOnTop: (value) => ipcRenderer.invoke("overlay:alwaysOnTop", value),
  setOpacity: (value) => ipcRenderer.invoke("overlay:opacity", value),
  setClickThrough: (value) => ipcRenderer.invoke("overlay:clickThrough", value),
  setSideMode: (value) => ipcRenderer.invoke("overlay:sideMode", value),
  onOverlayState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("overlay:state", listener);
    return () => ipcRenderer.removeListener("overlay:state", listener);
  },

  listTileMaps: () => ipcRenderer.invoke("maps:list"),
  openBuiltInTilesFolder: () => ipcRenderer.invoke("maps:openBuiltInSource"),
  openMapsFolder: () => ipcRenderer.invoke("maps:openRoot"),
  openMapImage: () => ipcRenderer.invoke("map:openImage"),
  savePlan: (payload) => ipcRenderer.invoke("plan:save", payload),
  loadPlan: () => ipcRenderer.invoke("plan:load")
});
