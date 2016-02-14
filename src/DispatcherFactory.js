/**
 * @flow
 */
import Immutable from 'immutable';

import Dispatcher from './Dispatcher';
import mapObject from '../utils/mapObject';
import objectPromise from '../utils/objectPromise';

import type Store from '../Store';

type StoresMap = Immutable.Map<string, Store<any>>;
type CreateDispatchHandlerFunc = (stores: StoresMap) => DispatchHandler;
type CreateSubscriptionHandlerFunc = () => SubscriptionHandler;

/**
 * A factory that creates dispatchers, with either the initial state  of it's stores or from the middle of a dispatch.
 */
export default class DispatcherFactory {

	/**
	 * Create a new factory with the given settings.
	 *
	 * @param settings					{						The settings used to create the factory
	 *			initialStores 				{StoresMap}				The initial stores
	 *			createDispatchHandler 		{Function}				A function that creates new DispatchHandlers
	 *			createSubscriptionHandler 	{Function}				A function that creates new SubscriptionHandlers
	 *									}
	 *
	 * @return							{DispatcherFactory}		The new DispatcherFactory
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
	 * @param initialStores 				{StoresMap}		The initial stores
	 * @param createDispatchHandler 		{Function}		A function that creates new DispatchHandlers
	 * @param createSubscriptionHandler 	{Function}		A function that creates new SubscriptionHandlers
	 */
	construtor(
		initialStores: StoresMap,
		createDispatchHandler: CreateDispatchHandlerFunc,
		createSubscriptionHandler: CreateSubscriptionHandlerFunc
	) {
		this._initialStores = initialStores;
		this._createDispatchHandler = createDispatchHandler;
		this._createSubscriptionHandler = createSubscriptionHandler;
	}

	/**
	 * Create a Dispatcher with the initial state of the Stores given to the constructor.
	 *
	 * @return	{Dispatcher}	The dispatcher
	 */
	getInitialDispatcher(): Dispatcher {
		return new Dispatcher(
			this._createDispatchHandler(this._initialStores),
			this._createSubscriptionHandler()
		);
	}

	/**
	 * Create a Dispatcher with that stats in the middle of a dispatch.
	 *
	 * @param startingPoints	{[key: string]: StartingPoint}	The points to restart the dispatch at
	 * @param actions			{Array<Action>}					The actions to perform, where the first is the action
	 *															being performed when the starting points where paused
	 *
	 * @return					{Dispatcher}					The dispatcher after all the actions finish
	 */
	getDispatcherAfter(startingPoints: {[key: string]: StartingPoint}, actions: Array<Action>): Promise<Dispatcher> {
		const [startingAction, ...otherActions] = actions;

		// Get store afters first actions finish
		const updatedStorePromises = Immutable.Map(startingPoints).map(startingPoint, storeName) => {
			if(!this._initialStores[storeName]) throw new Error(`Invalid store name, ${storeName}`);

			return this._initialStores[storeName].dispatch(startingAction, {
				skip: startingPoint.index,
				replaceState: startingPoint.state
			});
		});


		// Perform other actions
		const dispatchHandlerPromise = objectPromise(updatedStorePromises).then((updatedStores) => {
			const newStores = this._initialStores.merge(this._updatedStores);
			const dispatchHandler = this._createDispatchHandler(newStores);

			return dispatchHandler.pushManyActions(otherActions);
		});

		// Create Dispatcher
		const dispatcherPromise = dispatchHandlerPromise.then((dispatchHandler) => {
			const subscriptionHandler = this._createSubscriptionHandler();

			return new Dispatcher(dispatchHandler, subscriptionHandler
		});

		return dispatcherPromise;
	}
}