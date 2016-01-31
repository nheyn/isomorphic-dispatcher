/*
 * //NOTE, not checking because flow says the modules don't exist (look in this directory to see it is wrong)
 */
import Store from './Store';
import { createSubscriptionHandler } from './SubscriptionHandler';
import * as DispatcherFactory from './Dispatcher';
import isValidStore from './utils/isValidStore';

import type Dispatcher from './Dispatcher/Dispatcher';
import type ClientDispatcher from './Dispatcher/ClientDispatcher';
import type ServerDispatcher from './Dispatcher/ServerDispatcher';

/**
 * Create a new Store.
 *
 * @param initialState	{any}	The initial state of the object
 *
 * @return				{Store}	The new Store
 */
export function createStore<S>(initialState?: S): Store<S> {
	return Store.createStore(initialState? initialState: {});
}

/**
 * Create a Dispatch from a the given Stores.
 *
 * @param stores				{StoresObject}	The stores that the action are dispatched to
 *
 * @return						{Dispatcher}	The new Dispatcher
 */
export function createDispatcher(stores: any): Dispatcher {
	if(!isValidStoreObject(stores)) {
		throw new Error('An object of stores is required to create a Dispatcher.');
	}

	return DispatcherFactory.createDispatcher(stores, createSubscriptionHandler());
}

/**
 * Create a Client Dispatch from the given Stores.
 *
 * @param stores				{StoresObject}		The stores that the action are dispatched to
 * @param finishOnServer		{DispatcherIsoFunc}	The function to call when finishing a dispatch
 *													call on the server
 *
 * @return						{ClientDispatcher}	The new Client Dispatcher
 */
export function createClientDispatcher(stores: any, finishOnServer: any): ClientDispatcher {
	if(!isValidStoreObject(stores)) {
		throw new Error('An object of stores is required to create a Dispatcher.');
	}
	if(typeof finishOnServer !== 'function') {
		throw new Error('ClientDispatcher require a function that calls the server.');
	}

	return DispatcherFactory.createClientDispatcher(finishOnServer, stores, createSubscriptionHandler());
}

/**
 * Create a Server Dispatch from the given Stores.
 *
 * @param stores			{StoresObject}		The stores that the action are dispatched to
 *
 * @return					{ServerDispatcher}	The new Server Dispatcher
 */
export function createServerDispatcher(stores: any): ServerDispatcher {
	if(!isValidStoreObject(stores)) {
		throw new Error('An object of stores is required to create a Dispatcher.');
	}

	return DispatcherFactory.createServerDispatcher(undefined, stores, createSubscriptionHandler());
}

function isValidStoreObject(stores: any): boolean {
	if(typeof stores !== 'object')	return false;

	for(let storeName in stores) {
		if(!isValidStore(stores[storeName])) return false;
	}

	return true;
}
