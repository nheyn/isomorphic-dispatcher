/**
 * @flow
 */
import Immutable from 'immutable';

import { handleActions } from './DispatchHandler';
import makeSubscribeToGroupFunc from '../utils/makeSubscribeToGroupFunc';
import isValidStore from '../utils/isValidStore';
import mapObject from '../utils/mapObject';
import objectPromise from '../utils/objectPromise';

import type Store from '../Store';
import type SubscriptionHandler from '../SubscriptionHandler';

type StoresMap = Immutable.Map<string, Store<any>>;
type StatesObject = {[key: string]: any};
type Subscriber = SubscriptionFunc<StatesObject>;
type UnsubscibeFunc = () => StoresMap;

/**
 * A class that contains a group of stores that should all recive the same actions.
 *
 * NOTE: This should use 'export default class' but cannot create a subclass that way
 */
export class Dispatcher {

	_stores: StoresMap;
	_subscriptionHandler: ?SubscriptionHandler;
	_handleAction: (action: Action) => void;

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
		this._stores = stores;
		this._subscriptionHandler = subscriptionHandler;
		this._handleAction = handleActions({
			initalStores: stores,
			onUpdatedStore(updatedStores) {
				// Save updated stores
				this._stores = updatedStores;

				// Send state to subscribers
				this._subscriptionHandler.publish(this.getStateForAll());
			},
			onError(err) {
				console.error('Error performing dispatch:', err);
				throw err;
			}
		});
	}

	/**
	 * Dispatch the given action to all of the stores.
	 *
	 * @param action	{Object}					The action to dispatch
	 *
	 * @return			{Promise<{string: any}>}	The states after the dispatch is finished
	 */
	dispatch(action: Action): Promise<{[key: string]: any}> {
		return this._handleAction(action).then((storesMap) => {
			return storesMap.map((store) => store.getState());
		});
	}

	/**
	 * Gets the state from all of the Stores.
	 *
	 * @return	{{string: any}}				The state of all the stores
	 */
	getStateForAll(): {[key: string]: any} {
		const states = this._stores.map((store) => store.getState());
		return states.toJS();
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