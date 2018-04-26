import { Emitter } from 'event-kit';
import { findInList, buildStore } from './utils';

const stateKeyReg = /^(\w+)Store$/;

// get store state key from store instance
function getStateKey(storeClass) {
  let res = stateKeyReg.exec(storeClass.name);
  if (!res) {
    throw new Error(`Store ${storeClass.name} must be end with Store`);
  }
  let key = res[1];
  return key[0].toLowerCase() + key.slice(1);
}

export default class StoreBase {
  constructor() {
    this.state = {};
    this.emitter = new Emitter();
    this.inWillUpdate = false;
    this.willUpdateStates = [];
  }

  // Create new store from storeClass. storeClass must be factory or class.  
  buildStore(storeClass) {
    return buildStore(this._appStore, storeClass);
  }

  static getStateKey() {
    if (this._stateKey) {
      this._stateKey = getStateKey(this)      
    }
    return this._stateKey;
  }

  static getStoreKey() {
    if (this._storeKey) {
      let name = this.name;
      this._storeKey = name[0].toLowerCase() + name.slice(1);
    }
    return this._storeKey;
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
        this.state = this.willUpdateStates.reduce((allState, state) => Object.assign(allState, state), nextState);
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

  observeState(callback) {
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