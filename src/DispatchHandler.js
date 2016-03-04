/**
 * @flow
 */
import Immutable from 'immutable';

import PromisePlaceholder from './utils/PromisePlaceholder';
import resolveMapOfPromises from './utils/resolveMapOfPromises';
import mapObject from './utils/mapObject';

import type Store from './Store';

type StoresMap = Immutable.Map<string, Store<any>>;
type OnUpdateFunc = (updateStore: StoresMap) => void;
type OnErrorFunc = (err: Error) => void;
type DispatchFunctionSettings = { initialStores: StoresMap, onUpdatedStores: OnUpdateFunc, onError: OnErrorFunc };
type FinishOnServerFunc = (
	startingPoints: {[key: string]: StartingPoint},
	actions: Array<Action>
) => Promise<{[key: string]: any}>;
type ClientDispatchResults = {
	updatedStoresPromise: Promise<StoresMap>,
	pausePoints: Immutable.Map<string, StartingPoint>,
	responsePlaceholders: Immutable.Map<string, PromisePlaceholder>
};

/**
 * A class to handle calling 'dispatch' with different actions concurrently.
 */
export default class DispatchHandler {

	_stores: StoresMap;
	_actionQueue: ?Immutable.List<{ action: Action, promisePlaceholder: PromisePlaceholder}>;
	_updateFunctions: Immutable.List<OnUpdateFunc>;
	_errorFunctions: Immutable.List<OnErrorFunc>;

	/**
	 * The constructor for the DispatchHandler.
	 *
	 * @param initialStores		{StoresMap}			The stores to start with
	 */
	constructor(initialStores: StoresMap) {
		this._stores = initialStores;
		this._actionQueue = null;

		this._updateFunctions = Immutable.List();
		this._errorFunctions = Immutable.List();
	}

	/**
	 * The create a DispatchHandler with the given initial stores.
	 *
	 * @param initialStores		{StoresMap}			The stores to start with
	 *
	 * @return					{DispatchHandler}	The new DispatchHandler
	 */
	static createDispatchHandler(initialStores: StoresMap): DispatchHandler {
		return new DispatchHandler(initialStores);
	}

	/**
	 * Add a new action to the queue of actions to be dispatched to the stores.
	 *
	 * @param action	{Action}				The action to be dispatched
	 *
	 * @return			{Promise<StoresMap>}	A promise that contains the stores after the give action was dispatched
	 */
	pushAction(action: Action): Promise<StoresMap> {
		// Enqueue action if dispatch is already being performed
		if(this._actionQueue) {
			const promisePlaceholder = new PromisePlaceholder();
			this._actionQueue = this._actionQueue.push({ action, promisePlaceholder });

			return promisePlaceholder.getPromise();
		}

		// Start dispatch
		this._actionQueue = Immutable.List();
		return this._startDispatch(this._stores, action);
	}

	/**
	 * Add a new actions to the queue of actions to be dispatched to the stores.
	 *
	 * @param actions	{Array<Action>}			The actions to be dispatched
	 *
	 * @return			{Promise<StoresMap>}	A promise that contains the stores after all the given action have
	 *											finished dispatching
	 */
	pushActions(actions: Array<Action>): Promise<StoresMap> {
		// Add each action to the queue
		const storeMapPromises = actions.map((action) => this.pushAction(action));

		// The returned promise should resolve when the last action is finished
		return storeMapPromises[storeMapPromises.length - 1];
	}

	/**
	 * Get the current stores.
	 *
	 * @return 		{StoreMap}	The current stores
	 */
	getStores(): StoresMap {
		return this._stores;
	}

	/**
	 * Add a callback for the given event.
	 *
	 * @param event	{string}	The event to subscribe to
	 * @param cb	{Function}	The function to call when the given event happens
	 */
	on(event: string, cb: Function) {
		switch(event) {
			case 'update':
				this._updateFunctions = this._updateFunctions.push(cb);
				break;
			case 'error':
				this._errorFunctions = this._errorFunctions.push(cb);
				break;
			default:
				throw new Error(`Invalid event type for DispatchHandler: ${event}`);
		}
	}

	_onUpdatedStores(updatedStores: StoresMap) {
		// Save updated stores
		this._stores = this._stores.merge(updatedStores);

		// Send to event subscribers
		this._updateFunctions.forEach((updateFunc) => {
			updateFunc(updatedStores);
		});
	}

