import { initStore, disposeStore } from './storeBuilder';

export default class StoreList {
  length: number = 0;
  storeArray = [];
  disposables = [];
  builder: any;
  observer: any;
  parentStore: any = null;

  constructor(size, builder, observer) {
    this.builder = builder;
    this.observer = observer;
    if (size) this.setSize(size);
  }

  _initWrap() {
    // this._isInit = true;
  }

  setSize(count) {
    if (this.length === count) return;
    if (this.length < count) {
      for (let i = this.length; i < count; ++i) {
        let newStore = this.builder();
        newStore.listStoreKey = i;

        // if (this._isInit) initStore(newStore);
        initStore(newStore, this.parentStore);
        this.storeArray.push(newStore);
        this.disposables.push(this.observer(newStore, i));
      }
    } else {
      for (let i = count; i < this.length; ++i) {
        this.disposables[i].dispose();
        disposeStore(this.storeArray[i]);
      }
      this.disposables.splice(count, this.length - count);
      this.storeArray.splice(count, this.length - count);
    }
    this.length = count;
  }

  dispose() {
    this.setSize(0);
  }

  forEach(callback) { return this.storeArray.forEach(callback); }
  map(callback) { return this.storeArray.map(callback); }
  filter(callback) { return this.storeArray.filter(callback); }
  get(index) { return this.storeArray[index]; }
  slice(begin, end) { return this.storeArray.slice(begin, end); }
  indexOf(item) { return this.storeArray.indexOf(item); }
}