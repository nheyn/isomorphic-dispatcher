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
		var store = Store.createStore(initialState);
		var updaters = getUpdaters();
		updaters.forEach((updater, index) => {
			store = store.register(updater);
		});

		return store.dispatch({}).then(() => {
			updaters.forEach((updater) => {
				// Test the updater was called
				expect(updater.mock.calls.length).toBe(1);

				// Test the initial state is given
				var stateArg = updater.mock.calls[0][1];
				expect(stateArg.initialState).toBeDefined();
			});
		});
	});

	pit('passes the dispatched action to the updaters', () => {
		var dispatchedAction = { dispatchedAction: true };
		var store = Store.createStore({});
		var updaters = getUpdaters();
		updaters.forEach((updater) => {
			store = store.register(updater);
		});

		return store.dispatch(dispatchedAction).then(() => {
			updaters.forEach((updater) => {
				// Test the initial state is given
				var actionArg = updater.mock.calls[0][0];
				expect(actionArg).toBe(dispatchedAction);
			});
		});
	});

	pit('has the returned state after dispatch is called', () => {
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

		return store.dispatch({}).then((finalState) => {
			updaters.forEach((updater, index) => {
				// Test state is being updated correctly
				var stateArg = updater.mock.calls[0][1];

				if(index === 0) expect(stateArg.update).toBeUndefined();
				else			expect(stateArg.update).toBe(index - 1);
			});

			// Test final state is correct
			expect(finalState.update).toBe(updaters.length - 1);
		});
	});

	pit('can start the dispatch call in middle', () => {
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

		return store.startDispatchAt(passedAction, startPoint, passedArg).then(() => {
			updaters.forEach((updater, index) => {
				if(index < startingPoint.index) {
					// Test first updaters weren't called
					expect(updater.mock.calls.length).toBe(0);
				}
				else {
					// Test updaters at end are called
					expect(updater.mock.calls.length).toBe(1);

					// Test starting with the correct state
					var stateArg = updater.mock.calls[0][1];
					if(index === startingPoint.index) {
						expect(stateArg).toBe(startingPoint.state);
					}
					else {
						expect(stateArg.startPointState).toBeDefined();
					}

					// Test the given action is correct
					expect(action).toBe(passedAction);
				}
			});
		});
	});

	pit('can stop the dispatch call in middle', () => {
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

		return store.dispatch(dispatchedAction).then(() => {
			updaters.forEach((updater, index) => {
				if(index < stopAt) {
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

	pit('returns errors from updaters in the Promise', () => {
		var updaterError = new Error('updater error');
		var updaterErrorIndex = 3;
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

		return store.dispatch({})
			.then((store) => {
				throw new Error('store.dispatch return state, instead of an error');
			})
			.catch((err) => {
				// Test the thrown error is returned in the Promise
				expect(err).toBe(updaterError);
			})
			.then(() => {
				updaters.forEach((updater, index) => {
					if(index <= updaterErrorIndex) {
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

	it('validates method arguments', () => {
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
			"invalid",
			new Error()
		];
		invalidActions.forEach((invalidAction) => {
			promises.push(
				store.dispatch(invalidAction)
					.then(() => {
						throw new Error('store.dispatch return state, instead of an error');
					})
					.catch((err) => {
						// Test correct error is returned
						expect(err.message).toContain('Invalid Action Type');
					})
			);

			promises.push(
				store.startDispatchAt(invalidAction, { index: updaters.length - 1, state: {} }, {})
					.then(() => {
						throw new Error('store.dispatch return state, instead of an error');
					})
					.catch((err) => {
						// Test correct error is returned
						expect(err.message).toContain('Invalid Action');
					})
			);
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
			promises.push(
				store.startDispatchAt({}, invalidStartingPoint, {})
					.then(() => {
						throw new Error('store.dispatch return state, instead of an error');
					})
					.catch((err) => {
						// Test correct error is returned
						expect(err.message).toContain('Invalid Starting Point');
					})
			);
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

				promises.push(
					invalidStore.dispatch({})
						.then(() => {
							throw new Error('store.dispatch return state, instead of an error');
						})
						.catch((err) => {
							// Test correct error is returned
							expect(err.message).toContain('No State');
						})
				);
			}
			else {
				expect(() => store.register(invalidUpdater)).toThrow();
			}
		});

		return Promise.all(promises);
	});
});
