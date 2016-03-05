/**
 * @flow
 */
import Immutable from 'immutable';

import Dispatcher from './Dispatcher';
import mapObject from './utils/mapObject';
import resolveMapOfPromises from './utils/resolveMapOfPromises';

import type Store from './Store';
import type DispatchHandler from './DispatchHandler';
import type SubscriptionHandler from './SubscriptionHandler';

type StoresMap = Immutable.Map<string, Store<any>>;
type CreateDispatchHandlerFunc = (stores: StoresMap) => DispatchHandler;
type CreateSubscriptionHandlerFunc = () => ?SubscriptionHandler;

/**
 * A factory that creates dispatchers, with either the initial state  of it's stores or from the middle of a dispatch.
 */
export default class DispatcherFactory {

  /**
   * Create a new factory with the given settings.
   *
   * @param settings          {           The settings used to create the factory
   *      stores            {StoresMap}       The initial stores
   *      createDispatchHandler     {Function}        A function that creates new DispatchHandlers
   *      createSubscriptionHandler {[Function]}      A function that creates new SubscriptionHandlers
   *                  }
   *
   * @return              {DispatcherFactory}   The new DispatcherFactory
   */
  static createFactory(settings: Object): DispatcherFactory {
    return new DispatcherFactory(
      Immutable.Map(settings.stores),
      settings.createDispatchHandler,
      settings.createSubscriptionHandler
    );
  }

  _initialStores: StoresMap;
  _createDispatchHandler: CreateDispatchHandlerFunc;
  _createSubscriptionHandler: CreateSubscriptionHandlerFunc;

  /**
   * Constructs the factory.
   *
   * @param initialStores         {StoresMap}   The initial stores
   * @param createDispatchHandler     {Function}    A function that creates new DispatchHandlers
   * @param createSubscriptionHandler   {[Function]}  A function that creates new SubscriptionHandlers
   */
  constructor(
    initialStores: StoresMap,
    createDispatchHandler: CreateDispatchHandlerFunc,
    createSubscriptionHandler?: CreateSubscriptionHandlerFunc
  ) {
    if(!initialStores) throw new Error('DispatcherFactory requires stores');
    if(typeof createDispatchHandler !== 'function') {
      throw new Error('DispatcherFactory requires a createDispatchHandler function');
    }

    this._initialStores = initialStores;
    this._createDispatchHandler = createDispatchHandler;
    this._createSubscriptionHandler = createSubscriptionHandler? createSubscriptionHandler: () => null;
  }

  /**
   * Create a Dispatcher with the initial state of the Stores given to the constructor.
   *
   * @return  {Dispatcher}  The dispatcher
   */
  getInitialDispatcher(): Dispatcher {
    const dispatchHandler = this._createDispatchHandler(this._initialStores);
    const subscriptionHandler = this._createSubscriptionHandler();

    return new Dispatcher(dispatchHandler, subscriptionHandler);
  }

  /**
   * Create a Dispatcher with that stats in the middle of a dispatch.
   *
   * @param actions     {Array<Action>}         The actions to perform, where the first is the action
   *                              being performed when the starting points where paused
   * @param startingPoints  {[key: string]: StartingPoint}  The points to restart the dispatch at
   *
   * @return          {Dispatcher}          The dispatcher after all the actions finish
   */
  getDispatcherAfter(actions: Array<Action>, startingPoints?: {[key: string]: StartingPoint}): Promise<Dispatcher> {
    if(!actions || actions.length === 0) return Promise.resolve(this.getInitialDispatcher());

    const [firstAction, ...otherActions] = actions;

    // Perform first action, start in middle in starting points are given
    const updatedStorePromises = this._initialStores.map((initialStore, storeName) => {
      if(!startingPoints || !startingPoints[storeName]) return initialStore.dispatch(firstAction);

      const startingPoint = startingPoints[storeName];
      return initialStore.dispatch(firstAction, {
        skip: startingPoint.index,
        replaceState: startingPoint.state
      });
    });


    // Perform other actions
    const dispatchHandlerPromise = resolveMapOfPromises(updatedStorePromises).then((updatedStores) => {
      const dispatchHandler = this._createDispatchHandler(updatedStores);
      const waitForDispatch = dispatchHandler.pushActions(otherActions);

      return waitForDispatch.then(() => dispatchHandler);
    });

    // Create Dispatcher
    const dispatcherPromise = dispatchHandlerPromise.then((dispatchHandler) => {
      const subscriptionHandler = this._createSubscriptionHandler();

      return new Dispatcher(dispatchHandler, subscriptionHandler);
    });

    return dispatcherPromise;
  }
}

export const createDispatchFactory = DispatcherFactory.createFactory;
