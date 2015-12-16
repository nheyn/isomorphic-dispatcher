import { createStore } from './Store';
import { createDispatcher, createClientDispatcher, createServerDispatcher } from './Dispatcher';
import { createSubscriptionHandler } from './SubscriptionHandler';

/**
 * Create a new Store.
 *
 * @param initialState	{any}	The initial state of the object
 *
 * @return				{Store}	The new Store
 */
export function createStore(initialState) {
	return createStore(initialState);
}

/**
 * Create a Dispatch from a the given Stores.
 *
 * @param stores				{StoresObject}	The stores that the action are dispatched to
 *
 * @return						{Dispatcher}	The new Dispatcher
 */
export function createDispatcher(stores) {
	return createDispatcher(stores, createSubscriptionHandler());
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
export function createClientDispatcher(stores, finishOnServer) {
	return createClientDispatcher(finishOnServer, stores, createSubscriptionHandler());
}

/**
 * Create a Server Dispatch from the given Stores.
 *
 * @param stores			{StoresObject}			The stores that the action are dispatched to
 *
 * @return						{Dispatcher}	The new Server Dispatcher
 */
export function createServerDispatcher(stores) {
	return createServerDispatcher(undefined, stores, createSubscriptionHandler());
}
