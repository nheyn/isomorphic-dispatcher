/*
 * //NOTE, not checking because flow says the modules don't exist (look in this directory to see it is wrong)
 */
import Store from './Store';
import SubscriptionHandler from './SubscriptionHandler';
import { createNewDispatcher, createNewClientDispatcher, createNewServerDispatcher } from './Dispatcher';
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
export function createStore<S>(initialState: S): Store<S> {
	if(!initialState) {
		throw new Error('State must have an initial state.');
	}

	return Store.createStore(initialState);
}

/**
 * Create a Dispatch from a the given Stores.
 *
 * @param stores				{StoresObject}	The stores that the action are dispatched to
 *
 * @return						{Dispatcher}	The new Dispatcher
 */
export function createDispatcher(stores: any): Dispatcher {
	if(!isVaildStoreObject(stores)) {
		throw new Error('The stores must be given as a plain javascript object');
	}

	return createNewDispatcher(stores, SubscriptionHandler.createSubscriptionHandler());
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
	if(!isVaildStoreObject(stores)) {
		throw new Error('The stores must be given as a plain javascript object');
	}
	if(typeof finishOnServer !== 'function') {
		throw new Error('ClientDispatcher require a function that calls the server.');
	}

	return createNewClientDispatcher(finishOnServer, stores, SubscriptionHandler.createSubscriptionHandler());
}

/**
 * Create a Server Dispatch from the given Stores.
 *
 * @param stores			{StoresObject}		The stores that the action are dispatched to
 *
 * @return					{ServerDispatcher}	The new Server Dispatcher
 */
export function createServerDispatcher(stores: any): ServerDispatcher {
	if(!isVaildStoreObject(stores)) {
		throw new Error('The stores must be given as a plain javascript object');
	}

	return createNewServerDispatcher(undefined, stores, SubscriptionHandler.createSubscriptionHandler());
}

function isVaildStoreObject(stores: any): boolean {
	if(typeof stores !== 'object')			return false;
	for(let storeName in stores) {
		if(!isValidStore(stores[storeName]))	return false;
	}
	return true;
}
