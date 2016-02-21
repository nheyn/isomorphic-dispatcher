jest.dontMock('../src/Store');
jest.dontMock('immutable');

const Store = require('../src/Store');

describe('Store', () => {
	pit('will call updaters passed to register method with the action passed to dispatch', () => {
		const initialState = { the: 'state of the store' };
		const dispatchedAction = { the: 'dispatched action' };
		const store = Store.createStore(initialState).register((state, action) => {
			expect(action).toEqual(dispatchedAction);

			return state;
		}).register((state, action) => {
			expect(action).toEqual(dispatchedAction);

			return state;
		}).register((state, action) => {
			expect(action).toEqual(dispatchedAction);

			return state;
		});

		return store.dispatch(dispatchedAction);
	});

	pit('can replace the state before starting to dispatch', () => {
		const initialState = { the: 'state of the store' };
		const replacedState = { the: 'replaced state' };
		const store = Store.createStore(initialState).register((state, action) => {
			expect(state).toEqual(replacedState);

			return state;
		});

		return store.dispatch({ type: 'testAction' }, {
			replaceState: replacedState
		});
	});

	pit('can skip updaters at the beginning of the dispatch', () => {
		const initialState = { the: 'state of the store' };
		const updatedState = { the: 'updated state of the store' };
		const wrongUpdatedState = { the: 'wrong updated state of the store' };
		const store = Store.createStore(initialState).register((state, action) => {
			expect('not').toBe('called');

			return wrongUpdatedState;
		}).register((state, action) => {
			expect('not').toBe('called');

			return wrongUpdatedState;
		}).register((state, action) => {
			return updatedState;
		});

		const updatedStorePromise = store.dispatch({ type: 'testAction' }, {
			skip: 2
		});

		return updatedStorePromise.then((newStore) => {
			const newState = newStore.getState();

			expect(newState).toEqual(updatedState);
			expect(newState).not.toEqual(wrongUpdatedState);
		});
	});

	pit('will call the onServer arg of the updaters if no client side settings are given', () => {
		const initialState = { the: 'initial state of the store' };
		const updatedState = { the: 'updated state of the store' };
		const store = Store.createStore(initialState).register((state, action, onServer) => {
			return onServer(() => {
				return updatedState;
			});
		});

		return store.dispatch({ type: 'testAction' }).then((updatedStore) => {
			expect(updatedStore.getState()).toEqual(updatedState);
		});
	});

	pit('will call the onServer arg of the updaters if the arg is given', () => {
		const initialState = { the: 'initial state of the store' };
		const passedArg = { the: 'passed arg' };
		const store = Store.createStore(initialState).register((state, action, onServer) => {
			return onServer((arg) => {
				expect(arg).toBe(passedArg);

				return state;
			});
		});

		return store.dispatch({ type: 'testAction' }, {
			arg: passedArg
		});
	});

	pit('will get the state from finishOnServer function if given and onServer is called', () => {
		const initialState = { the: 'state of the store' };
		const updatedState = { the: 'updated state of the store' };
		const wrongUpdatedState = { the: 'wrong updated state of the store' };
		const store = Store.createStore(initialState).register((state, action, onServer) => {
			return onServer(() => {
				return wrongUpdatedState;
			});
		});

		const updatedStorePromise = store.dispatch({ type: 'testAction' }, {
			finishOnServer() {
				return updatedState;
			}
		});

		return updatedStorePromise.then((newStore) => {
			const newState = newStore.getState();

			expect(newState).toEqual(updatedState);
			expect(newState).not.toEqual(wrongUpdatedState);
		});
	});

	pit('will call the finishOnServer function with the correct stopping point', () => {
		const initialState = { the: 'state of the store' };
		const store = Store.createStore(initialState).register((state, action) => {
			return state;
		}).register((state, action, onServer) => {
			return onServer(() => state);
		}).register((state, action) => {
			expect('not').toBe('called');

			return state;
		});

		const finishOnServerFunc = jest.genMockFunction().mockReturnValue(initialState);
		const updatedStorePromise = store.dispatch({ type: 'testAction' }, {
			finishOnServer: finishOnServerFunc
		});

		return updatedStorePromise.then((newStore) => {
			const { mock } = finishOnServerFunc;

			expect(mock.calls.length).toBe(1);
			expect(mock.calls[0]).toEqual([initialState, 1]);
		});
	});

	pit('will not call the finishOnServer function if given and onServer is not called', () => {
		const initialState = { the: 'state of the store' };
		const updatedState = { the: 'updated state of the store' };
		const wrongUpdatedState = { the: 'wrong updated state of the store' };
		const store = Store.createStore(initialState).register((state, action, onServer) => {
			return updatedState;
		});

		const updatedStorePromise = store.dispatch({ type: 'testAction' }, {
			finishOnServer() {
				expect('not').toBe('called');

				return wrongUpdatedState;
			}
		});

		return updatedStorePromise.then((newStore) => {
			const newState = newStore.getState();

			expect(newState).toEqual(updatedState);
			expect(newState).not.toEqual(wrongUpdatedState);
		});
	});

	pit('will call finishedUpdaters after all the updater have been called in the store', () => {
		const initialState = { the: 'state of the store' };
		const store = Store.createStore(initialState).register((state, action, onServer) => state);

		const finishedUpdatersFunc = jest.genMockFunction();
		const updatedStorePromise = store.dispatch({ type: 'testAction' }, {
			finishedUpdaters: finishedUpdatersFunc
		});

		return updatedStorePromise.then(() => {
			const { mock } = finishedUpdatersFunc;

			expect(mock.calls.length).toBe(1);
		});
	});

	it('can replace the state of the store, keeping the same updaters', () => {
		const initialState = { the: 'state of the store' };
		const updaters = [
			jest.genMockFunction().mockReturnValue(initialState),
			jest.genMockFunction().mockReturnValue(initialState),
			jest.genMockFunction().mockReturnValue(initialState)
		];
		const store = Store.createStore(initialState).register(updaters[0]).register(updaters[1]).register(updaters[2]);

		const replacedState = { the: 'replaced state of the store' };
		const storeWithReplacedState = store.replaceState(replacedState);
		expect(storeWithReplacedState.getState()).toEqual(replacedState);

		return storeWithReplacedState.dispatch({ type: 'testAction' }).then((updatedStore) => {
			expect(updatedStore.getState()).toEqual(initialState);

			updaters.forEach((updaterFunc) => {
				const { mock } = updaterFunc;

				expect(mock.calls.length).toBe(1);
			})
		});
	});

	it('will have the initial state before dispatch is called', () => {
		const state = { the: 'state of the store' };
		const store = Store.createStore(state);

		expect(store.getState()).toEqual(state);
	});

	pit('will not change its state, because Store is immutable', () => {
		const initialState = { the: 'initial state of the store' };
		const updatedState = { the: 'updated state of the store' };
		const store = Store.createStore(initialState).register((state, action) => updatedState);

		expect(store.getState()).toEqual(initialState);
		return store.dispatch({ type: 'testAction' }).then(() => {
			expect(store.getState()).toEqual(initialState);
		});
	});

	pit('will return a Store with the new state from dispatch', () => {
		const initialState = { the: 'initial state of the store' };
		const updatedState = { the: 'updated state of the store' };
		const store = Store.createStore(initialState).register((state, action) => updatedState);

		return store.dispatch({ type: 'testAction' }).then((newStore) => {
			expect(newStore.getState()).toEqual(updatedState);
		});
	});

	pit('can accumulate state from multiple updaters', () => {
		const initialState = { initial: 'initial' };
		const stateUpdates = [
			{ update: 0, val0: 0 },
			{ update: 1, val1: 1 },
			{ update: 2, val2: 2 }
		];
		const store = Store.createStore(initialState).register((state, action) => {
			return Object.assign({}, state, stateUpdates[0]);
		}).register((state, action) => {
			return Object.assign({}, state, stateUpdates[1]);
		}).register((state, action) => {
			return Object.assign({}, state, stateUpdates[2]);
		});

		return store.dispatch({ type: 'testAction' }).then((newStore) => {
			const updatedState = newStore.getState();

			// Check initial state is still their
			expect(updatedState.initial).toBe(initialState.initial);

			// Check add state is their
			expect(updatedState.val0).toBe(0);
			expect(updatedState.val1).toBe(1);
			expect(updatedState.val2).toBe(2);

			// Check overwritten state is their and correct
			expect(updatedState.update).toBe(2);
		});
	});

	pit('can accumulate state from multiple calls to dispatch', () => {
		const initialState = { initial: 'initial' };
		const store = Store.createStore(initialState).register((state, action) => {
			const count = state.count? state.count: 0;

			return Object.assign({}, state, { count: count+1 });
		});

		let updatedStorePromise = Promise.resolve(store);

		const repeatCount = 5;
		for(let i = 0; i<repeatCount; i++) {
			updatedStorePromise = updatedStorePromise.then((updatedStore) => {
				return updatedStore.dispatch({ type: 'testAction' });
			});
		}

		return updatedStorePromise.then((updatedStore) => {
			const updatedState = updatedStore.getState();

			// Check initial state is still their
			expect(updatedState.initial).toBe(initialState.initial);

			// Check count is correct
			expect(updatedState.count).toBe(repeatCount);
		});
	});

	pit('can wait for asynchronous updaters', () => {
		const initialState = { the: 'initial state of the store' };
		const updatedState = { the: 'updated state of the store' };
		const store = Store.createStore(initialState).register((state, action) => {
			return new Promise((resolve) => {
				resolve(updatedState);

				setTimeout(() => {
					resolve(updatedState)
				}, 50);
			});
		});

		const updatedStorePromise = store.dispatch({ type: 'testAction' });


		// Check store did wait for timeout to finish
		let didCheck = false;
		setTimeout(() => {
			didCheck = true;
		}, 25);
		jest.runAllTimers();

		return updatedStorePromise.then((newStore) => {
			expect(newStore.getState()).toEqual(updatedState);
			expect(didCheck).toBe(true);
		});
	});
});
