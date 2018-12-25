import { initStore, disposeStore } from './storeBuilder';

export default class StoreMap {
  storeMap = new Map();
  disposables = new Map();
  builder: any;
  observer: any;
  parentStore: any = null;

  constructor(keys, builder, observer) {
    this.builder = builder;
    this.observer = observer;
    if (Array.isArray(keys)) keys.forEach(key => this.add(key, null));
  }

  _initWrap() {
    // this._isInit = true;
  }

  add(key, prevInit) {
    if (this.storeMap.has(key)) return;
    let newStore = this.builder();
    newStore.mapStoreKey = key;
    prevInit && prevInit(newStore);

    // if (this._isInit) initStore(newStore);
    initStore(newStore, this.parentStore);
    this.storeMap.set(key, newStore);
    this.disposables.set(key, this.observer(newStore, key));
    return newStore;
  }

  delete(key) {
    let store = this.storeMap.get(key);
    store && disposeStore(store);
    this.storeMap.delete(key);
    let disposable = this.disposables.get(key);
    disposable && disposable.dispose();
    this.disposables.delete(key);
  }

  clear() {
    let stores = this.storeMap.values();
    for (let store of stores) {
      disposeStore(store);
    }
    this.storeMap.clear();
    let disposables = this.disposables.values();
    for (let d of disposables) {
      d.dispose();
    }
    this.disposables.clear();
  }

  dispose() {
    this.clear();
  }

  forEach(callback) { return this.storeMap.forEach(callback); }
  get(key) { return this.storeMap.get(key); }
  has(key) { return this.storeMap.has(key); }
  keys() { return this.storeMap.keys(); }
  values() { return this.storeMap.values(); }
  entries() { return this.storeMap.entries(); }
}