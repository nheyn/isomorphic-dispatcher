var Store = require.requireActual('../src/Store');

function getUpdaters() {
	return [0, 1, 2, 3, 4].map((index) => {
		return (state, action) => Object.assign({}, state, { update: index });
	});
}

describe('Store', () => {
	it('has the given initial state', () => {
		var initialState = { initialState: true };
		var store = Store.createStore(initialState);

		var updaters = getUpdaters();
		updaters.forEach((updater, index) => {
			store = store.register((state, action) => {
				// Test initial state is correct
				if(index === 0)	expect(state).toBe(initialState);
				else			expect(state.initialState).toBeDefined();

				return updater(state, action);
			});
		});

		store.dispatch({});
	});

	it('passes the dispatched action to the updaters', () => {
		var dispatchedAction = { dispatchedAction: true };
		var store = Store.createStore({});

		var updaters = getUpdaters();
		updaters.forEach((updater, index) => {
			store = store.register((state, action) => {
				// Test action is correct
				expect(action).toBe(dispatchedAction);

				return updater(state, action);
			});
		});

		store.dispatch(dispatchedAction);
	});

	it('has the returned state after dispatch is called', () => {
		var store = Store.createStore({});

		var updaters = getUpdaters();
		updaters.forEach((updater, index) => {
			store = store.register((state, action) => {
				// Test state is being updated correctly
				if(index === 0) expect(state.update).toBeUndefined();
				else			expect(state.update).toBe(index - 1);

				return updater(state, action);
			});
		});

		store.dispatch({}).then((store) => {
			// Test final state is correct
			var finalState = store.getState();
			expect(finalState.update).toBe(updaters.length - 1);
		});
	});

	it('can start the dispatch call in middle', () => {
		var startPoint = {
			state: { startPointState: true },
			index: 3
		};
		var passedAction = { action: 'TEST-ACTION' };
		var passedArg = { passedArg: true };
		var store = Store.createStore({});

		var updaters = getUpdaters();
		updaters.forEach((updater, index) => {
			store = store.register((state, action, onServer) => {
				// Test starting in the correct place
				expect(index).toBeGreaterThan(startingPoint.index - 1);

				// Test starting with the correct state
				if(index === startingPoint.index)	expect(state).toBe(startingPoint.state);
				else								expect(state.startPointState).toBeDefined();

				// Test the given action is correct
				expect(action).toBe(passedAction);

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
		});
		store.startDispatchAt(passedAction, startPoint, passedArg);
	});

	it('can stop the dispatch call in middle', () => {
		var dispatchedAction = { dispatchedAction: true };
		var stopAt = 3;
		var store = Store.createStore({});

		var updaters = getUpdaters();
		updaters.forEach((updater, index) => {
			store = store.register((state, action, onServer) => {
				if(index === stopAt) {
					onServer(() => {
						// Test onServer func is called on the client
						expect('this not').toBe('CALLED');
					});
				}

				// Test only functions before the server is called
				expect(index).isLessThan(stopAt);

				return updater(state, action);
			});
		});

		store.useIsoDispatcher((action, startingPoint) => {
			// Test action is correct
			expect(action).toBe(dispatchedAction);

			// Test state is correct
			expect(startingPoint.state.update).toBe(stopAt - 1);

			// Test index is correct
			expect(startingPoint.index).toBe(stopAt);
		});

		store.dispatch(dispatchedAction);
	});

	it('returns errors from updaters in the Promise', () => {
		var updaterError = new Error('updater error');
		var updaterErrorIndex = 3;
		var updatersCalledCount = 0;
		var store = Store.createStore({});

		var updaters = getUpdaters();
		updaters.forEach((updater, index) => {
			store = store.register((state, action) => {
				if(index === updaterErrorIndex) throw updaterError;
				updatersCalledCount++;

				// Test only updaters before the error are called
				expect(index).toBeLessThan(updaterErrorIndex);

				return updater(state, action);
			});
		});

		store.dispatch({})
			.then((store) => {
				// Test dispatch returns an error (not new store)
				expect('this not').toBe('CALLED');
			})
			.catch((err) => {
				// Test all updaters before the error where called
				expect(updatersCalledCount).toBe(updaterErrorIndex);

				// Test the thrown error is returned in the Promise
				expect(err).toBe(updaterError);
			});
	});

	it('validates method arguments', () => {
		var store = Store.createStore({});

		var updaters = getUpdaters();
		updaters.forEach((updater) => {
			store = store.register(updater);
		});

		// Test incorrect action
		var invalidActions = [
			null,
			1,
			"invalid",
			new Error()
		];
		invalidActions.forEach((invalidAction) => {
			store.dispatch(invalidAction)
				.then(() => {
					// Test dispatch returns an error (not new store)
					expect('this not').toBe('CALLED');
				})
				.catch((err) => {
					// Test correct error is returned
					expect(err.message).toContain('Invalid Action Type');
				});

			store.startDispatchAt(invalidAction, { index: updaters.length - 1, state: {} }, {})
				.then(() => {
					// Test dispatch returns an error (not new store)
					expect('this not').toBe('CALLED');
				})
				.catch((err) => {
					// Test correct error is returned
					expect(err.message).toContain('Invalid Action');
				});
		});

		// Test incorrect starting point
		var invalidStartingPoints = [
			null,
			1,
			'invalid',
			new Error(),
			{ },
			{ state: {} },
			{ index: updaters.length - 1 },
			{ index: updaters.length, state: {} },
			{ index: -1, state: {} }
		];
		invalidStartingPoints.forEach((invalidStartingPoint) => {
			store.startDispatchAt({}, invalidStartingPoint, {})
				.then(() => {
					// Test dispatch returns an error (not new store)
					expect('this not').toBe('CALLED');
				})
				.catch((err) => {
					// Test correct error is returned
					expect(err.message).toContain('Invalid Starting Point');
				});
		});

		// Test invalid updaters
		var invalidUpdaters = [
			null,
			1,
			"invalid",
			new Error(),
			() => undefined
		];
		invalidUpdaters.forEach((invalidUpdater) => {
			if(typeof invalidUpdater === 'function') {
				var invalidStore = store.register(invalidUpdater);

				invalidStore.dispatch({})
					.then(() => {
						// Test dispatch returns an error (not new store)
						expect('this not').toBe('CALLED');
					})
					.catch((err) => {
						// Test correct error is returned
						expect(err.message).toContain('No State');
					});
			}
			else {
				expect(() => store.register(invalidUpdater)).toThrow();
			}
		});
	});
});
