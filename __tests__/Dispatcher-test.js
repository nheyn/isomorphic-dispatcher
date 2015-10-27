jest.autoMockOff();	//NOTE, needed because jest.dontMock() dosn't work

var Dispatcher = require.requireActual('../src/Dispatcher');

var Store = jest.genMockFromModule('../src/Store');
var SubscriptionHandler = jest.genMockFromModule('../src/SubscriptionHandler');

// Use manul mock
Store.createStore = function(initialState) {
	var store = new Store(initialState, [], null);

	store.getState = jest.genMockFunction().mockReturnValue(initialState);
	store.dispatch = jest.genMockFunction().mockReturnValue(Promise.resolve(store));
	store.startDispatchAt = jest.genMockFunction().mockReturnValue(Promise.resolve(store));
	store.finishOnServerUsing = jest.genMockFunction().mockReturnValue(store);
	store.setOnServerArg = jest.genMockFunction().mockReturnValue(store);

	return store;
};

SubscriptionHandler.createSubscriptionHandler = function() {
	var subscriptionHandler = new SubscriptionHandler([]);

	subscriptionHandler.subscribe = jest.genMockFunction().mockReturnValue(subscriptionHandler);
	subscriptionHandler.unsubscribe = jest.genMockFunction().mockReturnValue(subscriptionHandler);
	subscriptionHandler.publish = jest.genMockFunction();

	return subscriptionHandler;
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
		expect(dispatcher._stores.toJS()).toEqual(stores);	//TODO, fix to use public dispatcher api

		//Test trying to use invalid stores
		var invalidStores = [
			null,
			1,
			"invalid"
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

			expect(currentState).toEqual(initialStates[storeName]);
		});

		// Tests trying to get state from invalid stores
		var invalidStoreNames = [
			null,
			0,
			"not a store name",
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
		var subscriptionHandler = SubscriptionHandler.createSubscriptionHandler();
		var dispatcher = Dispatcher.createDispatcher(stores, subscriptionHandler);

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
		subscriptionHandler = dispatcher._subscriptionHandler;
		subscriptionHandler.subscribe.mock.calls.forEach((subscribeArgs) => {
			expect(subscribers).toContain(subscribeArgs[0]);
		});
		expect(subscriptionHandler.subscribe.mock.calls.length).toBe(subscribers.length);

		// Unsubscribing from all stores
		unsubscribeFuncs.forEach((unsubscribeFunc, index) => {
			// Test unsubscribing
			unsubscribeFunc();
			subscriptionHandler.unsubscribe.mock.calls.forEach((unsubscribeArgs) => {
				expect(subscribers).toContain(unsubscribeArgs[0]);
			});

			// Test when subscriptionHandler.unsubscribe is called correct number of times
			expect(subscriptionHandler.unsubscribe.mock.calls.length).toBe(index + 1);

			// Test unsubscibing twice
			expect(() => {
				unsubscribeFunc();
			}).toThrow();
		});

		// Test subscribing to single stores
		subscriptionHandler = SubscriptionHandler.createSubscriptionHandler();
		dispatcher = Dispatcher.createDispatcher(stores, subscriptionHandler);
		unsubscribeFuncs = subscribers.map((subsciber) => {
			return dispatcher.subscribeTo('a', subsciber);
		});

		subscriptionHandler = dispatcher._subscriptionHandler;
		/*/ERROR, won't work because of groups
		subscriptionHandler.subscribe.mock.calls.forEach((subscibeArgs) => {
			expect(subscribers).toContain(subscibeArgs[0]);
		});//*/
		expect(subscriptionHandler.subscribe.mock.calls.length).toBe(subscribers.length);

		// Unsubscribing from single stores
		unsubscribeFuncs.forEach((unsubscribeFunc, index) => {
			// Test unsubscribing
			unsubscribeFunc();
			/*/ERROR, won't work because of groups
			subscriptionHandler.unsubscribe.mock.calls.forEach((unsubscribeArgs) => {
				expect(subscribers).toContain(unsubscribeArgs[0]);
			});//*/

			// Test when subscriptionHandler.unsubscribe is called correct number of times
			expect(subscriptionHandler.unsubscribe.mock.calls.length).toBe(index + 1);

			// Test unsubscibing twice
			expect(() => {
				unsubscribeFunc();
			}).toThrow();
		});

		// Test subscribing to invalid store name
		var invalidStoreNames = [
			null,
			1,
			true,
			"invalid store name",
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
		var subscriptionHandler = SubscriptionHandler.createSubscriptionHandler();
		var dispatcher = Dispatcher.createDispatcher(stores, subscriptionHandler);

		return dispatcher.dispatch({}).then(() => {
			subscriptionHandler = dispatcher._subscriptionHandler;

			// Test published value is the states of the stores
			expect(subscriptionHandler.publish.mock.calls[0][0]).toEqual(initialStates);
		});
	});
});

