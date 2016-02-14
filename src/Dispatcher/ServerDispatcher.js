/**
 * @flow
 */
import { Dispatcher } from './Dispatcher';
import mapObject from '../utils/mapObject';
import objectPromise from '../utils/objectPromise';

import type Immutable from 'immutable';
import type Store from '../Store';
import type SubscriptionHandler from '../SubscriptionHandler';

type StoresMap = Immutable.Map<string, Store<any>>;
type StatesObject = {[key: string]: any};
type Subscriber = SubscriptionFunc<StatesObject>;
type StartingPointObject = {[key: string]: StartingPoint<any>};

/**
 * A sub-class of dispatch for the server.
 */
export default class ServerDispatcher extends Dispatcher {
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