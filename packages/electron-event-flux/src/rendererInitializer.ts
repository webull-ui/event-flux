import buildRendererAppStore from './RendererAppStore';
import { Emitter } from 'event-kit';

function getQuery() {
  let query = {};
  window.location.search.slice(1).split('&').forEach(item => {
    let [key, val] = item.split('=');
    query[key] = val;
  });
  return query;
}

class ChildWindowProxy {
  emitter = new Emitter();
  store: any;
  messages = [];
  childId: any;

  constructor(store, createPromise) {
    this.emitter = new Emitter();
    this.store = store;
    this.messages = [];
    createPromise.then(childId => {
      this.childId = childId;
      this.messages.forEach((message) => {
        this.send(message);
      });
    });
    this.store.onDidWinMessage(this.handleWinMessage.bind(this));
  }

  send(message) {
    if (!this.childId) {
      this.messages.push(message);
    } else {
      this.store.sendWindowMessage(this.childId, message);
    }
  }

  handleWinMessage({senderId, message}) {
    if (senderId === this.childId) {
      this.emitter.emit('message', message);
    }
  }

  onDidReceiveMsg(callback) {
    return this.emitter.on('message', callback);
  }
}

class ParentWindowProxy {
  store: any;
  parentId: any;
  emitter: Emitter;

  constructor(store, parentId) {
    this.store = store;
    this.parentId = parentId;
    this.emitter = new Emitter();

    this.store.onDidWinMessage(this.handleWinMessage.bind(this));
  }

  send(message) {
    this.store.sendWindowMessage(this.parentId, message);
  }

  handleWinMessage({senderId, message}) {
    if (senderId === this.parentId) {
      this.emitter.emit('message', message);
    }
  }

  onDidReceiveMsg(callback) {
    return this.emitter.on('message', callback);
  }
}

interface RenderOptions {
  renderHandler?: any;
  actionHandler?: any;
};

export default function rendererInit(rendererStores, options: RenderOptions = {}) {
  let query = getQuery();
  window['clientId'] = query['clientId'];
  window['parentId'] = query['parentId'];

  function getAction() {
    if (window['process']) return query['url'] || '/';
    return window.location.pathname;
  }
  window['action'] = getAction();

  const store = buildRendererAppStore(rendererStores, options.renderHandler);

  const genProxy = (store, multiWinStore) => {
    return new Proxy(multiWinStore, {
      get: function(target, propName) {
        if (!propName) return;
        if (propName === 'createWin') {
          return function(url, params) {
            return new ChildWindowProxy(store, target[propName](url, window['clientId'], params));
          }
        } else {
          return target[propName];
        }
      }
    })
  }

  return store.asyncInit().then((state) => {
    store.stores['multiWinStore'] = genProxy(store, store.stores['multiWinStore']);
    if (window['parentId']) {
      window['parentWin'] = new ParentWindowProxy(store, window['parentId']);
    }
    store.onDidMessage((message) => {
      // console.log('message', message);
      let {action, url, parentId} = message;
      if (action === 'change-props') {
        window['action'] = url;
        window['parentId'] = parentId;
        if (!window['parentWin']) {
          window['parentWin'] = new ParentWindowProxy(store, window['parentId']);
        } else {
          window['parentWin']['parentId'] = parentId;
        }
        options.actionHandler && options.actionHandler(window['action'], window['parentWin']);
      }
    });
    return store;
  });
}