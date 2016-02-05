/**
 * @flow
 */
import Immutable from 'immutable';

import { Dispatcher } from './Dispatcher';
import PromisePlaceholder from '../utils/PromisePlaceholder';

import type Store from '../Store';
import type SubscriptionHandler from '../SubscriptionHandler';

type StoresMap = Immutable.Map<string, Store<any>>;
type DispatcherIsoFunc = (
	action: Action,
	pausePoints: {[key: string]: StartingPoint<any>}
) => Promise<{[key: string]: any}>;

/**
 * A sub-class of dispatch for the client.
 */
export default class ClientDispatcher extends Dispatcher {

	_pausePoints: ?{[key: string]: StartingPoint<any>};
	_finishOnServer: DispatcherIsoFunc;

	/**
	 * See super class
	 *
	 * @param finishOnServer	{DispatcherIsoFunc}	The function to call when finishing a dispatch
	 *												call on the server
	 */
	constructor(
		finishOnServer: DispatcherIsoFunc,
		stores: StoresMap,
		subscriptionHandler: ?SubscriptionHandler
	) {
		if(typeof finishOnServer !== 'function') {
			throw new Error('finishOnServer must be a function');
		}

		super(stores, subscriptionHandler);
		this._pausePoints = null;
		this._finishOnServer = finishOnServer;
	}

	/**
	 * See super class
	 */
	dispatch(action: Action): Promise<{[key: string]: any}> {
		this._startDispatch(action);

		return super.dispatch(action).then((newStates) => {
			this._finishDispatch();

			return newStates;
		}).catch((err) => {
			this._finishDispatch();

			return Promise.reject(err);
		});
	}

	_startDispatch(action: Action) {
		this._pausePoints = {};

		//NOTE, not all (or possible no) placeholders are used
		let promisePlaceholders = Immutable.Map();
		this._stores = this._stores.map((store, storeName) => {
			const currPromisePlaceholder = new PromisePlaceholder();
			promisePlaceholders = promisePlaceholders.set(storeName, currPromisePlaceholder);

			return store.finishOnServerUsing(
				this._createFinishOnServer(storeName, currPromisePlaceholder.getPromise())
			);
		});

		// Start listening for 'onServer' calls
		this._performFinishOnServer(action, promisePlaceholders);
	}

	_finishDispatch() {
		this._pausePoints = null;
	}

	_performFinishOnServer(
		action: Action,
		promisePlaceholders: Immutable.Map<string, PromisePlaceholder<any>>,
		timeout: number = 50
	) {
		setTimeout(() => {
			// Check dispatch has finished
			if(!this._pausePoints) return;

			// If no puase points set
			if(Object.keys(this._pausePoints).length === 0) {
				this._performFinishOnServer(action, promisePlaceholders, timeout);
				return;
			}

			// Call server
			this._finishOnServer(action, this._pausePoints).then((newStates) => {
				// Send results to results promises for each store
				for(let storeName in newStates) {
					if(!promisePlaceholders.has(storeName)) {
						throw new Error(`invalid store(${storeName}) returned from server`);
					}
					if(!newStates[storeName]) {
						throw new Error(`missing store(${storeName}) returned from server`);
					}

					promisePlaceholders.get(storeName).resolve(newStates[storeName]);
				}
			}).catch((err) => {
				// Send error to promise for each store
				promisePlaceholders.forEach((promisePlaceholder) => {
					promisePlaceholder.reject(err);
				});
			}).then(() => {
				// Listen for any remaning 'onServer' calls
				this._performFinishOnServer(action, promisePlaceholders, timeout)
			});
		}, timeout);
	}

	_createFinishOnServer<S>(
		storeName: string,
		statePromise: Promise<S>
	): (action: Action, startingPoint: StartingPoint<S>) => Promise<S> {
		if(!this._stores.has(storeName)) {
			throw new Error(
				`cannot create finishOnServer for non-existing store(${storeName})`
			);
		}

		return (action, pausePoint) => {
			this._addStoreToFinishOnServer(storeName, pausePoint);

			return statePromise;
		};
	}

	_addStoreToFinishOnServer(storeName: string, pausePoint: StartingPoint<any>) {
		if(!this._pausePoints) {
			throw new Error('store[${storeName}].dispatch was called not from dispatcher.dispatch');
		}

		this._pausePoints[storeName] = pausePoint;
	}
}