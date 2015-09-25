/**
 * @flow
 */
var SubscriptionHandler = require('./SubscriptionHandler');

import type * as Store from './Store';

type StoresObject = {[key: string]: Store<any>};
type StatesObject = {[key: string]: any};
type Subscriber = (state: StatesObject) => void;
type UnsubscibeFunc = () => void;
type DispatcherIsoFunc = (
	action: Action,
	startingPoints: {[key: string]: StartingPoint<any>}
) => Promise<{[key: string]: any}>;
type ServerDispatcher = any; //Dispatcher & { startDispatchAt: () => any }

/*------------------------------------------------------------------------------------------------*/
//	--- Dispatcher ---
/*------------------------------------------------------------------------------------------------*/
/**
 * A class that contains a group of stores that should all recive the same actions.
 */
class Dispatcher {

	_stores: StoresObject;
	_subscriptionHandler: ?SubscriptionHandler;
	_isDispatching: boolean;

	/**
	 * Create a dispatch from a the given Stores.
	 *
	 * @param stores				{StoresObject}	The stores that the action are
	 *															dispatched to
	 * @param subscriptionHandler	{?SubscriptionHandler}		The subscription handler that
	 *															keeps track of the of the function
	 *															that have subscribed
	 */
	constuctor(stores: StoresObject, subscriptionHandler: ?SubscriptionHandler) {
		this._stores = stores;
		this._subscriptionHandler = subscriptionHandler;
		this._isDispatching = false;
	}

	/**
	 * Create a dispatch from a the given Stores.
	 *
	 * @param _stores				{StoresObject}	The stores that the action are dispatched to
	 *
	 * @return						{Dispatcher}	The new Dispatcher
	 */
	static createDispatcher(stores: StoresObject): Dispatcher {
		return new Dispatcher(stores, SubscriptionHandler.createSubscriptionHandler());
	}

	/**
	 * Create a server dispatch from a the given Stores.
	 *
	 * @param stores				{StoresObject}		The stores that the action are dispatched to
	 * @param finishOnServer		{DispatcherIsoFunc}	The function to call when finishing a
	 *													dispatch call on the server
	 *
	 * @return						{Dispatcher}		The new Client Dispatcher
	 */
	static createClientDispatcher(stores: StoresObject, finishOnServer: DispatcherIsoFunc): Dispatcher {
		var updateStore = function(store) {
			//TODO, nyi
			return store;
		};

		return Dispatcher.createDispatcher(stores.map(updateStore));
	}

	/**
	 * Create a server dispatch from a the given Stores.
	 *
	 * @param _stores				{StoresObject}		The stores that the action are dispatched to
	 *
	 * @return						{Dispatcher}		The new Server Dispatcher
	 */
	static createServerDispatcher(stores: StoresObject): ServerDispatcher {
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
		var startDispatchAt = function(action, startingPoints, arg) {
			//TODO, nyi
			return Promise.reject(new Error('NYI'));
		};

		return Object.assign({},
			Dispatcher.createDispatcher(stores),
			{ startDispatchAt }
		);
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
	dispatch(action: Action): Promise<{[key: string]: any}>{
		//TODO, nyi
		return Promise.reject(new Error('NYI'));
	};

	/**
	 * Gets the state from all of the Stores.
	 *
	 * @throws								When dispatch is currently running
	 *
	 * @return	{{string: any}}				The state of all the stores
	 */
	getStateForAll(): {[key: string]: any} {
		//TODO, nyi
		return {};
	};

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
		//TODO, nyi
		return {};
	};

	/**
	 * Add a new subscriber to all Stores.
	 *
	 * @param subscriber {({string: any}) => void}	The function to call, with the state, after each
	 *												dispatch
	 *
	 * @return			{() => void}				The function to call to unsubscibe
	 */
	subscribeToAll(subscriber: Subscriber): UnsubscibeFunc {
		//TODO, nyi
		return () => undefined;
	};

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
		//TODO, nyi
		return () => undefined;
	};
}


/*------------------------------------------------------------------------------------------------*/
//	--- Exports ---
/*------------------------------------------------------------------------------------------------*/
module.exports = Dispatcher;
