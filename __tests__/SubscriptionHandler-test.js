var SubscriptionHandler = require.requireActual('../src/SubscriptionHandler');

function getSubscribers() {
	return [
		jest.genMockFunction(),
		jest.genMockFunction(),
		jest.genMockFunction(),
		jest.genMockFunction(),
		jest.genMockFunction()
	];
}

describe('SubscriptionHandler', () => {
	it('can add subscribers', () => {
		var subscribers = getSubscribers();
		var subscriptionHandler = SubscriptionHandler.createSubscriptionHandler();

		subscribers.forEach((subscriber) => {
			subscriptionHandler = subscriptionHandler.subscribe(subscriber);
		});

		// Test correct subscribers added
		expect(subscriptionHandler._subscribers).toEqual(subscribers);

		// Test invalid subscribers throw errors
		var invalidsubscribers = [
			null,
			1,
			"invalid",
			new Error()
		];
		invalidsubscribers.forEach(()=>{
			expect(() => subscriptionHandler.subscribe(invalidSubsciber)).toThrow();
		});
	});

	it('can remove subscribers', () => {
		var subscribers = getSubscribers();
		var subscriptionHandler = SubscriptionHandler.createSubscriptionHandler();

		subscribers.forEach((subscriber) => {
			subscriptionHandler = subscriptionHandler.subscribe(subscriber);
		});

		// Test removing a func that has never been added
		expect(() => {
			subscriptionHandler.unsubscribe(() => undefined);
		}).toThrow();

		var fullSubscriptionHandler = subscriptionHandler;
		subscribers.forEach((subsciber, index) => {
			// Test removing subsciber
			var currSubscriptionHandler = fullSubscriptionHandler.unsubscribe(subsciber);
			expect(currSubscriptionHandler._subscribers.length).toBe(subscribers.length-1);

			currSubscriptionHandler = subscriptionHandler.unsubscribe(subsciber);
			expect(currSubscriptionHandler._subscribers.length).toBe(subscribers.length-1-index);

			// Test removeing same subsciber twice
			expect(() => {
				currSubscriptionHandler.unsubscribe(subsciber)
			}).toThrow();

			subscriptionHandler = currSubscriptionHandler;
		});

		// Test removing a func that has never been added in empty handler
		expect(() => {
			subscriptionHandler.unsubscribe(() => undefined);
		}).toThrow();
	});

	it('can publish a value', () => {
		var publishedVal = { publishedVal: true };
		var subscribers = getSubscribers();
		var subscriptionHandler = SubscriptionHandler.createSubscriptionHandler();

		subscribers.forEach((subscriber) => {
			subscriptionHandler = subscriptionHandler.subscribe(subscriber);
		});

		subscriptionHandler.publish(publishedVal);
		subscribers.forEach((subscriber) => {
			// Test subscriber was called with published value
			expect(subscriber.mock.calls.length).toBe(1);
			expect(subscriber.mock.calls[0]).toBe(publishedVal)
		});
	});
});
