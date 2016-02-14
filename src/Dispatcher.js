/**
 * @flow
 */
import Immutable from 'immutable';

import PromisePlaceholder from './utils/PromisePlaceholder';
import makeSubscribeToGroupFunc from './utils/makeSubscribeToGroupFunc';
import isValidStore from './utils/isValidStore';
import mapObject from './utils/mapObject';
import objectPromise from './utils/objectPromise';
import resolveMapOfPromises from './utils/resolveMapOfPromises';

import type Store from './Store';
import type SubscriptionHandler from './SubscriptionHandler';

type StoresObject = {[key: string]: Store<any>};
type StoresMap = Immutable.Map<string, Store<any>>;
type StatesObject = {[key: string]: any};
type StartingPointObject = {[key: string]: StartingPoint<any>};
type Subscriber = SubscriptionFunc<StatesObject>;
type UnsubscibeFunc = () => void;
type DispatcherIsoFunc = (
	action: Action,
	pausePoints: {[key: string]: StartingPoint<any>}
) => Promise<{[key: string]: any}>;


/*------------------------------------------------------------------------------------------------*/
//	--- Dispatcher ---
/*------------------------------------------------------------------------------------------------*/
/**
 * A class that contains a group of stores that should all recive the same actions.
 */
export class Dispatcher {

	_stores: StoresMap;
	_subscriptionHandler: ?SubscriptionHandler;
	_isDispatching: boolean;

	/**
	 * Create a Dispatch from the given Stores.
	 *
	 * @param stores				{StoresMap}				The stores that the action are
	 *														dispatched to
	 * @param subscriptionHandler	{?SubscriptionHandler}	The subscription handler that
	 *														keeps track of the of the function
	 *														that have subscribed
	 */
	constructor(stores: StoresMap, subscriptionHandler: ?SubscriptionHandler) {
		// Check stores are valid
		stores.forEach((store, storeName) => {
			if(typeof storeName !== 'string')	throw new Error('store name must be a string');
			if(!isValidStore(store))			throw new Error('invalid store');
		});

		this._stores = stores;
		this._subscriptionHandler = subscriptionHandler;
		this._isDispatching = false;
	}

	 /**
	 * Dispatch the given action to all of the stores.
	 *
	 * @param action	{Object}					The action to dispatch
	 *
	 * @throws										When dispatch has already been called but hasn't
	 *												finished
	 *
	 * @return			{Promise<{string: any}>}	The states after the dispatch is finished
	 */
	dispatch(action: Action): Promise<{[key: string]: any}> {
		if(this._isDispatching) {
			return Promise.reject(new Error('cannot dispatch until dispatch is finished'));
		}
		if(!action || typeof action !== 'object') {
			return Promise.reject(new Error('actions must be objects'));
		}

		// Start dispatch
		this._isDispatching = true;

		// Perform dispatch
		const dispatchedStoresPromises = this._stores.map((store) => store.dispatch(action));

		return resolveMapOfPromises(dispatchedStoresPromises).then((newStores) => {
			// Finish dispatch
			this._isDispatching = false;

			// Save Stores
			this._stores = newStores;

			// Send state to subscribers
			const newStates = newStores.map((store) => store.getState()).toJS();
			if(this._subscriptionHandler) {
				this._subscriptionHandler.publish(newStates);
			}

			// Get states
			return newStates;
		});
	}

	/**
	 * Gets the state from all of the Stores.
	 *
	 * @throws								When dispatch is currently running
	 *
	 * @return	{{string: any}}				The state of all the stores
	 */
	getStateForAll(): {[key: string]: any} {
		if(this._isDispatching) throw new Error('cannot get state until dispatch is finished');

		const states = this._stores.map((store) => store.getState());
		return states.toJS();
	}

	/**
	 * Gets the state from the given store of the Stores.
	 *
	 * @param storeName	{string}	The name of the store to get the state of
	 *
	 * @throws						When dispatch is currently running
	 *
	 * @return			{any}		The state of the given store
	 */
	getStateFor(storeName: string): any {
		if(this._isDispatching) throw new Error('cannot get state until dispatch is finished');
		if(!this._stores.has(storeName)) {
			throw new Error(`store name(${storeName}) does not exist`);
		}

		return this._stores.get(storeName).getState();
	}

