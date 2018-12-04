const { 
  mainInitName, mainDispatchName, mainReturnName, renderDispatchName, renderRegisterName, messageName, winMessageName
} = require('./constants');
const { ipcMain } = require('electron');
const findIndex = require('lodash/findIndex');

export default class ElectronMainClient {
  unregisterRenderer: any;
  clientInfos: any;
  
  constructor(callbacks) {
    let clientInfos = []; // webContentsId -> {webContents, filter, clientId, windowId, active}
    let clientMap = {};
    // Need to keep track of windows, as when a window refreshes it creates a new
    // webContents, and the old one must be unregistered
  
    // Cannot delete data, as events could still be sent after close
    // events when a BrowserWindow is created using remote
    let unregisterRenderer = (clientId) => {
      let existIndex = findIndex(clientInfos, (item) => item.clientId === clientId);
      if (existIndex !== -1) {
        clientInfos.splice(existIndex, 1);
        clientMap[clientId] = null;
        callbacks.deleteWin(clientId);
      }
    };
    this.unregisterRenderer = unregisterRenderer;
  
    ipcMain.on(renderRegisterName, ({ sender }, { filter, clientId }) => {
      let existIndex = findIndex(clientInfos, (item) => item.clientId === clientId);
      if (existIndex !== -1) {
        unregisterRenderer(clientId);        
      }
  
      let clientInfo = {
        webContents: sender,
        filter,
        clientId,
        window: sender.getOwnerBrowserWindow(),
        active: true
      };
      clientInfos.push(clientInfo);
      clientMap[clientId] = clientInfo;
      callbacks.addWin(clientId);

      if (!sender.isGuest()) { // For windowMap (not webviews)
        let browserWindow = sender.getOwnerBrowserWindow();
        
        // Webcontents aren't automatically destroyed on window close
        browserWindow.on('closed', () => unregisterRenderer(clientId));
      }
    });
  
    // Give renderers a way to sync the current state of the store, but be sure we don't
    // expose any remote objects. In other words, we need to rely exclusively on primitive
    // data types, Arrays, or Buffers. Refer to:
    // https://github.com/electron/electron/blob/master/docs/api/remote.md#remote-objects
  
    global[mainInitName + 'Stores'] = function(clientId) {
      return callbacks.getStores(clientId, clientMap[clientId].filter);
    }
  
    global[mainInitName] = (clientId) => {
      return callbacks.getInitStates(clientId, clientMap[clientId].filter);
    }
  
    ipcMain.on(renderDispatchName, (event, clientId, invokeId, stringifiedAction) => {
      let webContents = clientMap[clientId].webContents;
      callbacks.handleRendererMessage(stringifiedAction).then(result => {
        webContents.send(mainReturnName, invokeId, undefined, result);
      }, (err) => {
        let errInfo = { name: err.name, message: err.message };
        webContents.send(mainReturnName, invokeId, errInfo, undefined);
      });
    });

    ipcMain.on(winMessageName, (event, clientId, data) => {
      let webContents = clientMap[clientId].webContents;
      let existIndex = findIndex(clientInfos, (item) => item.webContents === event.sender);
      if (existIndex !== -1) {
        webContents.send(winMessageName, clientInfos[existIndex].clientId, data);
      }
    });
    this.clientInfos = clientInfos;
  }
  
  getForwardClients() {
    return this.clientInfos;
  }

  sendToRenderer(client, payload) {
    let webContents = client.webContents;
    if (webContents.isDestroyed() || webContents.isCrashed()) {
      return this.unregisterRenderer(client.clientId);
    }
    webContents.send(mainDispatchName, payload);
  }

  sendMessage(win, message) {
    win.webContents.send(messageName, message);
  }

  closeAllWindows() {
    this.clientInfos.forEach(client => {
      if (!client.window.isDestroyed()) {
        client.window.close()
      }
    });
  }
}