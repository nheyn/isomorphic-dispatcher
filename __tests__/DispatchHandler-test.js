jest.dontMock('immutable');
jest.dontMock('../src/DispatchHandler');
jest.dontMock('../src/utils/PromisePlaceholder');
jest.dontMock('../src/utils/resolveMapOfPromises');
jest.dontMock('../src/utils/mapObject');

const Immutable = require('immutable');

const DispatchHandler = require('../src/DispatchHandler');

function describe_DispatchHandler(createDispatchHandler) {
	it('will return the initial store before any actions are added', () => {
		const stores = Immutable.Map({
			store0: createStoreMock(),
			store1: createStoreMock(),
			store2: createStoreMock()
		});
		const dispatchHandler = createDispatchHandler(stores);

		expect(dispatchHandler.getStores()).toEqual(stores);
	});

	it('will dispatch actions to a store', () => {
		const store0 = createStoreMock();
		const store1 = createStoreMock();
		const store2 = createStoreMock();
		const dispatchHandler = createDispatchHandler(Immutable.Map({ store0, store1, store2 }));

		dispatchHandler.pushAction({ type: 'TEST_ACTION' });

		expect(getActions(store0)).toEqual([{ type: 'TEST_ACTION' }]);
		expect(getActions(store1)).toEqual([{ type: 'TEST_ACTION' }]);
		expect(getActions(store2)).toEqual([{ type: 'TEST_ACTION' }]);
	});

	pit('will return a promise form "pushAction" will resolve after the action finished dispatching', () => {
		const store = createStoreMock();
		const dispatchHandler = createDispatchHandler(Immutable.Map({ store }));

		return dispatchHandler.pushAction({ type: 'TEST_ACTION' }).then(() => {
			const dispatchedActions = getActions(store);

			expect(dispatchedActions).toContain({ type: 'TEST_ACTION' });
		});
	});

	pit('will return a promise form "pushActions" will resolve after the all the actions finish dispatching', () => {
		const store = createStoreMock();
		const dispatchHandler = createDispatchHandler(Immutable.Map({ store }));

		return dispatchHandler.pushActions([
			{ type: 'TEST_ACTION_0' },
			{ type: 'TEST_ACTION_1' },
			{ type: 'TEST_ACTION_2' }
		]).then(() => {
			const dispatchedActions = getActions(store);

			expect(dispatchedActions).toContain({ type: 'TEST_ACTION_0' });
			expect(dispatchedActions).toContain({ type: 'TEST_ACTION_1' });
			expect(dispatchedActions).toContain({ type: 'TEST_ACTION_2' });
		});
	});

	pit('will return a promise from "pushAction" that resolves to the updated stores', () => {
		const updatedStore = createStoreMock();
		const store = createStoreMock(updatedStore);
		const dispatchHandler = createDispatchHandler(Immutable.Map({ store }));

		return dispatchHandler.pushAction({ type: 'TEST_ACTION' }).then((newStores) => {
			expect(newStores.get('store')).toEqual(updatedStore);
		});
	});

	pit('will return a promise from "pushAction" that resolves to the finial updated stores', () => {
		const updatedStore0 = createStoreMock(updatedStore1);
		const updatedStore1 = createStoreMock(updatedStore2);
		const updatedStore2 = createStoreMock();
		const store = createStoreMock(updatedStore0);

		const dispatchHandler = createDispatchHandler(Immutable.Map({ store }));

		return dispatchHandler.pushActions([
			{ type: 'TEST_ACTION_0' },
			{ type: 'TEST_ACTION_1' },
			{ type: 'TEST_ACTION_2' }
		]).then((newStores) => {
			expect(newStores.get('store')).toEqual(updatedStore0);
		});
	});

	pit('will broadcast an "update" event after each action finishes', () => {
		const dispatchHandler = createDispatchHandler(Immutable.Map({ store: createStoreMock() }));

		// Update update event functions
		const updateFunc0 = jest.genMockFunction();
		dispatchHandler.on('update', updateFunc0);

		const updateFunc1 = jest.genMockFunction();
		dispatchHandler.on('update', updateFunc1);

		const updateFunc2 = jest.genMockFunction();
		dispatchHandler.on('update', updateFunc2);

		// Perform dispatches
		dispatchHandler.pushAction({ type: 'TEST_ACTION_0' });
		let finshedActions = dispatchHandler.pushActions([{ type: 'TEST_ACTION_1' }, { type: 'TEST_ACTION_2' }]);

		return finshedActions.then(() => {
			expect(updateFunc0.mock.calls.length).toEqual(3);
			expect(updateFunc1.mock.calls.length).toEqual(3);
			expect(updateFunc2.mock.calls.length).toEqual(3);
		});
	});

	pit('will pass the updated stores to each "update" event', () => {
		const updatedStore0 = createStoreMock();
		const updatedStore1 = createStoreMock();
		const updatedStore2 = createStoreMock();
		const dispatchHandler = createDispatchHandler(Immutable.Map({
			store0: createStoreMock(updatedStore0),
			store1: createStoreMock(updatedStore1),
			store2: createStoreMock(updatedStore2)
		}));

		// Update update event functions
		const updateFunc = jest.genMockFunction();
		dispatchHandler.on('update', updateFunc);

		// Perform dispatches
		return dispatchHandler.pushAction({ type: 'TEST_ACTION' }).then(() => {
			expect(updateFunc.mock.calls[0][0].toObject()).toEqual({
				store0: updatedStore0,
				store1: updatedStore1,
				store2: updatedStore2
			});
		});
	});
}
describe('DispatchHandler', () => describe_DispatchHandler(DispatchHandler.createDispatchHandler));

describe('ServerDispatchHandler', () => {
	describe_DispatchHandler((stores) => DispatchHandler.createServerDispatchHandler(stores, {}));

	//TODO, add client tests
});

describe('ClientDispatchHandler', () => {
	describe_DispatchHandler((stores) => DispatchHandler.createClientDispatchHandler(stores, () => {
		return Promise.resolve(stores);
	}));

	//TODO, add client tests
});

// Mocks
function createStoreMock(newStore) {
	const store = jest.genMockFunction();
	store.dispatch = jest.genMockFunction().mockImplementation((action, settings) => {
		return Promise.resolve(newStore? newStore: store).then((updatedStore) => {
			if(settings && settings.finishedUpdaters) settings.finishedUpdaters(true);

			return updatedStore;
		});
	});

	return store;
}

function getActions(store) {
	const dispatchCalls = store.dispatch.mock.calls;

	return dispatchCalls.map(([action]) => action);
}