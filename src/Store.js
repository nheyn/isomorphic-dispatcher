/**
 * @flow
 */
import Immutable from 'immutable';

type OnServerObj<S> = {
	isFinishingOnServer: bool,
	getServerState: () => Promise<S>
};
type OnServerReturnValue<S> = S | Promise<S> | OnServerObj<S>;	//ERROR, type error?????
type OnServerFunc<S> = (arg: any) => OnServerReturnValue<S>;
type StoreIsoFunc<S> = (action: Action, startingPoint: StartingPoint<S>) => Promise<S>;
type StoreUpdater<S> = (
	state: S,
	action: Action,
	onServer: OnServerFunc<S>
) => MaybePromise<S>;

/*------------------------------------------------------------------------------------------------*/
//	--- Store ---
/*------------------------------------------------------------------------------------------------*/
/**
 * A store that uses updaters to dispatch changes to its state.
 */
export default class Store<S> {
	_state: S;
	_updaters: Immutable.List<StoreUpdater<S>>;
	_finishOnServer: ?StoreIsoFunc<S>;
	_arg: ?any;

	/**
	 * Store constuctor (use Store.createStore).
	 *
	 * @param state				{any}					The current state of the object
	 * @param updaters			{List<StoreUpdater>}	The updaters that can mutate the Store
	 * @param finishOnServer	{?StoreIsoFunc}			The function to call when finishing a
	 *													dispatch call on the server
	 * @param arg				{?any}					The arg that will passed to the function
	 *													given to onServer, when on the server
	 */
	constructor(
		state: S,
		updaters: Immutable.List<StoreUpdater<S>>,
		finishOnServer?: ?StoreIsoFunc<S>,
		arg?: ?any
	) {
		// Check stores is not set up to be used on both the server and client
		if(arg && finishOnServer) {
			throw new Error('Unable to use both a finish on server function and argument');
		}

		this._state =			state;
		this._updaters =		updaters;
		this._finishOnServer =	finishOnServer;
		this._arg =				arg;
	}

	/**
	 * Create a new Store.
	 *
	 * @param initialState	{any}	The initial state of the object
	 *
	 * @return				{Store}	The new Store
	 */
	static createStore(initialState: S): Store<S> {
		return new Store(initialState, Immutable.List(), undefined, undefined);
	}

	/**
	 * Set the function to call when finishing a dispatch call on the server.
	 *
	 * @param newFinishOnServer	{StoreIsoFunc}	The new function
	 *
	 * @throws									An error is thrown when this is set on
	 *											the server
	 *
	 * @return					{Store}			A new Store with the given function
	 */
	finishOnServerUsing(newFinishOnServer: StoreIsoFunc): Store<S> {
		if(typeof newFinishOnServer !== 'function') {
			throw new Error('iso dispatcher must be a function');
		}

		return new Store(this._state, this._updaters, newFinishOnServer, undefined);
	}

	/**
	 * Set the argument that will be passed to the function given to the onServer function, in the
	 * updater functions.
	 *
	 * @param arg	{any}	The argument to use in the function given to onServer
	 *
	 * @return		{Store}	A new Store with the given arg
	 */
	setOnServerArg(arg: any): Store<S> {
		return new Store(this._state, this._updaters, undefined, arg);
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

		return new Store(this._state, newUpdaters, this._finishOnServer, this._arg);
	}

	/**
	 * Update the Store by calling the actions in all the updaters.
	 *
	 * @param action	{Object}				The action to pass to each of the updaters
	 *
	 * @return			{Promise<Store>}		A Promise with the new Store with the state after
	 *											calling the updaters
	 */
	dispatch(action: Action): Promise<Store<S>> {
		return this.startDispatchAt(action, { state: this._state, index: 0});
	}

	/**
	 * Update the Store by calling the actions in the updaters after startingPoint.index using
	 * startingPoint.state instead of the Stores state.
	 *
	 * @param action		{Object}			The action to pass to each of the updaters
	 * @param startingPoint {
	 *							state,			The state to pass to the updater at the given index
	 *							index			The index of the dispatcher to start with
	 *						}
	 *
	 * @return				{Promise<Store>}	A Promise with the new Store with the state after
	 *											calling the updaters
	 */
	startDispatchAt(action: Action, startingPoint: StartingPoint<S>): Promise<Store<S>> {
		// Do nothing if there are no updaters to perform
		if(this._updaters.count() === 0)	return Promise.resolve(this);

		// Check args
		if(!action || typeof action !== 'object') {
			return Promise.reject(new Error('actions must be objects'));
		}
		if(
			!startingPoint									||
			startingPoint.state === undefined				||
			typeof startingPoint.index !== 'number'			||
			startingPoint.index < 0							||
			startingPoint.index >= this._updaters.count()
		) {
			return Promise.reject(new Error('starting point must contain valid index and state'));
		}

		// Dispatch to each updater
		const updatedStatePromise = this._updaters.reduce(
			(currStatePromise, updater, index) => {
				// Check if this updater should be skipped
				if(index < startingPoint.index)	return currStatePromise;

				return currStatePromise.then((state) => {
					// Check if finishing on server
					if(state.isFinishingOnServer) return state;

					// Check for valid state (pass through to be checked below)
					if(!this._isValidState(state)) return state;

					// Call updater
					const onServer = this._makeOnServer(action, { state, index });
					return updater(state, action, onServer);
				});
			},
			Promise.resolve(startingPoint.state)	//ERROR, flow error here (????)
		);

		const newStatePromise = updatedStatePromise.then((updatedState) => {
			if(!updatedState.isFinishingOnServer) return updatedState;

			// Get state from server
			return updatedState.getServerState();
		});

		// Create new store from the new state
		return newStatePromise.then((newState) => {
			// Check for valid state
			if(!this._isValidState(newState)) {
				throw new Error('a state must be returned from each updater');
			}

			return new Store(newState, this._updaters, this._finishOnServer, this._arg);
		});
	}

	/**
	 * Gets the current state of the Store.
	 *
	 * @return {any}	The state of the Store
	 */
	getState(): S {
		return this._state;
	}

	_makeOnServer(action: Action, startingPoint: StartingPoint<S>): OnServerFunc<S> {
		return (onServerFunc) => {
			if(this._finishOnServer) {
				const resultFromServer = this._finishOnServer(action, startingPoint);
				return {
					isFinishingOnServer: true,
					getServerState() {
						return resultFromServer;
					}
				};
			}

			return Promise.resolve(onServerFunc(this._arg));
		};
	}

	_isValidState(testState: S): boolean {
		return typeof testState !== 'undefined';
	}
}
