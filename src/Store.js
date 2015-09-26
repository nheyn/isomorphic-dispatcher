/**
 * @flow
 */
type OnServerFunc<S> = (arg: any) => MaybePromise<S>;
type OnServerObj<S> = {
	func: OnServerFunc<S>,
	isFinishingOnServer: () => bool
};
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
	constructor(state: S, updaters: Array<StoreUpdater<S>>, finishOnServer: ?StoreIsoFunc<S>) {
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
		if(typeof newFinishOnServer !== 'function') {
			throw new Error('iso dispatcher must be a function');
		}

		return new Store(this._state, this._updaters, newFinishOnServer);
	}

	/**
	 * Registers a new upator in the store.
	 *
	 * @param updater	{StoreUpdater}	The new function that is able to update the store's state
	 *
	 * @return			{Store}			A new Store with the new updater
	 */
	register(updater: StoreUpdater<S>): Store<S> {
		if(typeof updater !== 'function') throw new Error('updaters must be functions');

		var newUpdaters = this._updaters.slice(0);
		newUpdaters.push(updater);

		return new Store(this._state, newUpdaters, this._finishOnServer);
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
		//TODO, need to be able to get the arg here too
		return this.startDispatchAt(action, { state: this._state, index: 0}); //, arg);
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
	startDispatchAt(action: Action, startingPoint: StartingPoint<S>, arg?: any): Promise<Store<S>> {
		// Check args
		if(!action || typeof action !== 'object') {
			return Promise.reject(new Error('actions must be objects'));
		}
		if(
			!startingPoint								||
			startingPoint.state === undefined			||
			typeof startingPoint.index !== 'number'		||
			startingPoint.index < 0						||
			startingPoint.index >= this._updaters.length
		) {
			return Promise.reject(new Error('starting point must contain index and state'))
		}


		// Dispatch to each updater
		var lastOnServerFunc = null;
		var newStatePromise = this._updaters.reduce(
			(currStatePromise, updater, index) => {
				// Check to see if this updater should be called
				if(index < startingPoint.index)	return currStatePromise;

				return currStatePromise.then((state) => {
					// Check for no state returned
					if(state === undefined) return state;

					// Check if last updater called onServer function
					if(lastOnServerFunc && lastOnServerFunc.isFinishingOnServer()) return state;

					// Call updater
					var onServerObj = this._makeOnServer(action, { state, index }, arg);
					var nextStatePromise = updater(state, action, onServerObj.func);

					// Get ready for next reducer
					lastOnServerFunc = onServerObj;
					return nextStatePromise;
				});
			},
			Promise.resolve(startingPoint.state)
		);

		// Create new store from the new state
		return newStatePromise.then((newState) => {
			// Check for valid state
			if(newState === undefined) {
				throw new Error('a state must be returned from each updater');
			}

			var newStore = new Store(newState, this._updaters, this._finishOnServer);
			return Promise.resolve(newStore);
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

	_makeOnServer(action: Action, startingPoint: StartingPoint<S>, arg?: any): OnServerObj<S> {
		var finishingOnServer = false;
		var finishOnServer = this._finishOnServer;
		return {
			func(onServerFunc) {
				if(finishOnServer) {
					finishingOnServer = true;
					return finishOnServer(action, startingPoint)
				}

				return Promise.resolve(onServerFunc(arg));
			},
			isFinishingOnServer() {
				return finishingOnServer;
			}
		};

	}
}

/*------------------------------------------------------------------------------------------------*/
//	--- Exports ---
/*------------------------------------------------------------------------------------------------*/
module.exports = Store;
