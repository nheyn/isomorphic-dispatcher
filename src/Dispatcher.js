/**
 * @flow
 */
import Immutable from 'immutable';

import makeSubscribeToGroupFunc from './utils/makeSubscribeToGroupFunc';
import isValidStore from './utils/isValidStore';
import mapObject from './utils/mapObject';
import objectPromise from './utils/objectPromise';

import type Store from './Store';
import type DispatchHandler from './DispatchHandler';
import type SubscriptionHandler from './SubscriptionHandler';

type StoresMap = Immutable.Map<string, Store<any>>;
type StatesObject = {[key: string]: any};
type Subscriber = SubscriptionFunc<StatesObject>;
type UnsubscibeFunc = () => void;

/**
 * A class that contains a group of stores that should all recive the same actions.
 *
 * NOTE: This should use 'export default class' but cannot create a subclass that way
 */
export default class Dispatcher {
	_dispatchHandler: DispatchHandler;
	_subscriptionHandler: ?SubscriptionHandler;
	_stores: StoresMap;

	/**
	 * Create a Dispatch from the given Stores.
	 *
	 * @param dispatchHandler		{DispatchHandler}		The object that will handle dispatch calls
	 * @param subscriptionHandler	{?SubscriptionHandler}	The subscription handler that keeps track of the of the
	 *														function that have subscribed
	 */
	constructor(dispatchHandler: DispatchHandler, subscriptionHandler: ?SubscriptionHandler) {
		this._dispatchHandler = dispatchHandler;
		this._subscriptionHandler = subscriptionHandler;

		// Set up dispatch handler
		this._dispatchHandler.on('update', this._onUpdatedStores.bind(this));
		this._dispatchHandler.on('error', this._onDispatchError.bind(this));
		this._stores = this._dispatchHandler.getStores();
	}

	/**
	 * Dispatch the given action to all of the stores.
	 *
	 * @param action	{Object}					The action to dispatch
	 *
	 * @return			{Promise<{string: any}>}	The states after the dispatch is finished
	 */
	dispatch(action: Action): Promise<StatesObject> {
		// Add action to queue of actions to be dispatched
		const updatedStoresPromise = this._dispatchHandler.pushAction(action);

		// Get state after given action
		return updatedStoresPromise.then((updatedStores) => {
			return updatedStores.map((store) => store.getState()).toObject();
		});
	}

	/**
	 * Gets the state from all of the Stores.
	 *
	 * @return	{{string: any}}				The state of all the stores
	 */
	getStateForAll(): StatesObject {
		const states = this._stores.map((store) => store.getState());
		return states.toObject();
	}

	/**
	 * Gets the state from the given store of the Stores.
	 *
	 * @param storeName	{string}	The name of the store to get the state of
	 *
	 * @return			{any}		The state of the given store
	 */
	getStateFor(storeName: string): any {
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
			throw new Error('cannot subscribe if the dispatcher was not created with a subscription handler');
		}
		this._subscriptionHandler = this._subscriptionHandler.subscribe(subscriber);

		let hasUnsubscribed = false;
		return () => {
			if(!this._subscriptionHandler) {
				throw new Error('cannot unsubscripted if the dispatcher was not created with a subscription handler');
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

		// Create subscription function for single store
		const storeSubscriber = makeSubscribeToGroupFunc(storeName, subscriber);

		// Subscribe
		if(!this._subscriptionHandler) {
			throw new Error('cannot subscribe if the dispatcher was not created with a subscription handler');
		}
		this._subscriptionHandler = this._subscriptionHandler.subscribe(storeSubscriber);

		// Unsubscribe
		var hasUnsubscribed = false;
		return () => {
			if(hasUnsubscribed)	throw new Error('subscriber has already been removed from the dispatcher');
			if(!this._subscriptionHandler) {
				throw new Error('cannot unsubscribe if the dispatcher was not created with a subscription handler');
			}

			this._subscriptionHandler = this._subscriptionHandler.unsubscribe(storeSubscriber);
			hasUnsubscribed = true;
		};
	}

	_onUpdatedStores(updatedStores: StoresMap) {
		// Save updated stores
		this._stores = updatedStores;

		// Send state to subscribers
		const subscriptionHandler = this._subscriptionHandler
		if(subscriptionHandler) subscriptionHandler.publish(this.getStateForAll());
	}

	_onDispatchError(err: Error): void {
		console.error('Error performing dispatch:', err);
		throw err;
	}
}
