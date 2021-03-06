import { Disposable, CompositeDisposable } from 'event-kit';
import StoreBase from './StoreBase';

export default class StoreRecycleBase extends StoreBase {
  disposables = new CompositeDisposable();

  addDisposable(item) {
    this.disposables.add(item);
  }

  dispose() {
    super.dispose();
    this.disposables.dispose();
  }
}