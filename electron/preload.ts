import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  onMenuAction: (callback: (action: string) => void) => {
    ipcRenderer.on('menu-new-chat', () => callback('new-chat'))
    ipcRenderer.on('menu-settings', () => callback('settings'))
  },
  
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  },

  // File system operations (for knowledge base)
  selectFiles: () => ipcRenderer.invoke('dialog:openFiles'),
  selectFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  
  // Storage operations
  saveData: (key: string, data: any) => ipcRenderer.invoke('storage:save', key, data),
  loadData: (key: string) => ipcRenderer.invoke('storage:load', key),
  
  // App info
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => process.platform,
})

// Types for TypeScript
export interface ElectronAPI {
  onMenuAction: (callback: (action: string) => void) => void
  removeAllListeners: (channel: string) => void
  selectFiles: () => Promise<string[]>
  selectFolder: () => Promise<string>
  saveData: (key: string, data: any) => Promise<void>
  loadData: (key: string) => Promise<any>
  getVersion: () => Promise<string>
  getPlatform: () => string
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}