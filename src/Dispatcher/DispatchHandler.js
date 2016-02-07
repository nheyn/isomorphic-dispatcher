/**
 * @flow
 */
import Immutable from 'immutable';

import resolveMapOfPromises from '../utils/resolveMapOfPromises';

import type Store from '../Store';

type StoresMap = Immutable.Map<string, Store<any>>;
type OnUpdateFunction = (updateStore: StoresMap) => void;
type OnErrorFunction = (err: Error) => void;

export default class DispatchHandler {

	static handleActions(settings: {
		initalStores:	StoresMap,
		onUpdatedStore:	OnUpdateFunction,
		onError:		OnErrorFunction
	}):					(action: Action) => void {
		const { initalStores, onUpdatedStore, onError } = settings;
		const dispatchHandler = new DispatchHandler(initalStores, onUpdatedStore, onError);

		return (action) => dispatchHandler.pushAction(action);
	}

	_stores: StoresMap;
	_onUpdatedStore: OnUpdateFunction;
	_onError: OnErrorFunction;
	_actionQueue: ?Immutable.List<Action>;

	constructor(initalStores: StoresMap, onUpdatedStore: OnUpdateFunction, onError: OnErrorFunction) {
		this._stores = initalStores;
		this._onUpdatedStore = onUpdatedStore;
		this._onError = onError;
		this._actionQueue = null;
	}

	pushAction(action: Action) {
		if(!action || typeof action !== 'object') {
			throw new Error('actions must be objects');
		}

		// Enqueue action if dispatch is already being perform
		if(this._actionQueue) {
			this._actionQueue = this._actionQueue.push(action);
			return;
		}

		// Start dispatch
		this._actionQueue = Immutable.List();
		this._peformDispatch(this._stores, action);
	}

	_performDispatch(stores: StoresMap, action: Object) {
		// Dispatch the action to each store
		const updatedStoresPromise = stores.map((store) => store.dispatch(action))

		// Report Results
		updatedStoresPromise.then((updatedStores) => {
			this._onUpdatedStore(updatedStores);

			return updatedStores;
		}).catch((err) => {
			this._onError(err);

			return stores;
		}).then((currentStores) => {
			if(!this._actionQueue || this._actionQueue.size === 0) {
				// Pause, to wait for next action
				this._actionQueue = null;
				this._stores = currentStores;
			}
			else {
				// Dequeue next action
				const nextAction = this._actionQueue.first();
				this._actionQueue = this._actionQueue.shift();

				// Start next dispatch
				this._performDispatch(currentStores, nextAction);
			}
		}).catch((err) => {
			this._onError(err);	//NOTE, this shouldn't be need (just in case)
		});
	}
}

export const handleActions = DispatchHandler.handleActions;