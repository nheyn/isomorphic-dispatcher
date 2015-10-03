var Store = require('./Store');
var Dispatcher = require('./Dispatcher');
var SubscriptionHandler = require('./SubscriptionHandler');

/**
 * Create a new Store.
 *
 * @param initialState	{any}	The initial state of the object
 *
 * @return				{Store}	The new Store
 */
function createStore(initialState) {
	return Store.createStore(initialState);
}

/**
 * Create a Dispatch from a the given Stores.
 *
 * @param stores				{StoresObject}	The stores that the action are dispatched to
 *
 * @return						{Dispatcher}	The new Dispatcher
 */
function createDispatcher(stores) {
	return Dispatcher.createDispatcher(stores, SubscriptionHandler.createSubscriptionHandler());
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
function createClientDispatcher(stores, finishOnServer) {
	return Dispatcher.createClientDispatcher(
		finishOnServer,
		stores,
		SubscriptionHandler.createSubscriptionHandler()
	);
}

/**
 * Create a Server Dispatch from the given Stores.
 *
 * @param stores				{StoresObject}	The stores that the action are dispatched to
 *
 * @return						{Dispatcher}	The new Server Dispatcher
 */
function createServerDispatcher(stores) {
	return Dispatcher.createServerDispatcher(
		stores,
		SubscriptionHandler.createSubscriptionHandler()
	);
}

/*------------------------------------------------------------------------------------------------*/
//	--- Exports ---
/*------------------------------------------------------------------------------------------------*/
module.exports.createStore = createStore;
module.exports.createDispatcher = createDispatcher;
module.exports.createClientDispatcher = createClientDispatcher;
module.exports.createServerDispatcher = createServerDispatcher;
