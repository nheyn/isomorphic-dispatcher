/**
 * @flow
 */
import Immutable from 'immutable';

import performDispatch from './performDispatch';
import makeSubscribeToGroupFunc from '../utils/makeSubscribeToGroupFunc';
import isValidStore from '../utils/isValidStore';
import mapObject from '../utils/mapObject';
import objectPromise from '../utils/objectPromise';

import type Store from '../Store';
import type SubscriptionHandler from '../SubscriptionHandler';

type StoresMap = Immutable.Map<string, Store<any>>;
type StatesObject = {[key: string]: any};
type Subscriber = SubscriptionFunc<StatesObject>;
type UnsubscibeFunc = () => void;

/**
 * A class that contains a group of stores that should all recive the same actions.
 *
 * NOTE: This should use 'export default class' but cannot create a subclass that way
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

		// Start dispatch
		this._isDispatching = true;

		// Perform dispatch
		return performDispatch(this._stores, action).then((newStores) => {
			// Finish dispatch
			this._isDispatching = false;

			// Save Stores
			this._stores = newStores;

			// Get states
			const newStates = newStores.map((store) => store.getState()).toJS();

			// Send state to subscribers
			if(this._subscriptionHandler)	this._subscriptionHandler.publish(newStates);

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