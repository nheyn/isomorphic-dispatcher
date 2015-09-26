/**
 * @flow
 */
var SubscriptionHandler = require('./SubscriptionHandler');

import type * as Store from './Store';

type StoresObject = {[key: string]: Store<any>};
type StatesObject = {[key: string]: any};
type Subscriber = SubscriptionFunc<StatesObject>;
type UnsubscibeFunc = () => void;
type DispatcherIsoFunc = (
	action: Action,
	startingPoints: {[key: string]: StartingPoint<any>}
) => Promise<{[key: string]: any}>;
type ServerDispatcher = any; //Dispatcher & { startDispatchAt: () => any }

/*------------------------------------------------------------------------------------------------*/
//	--- Dispatcher ---
/*------------------------------------------------------------------------------------------------*/
/**
 * A class that contains a group of stores that should all recive the same actions.
 */
class Dispatcher {

	_stores: StoresObject;
	_subscriptionHandler: ?SubscriptionHandler;
	_isDispatching: boolean;

	/**
	 * Create a dispatch from a the given Stores.
	 *
	 * @param stores				{StoresObject}	The stores that the action are
	 *															dispatched to
	 * @param subscriptionHandler	{?SubscriptionHandler}		The subscription handler that
	 *															keeps track of the of the function
	 *															that have subscribed
	 */
	constructor(stores: StoresObject, subscriptionHandler: ?SubscriptionHandler) {
		// Check inputs
		if(typeof stores !== 'object')		throw new Error('store must be passed as an object');
		var validatedStores = mapStores(stores, (store, storeName) => {
			if(!validStoreName(storeName))	throw new Error('store name must be a string');
			if(!validStore(store))			throw new Error('invalid store')

			return store;
		});

		this._stores = validatedStores;
		this._subscriptionHandler = subscriptionHandler;
		this._isDispatching = false;
	}

	/**
	 * Create a dispatch from a the given Stores.
	 *
	 * @param _stores				{StoresObject}	The stores that the action are dispatched to
	 *
	 * @return						{Dispatcher}	The new Dispatcher
	 */
	static createDispatcher(stores: StoresObject): Dispatcher {
		return new Dispatcher(stores, SubscriptionHandler.createSubscriptionHandler());
	}

	//TODO, need to make subclasses to make this work w/ flowtype
	/**
	 * Create a server dispatch from a the given Stores.
	 *
	 * @param stores				{StoresObject}		The stores that the action are dispatched to
	 * @param finishOnServer		{DispatcherIsoFunc}	The function to call when finishing a
	 *													dispatch call on the server
	 *
	 * @return						{Dispatcher}		The new Client Dispatcher
	 *
	static createClientDispatcher(
		stores: StoresObject,
		finishOnServer: DispatcherIsoFunc
	): Dispatcher {
		// Update stores for client -> server communication
		var clientStores = mapStores(stores, (store) => {
			return store.useIsoDispatcher((action, startingPoint) => {
				//TODO, nyi
				return Promise.reject(new Error('nyi'));
			});
		});

		// Update dispatcher for client -> server communication
		var dispatcher = Dispatcher.createDispatcher(clientStores);
		dispatcher._dispatch = dispatcher.dispatch;
		dispatcher.dispatch = (action) => {
			//TODO, nyi
			//finishOnServer(action, startingPoints);
			return dispatcher._dispatch(action).then(() => { throw new Error('nyi'); });
		};

		return dispatcher;
	}

	/**
	 * Create a server dispatch from a the given Stores.
	 *
	 * @param _stores				{StoresObject}		The stores that the action are dispatched to
	 *
	 * @return						{Dispatcher}		The new Server Dispatcher
	 *
	static createServerDispatcher(stores: StoresObject): ServerDispatcher {
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
		 *
		var startDispatchAt = function(action, startingPoints, arg) {
			//TODO, nyi
			return Promise.reject(new Error('NYI'));
		};

		return Object.assign({},
			Dispatcher.createDispatcher(stores),
			{ startDispatchAt }
		);
	}*/

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
		if(typeof action !== 'object') {
			return Promise.reject(new Error('actions must be objects'));
		}

		// Start dispatch
		this._isDispatching = true;

		// Perform dispatch
		var resultPromises = mapStores(this._stores, (store, storeName) => {
			return store.dispatch(action).then((updatedStore) => {
				// Save store for current dispatch
				this._stores[storeName] = updatedStore;

				return updatedStore.getState();
			});
		});

		return objectPromise(resultPromises).then((newStates) => {
			// Finish dispatch
			this._isDispatching = false;

			// Send state to subscribers
			if(this._subscriptionHandler) {
				this._subscriptionHandler.publish(newStates);
			}

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

		return mapStores(this._stores, (store) => store.getState());
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
		if(!this._stores[storeName]) throw new Error(`store name(${storeName}) does not exist`);

		return this._stores[storeName].getState();
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
				'cannot subscribe if the dispatcher was not created with a subscribtion handler'
			);
		}
		this._subscriptionHandler = this._subscriptionHandler.subscribe(subscriber);

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
		if(!validStoreName(storeName)) throw new Error('store name must be a string');
		if(!this._stores[storeName]) throw new Error('store(${storeName}) dose not exist');

		// Create subscribtion function for single store
		var storeSubscriber = makeSubscribeToGroupFunc(storeName, subscriber);

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
//	--- Helper functions ---
/*------------------------------------------------------------------------------------------------*/
/**
 * Create a Subscription Func that can subscribe to a single group, if the publish functions is
 * passed an Object (and group is an entry in the Object).
 *
 * @param subscriber	{(any) => void}						The function to wrap for the handler
 *
 * @return				{({[key: string]: any}) => void}	The subsciber to add to the handler
 */
function makeSubscribeToGroupFunc<V>(groupName: string, subscriber: SubscriptionFunc<V>)
														: SubscriptionFunc<{[key: string]: V}> {
	return (groupsObj) => subscriber(groupsObj[groupName]);
}

function validStoreName(storeName: string): boolean {
	return typeof storeName === 'string';
}

function validStore(possibleStore: any): boolean {
	var publicStoreMethods = [
		'useIsoDispatcher',
		'register',
		'dispatch',
		'startDispatchAt',
		'getState'
	];

	return publicStoreMethods.reduce(
		(containsPervMethod, methodName) => {
			if(!containsPervMethod) return false;

			return possibleStore[methodName] && typeof possibleStore[methodName] === 'function';
		},
		true
	);
}

function mapStores(
	stores: StoresObject,
	mapFunc: (store: Store<any>, storeName: string) => Object
): {[key: string]: any} {
	var results = {};
	Object.keys(stores).forEach((storeName) => {
		var store = stores[storeName];

		results[storeName] = mapFunc(store, storeName);
	});
	return results;
}

function objectPromise(promises: {[key: string]: Promise<any>}): Promise<{[key: string]: any}> {
	var keys = Object.keys(promises);
	var promiseArray = keys.map((key) => promises[key]);

	return Promise.all(promiseArray).then((vals) => {
		var results = {};
		vals.forEach((val, index) => {
			results[keys[index]] = val;
		});
		return results;
	});
}

/*------------------------------------------------------------------------------------------------*/
//	--- Exports ---
/*------------------------------------------------------------------------------------------------*/
module.exports = Dispatcher;
