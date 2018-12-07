import * as React from 'react';
import { StoreContext } from './Provider';
import { pick } from 'event-flux/lib/utils';

const notUsed = () => null;
function unifySelector(selector) {
  if (!selector) return notUsed;
  if (typeof selector !== 'function') {
    if (!Array.isArray(selector)) selector = [selector];
    return (state) => pick(state, selector); 
  }
  return selector;
}

export default function withState(stateSelector, storeSelector) {
  storeSelector = unifySelector(storeSelector);
  stateSelector = unifySelector(stateSelector);
  return function(Component) {

    return class Injector extends React.PureComponent<any> {
      render() {
        let props = this.props;
        return (
          <StoreContext.Consumer>
            {value => <Component 
              {...props}
              {...storeSelector(value.stores, props)} 
              {...stateSelector(value.state, props)}
            />}
          </StoreContext.Consumer>
        );
      }
    }
  }
}