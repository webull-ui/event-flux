const { 
  mainInitName, renderRegisterName, renderDispatchName, mainDispatchName, mainReturnName, winMessageName, messageName
} = require('./constants');
const { ipcRenderer, remote } = require('electron');
// const { serialize, deserialize } = require('json-immutable');

export default class ElectronRendererClient {
  clientId: any;

  constructor(filter, callback, onGetAction, onGetResult, onGetMessage, onGetWinMessage) {
    let clientId = (window as any).clientId;
    if (!clientId) {
      const rendererId = (process as any).guestInstanceId || remote.getCurrentWindow().id;
      clientId = (process as any).guestInstanceId ? `webview ${rendererId}` : `window ${rendererId}`;
    }
    this.clientId = clientId;
    
    // Allows the main process to forward updates to this renderer automatically
    ipcRenderer.send(renderRegisterName, { filter: filter, clientId });
  
    // Get current from the electronEnhanced store in the browser through the global it creates
    let getStores = remote.getGlobal(mainInitName + 'Stores');
    const storeFilters = getStores(clientId);
    // const util = require('util')
    // console.log(util.inspect(storeFilters, {showHidden: false, depth: null}))
  
    let getInitialState = remote.getGlobal(mainInitName);
    if (!getInitialState) throw new Error('Could not find electronEnhanced store in main process');
    const stateData = getInitialState(clientId);
  
    callback(stateData, storeFilters);
    
    // Dispatches from other processes are forwarded using this ipc message
    ipcRenderer.on(mainDispatchName, (event, stringifiedAction) => {
      onGetAction(stringifiedAction);
    });
    ipcRenderer.on(mainReturnName, (event, invokeId, error, result) => {
      onGetResult(invokeId, error, result);
    });
    ipcRenderer.on(messageName, (event, params) => {
      onGetMessage(params);
    });
    ipcRenderer.on(winMessageName, (event, senderId, params) => {
      onGetWinMessage(senderId, params);
    });
  }

  // Forward update to the main process so that it can forward the update to all other renderers
  forward(invokeId, action) {
    ipcRenderer.send(renderDispatchName, this.clientId, invokeId, action);
  }

  sendMessage(args) {
    ipcRenderer.send(messageName, args);
  }

  sendWindowMessage(clientId, args) {
    ipcRenderer.send(winMessageName, clientId, args);
  }
}
