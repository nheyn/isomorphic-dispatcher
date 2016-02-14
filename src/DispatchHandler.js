/**
 * @flow
 */
import Immutable from 'immutable';

import PromisePlaceholder from './utils/PromisePlaceholder';
import resolveMapOfPromises from './utils/resolveMapOfPromises';

import type Store from './Store';

type StoresMap = Immutable.Map<string, Store<any>>;
type OnUpdateFunc = (updateStore: StoresMap) => void;
type OnErrorFunc = (err: Error) => void;
type DispatchFunctionSettings = { initalStores: StoresMap, onUpdatedStores: OnUpdateFunc, onError: OnErrorFunc };

/**
 * A class to handle calling 'dispatch' with different actions concurrently.
 */
export default class DispatchHandler {

	/**
	 * Create a function that
	 */
	static createDispatchFunction(settings: DispatchFunctionSettings): (action: Action) => Promise<StoresMap> {
		const { initalStores, onUpdatedStores, onError } = settings;
		const dispatchHandler = new DispatchHandler(initalStores, onUpdatedStores, onError);

		return (action) => dispatchHandler.pushAction(action);
	}

	_stores: StoresMap;
	_onUpdatedStores: OnUpdateFunc;
	_onError: OnErrorFunc;
	_actionQueue: ?Immutable.List<{ action: Action, promisePlaceholder: PromisePlaceholder}>;

	/**
	 * The constructor for the DispatchHandler.
	 *
	 * @param initalStores		{StoresMap}				The stores to start with
	 * @param onUpdatedStores 	{(StoresMap) => void}	The function that will be called when the stores are updated
	 * @param onError			{(Error) => void}		The function that will be called when an error occurs
	 */
	constructor(initalStores: StoresMap, onUpdatedStores: OnUpdateFunc, onError: OnErrorFunc) {
		this._stores = initalStores;
		this._onUpdatedStores = onUpdatedStores;
		this._onError = onError;
		this._actionQueue = null;
	}

	/**
	 * Add a new action to the queue of action to be dispatched to the stores.
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
		return this._performDispatch(this._stores, action);
	}

	_performDispatch(stores: StoresMap, action: Action): Promise<StoresMap> {
		// Dispatch the action to each store
		const updatedStoresPromises = stores.map((store) => store.dispatch(action))

		// Report Results
		return resolveMapOfPromises(updatedStoresPromises).then((updatedStores) => {
			this._onUpdatedStores(updatedStores);

			return updatedStores;
		}).catch((err) => {
			this._onError(err);

			return stores;
		}).then((currentStores) => {
			// Save updated stores
			this._stores = currentStores;

			if(!this._actionQueue || this._actionQueue.size === 0) {
				// Pause, to wait for next action
				this._actionQueue = null;

				return currentStores;
			}

			// Start performing the next dispatch
			const { action: nextAction, promisePlaceholder } = this._dequeueNextAction();
			this._performDispatch(currentStores, nextAction).then((nextStores) => {
				// Resolve promise that was returned from 'pushAction'
				promisePlaceholder.resolve(nextStores);
			});

			return currentStores;
		}).catch((err) => {
			this._onError(err);	//NOTE, this shouldn't be need (just in case)

			throw err;
		});
	}

	_dequeueNextAction(): { action: Action, promisePlaceholder: PromisePlaceholder } {
		if(!this._actionQueue) throw new Error('cannot dequeue if the queue, _actionQueue, is null');
		const actionQueue = this._actionQueue;

		const nextActionObject = actionQueue.first();
		this._actionQueue = actionQueue.shift();

		return nextActionObject;
	}
}

export const createDispatchFunction = DispatchHandler.createDispatchFunction;