	/**
	 * Add a new subscriber to all Stores.
	 *
	 * @param subscriber {({string: any}) => void}	The function to call, with the state, after each
	 *												dispatch
	 *
	 * @return			{() => void}				The function to call to unsubscibe
	 */
	subscribeToAll(subscriber: Subscriber): UnsubscibeFunc {
		// Subscribe
		if(!this._subscriptionHandler) {
			throw new Error(
				'cannot subscribe if the dispatcher was not created with a subscription handler'
			);
		}
		this._subscriptionHandler = this._subscriptionHandler.subscribe(subscriber);

		let hasUnsubscribed = false;
		return () => {
			if(!this._subscriptionHandler) {
				throw new Error(
					'cannot unsubscripted if the dispatcher was not created' +
					'with a subscription handler'
				);
			}

			// Check if this function has already been called
			if(hasUnsubscribed) {
				throw new Error('subscriber has already been removed from the dispatcher');
			}
			else {
				hasUnsubscribed = true;
			}

			this._subscriptionHandler = this._subscriptionHandler.unsubscribe(subscriber);
		};
	}

	/**
	 * Add a new subscriber to the given Store.
	 *
	 * @param storeName	{string}			The store to subscribe to
	 * @param subscriber {(any) => void}	The function to call, with the state, after each
	 *										dispatch
	 *
	 * @return			{() => void}		The function to call to unsubscibe
	 */
	subscribeTo(storeName: string, subscriber: Subscriber): UnsubscibeFunc {
		// Check inputs
		if(typeof storeName !== 'string') throw new Error('store name must be a string');
		if(!this._stores.has(storeName)) {
			throw new Error('store(${storeName}) dose not exist');
		}

		// Create subscribtion function for single store
		const storeSubscriber = makeSubscribeToGroupFunc(storeName, subscriber);

		// Subscribe
		if(!this._subscriptionHandler) {
			throw new Error(
				'cannot subscribe if the dispatcher was not created with a subscribtion handler'
			);
		}
		this._subscriptionHandler = this._subscriptionHandler.subscribe(storeSubscriber);

		// Unsubscribe
		var hasUnsubscribed = false;
		return () => {
			if(!this._subscriptionHandler) {
				throw new Error(
					'cannot unsubscribe if the dispatcher was not created' +
					'with a subscribtion handler'
				);
			}

			// Check if this function has already been called
			if(hasUnsubscribed) {
				throw new Error('subscriber has already been removed from the dispatcher');
			}
			else {
				hasUnsubscribed = true;
			}

			this._subscriptionHandler = this._subscriptionHandler.unsubscribe(storeSubscriber);
		};
	}
}

/*------------------------------------------------------------------------------------------------*/
//	--- Client Dispatcher ---
/*------------------------------------------------------------------------------------------------*/
/**
 * A sub-class of dispatch for the client.
 */
class ClientDispatcher extends Dispatcher {

	_pausePoints: ?{[key: string]: StartingPoint<any>};
	_finishOnServer: DispatcherIsoFunc;

	/**
	 * See super class
	 *
	 * @param finishOnServer	{DispatcherIsoFunc}	The function to call when finishing a dispatch
	 *												call on the server
	 */
	constructor(
		finishOnServer: DispatcherIsoFunc,
		stores: StoresMap,
		subscriptionHandler: ?SubscriptionHandler
	) {
		if(typeof finishOnServer !== 'function') {
			throw new Error('finishOnServer must be a function');
		}

		super(stores, subscriptionHandler);
		this._pausePoints = null;
		this._finishOnServer = finishOnServer;
	}

	/**
	 * See super class
	 */
	dispatch(action: Action): Promise<{[key: string]: any}> {
		this._startDispatch(action);

		return super.dispatch(action).then((newStates) => {
			this._finishDispatch();

			return newStates;
		}).catch((err) => {
			this._finishDispatch();

			return Promise.reject(err);
		});
	}

