jest.dontMock('../src/DispatcherFactory');

var DispatcherFactory = require('../src/DispatcherFactory');

describe('DispatcherFactory', () => {
	it('can get a dispatcher with the initial stores', () => {
		//TODO, write tests
	});

	it('can get a dispatcher after one or more actions haven been called on the initial stores', () => {
		//TODO, write tests
	});

	it('will start in the middle of the first action, if starting points has been given', () => {
		//TODO, write test
	});

	it('will create a dispatcher with a SubscriptionHandler, only if the function to create one is given', () => {
		//TODO, write tests
	});
});