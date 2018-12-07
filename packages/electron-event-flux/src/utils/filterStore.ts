/*
  Given an source Store and find all of the store names

  Examples:
  new TodoStore({ hello: new HelloStore, world: new WorldStore }) => { todoStore: { hello, world } }  
*/
import { StoreDeclarer, StoreListDeclarer, StoreMapDeclarer } from '../StoreDeclarer';
import StoreList from './StoreList';
import StoreMap from './StoreMap';
import { beforeInit } from './storeBuilder';
const isFunction = require('lodash/isFunction');
const omit = require('lodash/omit');

const storeBuilders = {
  Item: function (StoreClass, storeKey, stateKey, args) {
    if (this.setStore) {
      return this.setStore(storeKey, this.buildStore(StoreClass, args));
    }  
    this[storeKey] = this.buildStore(StoreClass, args);
  },
  List: function (StoreClass, storeKey, stateKey, args) {
    let storeBuilder = () => this.buildStore(StoreClass, args);
    let storeObserver = (store, index) => {
      return store.observe(state => {
        let oldStates = this.state[stateKey] || [];
        this.setState({
          [stateKey]: [
            ...oldStates.slice(0, index), 
            state,
            ...oldStates.slice(index + 1), 
          ]
        });
      });
    }
    let newStore = new StoreList(0, storeBuilder, storeObserver);
    if (this.setStore) return this.setStore(storeKey, newStore);
    this[storeKey] = newStore;
  },
  Map: function (StoreClass, storeKey, stateKey, args) {
    let storeBuilder = () => this.buildStore(StoreClass, args);
    let storeObserver = (store, index) => {
      if (!stateKey) {
        return store.observe(state => 
          this.setState({
            [index]: state
          })
        );
      }
      return store.observe(state => this.setState({
        [stateKey]: { ...this.state[stateKey], [index]: state },
      }));
    }
    let newStore = new StoreMap(null, storeBuilder, storeObserver);
    if (this.setStore) return this.setStore(storeKey, newStore);
    this[storeKey] = newStore;    
  }
}

const storeObservers = {
  Item: function (storeKey, stateKey) {
    let store = this.getStore ? this.getStore(storeKey) : this[storeKey];
    let disposable = store.observe((state) => {
      this.setState({ [stateKey]: state });
    });
    let dispose = store.dispose;
    store.dispose = function() {
      dispose.call(this);
      disposable && disposable.dispose();
    };
  },
  List: function (storeKey, stateKey, options) {
    let count = options && options.size || 0;
    if (count > 0) {
      let store = this.getStore ? this.getStore(storeKey) : this[storeKey];      
      store.setSize(count);
    }
  },
  Map: function (storeKey, stateKey, options) {
    let keys = options && options.keys;
    if (Array.isArray(keys)) {
      let store = this.getStore ? this.getStore(storeKey) : this[storeKey];            
      keys.forEach(key => store.add(key));
    }
  }
}

function extendClass(StoreClass) {
  // return class ExtendStoreClass extends StoreClass {};
  function ExtendStoreClass(...args) {
    const obj = new StoreClass(...args);
    Object.setPrototypeOf(obj, new.target.prototype); 
    // or B.prototype, but if you derive from B you'll have to do this dance again
  
    // use obj instead of this
    return obj;
  }
  Object.setPrototypeOf(ExtendStoreClass.prototype, StoreClass.prototype);
  Object.setPrototypeOf(ExtendStoreClass, StoreClass);
  return ExtendStoreClass;
}

