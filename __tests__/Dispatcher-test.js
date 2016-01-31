jest.dontMock('../src/Dispatcher');

var Dispatcher = require('../src/Dispatcher');

describe('Dispatcher', testDispatcher);
function testDispatcher() {
	it('has the given stores', () => {
		//TODO, rewrite test
	});

	it('dispatches to all of its stores', () => {
		//TODO, rewrite test
	});

	it('can get the states of all of its stores', () => {
		//TODO, rewrite test
	});

	it('allows function to subscribe to it', () => {
		//TODO, rewrite test
	});

	it('calls all of its subscribers with the stores state', () => {
		//TODO, rewrite test
	});
}

describe('ClientDispatcher', () => {
	testDispatcher();

	it('calls iso function when onServer is called', () => {
		//TODO, rewrite test
	});
});

describe('ServerDispatcher', () => {
	testDispatcher();

	it('can start stores in the middle', () => {
		//TODO, rewrite test
	});
});
