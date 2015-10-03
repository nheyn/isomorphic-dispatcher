/**
 * @flow
 */
import type * as Store from './Store';
import type * as SubscriptionHandler from './SubscriptionHandler';

type StoresObject = {[key: string]: Store<any>};
type StatesObject = {[key: string]: any};
type StartingPointObject = {[key: string]: StartingPoint<any>};
type Subscriber = SubscriptionFunc<StatesObject>;
type UnsubscibeFunc = () => void;
type DispatcherIsoFunc = (
	action: Action,
	pausePoints: {[key: string]: StartingPoint<any>}
) => Promise<{[key: string]: any}>;

const makeSubscribeToGroupFunc = require('./utils/makeSubscribeToGroupFunc');
const isValidStore = require('./utils/isValidStore');
const mapObject = require('./utils/mapObject');
const objectPromise = require('./utils/objectPromise');


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
	 * Create a Dispatch from the given Stores.
	 *
	 * @param stores				{StoresObject}			The stores that the action are
	 *														dispatched to
	 * @param subscriptionHandler	{?SubscriptionHandler}	The subscription handler that
	 *														keeps track of the of the function
	 *														that have subscribed
	 */
	constructor(stores: StoresObject, subscriptionHandler: ?SubscriptionHandler) {
		// Check inputs
		if(!stores || typeof stores !== 'object') {
			throw new Error('store must be passed as an object');
		}
		const validatedStores = mapObject(stores, (store, storeName) => {
			if(typeof storeName !== 'string')	throw new Error('store name must be a string');
			if(!isValidStore(store))			throw new Error('invalid store')

			return store;
		});

		this._stores = validatedStores;
		this._subscriptionHandler = subscriptionHandler;
		this._isDispatching = false;
	}

	/**
	 * Create a Dispatch from the given Stores.
	 *
	 * @param stores				{StoresObject}	The stores that the action are dispatched to
	 * @param subscriptionHandler	{?SubscriptionHandler}	The subscription handler that
	 *														keeps track of the of the function
	 *														that have subscribed
	 *
	 * @return						{Dispatcher}	The new Dispatcher
	 */
	static createDispatcher(
		stores: StoresObject,
		subscriptionHandler: ?SubscriptionHandler
	): Dispatcher {
		return new Dispatcher(stores, subscriptionHandler);
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
	static createClientDispatcher(
		finishOnServer: DispatcherIsoFunc,
		stores: StoresObject,
		subscriptionHandler: ?SubscriptionHandler
	): Dispatcher {
		return new ClientDispatcher(finishOnServer, stores, subscriptionHandler);
	}

	/**
	 * Create a Server Dispatch from the given Stores.
	 *
	 * @param stores				{StoresObject}			The stores that the action are
	 *														dispatched to
	 * @param subscriptionHandler	{?SubscriptionHandler}	The subscription handler that
	 *														keeps track of the of the function
	 *														that have subscribed
	 *
	 * @return						{Dispatcher}			The new Server Dispatcher
	 */
	static createServerDispatcher(
		stores: StoresObject,
		subscriptionHandler: ?SubscriptionHandler
	): ServerDispatcher {
		return new ServerDispatcher(stores, subscriptionHandler);
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
		const resultPromises = mapObject(this._stores, (store, storeName) => {
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

		return mapObject(this._stores, (store) => store.getState());
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

		let hasUnsubscribed = false;
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
		if(typeof storeName !== 'string')	throw new Error('store name must be a string');
		if(!this._stores[storeName])		throw new Error('store(${storeName}) dose not exist');

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
		stores: StoresObject,
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
		const promisePlaceholders = this._startDispatch();

		// Call dispatch
		const newStatesPromise = super.dispatch(action);

		// Call finishOnServer
		//NOTE, because directly after 'super.dispatch' onServer must be called
		//		on the 'sequential' part of the updater functions (given to the Stores)
		this._performFinishOnServer(action, promisePlaceholders);

		return newStatesPromise.then((newStates) => {
			this._finishDispatch();
			return newStates;
		});
	}

	_startDispatch(): {[key: string]: PromisePlaceholder<any>} {
		this._pausePoints = {};

		//NOTE, not all (or possible no) placeholders are used
		let promisePlaceholders = {};
		this._stores = mapObject(this._stores, (store, storeName) => {
			promisePlaceholders[storeName] = new PromisePlaceholder();

			return store.finishOnServerUsing(
				this._createFinishOnServer(storeName, promisePlaceholders[storeName])
			);
		});

		return promisePlaceholders;
	}

	_finishDispatch() {
		this._pausePoints = null;
	}

	_performFinishOnServer(
		action: Action,
		promisePlaceholders: {[key: string]: PromisePlaceholder<any>}
	): {[key: string]: Promise<any>} {
		// Check dispatch is happening
		if(!this._pausePoints) {
			throw new Error('finishOnServer should not be called if dispatch has not been called');
		}

		// If no puase points where set, don't call server
		//ERROR, flowtype error here: this._pausePoints is undefined (not ture, see ^^)
		if(Object.keys(this._pausePoints).length === 0) return;

		// Call server
		return this._finishOnServer(action, this._pausePoints).then((newStates) => {
			// Send results to results promises for each store
			for(let storeName in newStates) {
				if(!promisePlaceholders[storeName]) {
					throw new Error(`invalid store(${storeName}) returned from server`);
				}
				if(!newStates[storeName]) {
					throw new Error(`missing store(${storeName}) returned from server`);
				}

				promisePlaceholders[storeName].resolve(newStates[storeName]);
			}
		}).catch((err) => {
			// Send error to promise for each store
			for(let storeName in promisePlaceholders) {
				promisePlaceholders[storeName].reject(err);
			}
		});
	}

	_createFinishOnServer<S>(
		storeName: string,
		statePromise: Promise<S>
	): (action: Action, startingPoint: StartingPoint<S>) => Promise<S> {
		const store = this._stores[storeName];
		if(!store) {
			throw new Error(`cannot create finishOnServer for non-existing store(${storeName})`);
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

// Move to own file
/**
 * A helper class for the ES6 Promise class. It allows resolve / reject functions to be called
 * outside the Promise constructor argument.
 */
class PromisePlaceholder<V> {
	_promise: Promise<V>;
	_resolve: (val: V) => void;
	_reject: (err: Error) => void;

	/**
	 * Create a new PromisePlaceholder.
	 */
	constructor() {
		this._promise = new Promise((resolve, reject) => {
			this._resolve = resolve;
			this._reject = reject;
		});
	}

	/**
	 * Get the Promise this is a placeholder for.
	 *
	 * @return	{Promise}	The promise
	 */
	getPromise(): Promise<V> {
		return this._promise;
	}

	/**
	 * Resolve the Promise this is a placeholder for.
	 *
	 * @param val	{any}		The value to resolve
	 *
	 * @return		{Promise}	The promise that was resolved
	 */
	resolve(val: V): Promise<V> {
		this._resolve(val);

		return this.getPromise();
	}

	/**
	 * Reject the Promise this is a placeholder for.
	 *
	 * @param err	{Error}		The error to use to reject the promise
	 *
	 * @return		{Promise}	The promise that was rejected
	 */
	reject(err: Error): Promise<V> {
		this._reject(err);

		return this.getPromise();
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
	startDispatchAt(
		action: Action,
		startingPoints: StartingPointObject,
		arg: ?any
	): Promise<StatesObject> {
		if(this._isDispatching) {
			return Promise.reject(new Error('cannot dispatch until dispatch is finished'));
		}
		if(!action || typeof action !== 'object') {
			return Promise.reject(new Error('actions must be objects'));
		}
		if(!startingPoints || typeof startingPoints !== 'object') {
			return Promise.reject(new Error('starting point must be an object of starting points'));
		}
		for(var storeName in startingPoints) {
			const startingPoint = startingPoints[storeName];
			if(!startingPoint || typeof startingPoint !== 'object') {
				return Promise.reject(
					new Error('starting point must be an object of starting points')
				);
			}
		}

		// Start dispatch
		this._isDispatching = true;

		// Perform dispatch for given stores
		const resultPromises = mapObject(startingPoints, (startingPoint, storeName) => {
			const store = this._stores[storeName];
			if(!store)	throw new Error('invalid store returned from the server');

			return store.startDispatchAt(action, startingPoint, arg).then((updatedStore) => {
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
}

/*------------------------------------------------------------------------------------------------*/
//	--- Exports ---
/*------------------------------------------------------------------------------------------------*/
module.exports = Dispatcher;