	_onError(err: Error) {
		this._errorFunctions.forEach((errorFunc) => {
			errorFunc(err);
		});
	}

	_startDispatch(stores: StoresMap, action: Action): Promise<StoresMap> {
		// Dispatch the action to each store
		let updatedStoresPromises = this._performDispatch(stores, action);

		// Report Results
		updatedStoresPromises = updatedStoresPromises.then((updatedStores) => {
			this._onUpdatedStores(updatedStores);

			return updatedStores;
		}).catch((err) => {
			this._onError(err);

			return stores;
		})

		// Return the stores after dispatch finishes
		return updatedStoresPromises.then((currentStores) => {
			if(!this._actionQueue || this._actionQueue.size === 0) {
				// Pause, to wait for next action
				this._actionQueue = null;

				return currentStores;
			}

			// Start performing the next dispatch
			const { action: nextAction, promisePlaceholder } = this._dequeueNextAction();
			this._startDispatch(currentStores, nextAction).then((nextStores) => {
				// Resolve promise that was returned from 'pushAction'
				promisePlaceholder.resolve(nextStores);
			});

			return currentStores;
		}).catch((err) => {	//NOTE, this shouldn't be need (just in case)
			this._onError(err);

			throw err;
		});
	}

	_performDispatch(stores: StoresMap, action: Action): Promise<StoresMap> {
		const updatedStoresPromises = stores.map((store) => store.dispatch(action));

		return resolveMapOfPromises(updatedStoresPromises);
	}

	_dequeueNextAction(): { action: Action, promisePlaceholder: PromisePlaceholder } {
		if(!this._actionQueue) throw new Error('cannot dequeue if the queue, _actionQueue, is null');
		const actionQueue = this._actionQueue;

		const nextActionObject = actionQueue.first();
		this._actionQueue = actionQueue.shift();

		return nextActionObject;
	}
}

export class ServerDispatchHandler extends DispatchHandler {
	_onServerArg: any;

	/**
	 * The constructor for the ServerDispatchHandler.
	 *
	 * @param initialStores	{StoresMap}	The stores to start with
	 * @param onServerArg	{any}		The arg to pass to the 'onServer' argument of the updaters
	 */
	constructor(initialStores: StoresMap, onServerArg: any) {
		super(initialStores);

		this._onServerArg = onServerArg;
	}

	/**
	 * The create a ServerDispatchHandler with the given initial stores and passes the given arg to the 'onServer' arg
	 * of the updaters (3rd argument).
	 *
	 * @param initialStores	{StoresMap}			The stores to start with
	 * @param onServerArg	{any}				The arg to pass to the 'onServer' argument of the updaters
	 *
	 * @return				{DispatchHandler}	The new ServerDispatchHandler
	 */
	static createServerDispatchHandler(initialStores: StoresMap, onServerArg: any): DispatchHandler {
		return new ServerDispatchHandler(initialStores, onServerArg);
	}

	_performDispatch(stores: StoresMap, action: Action): Promise<StoresMap> {
		const updatedStoresPromises = stores.map((store) => {
			return store.dispatch(action, { arg: this._onServerArg })
		});

		return resolveMapOfPromises(updatedStoresPromises);
	}
}

export class ClientDispatchHandler extends DispatchHandler {
	_finishOnServer: FinishOnServerFunc;

	/**
	 * The constructor for the ClientDispatchHandler.
	 *
	 * @param initialStores		{StoresMap}				The stores to start with
	 * @param finishOnServer	{FinishOnServerFunc}	A function that finishes a dispatching an action on the server
	 */
	constructor(initialStores: StoresMap, finishOnServer: FinishOnServerFunc) {
		super(initialStores);

		this._finishOnServer = finishOnServer;
	}

	/**
	 * The create a ServerDispatchHandler with the given initial stores and the function to finish the a dispatch in
	 * the ServerDispatcher.
	 *
	 * @param initialStores		{StoresMap}				The stores to start with
	 * @param finishOnServer	{FinishOnServerFunc}	A function that finishes a dispatching an action on the server
	 *
	 * @return					{DispatchHandler}		The new ServerDispatchHandler
	 */
	static createClientDispatchHandler(initialStores: StoresMap, finishOnServer: FinishOnServerFunc): DispatchHandler {
		return new ClientDispatchHandler(initialStores, finishOnServer);
	}

