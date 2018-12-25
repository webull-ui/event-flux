import AppStore from 'event-flux/lib/AppStore';
import objectDifference from './utils/objectDifference';
import { filterOneStore, filterWindowStore, filterWindowState, filterWindowDelta } from './utils/filterStore';
import { declareStore } from './StoreDeclarer';
import MainClient from './MainClient';
import MultiWinManagerStore, { WinPackStore } from './MultiWinManagerStore';
import ActionRecordStore from './ActionRecordStore';
import fillShape from './utils/fillShape';
import MultiWinStore from './MultiWinStore';

const isEmpty = require('lodash/isEmpty');
const isObject = require('lodash/isObject');
const { winManagerStoreName, winManagerKey } = require('./constants');
const { serialize, deserialize } = require('json-immutable');

function findStore(stores, storePath) {
  return storePath.reduce((subStores, entry) => {
    if (!isObject(entry)) return subStores[entry]
    let { name, type, index } = entry;
    let storeCol = subStores[name];
    if (type === 'List' || type === 'Map') {
      return storeCol.get(index);      
    }
  }, stores);
}

function storeEnhancer(appStore, stores, storeShape) {
  const callbacks = {
    addWin(clientId) {
      stores[winManagerStoreName].addWin(clientId);
    },
    deleteWin(clientId) {
      stores[winManagerStoreName].deleteWin(clientId);
    },
    getStores(clientId, filter) {
      let stores = filterWindowStore(storeShape, winManagerStoreName, clientId);
      return JSON.stringify(stores);
    },
    getInitStates(clientId, filter) {
      let filterState = filterWindowState(appStore.state, winManagerKey, clientId);
      return serialize(filterState);
    },
    handleRendererMessage(payload) {
      const { store: storePath, method, args } = deserialize(payload);
      let store = findStore(stores, storePath);
      if (!store[method]) {
        throw new Error(`The method ${method} in Store ${store} is not defined`);
      }
      try {
        let result = store[method].apply(store, args);
        return Promise.resolve(result);
      } catch (err) {
        return Promise.reject(err);
      }
    }
  }
  
  const mainClient = new MainClient(callbacks);
  appStore.mainClient = mainClient;
  const forwarder = (payload) => {
    // Forward all actions to the listening renderers
    let clientInfo = mainClient.getForwardClients();
   
    clientInfo.forEach(client => {
      let { filter: shape, clientId } = client;
      let updated = fillShape(payload.updated, shape);
      let deleted = fillShape(payload.deleted, shape);
      [updated, deleted] = filterWindowDelta(updated, deleted, winManagerKey, clientId);

      if (isEmpty(updated) && isEmpty(deleted)) {
        return;
      }

      const action = { payload: { updated, deleted } };

      mainClient.sendToRenderer(client, serialize(action));
    });
  };
  return forwarder;
}

class MultiWindowAppStore extends AppStore {
  storeShape: any;
  forwarder: any;

  static innerStores;

  onWillChange(prevState, state) {
    const delta = objectDifference(prevState, state);
    if (isEmpty(delta.updated) && isEmpty(delta.deleted)) return;
    this.forwarder(delta);
  };

  init() {
    this.buildStores();
    this.initStores(this);
    this.startObserve();
    super.init();
    this.forwarder = storeEnhancer(this, this.stores, this.storeShape);
    return this;
  }

  getStore(key) {
    return this.stores[key]
  }

  setStore(key, store) {
    return this.stores[key] = store;
  }

  getWinSpecificStore(clientId, storeName) {
    let winStores = this.stores[winManagerStoreName].winPackMap[clientId];
    if (winStores) return winStores[storeName];
  }

  // 构建子Stores
  buildStores() {}
  // 初始化子Stores
  initStores(parent) {}
  // 开始监听子Store改变
  startObserve() {}
}

export default function buildMultiWinAppStore(
  stores, 
  winStores, 
  { 
    WindowsManagerStore = MultiWinManagerStore, 
    ActionStore = ActionRecordStore, 
    WinHandleStore = MultiWinStore, 
  }
) {
  WinPackStore.innerStores = { ...winStores, actionRecord: ActionStore };
  let allStores = {
    ...stores, 
    multiWin: WinHandleStore,
    [winManagerKey]: declareStore(WindowsManagerStore, { storeKey: winManagerStoreName }),
  };
  MultiWindowAppStore.innerStores = allStores;
  const storeShape = filterOneStore(MultiWindowAppStore);
  const appStore = new MultiWindowAppStore(null);
  appStore.storeShape = storeShape;
  appStore.init();
  return appStore;
}