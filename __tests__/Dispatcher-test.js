var Dispatcher = require.requireActual('../src/Dispatcher');

var Store = jest.genMockFromModule('../src/Store');								//TODO, finish mock
var SubscriptionHandler = jest.genMockFromModule('../src/SubscriptionHandler');	//TODO, finish mock

describe('Dispatcher', () => {
	it('has the given stores', () => {
		//TODO, nyi: add stores to dispatcher
		//TODO, nyi: send non {[key: string]: Store} as stores
	});

	it('dispatchs to all of its stores', () => {
		//TODO, nyi: call dispatch with multipe stores
	});

	it('can get the states of all of its stores', () => {
		//TODO, nyi: get state from all stores
		//TODO, nyi: get state from single store
		//TODO, nyi: try to get state from invalid store name
	});

	it('allows function to subscribe to it', () => {
		//TODO, nyi: subscribe to all stores
		//TODO, nyi: unsubscribe from all stores
		//TODO, nyi: subscribe to a single store
		//TODO, nyi: unsubscribe to from a single store
		//TODO, nyi: unsubscribe more then once
		//TODO, nyi: try to subscribe to invalid store name
	});

	it('calls all of its subscribers after dispatchs', () => {
		//TODO, nyi: add subscribers and call dispatch
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