	_performDispatch(stores: StoresMap, action: Action): Promise<StoresMap> {
		// Preform client side dispatch
		const clientDispatchPromise = this._performClientDispatch(stores, action);

		return clientDispatchPromise.then(({ updatedStoresPromise, pausePoints, responsePlaceholders }) => {

			// Finish on server, if any 'onServer' was called
			if(responsePlaceholders.size > 0) {
				const actionQueue = this._actionQueue? this._actionQueue: Immutable.List();
				this._actionQueue = null;

				const queuedActions = actionQueue.map(({ action }) => action).toArray();
				let queuedPromisePlaceholders = actionQueue.map(({ promisePlaceholder}) => promisePlaceholder);
				let responsePlaceholdersLeft = responsePlaceholders;

				// Send to server
				const pausePointsObject = pausePoints.toObject();
				const actions = [action, ...queuedActions];

				this._finishOnServer(pausePointsObject, actions).then((responseStates) => {
					for(let storeName in responseStates) {
						const responseState = responseStates[storeName];

						// Return result for paused dispatches
						if(responsePlaceholdersLeft.has(storeName)) {
							const responsePlaceholder = responsePlaceholdersLeft.get(storeName);
							responsePlaceholdersLeft = responsePlaceholdersLeft.delete(storeName);

							//Give result to Stores
							responsePlaceholder.resolve(responseState);
						}
					}

					// Return result for queued actions
					if(queuedPromisePlaceholders.size > 0) {
						queuedPromisePlaceholders.forEach((queuedPromisePlaceholder) => {
							//Give result to dispatch caller
							queuedPromisePlaceholder.resolve(responseStates);
						});

						queuedPromisePlaceholders = queuedPromisePlaceholders.clear();
					}

					// Send errors if any stores are not returned
					if(responsePlaceholdersLeft.size > 0) {
						throw new Error('No state for store missing from server response');
					}
				}).catch((err) => {
					// Send error to stores
					responsePlaceholdersLeft.forEach((responsePlaceholder) => {
						responsePlaceholder.reject(err);
					});

					// Send error to dispatch callers
					queuedPromisePlaceholders.forEach((queuedPromisePlaceholder) => {
						queuedPromisePlaceholder.reject(err);
					});
				});
			}

			// Return the final state (resolves after server returns response)
			return updatedStoresPromise;
		});
	}

	_performClientDispatch(stores: StoresMap, action: Action): Promise<ClientDispatchResults> {
		let responsePlaceholders = Immutable.Map();
		let updatedStoresPromises = Immutable.Map();

		// Get pause points from each store's dispatch
		const pausePointsPromises = stores.map((store, storeName) => {
			return new Promise((resolve, reject) => {
				// Perform dispatch, track returned promise for final return from 'dispatch method'
				updatedStoresPromises = updatedStoresPromises.set(storeName,
					store.dispatch(action, {
						finishOnServer(state, index) {
							resolve({ state, index });

							// Return value from Dispatcher.dispatch calls
							const responsePlaceholder = new PromisePlaceholder();
							responsePlaceholders = responsePlaceholders.set(storeName, responsePlaceholder);
							return responsePlaceholder.getPromise();
						},
						finishedUpdaters(didFinishOnClient) {
							// $FlowIssue - null is valid resolved value (filtered out below)
							if(didFinishOnClient) resolve(null);
						}
					})
				);
			});
		});

		// Wait for client  part of dispatch to finish
		return resolveMapOfPromises(pausePointsPromises).then((maybePausePoints) => {
			const updatedStoresPromise = resolveMapOfPromises(updatedStoresPromises);
			const pausePoints = maybePausePoints.filter((maybePausePoint) => maybePausePoint? true: false);

			return { updatedStoresPromise, pausePoints, responsePlaceholders };
		});
	}
}

export const createDispatchHandler = DispatchHandler.createDispatchHandler;
export const createServerDispatchHandler = ServerDispatchHandler.createServerDispatchHandler;
export const createClientDispatchHandler = ClientDispatchHandler.createClientDispatchHandler;
