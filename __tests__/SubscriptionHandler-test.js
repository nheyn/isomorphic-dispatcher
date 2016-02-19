jest.dontMock('immutable');
jest.dontMock('../src/SubscriptionHandler');

var SubscriptionHandler = require('../src/SubscriptionHandler');

describe('SubscriptionHandler', () => {
	it('can add subscribers', () => {
		const subscribers = [
			jest.genMockFunction(),
			jest.genMockFunction(),
			jest.genMockFunction()
		];

		SubscriptionHandler.createSubscriptionHandler()
			.subscribe(subscribers[0])
			.subscribe(subscribers[1])
			.subscribe(subscribers[2])
			.publish('some value');

		subscribers.forEach((subscriberFunc) => {
			const { mock } = subscriberFunc;

			expect(mock.calls.length).toBe(1);
		});
	});

	it('can remove a subscriber', () => {
		const subscribers = [
			jest.genMockFunction(),
			jest.genMockFunction(),
			jest.genMockFunction()
		];

		const indexToRemove = 1;
		let subsciptionHandler = SubscriptionHandler.createSubscriptionHandler()
									.subscribe(subscribers[0])
									.subscribe(subscribers[1])
									.subscribe(subscribers[2])
		subsciptionHandler.publish('some value');

		subsciptionHandler = subsciptionHandler.unsubscribe(subscribers[indexToRemove])
		subsciptionHandler.publish('some value');


		subscribers.forEach((subscriberFunc, index) => {
			const { mock } = subscriberFunc;

			expect(mock.calls.length).toBe(index === indexToRemove? 1: 2);
		});
	});

	it('can publish a value', () => {
		const subscribers = [
			jest.genMockFunction(),
			jest.genMockFunction(),
			jest.genMockFunction()
		];
		const publishedValue = 'published value';

		SubscriptionHandler.createSubscriptionHandler()
			.subscribe(subscribers[0])
			.subscribe(subscribers[1])
			.subscribe(subscribers[2])
			.publish(publishedValue);

		subscribers.forEach((subscriberFunc) => {
			const { mock } = subscriberFunc;

			expect(mock.calls[0][0]).toEqual(publishedValue);
		});
	});
});
