/**
 * @flow
 */
type OnServerFunc<S> = (arg: any) => MaybePromise<S>;
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
class Store<S> {
	_state: S;
	_updaters: Array<StoreUpdater<S>>;
	_finishOnServer: ?StoreIsoFunc<S>;

	/**
	 * Store constuctor (use Store.createStore).
	 *
	 * @param state				{any}					The current state of the object
	 * @param updaters			{Array<StoreUpdater>}	The updaters that can mutate the Store
	 * @param finishOnServer	{?StoreIsoFunc}		The function to call when finishing a dispatch
	 *													call on the server
	 */
	constuctor(state: S, updaters: Array<StoreUpdater<S>>, finishOnServer: ?StoreIsoFunc<S>) {
		this._state =			state;
		this._updaters =		updaters;
		this._finishOnServer =	finishOnServer;
	}

	/**
	 * Create a new Store.
	 *
	 * @param initialState	{any}	The initial state of the object
	 *
	 * @return				{Store}	The new Store
	 */
	static createStore(initialState: S): Store<S> {
		return new Store(initialState, [], null);
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
	useIsoDispatcher(newFinishOnServer: StoreIsoFunc): Store<S> {
		//TODO, nyi
		return new Store(this._state, this._updaters, this._finishOnServer);
	}

	/**
	 * Registers a new upator in the store.
	 *
	 * @param updater	{StoreUpdater}	The new function that is able to update the store's state
	 *
	 * @return			{Store}			A new Store with the new updater
	 */
	register(updater: StoreUpdater<S>): Store<S> {
		//TODO, nyi
		return new Store(this._state, this._updaters, this._finishOnServer);
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
		//TODO, nyi
		return Promise.reject(new Error('NYI'));
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
	 * @param arg			{any}				The argument to send to the onServer function
	 *
	 * @return				{Promise<Store>}	A Promise with the new Store with the state after
	 *											calling the updaters
	 */
	startDispatchAt(action: Action, startingPoint: StartingPoint<S>, arg: any):  Promise<Store<S>> {
		//TODO, nyi
		return Promise.reject(new Error('NYI'));
	}

	/**
	 * Gets the current state of the Store.
	 *
	 * @return {any}	The state of the Store
	 */
	getState(): S {
		//TODO, nyi
		return this._state;
	}
}

/*------------------------------------------------------------------------------------------------*/
//	--- Exports ---
/*------------------------------------------------------------------------------------------------*/
module.exports = Store;
