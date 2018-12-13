import { Emitter } from 'event-kit';
import { buildStore } from './buildStore';

const IS_STORE = '@@__FLUX_STORE__@@';

export default class StoreBase {
  state: any = {};
  appStores: any;
  parentStore: StoreBase;

  emitter = new Emitter();
  inWillUpdate = false;
  willUpdateStates = [];
  _isInit = false
  _appStore = null;
  batchUpdater: any;

  static isStore;
  static innerStores;

  _initWrap() {
    if (!this._isInit) {
      this.init && this.init();
      this._isInit = true;
    }
  }

  init() {}

  // Create new store from storeClass. storeClass must be factory or class.  
  buildStore(storeClass, args) {
    if (!this._appStore) return console.error('Can not invoke buildStore in constructor');
    let store = buildStore(this._appStore, storeClass, args);
    // store._initWrap();
    return store;
  }

  setState(state) {
    // 当will-update，将状态保存到缓存队列中
    if (this.inWillUpdate) {
      return this.willUpdateStates.push(state);
    }
    // Make the update delay to next tick that can collect many update into one operation.
    this.batchUpdater.addTask(() => {
      let nextState = { ...this.state, ...state }; 
      this.inWillUpdate = true;   
      this.emitter.emit('will-update', nextState);
      this.inWillUpdate = false;
      if (this.willUpdateStates.length > 0) {
        this.state = this.willUpdateStates.reduce((allState, state) => 
          (Object as any).assign(allState, state
        ), nextState);
        this.willUpdateStates = [];
      } else {
        this.state = nextState;
      }
      this.emitter.emit('did-update', this.state);
    });
    // this.emitter.emit('did-update', this.state);
  }

  onDidUpdate(callback) {
    return this.emitter.on('did-update', callback);
  }

  onWillUpdate(callback) {
    return this.emitter.on('will-update', callback);    
  }

  observe(callback) {
    callback(this.state);
    return this.emitter.on('did-update', callback);    
  }

  dispose() {
    this.emitter.dispose();
  }

  getState() {
    return this.state;
  }
}

StoreBase.prototype[IS_STORE] = true;
StoreBase.isStore = function(maybeStore) {
  return !!(maybeStore && maybeStore[IS_STORE]);
}