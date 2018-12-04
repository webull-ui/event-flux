
import StoreBase from './StoreBase';
import { findInObject } from './utils';

const StoreExp = /Store/;
// Parse the store instance or create instance from instance class
export function parseStore(store, args: [] = []) {
  if (typeof store === 'function') {
    return new store(...args);
  } else if (typeof store === 'object') {
    return store;
  } else {
    console.error('The store you specific must be Store instance or Store class');
    return null;
  }
}

const stateKeyReg = /^(\w+)Store$/;
const storeKeyReg = /^(\w+)State$/

// get store state key from store instance
export function getStateKey(storeClass) {
  if (storeClass.stateKey) return storeClass.stateKey;
  if (!storeClass.storeKey) {
    throw new Error(`Store ${storeClass.name} must provider storeKey or stateKey`);
  }
  let res = stateKeyReg.exec(storeClass.storeKey);
 
  let key = res ? res[1] : storeClass.storeKey + 'State';
  storeClass.stateKey = key;
  return key;
}

/**
 * generate stateKey according to storeKey , example 
 * if the stateKey is userInfo , then the storeKey is userInfoState.
 * even if the stateKey is userInfoState , the storeKey also is userInfoState.
 * @param {*} storeClass 
 */
export function getStoreKey(storeClass) {
  if (storeClass.storeKey) return storeClass.storeKey;
  if (!storeClass.stateKey) {
    throw new Error(`Store ${storeClass.name} must provider storeKey or stateKey`);
  }
  let res = storeKeyReg.exec(storeClass.stateKey);
  storeClass.storeKey = res ? res[1] : storeClass.stateKey + 'Store';
  return storeClass.storeKey;
}

// storeClass must be factory or class.
export function buildStore(appStore, storeClass, args) {
  let store = parseStore(storeClass, args);
  store.batchUpdater = appStore.batchUpdater;
  store._appStore = appStore;
  store.appStores = appStore.stores;
  if (appStore._init) store._initWrap();  //appStore已经初始化，直接init store
  return store;
}

export function buildObserveStore(appStore, storeClass) {
  let store = buildStore(appStore, storeClass, null);
  const stateKey = getStateKey(storeClass);
  store.observe((state) => {
    appStore.setState({ [stateKey]: state });
  });
  return store;
}