	_startDispatch(action: Action) {
		this._pausePoints = {};

		//NOTE, not all (or possible no) placeholders are used
		let promisePlaceholders = Immutable.Map();
		this._stores = this._stores.map((store, storeName) => {
			const currPromisePlaceholder = new PromisePlaceholder();
			promisePlaceholders = promisePlaceholders.set(storeName, currPromisePlaceholder);

			return store.finishOnServerUsing(
				this._createFinishOnServer(storeName, currPromisePlaceholder.getPromise())
			);
		});

		// Start listening for 'onServer' calls
		this._performFinishOnServer(action, promisePlaceholders);
	}

	_finishDispatch() {
		this._pausePoints = null;
	}

	_performFinishOnServer(
		action: Action,
		promisePlaceholders: Immutable.Map<string, PromisePlaceholder<any>>,
		timeout: number = 50
	) {
		setTimeout(() => {
			// Check dispatch has finished
			if(!this._pausePoints) return;

			// If no puase points set
			if(Object.keys(this._pausePoints).length === 0) {
				this._performFinishOnServer(action, promisePlaceholders, timeout);
				return;
			}

			// Call server
			this._finishOnServer(action, this._pausePoints).then((newStates) => {
				// Send results to results promises for each store
				for(let storeName in newStates) {
					if(!promisePlaceholders.has(storeName)) {
						throw new Error(`invalid store(${storeName}) returned from server`);
					}
					if(!newStates[storeName]) {
						throw new Error(`missing store(${storeName}) returned from server`);
					}

					promisePlaceholders.get(storeName).resolve(newStates[storeName]);
				}
			}).catch((err) => {
				// Send error to promise for each store
				promisePlaceholders.forEach((promisePlaceholder) => {
					promisePlaceholder.reject(err);
				});
			}).then(() => {
				// Listen for any remaning 'onServer' calls
				this._performFinishOnServer(action, promisePlaceholders, timeout)
			});
		}, timeout);
	}

	_createFinishOnServer<S>(
		storeName: string,
		statePromise: Promise<S>
	): (action: Action, startingPoint: StartingPoint<S>) => Promise<S> {
		if(!this._stores.has(storeName)) {
			throw new Error(
				`cannot create finishOnServer for non-existing store(${storeName})`
			);
		}

		return (action, pausePoint) => {
			this._addStoreToFinishOnServer(storeName, pausePoint);

			return statePromise;
		};
	}

	_addStoreToFinishOnServer(storeName: string, pausePoint: StartingPoint<any>) {
		if(!this._pausePoints) {
			throw new Error('store[${storeName}].dispatch was called not from dispatcher.dispatch');
		}

		this._pausePoints[storeName] = pausePoint;
	}
}

/*------------------------------------------------------------------------------------------------*/
//	---  ServerDispatcher ---
/*------------------------------------------------------------------------------------------------*/
/**
 * A sub-class of dispatch for the server.
 */
class ServerDispatcher extends Dispatcher {
	/**
	 * See super class
	 *
	 * @param onServerArg	{any}	The argument to pass the onServer callback in the updaters
	 */
	constructor(
		onServerArg: any,
		stores: StoresMap,
		subscriptionHandler: ?SubscriptionHandler
	) {
		// Add arg to stores
		const updatedStores = stores.map((store) => store.setOnServerArg(onServerArg));

		super(updatedStores, subscriptionHandler);
	}

	/**
	 * Create a new ServerDispatcher with the given arg, but the same stores/subscriptions as this.
	 *
	 * @param onServerArg	{any}	The argument to pass the onServer callback in the updaters
	 *
	 * @return	{ServerDispatcher}	The new dispatcher
	 */
	cloneWithOnServerArg(onServerArg: any): ServerDispatcher {
		return new ServerDispatcher(onServerArg, this._stores, this._subscriptionHandler);
	}

