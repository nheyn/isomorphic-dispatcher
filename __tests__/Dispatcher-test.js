var Dispatcher = require.requireActual('../src/Dispatcher');

var Store = jest.genMockFromModule('../src/Store');								//TODO, finish mock
var SubscriptionHandler = jest.genMockFromModule('../src/SubscriptionHandler');	//TODO, finish mock

// Use manul mock
Store.createStore = function(initialState, updateStore) {
	var store = new Store(initialState, [], null);
	if(updateStore) {
		store = updateStore(store);
	}

	return store;
};
SubscriptionHandler.createSubscriptionHandler = function(updateSubscriptionHandler) {
	var subscriptionHandler = new SubscriptionHandler([]);
	if(updateSubscriptionHandler) {
		subscriptionHandler = updateSubscriptionHandler(subscriptionHandler);
	}
	return subscriptionHandler;
}
Dispatcher.createDispatcher = function(stores, updateSubscriptionHandler) {
	return new Dispatcher(
		stores,
		SubscriptionHandler.createSubscriptionHandler(updateSubscriptionHandler)
	);
};

function getStores(updateStore, initialStates) {
	var updateStoreWrapper = (storeName) => {
		return (store) => updateStore(store, storeName);
	};

	return {
		a: Store.createStore(initialStates? initialStates.a: {}, updateStoreWrapper('a')),
		b: Store.createStore(initialStates? initialStates.b: {}, updateStoreWrapper('b')),
		c: Store.createStore(initialStates? initialStates.c: {}, updateStoreWrapper('c')),
		d: Store.createStore(initialStates? initialStates.d: {}, updateStoreWrapper('d')),
		e: Store.createStore(initialStates? initialStates.e: {}, updateStoreWrapper('e'))
	};
}

