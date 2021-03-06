function setItem(key, value) {
  if (value === null || value === undefined) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, value);
  }
}

export class NSStorage {
  ns: any;

  constructor(ns) {
    this.ns = ns;
  }

  setItem(key, value) {
    setItem(`${this.ns}.${key}`, value);
  }

  getItem(key) {
    return localStorage.getItem(`${this.ns}.${key}`);
  }
}

export default class AsyncStorage {
  version: number;

  // Update the version when the storage is obsolete
  constructor(version) {
    this.version = version;
  }

  init(version) {
    if (version) {
      const curVersion = parseInt(this.getItem('version'));
      if (version !== curVersion) {
        localStorage.clear();
        localStorage.setItem('version', version);
      }
    }
  }

  setItem(key, value) {
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  }

  getItem(key) {
    return localStorage.getItem(key);
  }

  getNSStorage(namespace) {
    return new NSStorage(namespace);
  }
}