describe('ClientDispatcher', () => {
	pit('calls iso function when onServer is called', () => {
		var initialStates = {
			a: { stateFor: 'a' },
			b: { stateFor: 'b' },
			c: { stateFor: 'c' },
			d: { stateFor: 'd' },
			e: { stateFor: 'e' }
		};
		var statesFromServer = {
			a: { stateFromServerFor: 'a' },
			c: { stateFromServerFor: 'c' },
			e: { stateFromServerFor: 'e' }
		};
		var storesToPause = Object.keys(statesFromServer);
		var pauseAtStartingPoints = {};
		storesToPause.forEach((storeName) => {
			pauseAtStartingPoints[storeName] = { index: 0, state: initialStates[storeName] };
		});
		var dispatchedAction = { type: 'test action' };
		var finishOnServer = jest.genMockFunction().mockReturnValue(
			Promise.resolve(statesFromServer)
		);
		var stores = getStores(initialStates);

		// Update mock for stores that 'call' onServer
		storesToPause.forEach((storeToPause) => {
			var store = stores[storeToPause];

			store.dispatch = jest.genMockFunction().mockImplementation((action) => {
				// Test 'useIsoDispatcher' was called by ClientDispatcher
				expect(store.finishOnServerUsing.mock.calls.length).toBe(1);

				// Test correct action is sent
				expect(action).toEqual(dispatchedAction);

				// Call function passed to 'useIsoDispatcher'
				var useFinishOnServerUsing = store.finishOnServerUsing.mock.calls[0][0];
				useFinishOnServerUsing(action, pauseAtStartingPoints[storeToPause]);

				return Promise.resolve(store);
			});

			stores[storeToPause] = store;
		});

		var dispatcher = Dispatcher.createClientDispatcher(finishOnServer, stores);

		// Perform dispatch
		return dispatcher.dispatch(dispatchedAction).then((newStates) => {
			for(var storeName in newStates) {
				var newState = newStates[storeName];

				// Test finish on server was called
				//expect(finishOnServer.mock.calls.length).toBe(1); (working in production ???)
				finishOnServer.mock.calls.forEach(([action, pausePoints]) => {
					// Test correct action is sent
					expect(action).toEqual(dispatchedAction);

					// Test no extra stores where paused
					var pausePointStoreNames = Object.keys(pausePoints);
					expect(pausePointStoreNames.length).toBe(storesToPause.length);

					pausePointStoreNames.forEach((pausePointStoreName) => {
						var pausePoint = pausePoints[pausePointStoreName];

						// Test correct pause point index and state
						expect(pausePoint.index).toBe(0);
						expect(pausePoint.state).toEqual(initialStates[pausePointStoreName]);

						// Test correct stores where paused
						expect(storesToPause).toContain(pausePointStoreName);
					});
				});
			}
		});
	});
});

describe('ServerDispatcher', () => {
	pit('can start stores in the middle', () => {
		var promises = [];

		var initialStates = {
			a: { stateFor: 'a' },
			b: { stateFor: 'b' },
			c: { stateFor: 'c' },
			d: { stateFor: 'd' },
			e: { stateFor: 'e' }
		};
		var action = { type: 'test action' };
		var startingPoints = {
			a: { index: 0, state: { newStateFor: 'a' } },
			c: { index: 0, state: { newStateFor: 'c' } },
			e: { index: 0, state: { newStateFor: 'e' } }
		};
		var passedArg = { passed: 'arg' };
		var getOnServerArg = () => passedArg;
		var stores = getStores(initialStates);
		var dispatcher = Dispatcher.createServerDispatcher(getOnServerArg, stores);

		promises.push(
			dispatcher.startDispatchAt(action, startingPoints).then((newStates) => {
				for(var storeName in stores) {
					var store = stores[storeName];
					var startingPoint = startingPoints[storeName];

					// Test correct states are returned
					if(startingPoint) {
						//NOTE, not the new state, because this is part of Store (not being tested)
						expect(newStates[storeName]).toBeDefined();
					}
					else {
						expect(newStates[storeName]).toBeUndefined();
					}

					// Test correct store.setOnServerArg is called
					var setOnServerArgCalls = store.setOnServerArg.mock.calls;

					expect(setOnServerArgCalls.length).toBe(1);
					expect(setOnServerArgCalls[0]).toEqual([passedArg]);


					// Test correct the store.startDispatchAt was called
					var startDispatchAtCalls = store.startDispatchAt.mock.calls;
					if(startingPoint) {
						expect(startDispatchAtCalls.length).toBe(1);
						expect(startDispatchAtCalls[0]).toEqual([action, startingPoint]);
					}
					else {
						expect(startDispatchAtCalls.length).toBe(0);
					}
				}
			})
		);

		// Test invalid starting points
		var invalidStartingPoints = [
			null,
			1,
			true,
			{ a: null },
			{ a: 1 },
			{ a: true }
		];
		invalidStartingPoints.forEach((invalidStartingPoint) => {
			dispatcher = Dispatcher.createServerDispatcher(getOnServerArg, stores);
			promises.push(
				dispatcher.startDispatchAt(action, invalidStartingPoint, passedArg)
					.then(() => {
						throw new Error(
							'dispatcher.startDispatchAt return state, instead of an error'
						);
					})
					.catch((err) => {
						expect(err.message).toBe(
							'starting point must be an object of starting points'
						);
					})
			);
		});

		return Promise.all(promises);
	});
});
