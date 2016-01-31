/**
 * //NOTE, not checking because flow says the modules don't exist (look in this directory to see it is wrong)
 */
import { Dispatcher } from './Dispatcher';
import ClientDispatcher from './ClientDispatcher';
import ServerDispatcher from './ServerDispatcher';

import type Store from '../Store';

type StoresObject = {[key: string]: Store<any>};

/**
 * Export Classes
 */
export default Dispatcher;
export { ClientDispatcher, ServerDispatcher };


/**
 * Create a Dispatch from the given Stores.
 *
 * @param stores				{StoresMap}				The stores that the action are dispatched to
 * @param subscriptionHandler	{?SubscriptionHandler}	The subscription handler that keeps track of the of the function
 *														that have subscribed
 *
 * @return						{Dispatcher}			The new Dispatcher
 */
export function createDispatcher(
	stores: StoresObject,
	subscriptionHandler: ?SubscriptionHandler
): Dispatcher {
	return new Dispatcher(Immutable.Map(stores), subscriptionHandler);
}

/**
 * Create a Client Dispatch from the given Stores.
 *
 * @param finishOnServer		{DispatcherIsoFunc}		The function to call when finishing a dispatch call on the server
 * @param stores				{StoresObject}			The stores that the action are dispatched to
 * @param subscriptionHandler	{?SubscriptionHandler}	The subscription handler that keeps track of the of the function
 *														that have subscribed
 *
 * @return						{ClientDispatcher}		The new Client Dispatcher
 */
export function createClientDispatcher(
	finishOnServer: DispatcherIsoFunc,
	stores: StoresObject,
	subscriptionHandler: ?SubscriptionHandler
): ClientDispatcher {
	return new ClientDispatcher(finishOnServer, Immutable.Map(stores), subscriptionHandler);
}

/**
 * Create a Server Dispatch from the given Stores.
 *
 * @param getOnServerArg		{() => any | Promise}	The function that is called each time the updaters are called, it
 *														should return the argument to pass the onServer callback in the
 *														updaters (can be in a Promise)
 * @param stores				{StoresObject}			The stores that the action are dispatched to
 * @param subscriptionHandler	{?SubscriptionHandler}	The subscription handler that keeps track of the of the function
 *														that have subscribed
 *
 * @return						{ServerDispatcher}		The new Server Dispatcher
 */
export function createServerDispatcher(
	getOnServerArg: () => any | Promise<any>,
	stores: StoresObject,
	subscriptionHandler: ?SubscriptionHandler
): ServerDispatcher {
	return new ServerDispatcher(getOnServerArg, Immutable.Map(stores), subscriptionHandler);
}