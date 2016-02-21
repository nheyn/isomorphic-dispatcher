jest.dontMock('immutable');
jest.dontMock('../src/Dispatcher');
jest.dontMock('../src/utils/makeSubscribeToGroupFunc');
jest.dontMock('../src/utils/isValidStore');
jest.dontMock('../src/utils/mapObject');
jest.dontMock('../src/utils/objectPromise');

const Immutable = require('immutable');

const Dispatcher = require('../src/Dispatcher');


describe('Dispatcher', () => {
	it('updates its stores when DispatchHandler performs an update event', () => {
		// Create mock dispatch handler
		const dispatchHandler = createDispatcherMock();
		const onUpdate = (updatedStores) => callMockEvent(dispatchHandler, 'update', Immutable.Map(updatedStores));

		// Create dispatcher
		const dispatcher = Dispatcher.createDispatcher(dispatchHandler);

		// Perform update event
		onUpdate({
			store0: createStoreMock({ state: 0 }),
			store1: createStoreMock({ state: 1 }),
			store2: createStoreMock({ state: 2 })
		});

		expect(dispatcher.getStateForAll()).toEqual({
			store0: { state: 0 },
			store1: { state: 1 },
			store2: { state: 2 }
		});
	});

	it('add actions to the dispatch handler', () => {
		const action0 = {  type: 'action0' };
		const action1 = {  type: 'action1' };
		const action2 = {  type: 'action2' };

		// Create dispatcher
		const dispatchHandler = createDispatcherMock();
		const dispatcher = Dispatcher.createDispatcher(dispatchHandler);

		// Dispatch actions
		dispatcher.dispatch(action0);
		dispatcher.dispatch(action1);
		dispatcher.dispatch(action2);

		const dispatchedActions = getPushedActions(dispatchHandler);

		expect(dispatchedActions).toContain(action0);
		expect(dispatchedActions).toContain(action1);
		expect(dispatchedActions).toContain(action2);
	});

	it('can get all states from the stores in its DispatchHandler', () => {
		const dispatchHandler = createDispatcherMock({
			store0: createStoreMock({ state: 0 }),
			store1: createStoreMock({ state: 1 }),
			store2: createStoreMock({ state: 2 })
		});
		const dispatcher = Dispatcher.createDispatcher(dispatchHandler);

		expect(dispatcher.getStateForAll()).toEqual({
			store0: { state: 0 },
			store1: { state: 1 },
			store2: { state: 2 }
		});
	});

	it('can get states of a single stores from its DispatchHandler', () => {
		const dispatchHandler = createDispatcherMock({
			store0: createStoreMock({ state: 0 }),
			store1: createStoreMock({ state: 1 }),
			store2: createStoreMock({ state: 2 })
		});
		const dispatcher = Dispatcher.createDispatcher(dispatchHandler);

		expect(dispatcher.getStateFor('store0')).toEqual({ state: 0 });
		expect(dispatcher.getStateFor('store1')).toEqual({ state: 1 });
		expect(dispatcher.getStateFor('store2')).toEqual({ state: 2 });
	});

	it('can add functions to its SubscriptionHandler', () => {			//TODO, figure out
		const dispatchHandler = createDispatcherMock();
		const subscriptionHandler = createSubscriptionHandlerMock();

		// Create dispatcher
		const dispatcher = Dispatcher.createDispatcher(dispatchHandler, subscriptionHandler);

		// Add Subscribers
		const subscriber0 = function subscriber0() { };
		const subscriber1 = function subscriber1() { };
		const subscriber2 = function subscriber2() { };

		dispatcher.subscribeToAll(subscriber0);
		dispatcher.subscribeToAll(subscriber1);
		dispatcher.subscribeToAll(subscriber2);

		const subscribers = getSubscribers(subscriptionHandler);
		expect(subscribers.length).toBe(3);
		expect(subscribers).toContain(subscriber0);
		expect(subscribers).toContain(subscriber1);
		expect(subscribers).toContain(subscriber2);
	});

	it('calls the unsubscribe function returned by its SubscriptionHandler', () => {
		const dispatchHandler = createDispatcherMock();
		const subscriptionHandler = createSubscriptionHandlerMock();

		// Create dispatcher
		const dispatcher = Dispatcher.createDispatcher(dispatchHandler, subscriptionHandler);

		// Add Subscribers
		const subscriber0 = function subscriber0() { };
		const subscriber1 = function subscriber1() { };
		const subscriber2 = function subscriber2() { };

		const ubsub0 = dispatcher.subscribeToAll(subscriber0);
		const ubsub1 = dispatcher.subscribeToAll(subscriber1);
		const ubsub2 = dispatcher.subscribeToAll(subscriber2);

		// Remove subscribers
		ubsub0();
		ubsub1();
		ubsub2();

		const unsubscribers = getUnsubscribers(subscriptionHandler);
		expect(unsubscribers.length).toBe(3);
		expect(unsubscribers).toContain(subscriber0);
		expect(unsubscribers).toContain(subscriber1);
		expect(unsubscribers).toContain(subscriber2);
	});

	it('calls its SubscriptionHandler publish method when the state is updated', () => {
		// Create mock subscription/dispatch handler
		const subscriptionHandler = createSubscriptionHandlerMock();
		const dispatchHandler = createDispatcherMock();
		const onUpdate = (updatedStores) => callMockEvent(dispatchHandler, 'update', Immutable.Map(updatedStores));

		// Create dispatcher
		const dispatcher = Dispatcher.createDispatcher(dispatchHandler, subscriptionHandler);

		// Perform update event
		onUpdate({
			store0: createStoreMock({ state: 0 }),
			store1: createStoreMock({ state: 1 }),
			store2: createStoreMock({ state: 2 })
		});

		const publishedValues = getPublishedValues(subscriptionHandler);
		expect(publishedValues.length).toBe(1);
		expect(publishedValues[0]).toEqual({
			store0: { state: 0 },
			store1: { state: 1 },
			store2: { state: 2 }
		});
	});
});