function filterOneStore(StoreClass) {
  if (!StoreClass) return null;
  let innerStores = StoreClass.innerStores;
  if (!innerStores) return null;

  let filters = {};
  let subStoreInfos = [];
  for (let key in innerStores) {
    let value = innerStores[key];
    if (isFunction(value)) {
      let storeName = key + 'Store';
      let Store = extendClass(value);
      filters[storeName] = { 
        type: 'Store',
        filters: filterOneStore(Store),
      };
      subStoreInfos.push(['Item', Store, storeName, key]);
    } else {
      let { options, Store } = value;
      let storeName = options && options.storeKey || key + 'Store';
      Store = extendClass(Store);

      if (StoreDeclarer.isStore(value)) {
        filters[storeName] = { 
          type: 'Store',
          filters: filterOneStore(Store),
        };
        subStoreInfos.push(['Item', Store, storeName, key, options]);
      } else if (StoreListDeclarer.isStoreList(value)) {
        filters[storeName] = {
          type: 'StoreList',
          filters: filterOneStore(Store),
        }
        subStoreInfos.push(['List', Store, storeName, key, options]);
      } else if (StoreMapDeclarer.isStoreMap(value)) {
        filters[storeName] = {
          type: 'StoreMap',
          filters: filterOneStore(Store),
        };
        if (options && options.directInsert) key = null;
        subStoreInfos.push(['Map', Store, storeName, key, options]);
      }
    }
  }
  StoreClass.prototype.buildStores = function() {
    subStoreInfos.forEach(([type, StoreClass, storeKey, stateKey, options]) => {
      storeBuilders[type].call(this, StoreClass, storeKey, stateKey, options && options.args);
      let store = this.getStore ? this.getStore(storeKey) : this[storeKey];
      store.buildStores && store.buildStores();
    });
  };
  StoreClass.prototype.initStores = function(parentStore) {
    subStoreInfos.forEach((info) => {
      let storeKey = info[2];
      let store = this.getStore ? this.getStore(storeKey) : this[storeKey];
      
      beforeInit(store, parentStore);

      store.willInit && store.willInit();
      store.initStores && store.initStores(store);
      store._initWrap();
    });
  };
  StoreClass.prototype.startObserve = function() {
    subStoreInfos.forEach(([type, StoreClass, storeKey, stateKey, options]) => {
      let store = this.getStore ? this.getStore(storeKey) : this[storeKey];
      store.startObserve && store.startObserve();
      storeObservers[type].call(this, storeKey, stateKey, options);
    });
  };
  StoreClass.prototype.disposeStores = function() {
    subStoreInfos.forEach(info => {
      let storeKey = info[2];
      let store = this.getStore ? this.getStore(storeKey) : this[storeKey];
      if (store) {
        store.disposeStores && store.disposeStores();
        store.dispose();
      }
    });
  };
  return filters;
}

function filterStore(stores) {
  let storeFilters = {};
  for (let key in stores) {
    let store = stores[key];
    storeFilters[key] = { type: 'Store', filters: filterOneStore(store.constructor) };
  }
  return storeFilters;
};

function filterWindowStore(storeFilters, winStoreKey, winId) {
  let winFilters = storeFilters[winStoreKey].filters;
  if (!winFilters) return storeFilters;
  winFilters = winFilters.winPackMapStore.filters;
  if (!winFilters) return omit(storeFilters, [winStoreKey]);
  let winOnlyShape = {};
  let path = [winStoreKey, { type: 'Map', name: 'winPackMapStore', index: winId }];
  Object.keys(winFilters).forEach(storeKey => {
    winOnlyShape[storeKey] = { ...winFilters[storeKey], path };
  });
  return { ...omit(storeFilters, [winStoreKey]), ...winOnlyShape };
}

function filterWindowState(allState, winStateKey, winId) {
  if (!allState[winStateKey]) return allState;
  let { winPackMap } = allState[winStateKey];
  if (!winPackMap) return omit(allState, [winStateKey]);
  let winState = winPackMap[winId];

  return { ...omit(allState, [winStateKey]), ...winState };
}

function filterWindowDelta(updated, deleted, winStateKey, winId) {
  return [
    filterWindowState(updated, winStateKey, winId),
    filterWindowState(deleted, winStateKey, winId)
  ];
}

export {
  filterOneStore, filterWindowStore, filterWindowState, filterWindowDelta,
};