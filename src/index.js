/*
 * //NOTE, not checking because flow says the modules don't exist (look in this directory to see it is wrong)
 */
import { createNewDispatcher, createNewClientDispatcher, createNewServerDispatcher } from './Dispatcher';
import { createSubscriptionHandler } from './SubscriptionHandler';
import Store from './Store';

import type Dispatcher from './Dispatcher';

/**
 * Create a new Store.
 *
 * @param initialState	{any}	The initial state of the object
 *
 * @return				{Store}	The new Store
 */
export function createStore<S>(initialState: S): Store<S> {
	//TODO, check if stores is valid

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
	//TODO, check if stores is valid

	return createNewDispatcher(stores, createSubscriptionHandler());
}

/**
 * Create a Client Dispatch from the given Stores.
 *
 * @param stores				{StoresObject}		The stores that the action are dispatched to
 * @param finishOnServer		{DispatcherIsoFunc}	The function to call when finishing a dispatch
 *													call on the server
 *
 * @return						{Dispatcher}		The new Client Dispatcher
 */
export function createClientDispatcher(stores: any, finishOnServer: any): Dispatcher {
	//TODO, check if stores and finishOnServer are valid

	return createNewClientDispatcher(finishOnServer, stores, createSubscriptionHandler());
}

/**
 * Create a Server Dispatch from the given Stores.
 *
 * @param stores			{StoresObject}			The stores that the action are dispatched to
 *
 * @return						{Dispatcher}	The new Server Dispatcher
 */
export function createServerDispatcher(stores: any): Dispatcher {
	//TODO, check if stores is valid

	return createNewServerDispatcher(undefined, stores, createSubscriptionHandler());
}
