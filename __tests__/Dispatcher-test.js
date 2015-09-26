var Dispatcher = require.requireActual('../src/Dispatcher');

var Store = jest.genMockFromModule('../src/Store');
var SubscriptionHandler = jest.genMockFromModule('../src/SubscriptionHandler');

// Use manul mock
Store.createStore = function(initialState) {
	var store = new Store(initialState, [], null);

	store.getState = jest.genMockFunction().mockReturnValue(initialState);
	store.dispatch = jest.genMockFunction().mockReturnValue(Promise.resolve(initialState));

	return store;
};
SubscriptionHandler.createSubscriptionHandler = function() {
	var subscriptionHandler = new SubscriptionHandler([]);

	subscriptionHandler.publish = jest.genMockFunction();

	return subscriptionHandler;
}
Dispatcher.createDispatcher = function(stores, updateSubscriptionHandler) {
	return new Dispatcher(
		stores,
		SubscriptionHandler.createSubscriptionHandler(updateSubscriptionHandler)
	);
};

function getStores(initialStates) {
	return {
		a: Store.createStore(initialStates? initialStates.a: {}),
		b: Store.createStore(initialStates? initialStates.b: {}),
		c: Store.createStore(initialStates? initialStates.c: {}),
		d: Store.createStore(initialStates? initialStates.d: {}),
		e: Store.createStore(initialStates? initialStates.e: {})
	};
}

describe('Dispatcher', () => {
	it('has the given stores', () => {
		var stores = getStores();
		var dispatcher = Dispatcher.createDispatcher(stores);

		// Test the given stores are added (and no others)
		expect(dispatcher._stores).toBe(stores);

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

	pit('dispatchs to all of its stores', () => {
		var dispatchedAction = { dispatchedAction: true };
		var dispatchFuncs = {};
		var stores = getStores();

		return Dispatcher.createDispatcher(stores).dispatch(dispatchedAction).then(() => {
			Object.keys(stores).forEach((storeName) => {
				// Test dispatcher was called
				var dispatchFunc = stores[storeName].dispatch;
				expect(dispatchFunc.mock.calls.length).toBe(1);

				// Test dispatcher was called with the correct object
				var dispatchFuncArg = dispatchFunc.mock.calls[0][0];
				expect(dispatchFuncArg).toBe(dispatchedAction);
			});
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
		var stores = getStores(initialStates);
		var dispatcher = Dispatcher.createDispatcher(stores);

		// Test getting all states
		var allStates = dispatcher.getStateForAll();
		expect(allStates).toEqual(initialStates);

		// Test getting a single stores state
		Object.keys(initialStates).forEach((storeName) => {
			var currentState = dispatcher.getStateFor(storeName);

			expect(currentState).toBe(initialStates[storeName]);
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

		var dispatcher = Dispatcher.createDispatcher(stores);

		var subscribers = [
			jest.genMockFunction(),
			jest.genMockFunction(),
			jest.genMockFunction(),
			jest.genMockFunction(),
			jest.genMockFunction()
		];
		var unsubscribeFuncs = subscribers.map((subscriber) => {
			return dispatcher.subscribeToAll(subscriber);
		});

		// Test subscribing to all stores
		var subscriptionHandler = dispatcher._subscriptionHandler;
		subscriptionHandler.subscribe.mock.calls.forEach((subscribeArgs) => {
			expect(subscribers).toContains(subscribeArgs[0]);
		});
		expect(subscriptionHandler.subscribe.mock.calls.length).toBe(subscribers.length);

		// Test unsubscribing to all stores
		unsubscribeFuncs.forEach((unsubscribeFunc, index) => {
			unsubscribeFunc();
			var subscribersLeft = unsubscribeFuncs.length - index - 1;

			subscriptionHandler.unsubscribe.mock.calls.forEach((unsubscribeArgs) => {
				expect(subscribers).contains(unsubscribeArgs[0]);
			});
			expect(subscriptionHandler.unsubscribe.mock.calls.length).toBe(subscribers.length);

			// Test unsubscibing twice
			expect(() => {
				unsubscribeFunc();
			}).toThrow();
		});

		// Test subscribing to single stores
		dispatcher = Dispatcher.createDispatcher(stores);
		unsubscribeFuncs = subscribers.map((subsciber) => {
			return dispatcher.subscribeTo('a', subsciber);
		});

		/*subscriptionHandler.subscribe.mock.calls.forEach((subscibeArgs) => {
			expect(subscribers).contains(subscibeArgs[0]);
		});*/ //ERROR, won't work because of groups
		expect(subscriptionHandler.subscribe.mock.calls.length).toBe(subscribers.length);

		// Test unsubscribing to single stores
		unsubscribeFuncs.forEach((unsubscribeFunc, index) => {
			unsubscribeFunc();
			var subscribersLeft = unsubscribeFuncs.length - index - 1;

			/*subscriptionHandler.unsubscribe.mock.calls.forEach((unsubscibeArgs) => {
				expect(subscribers).contains(unsubscibeArgs[0]);
			});*/ //ERROR, won't work because of groups
			expect(subscriptionHandler.unsubscribe.mock.calls.length).toBe(subscribers.length);

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
				dispatcher.subscribeTo(invalidStoreName, jest.genMockFunction());
			}).toThrow();
		});
	});

	pit('calls all of its subscribers with the stores state', () => {
		var initialStates = {
			a: { stateFor: 'a' },
			b: { stateFor: 'b' },
			c: { stateFor: 'c' },
			d: { stateFor: 'd' },
			e: { stateFor: 'e' }
		};
		var stores = getStores(initialStates);
		var dispatcher = Dispatcher.createDispatcher(stores);

		return dispatcher.dispatch({}).then(() => {
			var subscriptionHandler = dispatcher._subscriptionHandler;

			// Test published value is the states of the stores
			expect(subscriptionHandler.publish.mock.calls[0]).toEqual(initialStates);
		});
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