	/**
	 * Dispatch the given action to starting at each of the given starting points.
	 *
	 * @param action			{Object}					The action to dispatch
	 * @param startingPoints	{{string: StartingPoint}}	The starting points for some of the
	 *														Stores
	 * @param arg				{any}						The arg to send as the 3rd param in
	 *														the updator funcs
	 *
	 * @throws												When dispatch has already been
	 *														called but hasn't finished
	 *
	 * @return					{Promise<{string: any}>}	The states after the dispatch is
	 *														finished
	 */
	startDispatchAt(action: Action, startingPoints: StartingPointObject): Promise<StatesObject> {
		if(this._isDispatching) {
			return Promise.reject(new Error('cannot dispatch until dispatch is finished'));
		}
		if(!action || typeof action !== 'object') {
			return Promise.reject(new Error('actions must be objects'));
		}
		if(!startingPoints || typeof startingPoints !== 'object') {
			return Promise.reject(new Error('starting point must be an object of starting points'));
		}
		for(let storeName in startingPoints) {
			const startingPoint = startingPoints[storeName];
			if(!startingPoint || typeof startingPoint !== 'object') {
				return Promise.reject(
					new Error('starting point must be an object of starting points')
				);
			}
		}

		// Start dispatch
		this._isDispatching = true;

		// Perform dispatch
		const dispatchedStoresPromises = mapObject(startingPoints, (startingPoint, storeName) => {
			return this._stores.get(storeName).startDispatchAt(action, startingPoint);
		});

		// Get states for updated stores
		return objectPromise(dispatchedStoresPromises).then((dispatchedStores) => {
			return mapObject(dispatchedStores, (dispatchedStore, storeName) => {
				// Save results
				this._stores = this._stores.set(storeName, dispatchedStore);

				// Finish dispatch
				this._isDispatching = false;

				return dispatchedStore.getState();
			});
		});
	}
}

/**
 * Create a Dispatch from the given Stores.
 *
 * @param stores				{StoresMap}				The stores that the action are
 *														dispatched to
 * @param subscriptionHandler	{?SubscriptionHandler}	The subscription handler that
 *														keeps track of the of the function
 *														that have subscribed
 *
 * @return						{Dispatcher}			The new Dispatcher
 */
export function createDispatcher(
	stores: StoresObject,
	subscriptionHandler: ?SubscriptionHandler
): Dispatcher {
	// Check stores is basic js object
	if(!stores || typeof stores !== 'object') {
		throw new Error('store must be passed as an object');
	}

	return new Dispatcher(Immutable.Map(stores), subscriptionHandler);
}

/**
 * Create a Client Dispatch from the given Stores.
 *
 * @param finishOnServer		{DispatcherIsoFunc}		The function to call when finishing a
 *														dispatch call on the server
 * @param stores				{StoresObject}			The stores that the action are
 *														dispatched to
 * @param subscriptionHandler	{?SubscriptionHandler}	The subscription handler that
 *														keeps track of the of the function
 *														that have subscribed
 *
 * @return						{Dispatcher}		The new Client Dispatcher
 */
export function createClientDispatcher(
	finishOnServer: DispatcherIsoFunc,
	stores: StoresObject,
	subscriptionHandler: ?SubscriptionHandler
): Dispatcher {
	// Check stores is basic js object
	if(!stores || typeof stores !== 'object') {
		throw new Error('store must be passed as an object');
	}

	return new ClientDispatcher(finishOnServer, Immutable.Map(stores), subscriptionHandler);
}

/**
 * Create a Server Dispatch from the given Stores.
 *
 * @param getOnServerArg		{() => any | Promise}	The function that is called each time
 *														the updaters are called, it should
 *														return the argument to pass the onServer
 *														callback in the updaters (can be in a
 *														Promise)
 * @param stores				{StoresObject}			The stores that the action are
 *														dispatched to
 * @param subscriptionHandler	{?SubscriptionHandler}	The subscription handler that
 *														keeps track of the of the function
 *														that have subscribed
 *
 * @return						{Dispatcher}			The new Server Dispatcher
 */
export function createServerDispatcher(
	getOnServerArg: () => any | Promise<any>,
	stores: StoresObject,
	subscriptionHandler: ?SubscriptionHandler
): ServerDispatcher {
	// Check stores is basic js object
	if(!stores || typeof stores !== 'object') {
		throw new Error('store must be passed as an object');
	}

	return new ServerDispatcher(getOnServerArg, Immutable.Map(stores), subscriptionHandler);
}