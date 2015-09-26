var Store = require.requireActual('../src/Store');

function getUpdaters() {
	return [0, 1, 2, 3, 4].map((index) => {
		return jest.genMockFunction().mockImplementation(
			(state, action) => Object.assign({}, state, { update: index })
		);
	});
}

describe('Store', () => {
	pit('has the given initial state', () => {
		var initialState = { initialState: true };
		var emptyStore = Store.createStore(initialState);
		var updaters = getUpdaters();

		// Add Updaters to store
		var store = updaters.reduce(
			(currStore, updater) => currStore.register(updater),
			emptyStore
		);

		return store.dispatch({}).then(() => {
			updaters.forEach((updater) => {
				// Test the updater was called
				expect(updater.mock.calls.length).toBe(1);

				// Test the initial state is given
				var stateArg = updater.mock.calls[0][0];
				expect(stateArg.initialState).toBeDefined();
			});
		});
	});

	pit('passes the dispatched action to the updaters', () => {
		var dispatchedAction = { dispatchedAction: true };
		var emptyStore = Store.createStore({});
		var updaters = getUpdaters();

		// Add Updaters to store
		var store = updaters.reduce(
			(currStore, updater) => currStore.register(updater),
			emptyStore
		);

		return store.dispatch(dispatchedAction).then(() => {
			updaters.forEach((updater) => {
				// Test the initial state is given
				var actionArg = updater.mock.calls[0][1];
				expect(actionArg).toBe(dispatchedAction);
			});
		});
	});

	pit('has the returned state after dispatch is called', () => {
		var emptyStore = Store.createStore({});
		var updaters = getUpdaters();

		var store = updaters.reduce((currStore, updater, index) => {
			return currStore.register((state, action) => {
				// Test state is being updated correctly
				if(index === 0) expect(state.update).toBeUndefined();
				else			expect(state.update).toBe(index - 1);

				return updater(state, action);
			});
		}, emptyStore);

		return store.dispatch({}).then((updatedStore) => {
			updaters.forEach((updater, index) => {
				// Test state is being updated correctly
				var stateArg = updater.mock.calls[0][0];

				if(index === 0)		expect(stateArg.update).toBeUndefined();
				else				expect(stateArg.update).toBe(index - 1);
			});

			// Test final state is correct
			var finalState = updatedStore.getState();
			expect(finalState.update).toBe(updaters.length - 1);
		});
	});

	pit('can start the dispatch call in middle', () => {
		var startingPoint = {
			state: { startingPointState: true },
			index: 2
		};
		var passedAction = { action: 'TEST-ACTION' };
		var passedArg = { passedArg: true };
		var emptyStore = Store.createStore({});
		var updaters = getUpdaters();

		var store = updaters.reduce((currStore, updater, index) => {
			return currStore.register((state, action, onServer) => {
				// Test the passed arg is correct
				var onServerReturnVal = { onServerReturnVal: true };
				var onServerPromise = onServer((arg) => {
					expect(arg).toBe(passedArg);
					return onServerReturnVal;
				});

				// Test onServer function return value is in the returned promise
				onServerPromise.then((val) => {
					expect(val).toBe(onServerReturnVal);
				});

				return updater(state, action);
			});
		}, emptyStore);

		return store.startDispatchAt(passedAction, startingPoint, passedArg).then(() => {
			updaters.forEach((updater, index) => {
				if(index < startingPoint.index) {
					// Test first updaters weren't called
					expect(updater.mock.calls.length).toBe(0);
				}
				else {
					// Test updaters at end are called
					expect(updater.mock.calls.length).toBe(1);

					// Test given action is correct and starting with the correct state
					var updaterArgs = updater.mock.calls[0];
					expect(updaterArgs[0].startingPointState).toBeDefined();
					expect(updaterArgs[1]).toBe(passedAction);
				}
			});
		});
	});

	pit('can stop the dispatch call in middle', () => {
		var stopAt = 2;
		var dispatchedAction = { dispatchedAction: true };
		var serverResponse = { fromIsoFunc: true };
		var isoFunc = jest.genMockFunction().mockImplementation(
			() => Promise.resolve(serverResponse)
		);
		var emptyStore = Store.createStore({});
		var updaters = getUpdaters();

		// Fill store and add iso dispatcher
		var store = updaters.reduce((currStore, updater, index) => {
			return currStore.register((state, action, onServer) => {
				if(index === stopAt) {
					return onServer(() => {
						// Test onServer func is called on the client
						expect('this not').toBe('CALLED');
					});
				}

				return updater(state, action);
			});
		}, emptyStore.useIsoDispatcher(isoFunc));


		return store.dispatch(dispatchedAction).then((updatedStore) => {
			// Test server (the iso dispatcher func) is only called once
			expect(isoFunc.mock.calls.length).toBe(1);

			// Test action/starting point is correct
			var [action, startingPoint] = isoFunc.mock.calls[0];

			expect(action).toBe(dispatchedAction);
			expect(startingPoint.index).toBe(stopAt);
			expect(startingPoint.state.update).toBe(stopAt - 1);

			// Test state is what was returned by the server (the iso dispatcher func)
			expect(updatedStore.getState()).toBe(serverResponse);

			updaters.forEach((updater, index) => {
				// Test correct updater was called / skipped
				if(index < stopAt)	expect(updater.mock.calls.length).toBe(1);
				else 				expect(updater.mock.calls.length).toBe(0);
			});
		});
	});

	pit('returns errors from updaters in the Promise', () => {
		var updaterError = new Error('updater error');
		var updaterErrorIndex = 2;
		var store = Store.createStore({});

		var updaters = getUpdaters();
		updaters.forEach((updater, index) => {
			store = store.register((state, action) => {
				if(index === updaterErrorIndex) throw updaterError;

				// Test only updaters before the error are called
				expect(index).toBeLessThan(updaterErrorIndex);

				return updater(state, action);
			});
		});

		return store.dispatch({})
			.then((store) => {
				throw new Error('store.dispatch return state, instead of an error');
			})
			.catch((err) => {
				// Test the thrown error is returned in the Promise
				expect(err.message).toBe(updaterError.message);

				updaters.forEach((updater, index) => {
					if(index < updaterErrorIndex) {
						// Test first updaters weren't called
						expect(updater.mock.calls.length).toBe(1);
					}
					else {
						// Test updaters at end are called
						expect(updater.mock.calls.length).toBe(0);
					}
				});
			});
	});

	pit('validates method arguments', () => {
		var promises = [];

		var store = Store.createStore({});

		var updaters = getUpdaters();
		updaters.forEach((updater) => {
			store = store.register(updater);
		});

		// Test incorrect action
		var invalidActions = [
			null,
			1,
			true,
			false,
			"invalid"
		];
		invalidActions.forEach((invalidAction) => {
			promises.push(
				store.dispatch(invalidAction)
					.then(() => {
						throw new Error('store.dispatch return state, instead of an error');
					})
					.catch((err) => {
						// Test correct error is returned
						expect(err.message).toBe('actions must be objects');
					})
			);

			promises.push(
				store.startDispatchAt(invalidAction, { index: updaters.length - 1, state: {} }, {})
					.then(() => {
						throw new Error('store.dispatch return state, instead of an error');
					})
					.catch((err) => {
						// Test correct error is returned
						expect(err.message).toBe('actions must be objects');
					})
			);
		});

		// Test incorrect starting point
		var invalidStartingPoints = [
			null,
			1,
			true,
			'invalid',
			new Error(),
			{ },
			{ state: {} },
			{ index: updaters.length - 1 },
			{ index: updaters.length, state: {} },
			{ index: -1, state: {} }
		];
		invalidStartingPoints.forEach((invalidStartingPoint) => {
			promises.push(
				store.startDispatchAt({}, invalidStartingPoint, {})
					.then(() => {
						throw new Error('store.dispatch return state, instead of an error');
					})
					.catch((err) => {
						// Test correct error is returned
						expect(err.message).toBe('starting point must contain index and state');
					})
			);
		});

		// Test invalid updaters
		var invalidUpdaters = [
			null,
			1,
			true,
			"invalid",
			new Error(),
			() => undefined
		];
		invalidUpdaters.forEach((invalidUpdater) => {
			if(typeof invalidUpdater === 'function') {
				var invalidStore = store.register(invalidUpdater);

				promises.push(
					invalidStore.dispatch({})
						.then(() => {
							throw new Error('store.dispatch return state, instead of an error');
						})
						.catch((err) => {
							// Test correct error is returned
							expect(err.message).toBe('a state must be returned from each updater');
						})
				);
			}
			else {
				expect(() => store.register(invalidUpdater)).toThrow('updaters must be functions');
			}
		});

		return Promise.all(promises);
	});
});
