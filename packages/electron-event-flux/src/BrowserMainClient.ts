
const findIndex = require('lodash/findIndex');
const { 
  renderRegisterName, renderDispatchName, mainDispatchName, mainInitName, mainReturnName, winMessageName, messageName 
} = require('./constants');

export default class ElectronMainClient {
  callbacks: any;
  clients = {};
  clientInfos = [];

  constructor(callbacks) {
    this.callbacks = callbacks;
     (window as any).isMainClient = true;

    window.addEventListener("message", (event) => {
      let callbacks = this.callbacks;
      let { action, data, invokeId, senderId, clientId } = event.data || {} as any;
      if (action === renderDispatchName) {
        callbacks.handleRendererMessage(data).then((result) => {
          this.clients[clientId].postMessage({
            action: mainReturnName,
            invokeId,
            data: result,
          }, '*');
        }, (err) => {
          this.clients[clientId].postMessage({
            action: mainReturnName,
            invokeId,
            error: { name: err.name, message: err.message },
          }, '*');
        });
      } else if (action === winMessageName) {
        this.clients[clientId].postMessage({
          action: winMessageName,
          senderId,
          data: data,
        }, '*');
      } else if (action === 'close') {       // Child window has closed
        let index = findIndex(this.clientInfos, (item) => item.clientId === clientId);
        if (index !== -1) this.clientInfos.splice(index, 1);
        this.clients[clientId] = null;
        callbacks.deleteWin(clientId);
      } else if (action === renderRegisterName) {
        let { filter } = data;
        callbacks.addWin(clientId);
        this.clientInfos.push({ clientId, filter });
        this.clients[clientId].postMessage({
          action: mainInitName,
          data: [
            callbacks.getInitStates(clientId, filter), 
            callbacks.getStores(clientId, filter)
          ],
        }, '*');
      }
    });

    this.addWin('mainClient', window);
  }
  
  addWin(clientId, newWin) {
    this.clients[clientId] = newWin;
  }

  getForwardClients() {
    return this.clientInfos;
  }

  sendToRenderer(client, payload) {
    let window = this.clients[client.clientId];
    window && window.postMessage({ action: mainDispatchName, data: payload }, '*');
  }

  sendMessage(win, message) {
    win && win.postMessage({ action: messageName, data: message }, '*');
  }

  closeAllWindows() {
    Object.keys(this.clients).forEach(clientId => {
      let window = this.clients[clientId];
      window && window.close();
    });
  }
}