import AppStore from 'event-flux/lib/AppStore';
import objectMerge from './utils/objectMerge';
import fillShape from './utils/fillShape';
import { serialize, deserialize } from 'json-immutable';
import proxyStores from './utils/proxyStore';
import RendererClient from './RendererClient';
import { Emitter } from 'event-kit';
import { filterOneStore } from './utils/filterStore';

class IDGenerator {
  count = 0;

  genID() {
    return ++this.count;
  }

  dispose(id) {
  }
}

export class RendererAppStore extends AppStore {
  emitter: Emitter;
  client: any;
  idGenerator = new IDGenerator();
  resolveMap = {};
  storeShape: any;

  static innerStores;

  asyncInit() {
    super.init();
    this.emitter = new Emitter();

    let filter = true;
    return new Promise((resolve) => {
      this.client = new RendererClient(
        filter,
        this.handleStore.bind(this, resolve, filter), 
        this.handleAction.bind(this), 
        this.handleResult.bind(this), 
        this.handleMessage.bind(this),
        this.handleWinMessage.bind(this)
      );
    });
  }

  handleStore(resolve, filter, state, store) {
    const storeData = deserialize(state);
    const initialState = filter ? fillShape(storeData, filter) : storeData;
    this.state = initialState;

    const storeFilters = JSON.parse(store);
    let stores = proxyStores(storeFilters, (action) => {
      let invokeId = this.idGenerator.genID();
      this.client.forward(invokeId, serialize(action));
      return new Promise((resolve, reject) => this.resolveMap[invokeId] = {resolve, reject});
    });
    this.stores = stores;
    this.initRenderStores();
    resolve();
  }

  handleAction(action) {
    action = deserialize(action);
    const { updated, deleted } = action.payload;
    // const withDeletions = filterObject(this.state, deleted);
    if (!this.state) return;
    this.state = objectMerge(this.state, updated, deleted);
    this.sendUpdate();
  }

  handleResult(invokeId, error, result) {
    this.idGenerator.dispose(invokeId);
    let {resolve, reject} = this.resolveMap[invokeId];
    if (error) {
      reject(error);
     } else {
      // if (result !== undefined) result = JSON.parse(result);
      resolve(result);
     }
    this.resolveMap[invokeId] = null;
  }

  handleMessage(message) {
    this.emitter.emit('did-message', message);
  }

  handleWinMessage(senderId, message) {
    this.emitter.emit('did-win-message', {senderId, message});
  }

  sendWindowMessage(clientId, args) {
    this.client.sendWindowMessage(clientId, args);
  }

  onDidMessage(callback) {
    return this.emitter.on('did-message', callback);
  }

  onDidWinMessage(callback) {
    return this.emitter.on('did-win-message', callback);
  }

  initRenderStores() {
    this.buildStores();
    this.initStores(this);
    this.startObserve();
  }

  getStore(key) {
    return this.stores[key]
  }

  setStore(key, store) {
    return this.stores[key] = store;
  }

  // 构建子Stores
  buildStores() {}
  // 初始化子Stores
  initStores(parent) {}
  // 开始监听子Store改变
  startObserve() {}
}

export default function buildRendererAppStore(stores, onChange) {
  RendererAppStore.innerStores = stores;
  const storeShape = filterOneStore(RendererAppStore);
  const appStore = new RendererAppStore(onChange);
  appStore.storeShape = storeShape;
  return appStore;
}