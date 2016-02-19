jest.dontMock('../src/Dispatcher');

var Dispatcher = require('../src/Dispatcher');

describe('Dispatcher', () => {
	it('has the state from the stores returned by the DispatchHandler', () => {
		//TODO, rewrite test
	});

	it('updates its stores when DispatchHandler performs an update event', () => {
		//TODO, rewrite test
	});

	it('throws the error when DispatchHandler performs an error event', () => {
		//TODO, rewrite test
	});

	it('add actions to the dispatch handler', () => {
		//TODO, rewrite test
	});

	it('can get all states from the stores in its DispatchHandler', () => {
		//TODO, rewrite test
	});

	it('can get states of single stores from its DispatchHandler', () => {
		//TODO, rewrite test
	});

	it('can add function to its SubscribtionHandler', () => {
		//TODO, rewrite test
	});

	it('calls the unsubscribe function returned by its SubscribtionHandler', () => {
		//TODO, rewrite test
	});

	it('calls its SubscribtionHandler publish method when the state is updated', () => {
		//TODO, rewrite test
	});
});
