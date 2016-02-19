jest.dontMock('../src/DispatchHandler');

var DispatchHandler = require('../src/DispatchHandler');

describe('DispatchHandler', () => {
	it('will return the given store before any actions are added', () => {
		//TODO, write tests
	});

	it('will dispatch actions to a store', () => {
		//TODO, write tests
	});


	it('will queue actions if a dispatch is currently occurring in the stores', () => {
		//TODO, write tests
	});

	it('will dispatch all actions in the queue, then stop', () => {
		//TODO, write tests
	});

	it('will re-start dispatching actions, after it has already started/stoped, if more actions are given', () => {
		//TODO, write tests
	});

	it('will brodcast an "update" event after each action finishes', () => {
		//TODO, write tests
	});

	it('will brodcast an "error" event after any error that occurs during dispatch', () => {
		//TODO, write tests
	});

	it('will keep the same state, if the action causes an error', () => {
		//TODO, write tests
	});
});
