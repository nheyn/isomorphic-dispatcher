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

  pit('passes the "onServer" argument to each of the stores', () => {
    const store0 = createStoreMock();
    const store1 = createStoreMock();
    const store2 = createStoreMock();

    const dispatchHandler = DispatchHandler.createServerDispatchHandler(
      Immutable.Map({ store0, store1, store2}),
      { passed: 'arg' }
    );

    // Perform single dispatch
    return dispatchHandler.pushAction({ type: 'TEST_ACTION' }).then(() => {
      expect(getOnServerArgs(store0)).toEqual([{ passed: 'arg' }]);
      expect(getOnServerArgs(store1)).toEqual([{ passed: 'arg' }]);
      expect(getOnServerArgs(store2)).toEqual([{ passed: 'arg' }]);
    });
  });

  pit('passes the "onServer" argument for every dispatch', () => {
    const store = createStoreMock();
    const dispatchHandler = DispatchHandler.createServerDispatchHandler(
      Immutable.Map({ store }),
      { passed: 'arg' }
    );

    // Perform multiple dispatches
    return dispatchHandler.pushActions([
      { type: 'TEST_ACTION_0' },
      { type: 'TEST_ACTION_1' },
      { type: 'TEST_ACTION_2' }
    ]).then(() => {
      expect(getOnServerArgs(store)).toEqual([
        { passed: 'arg' },
        { passed: 'arg' },
        { passed: 'arg' }
      ]);
    });
  });
});

describe('ClientDispatchHandler', () => {
  describe_DispatchHandler((stores) => DispatchHandler.createClientDispatchHandler(stores, () => {
    return Promise.resolve(stores);
  }));

  pit('does not call the "finishOnServer" function if the store pauses during a dispatch', () => {
    const dispatchHandler = DispatchHandler.createClientDispatchHandler(
      Immutable.Map({ store: createStoreMock() }),
      () => {
        expect('not').toBe('called');

        return Promise.resolve({});
      }
    );

    return dispatchHandler.pushAction({ type: 'TEST_ACTION' });
  });

  pit('pauses the locations the stores pauses to the "finishOnServer" function for each paused store', () => {
    const store0 = createStoreMock();
    const store1 = createPauseStoreMock({ paused: 'state1' }, 1);
    const store2 = createPauseStoreMock({ paused: 'state2' }, 2);

    const dispatchHandler = DispatchHandler.createClientDispatchHandler(
      Immutable.Map({ store0, store1, store2}),
      (startingPoints) => {
        // Simulate call to the server
        expect(startingPoints).toContain({ state: { paused: 'state1' }, index: 1 });
        expect(startingPoints).toContain({ state: { paused: 'state2' }, index: 2 });

        return Promise.resolve({});
      }
    );

    return dispatchHandler.pushAction({ type: 'TEST_ACTION' });
  });

  pit('pauses the locations the stores pauses to the "finishOnServer" function', () => {
    const updatedStore0 = createStoreMock();
    const updatedStore1 = createStoreMock();
    const updatedStore2 = createStoreMock();
    const store0 = createStoreMock(updatedStore0);
    const store1 = createPauseStoreMock({ paused: 'state' }, 0);
    const store2 = createPauseStoreMock({ paused: 'state' }, 0);

    const dispatchHandler = DispatchHandler.createClientDispatchHandler(
      Immutable.Map({ store0, store1, store2}),
      (startingPoints) => {
        // Simulate call to the server
        return Promise.resolve({
          store1: updatedStore1,
          store2: updatedStore2
        });
      }
    );

    return dispatchHandler.pushAction({ type: 'TEST_ACTION' }).then((updatedStores) => {
      expect(updatedStores.get('store0')).toBe(updatedStore0);
      expect(updatedStores.get('store1')).toBe(updatedStore1);
      expect(updatedStores.get('store2')).toBe(updatedStore2);
    });
  });

  pit('passes the correct actions to the "finishOnServer" function', () => {
    const dispatchHandler = DispatchHandler.createClientDispatchHandler(
      Immutable.Map({ store: createPauseStoreMock({ paused: 'state' }, 0) }),
      (startingPoints, actions) => {
        // Simulate call to the server
        expect(actions).toContain({ type: 'TEST_ACTION_0' });
        expect(actions).toContain({ type: 'TEST_ACTION_1' });
        expect(actions).toContain({ type: 'TEST_ACTION_2' });

        return Promise.resolve({ store: {} });
      }
    );

    return dispatchHandler.pushActions([
      { type: 'TEST_ACTION_0' },
      { type: 'TEST_ACTION_1' },
      { type: 'TEST_ACTION_2' }
    ]);
  });
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

function createPauseStoreMock(state, index) {
  const store = jest.genMockFunction();
  store.dispatch = jest.genMockFunction().mockImplementation((action, settings) => {
    if(settings && settings.finishedUpdaters) settings.finishedUpdaters(true);

    expect(settings.finishOnServer).toBeDefined();
    return Promise.resolve(settings.finishOnServer(state, index));
  });

  return store;
}

function getActions(store) {
  const dispatchCalls = store.dispatch.mock.calls;

  return dispatchCalls.map(([action]) => action);
}

function getSettings(store) {
  const dispatchCalls = store.dispatch.mock.calls;

  return dispatchCalls.map(([action, settings]) => settings);
}

function getOnServerArgs(store) {
  return getSettings(store).map(({ arg }) => arg);
}