// Mocks
function createDispatcherMock(stores) {
	const dispatcher = jest.genMockFunction();
	dispatcher.getStores = jest.genMockFunction().mockReturnValue(Immutable.Map(stores));
	dispatcher.on = jest.genMockFunction();
	dispatcher.pushAction = jest.genMockFunction().mockReturnValue(Promise.resolve(Immutable.Map(stores)));
	dispatcher.pushActions = jest.genMockFunction().mockReturnValue(Promise.resolve(Immutable.Map(stores)));

	return dispatcher;
}

function callMockEvent(dispatchHandler, event, arg) {
	const onFuncs = dispatchHandler.on.mock.calls
							.filter(	([event, callback]) => event === 'update')
							.map(		([event, callback]) => callback);

	onFuncs.forEach((onCallback) => onCallback(arg));
}

function getPushedActions(dispatchHandler) {
	const pushActionArray = dispatchHandler.pushAction.mock.calls.reduce((prevActions, [action]) => {
		return [ ...prevActions, action ];
	}, []);

	const pushActionsArray = dispatchHandler.pushActions.mock.calls.reduce((prevActions, [actions]) => {
		return [ ...prevActions, ...actions ];
	}, []);

	return [ ...pushActionArray, ...pushActionsArray ];
}


function createSubscriptionHandlerMock() {
	const subscriptionHandler = jest.genMockFunction();
	subscriptionHandler.subscribe = jest.genMockFunction().mockReturnValue(subscriptionHandler);
	subscriptionHandler.unsubscribe = jest.genMockFunction().mockReturnValue(subscriptionHandler);
	subscriptionHandler.publish = jest.genMockFunction();

	return subscriptionHandler;
}

function getSubscribers(subscriptionHandler) {
	const subscribeCalls = subscriptionHandler.subscribe.mock.calls;

	return subscribeCalls.map(([subscriber]) => subscriber);
}

function getUnsubscribers(subscriptionHandler) {
	const unsubscribeCalls = subscriptionHandler.unsubscribe.mock.calls;

	return unsubscribeCalls.map(([unsubscriber]) => unsubscriber);
}

function getPublishedValues(subscriptionHandler) {
	const publishCalls = subscriptionHandler.publish.mock.calls;

	return publishCalls.map(([val]) => val);
}

function createStoreMock(state) {
	const store = jest.genMockFunction();
	store.getState = jest.genMockFunction().mockReturnValue(state);

	return store;
}