describe('Dispatcher', () => {
	it('has the given stores', () => {
		var stores = getStores();
		var dispatcher = Dispatcher.createDispatcher(stores);

		// Test the given stores are added (and no others)
		var correctNames = Object.key(stores);
		var storeNames = Object.keys(dispatcher.getStateForAll());

		expect(storeNames.length).toBe(correctNames.length);
		storeNames.forEach((storeName) => {
			expect(correctNames).toContain(storeName);
		});

		//Test trying to use invalid stores
		var invalidStores = [
			null,
			1,
			"invalid",
			new Error()
		];

		invalidStores.map((invalidStore) => {
			expect(() => {
				Dispatcher.createDispatcher(invalidStore);
			}).toThrow();

			expect(() => {
				Dispatcher.createDispatcher({ aName: invalidStore });
			}).toThrow();
		});
		expect(() => {
			Dispatcher.createDispatcher({ aName: {} });
		}).toThrow();
		expect(() => {
			Dispatcher.createDispatcher({ aName: [] });
		}).toThrow();
	});

	it('dispatchs to all of its stores', () => {
		var dispatchedAction = { dispatchedAction: true };
		var didDispatch = {};
		var stores = getStores((store, storeName) => {
			store.dispatch = function(action) {
				didDispatch[storeName] = true;

				// Test correct action is given
				expect(action).toBe(dispatchedAction);

				return Promise.resolve(store);
			};

			return store;
		});
		var dispatcher = Dispatcher.createDispatcher(stores);

		// Test all dispatchers where called
		dispatcher.dispatch(dispatchedAction).then(() => {
			expect(Object.keys(didDispatch).length).toBe(Object.keys(stores).length)
			for(var storeName in stores) {
				expect(didDispatch[storeName]).toBeTruthy();
			}
		});
	});

	it('can get the states of all of its stores', () => {
		var initialStates = {
			a: { stateFor: 'a' },
			b: { stateFor: 'b' },
			c: { stateFor: 'c' },
			d: { stateFor: 'd' },
			e: { stateFor: 'e' }
		};
		var stores = createStores((store, storeName) => {
			store.getState = function() {
				return initialStates[storeName];
			};

			return store;
		}, initialStates);
		var dispatchers = Dispatcher.createDispatcher(stores);

		// Test getting all states
		var allStates = dispatcher.getStateForAll();
		Object.keys(allStates).forEach((storeName) => {
			var currentState = allStates[storeName];
			var initialState = initialStates[storeName];

			expect(currentState).toBe(initialState);
		});
		expect(Object.keys(allStates)).toBe(Object.keys(initialStates));

		// Test getting a single stores state
		Object.keys(initialState).forEach((storeName) => {
			var currentState = dispatcher.getStateFor(storeName);
			var initialState = initialStates[storeName];

			expect(currentState).toBe(initialState);
		});

		// Tests trying to get state from invalid stores
		var invalidStoreNames = [
			null,
			0,
			"not a store name",
			new Error(),
			[],
			{}
		];
		invalidStoreNames.forEach((invalidStoreName) => {
			expect(() => {
				dispatcher.getStateFor(invalidStoreName);
			}).toThrow();
		});
	});

	it('allows function to subscribe to it', () => {
		var stores = getStores();

		var calledSubscribers;
		var dispatcher = Dispatcher.createDispatcher(stores, (subscriptionHandler) => {
			subscriptionHandler.publish = function() {
				calledSubscribers++;
			};

			return subscriptionHandler;
		});

		var unsubscribeFuncs = [
			dispatcher.subscribeToAll(() => undefined),
			dispatcher.subscribeToAll(() => undefined),
			dispatcher.subscribeToAll(() => undefined),
			dispatcher.subscribeToAll(() => undefined),
			dispatcher.subscribeToAll(() => undefined)
		];

		// Test subscribing to all stores
		calledSubscribers = 0;
		dispatcher.dispatch({}).then(() => {
			expect(calledSubscribers).toBe(unsubscribeFuncs.length);
		});

		// Test unsubscribing to all stores
		unsubscribeFuncs.forEach((unsubscribeFunc, index) => {
			unsubscribeFunc();
			var subscribersLeft = unsubscribeFuncs.length - index - 1;

			calledSubscribers = 0;
			dispatcher.dispatch({}).then(() => {
				expect(calledSubscribers).toBe(subscribersLeft);
			});

			// Test unsubscibing twice
			expect(() => {
				unsubscribeFunc();
			}).toThrow();
		});

		// Test subscribing to single stores
		unsubscribeFuncs = [
			dispatcher.subscribeTo('a', () => undefined),
			dispatcher.subscribeTo('b', () => undefined),
			dispatcher.subscribeTo('c', () => undefined),
			dispatcher.subscribeTo('d', () => undefined),
			dispatcher.subscribeTo('e', () => undefined)
		];

		calledSubscribers = 0;
		dispatcher.dispatch({}).then(() => {
			expect(calledSubscribers).toBe(unsubscribeFuncs.length);
		});

		// Test unsubscribing to single stores
		unsubscribeFuncs.forEach((unsubscribeFunc, index) => {
			unsubscribeFunc();
			var subscribersLeft = unsubscribeFuncs.length - index - 1;

			calledSubscribers = 0;
			dispatcher.dispatch({}).then(() => {
				expect(calledSubscribers).toBe(subscribersLeft);
			});

			// Test unsubscibing twice
			expect(() => {
				unsubscribeFunc();
			}).toThrow();
		});

		// Test subscribing to invalid store name
		var invalidStoreNames = [
			null,
			1,
			"invalid store name",
			new Error(),
			{},
			[]
		];
		invalidStoreNames.forEach((invalidStoreName) => {
			expect(() => {
				dispatcher.subscribeTo(invalidStoreName, () => undefined);
			}).toThrow();
		});
	});

	it('calls all of its subscribers with the stores state', () => {
		var initialStates = {
			a: { stateFor: 'a' },
			b: { stateFor: 'b' },
			c: { stateFor: 'c' },
			d: { stateFor: 'd' },
			e: { stateFor: 'e' }
		};
		var stores = createStores((store, storeName) => {
			store.getState = function() {
				return initialStates[storeName];
			};

			return store;
		}, initialStates);
		Dispatcher.createDispatcher(stores, (subscriptionHandler) => {
			subscriptionHandler.publish = function(storeStates) {
				// Test published value is the states of the stores
				expect(storeStates).toEqual(initialStates)
			};

			return subscriptionHandler;
		}).dispatch({});
	});
});

describe('ClientDispatcher', () => {
	it('calls iso function when onServer is called', () => {
		//TODO, nyi: add updater that uses onServer, and call dispatch
	});
});

describe('ServerDispatcher', () => {
	it('can start stores in the middle', () => {
		//TODO, nyi: start dispatch in middle
		//TODO, nyi: has invalid start point when starting in middle
	});
});
