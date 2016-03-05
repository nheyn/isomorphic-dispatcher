/**
 * @flow
 */
import Store from './Store';
import { ServerDispatchHandler, ClientDispatchHandler } from './DispatchHandler';
import { createDispatchFactory } from './DispatcherFactory';
import { createSubscriptionHandler } from './SubscriptionHandler';

import type Immutable from 'immutable';
import type DispatchHandler from './DispatchHandler';
import type DispatcherFactory from './DispatcherFactory';
import type SubscriptionHandler from './SubscriptionHandler';

type StoresMap = Immutable.Map<string, Store<any>>;
type StoresObject = {[key: string]: Store<any>};
type FinishOnServerFunc = (startingPoints: {[key: string]: StartingPoint}, actions: Array<Action>) => any;

/**
 * Creates a DispatcherFactory, from the given stores, that should be used on the server.
 *
 * @param stores    {StoresObject}    The initial stores to use in the dispatcher
 * @param onServerArg {any}       The argument to pass to the function given to 'onServer'
 *                      NOTE: 'onServer' is the third argument passed to each updater
 *
 * @return        {DispatcherFactory} The dispatcher factory
 */
export function createServerFactory(stores: StoresObject, onServerArg: any): DispatcherFactory {
  return createDispatchFactory({
    stores,
    createDispatchHandler(currStores: StoresMap): DispatchHandler {
      return new ServerDispatchHandler(currStores, onServerArg);
    },
    createSubscriptionHandler(): SubscriptionHandler {
      return createSubscriptionHandler()
    }
  });
}

/**
 * Creates a DispatcherFactory, from the given stores, that should be used on the client.
 *
 * @param stores      {StoresObject}      The initial stores to use in the dispatcher
 * @param finishOnServer  {FinishOnServerFunc}  A function that will send the state of dispatch to finish on the
 *                          server
 *
 * @return          {DispatcherFactory}   The dispatcher factory
 */
export function createClientFactory(stores: StoresObject, finishOnServer: FinishOnServerFunc): DispatcherFactory {
  return createDispatchFactory({
    stores,
    createDispatchHandler(currStores: StoresMap): DispatchHandler {
      return new ClientDispatchHandler(currStores, finishOnServer);
    },
    createSubscriptionHandler(): SubscriptionHandler {
      return createSubscriptionHandler();
    }
  });
}

/**
 * Create a new Store.
 *
 * @param initialState  {any} The initial state of the object
 *
 * @return        {Store} The new Store
 */
export function createStore<S>(initialState: S): Store<S> {
  return Store.createStore(initialState);
}