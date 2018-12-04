interface StoreDeclarerOptions {
  args?: [any];
  storeKey?: string;
}

const IS_STORE = '@@__STORE_ITEM__@@';
function StoreDeclarer(Store, options?: StoreDeclarerOptions) {
  this.Store = Store;
  this.options = options;
}
StoreDeclarer.prototype[IS_STORE] = true;
StoreDeclarer.isStore = function(maybeStore) {
  return !!(maybeStore && maybeStore[IS_STORE]);
}

function declareStore(Store, options?: StoreDeclarerOptions) {
  return new StoreDeclarer(Store, options);
}

interface StoreListDeclarerOptions {
  args?: [any];
  storeKey?: string;
  size?: number;
}
const IS_STORE_LIST = '@@__STORE_LIST__@@';
function StoreListDeclarer(Store, options?: StoreListDeclarerOptions) {
  this.Store = Store;
  this.options = options;
}

StoreListDeclarer.prototype[IS_STORE_LIST] = true;
StoreListDeclarer.isStoreList = function(maybeList) {
  return !!(maybeList && maybeList[IS_STORE_LIST]);
}

function declareStoreList(Store, options?: StoreListDeclarerOptions) {
  return new StoreListDeclarer(Store, options);
}

interface StoreMapDeclarerOptions {
  args?: [any];
  storeKey?: string;
  keys?: [string];
}
const IS_STORE_MAP = '@@__STORE_MAP__@@';
function StoreMapDeclarer(Store, options?: StoreMapDeclarerOptions) {
  this.Store = Store;
  this.options = options;
}

StoreMapDeclarer.prototype[IS_STORE_MAP] = true;
StoreMapDeclarer.isStoreMap = function(maybeMap) {
  return !!(maybeMap && maybeMap[IS_STORE_MAP]);
}

function declareStoreMap(Store, options?: StoreMapDeclarerOptions) {
  return new StoreMapDeclarer(Store, options);
}

export { 
  StoreDeclarer, StoreListDeclarer, StoreMapDeclarer, 
  declareStore, declareStoreList, declareStoreMap 
};
