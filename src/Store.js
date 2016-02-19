/**
 * @flow
 */
import Immutable from 'immutable';

type OnServerFunc<S> = (arg: any) => S | Promise<S> | { isFinishingOnServer: bool, getServerState: () => Promise<S> };
type StoreUpdater<S> = (state: S, action: Action, onServer: OnServerFunc<S>) => MaybePromise<S>;
type DispatchSettings<S> = {
	replaceState?: S,
	skip?: number,
	finishOnServer?: (state: S, index: number) => Promise<S>,
	finishedUpdaters?: (didFinishOnClient: boolean) => void,
	arg?: any
};

/*------------------------------------------------------------------------------------------------*/
//	--- Store ---
/*------------------------------------------------------------------------------------------------*/
/**
 * A store that uses updaters to dispatch changes to its state.
 */
export default class Store<S> {
	_state: S;
	_updaters: Immutable.List<StoreUpdater<S>>;

	/**
	 * Store constuctor (use Store.createStore).
	 *
	 * @param state				{any}					The current state of the object
	 * @param updaters			{List<StoreUpdater>}	The updaters that can mutate the Store
	 */
	constructor(state: S, updaters: Immutable.List<StoreUpdater<S>>) {
		this._state = state;
		this._updaters = updaters;
	}

	/**
	 * Create a new Store.
	 *
	 * @param initialState	{any}	The initial state of the object
	 *
	 * @return				{Store}	The new Store
	 */
	static createStore(initialState: S): Store<S> {
		return new Store(initialState, Immutable.List());
	}

	/**
	 * Registers a new upator in the store.
	 *
	 * @param updater	{StoreUpdater}	The new function that is able to update the store's state
	 *
	 * @throws							An error when the given updater is not a function
	 *
	 * @return			{Store}			A new Store with the new updater
	 */
	register(updater: StoreUpdater<S>): Store<S> {
		if(typeof updater !== 'function') throw new Error('updaters must be functions');

		const newUpdaters = this._updaters.push(updater);

		return new Store(this._state, newUpdaters);
	}

	/**
	 * Update the Store by calling the actions in all the updaters.
	 *
	 * @param action	{Object}				The action to pass to each of the updaters
	 * @param settings	{[Object]}				The settings for this dispatch
	 *
	 * @return			{Promise<Store>}		A Promise with the new Store with the state after
	 *											calling the updaters
	 */
	dispatch(action: Action, settings: DispatchSettings<S> = {}): Promise<Store<S>> {
		// Check args
		const { replaceState, skip, finishOnServer, arg } = settings;

		if(!action || typeof action !== 'object') throw new Error('actions must be objects');
		if(settings.skip && typeof settings.skip !== 'number') throw new Error('settings.skip must be a number');
		if(settings.finishOnServer && settings.arg) {
			throw new Error("'finishOnServer' and 'arg' cannot both be set for a dispatch");
		}
		if(settings.finishOnServer && typeof settings.finishOnServer !== 'function') {
			throw new Error("'finishOnServer' must be a function");
		}
		if(settings.finishedUpdaters && typeof settings.finishedUpdaters !== 'function') {
			throw new Error("'finishedUpdaters' must be a function");
		}

		// Do nothing if there are no updaters to perform
		if(this._updaters.count() === 0)	return Promise.resolve(this);

		// Dispatch to each updater
		const startingState = typeof settings.replaceState !== 'undefined'? settings.replaceState: this._state;
		const updatedStatePromise = this._updaters.reduce((currStatePromise, updater, index) => {
			// Check if this updater should be skipped
			if(settings.skip && index < settings.skip)	return currStatePromise;

			return currStatePromise.then((state) => {	//TODO, try wrapping this in Promise to get ride of $FlowIssue
				// Check if finishing on server
				if(state.isFinishingOnServer) return state;

				// Check for valid state (pass through to be checked below)
				if(!this._isValidState(state)) return state;

				// Call updater
				const onServer = this._makeOnServer(state, index, settings);
				return updater(state, action, onServer);
			});
		}, Promise.resolve(startingState));

		// $FlowIssue: not recognizing newStatePromise is a Promise
		const newStatePromise = updatedStatePromise.then((updatedState) => {
			const finishedOnClient = !updatedState.isFinishingOnServer;

			if(settings.finishedUpdaters) settings.finishedUpdaters(finishedOnClient);

			if(finishedOnClient) return updatedState;

			// Get state from server
			return updatedState.getServerState();
		});

		// Create new store from the new state
		return newStatePromise.then((newState) => {
			// Check for valid state
			if(!this._isValidState(newState)) throw new Error('a state must be returned from each updater');

			return new Store(newState, this._updaters);
		});
	}


	/**
	 * Replace the state of the current store.
	 *
	 * @param {newState}	The the new store should have
	 *
	 * @return				A store with the same updaters, but the given state
	 */
	replaceState(newState: S): Store<S> {
		return new Store(newState, this._updaters);
	}

	/**
	 * Gets the current state of the Store.
	 *
	 * @return {any}	The state of the Store
	 */
	getState(): S {
		return this._state;
	}

	_makeOnServer(state: S, index: number, settings: DispatchSettings): OnServerFunc<S> {
		// Create on server
		return (onServerFunc) => {
			if(settings.finishOnServer) {
				const resultFromServer = settings.finishOnServer(state, index);
				return {
					isFinishingOnServer: true,
					getServerState() {
						return resultFromServer;
					}
				};
			}

			return Promise.resolve(onServerFunc(settings.arg));
		};
	}

	_isValidState(testState: S): boolean {
		return typeof testState !== 'undefined';
	}
}

export function createStore<S>(initialState: S): Store<S> {
	return Store.createStore(initialState);
}