/**
 * @flow
 */
iimport Immutable from 'immutable';

import PromisePlaceholder from '../utils/PromisePlaceholder';
import resolveMapOfPromises from '../utils/resolveMapOfPromises';

import type Store from '../Store';

type StoresMap = Immutable.Map<string, Store<any>>;
type OnUpdateFunc = (updateStore: StoresMap) => void;
type OnErrorFunc = (err: Error) => void;
type DispatchFunctionSettings = { initalStores: StoresMap, onUpdatedStores: OnUpdateFunc, onError: OnErrorFunc };

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
	 * @param initalStores		{StoresMap}				The stores to start with
	 */
	constructor(initalStores: StoresMap) {
		this._stores = initalStores;
		this._actionQueue = null;

		this._updateFunctions = Immutable.List();
		this._errorFunctions = Immutable.List();
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
	getStores(): StoreMap {
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
		this._stores = this._stores.merge(updateStores);

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
		return updatedStoresPromise.then((currentStores) => {
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