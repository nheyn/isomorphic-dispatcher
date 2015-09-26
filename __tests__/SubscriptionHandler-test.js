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

		// Test correct subscribers added					//TODO, change to not use private var
		expect(subscriptionHandler._subscribers).toEqual(subscribers);

		// Test invalid subscribers throw errors
		var invalidsubscribers = [
			null,
			1,
			"invalid",
			new Error()
		];
		invalidsubscribers.forEach((invalidsubscriber)=> {
			expect(() => {
				subscriptionHandler.subscribe(invalidsubscriber)
			}).toThrow('subscriber must be a function');
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
			subscriptionHandler.unsubscribe(jest.genMockFunction());
		}).toThrow('subscriber not found');

		var fullSubscriptionHandler = subscriptionHandler;
		subscribers.forEach((subsciber, index) => {
			// Test removing subsciber						//TODO, change to not use private var
			var currSubscriptionHandler = fullSubscriptionHandler.unsubscribe(subsciber);
			expect(currSubscriptionHandler._subscribers.length).toBe(subscribers.length-1);

			currSubscriptionHandler = subscriptionHandler.unsubscribe(subsciber);
			expect(currSubscriptionHandler._subscribers.length).toBe(subscribers.length-1-index);

			// Test removeing same subsciber twice
			expect(() => {
				currSubscriptionHandler.unsubscribe(subsciber)
			}).toThrow('subscriber not found');

			subscriptionHandler = currSubscriptionHandler;
		});

		// Test removing a func that has never been added in empty handler
		expect(() => {
			subscriptionHandler.unsubscribe(jest.genMockFunction());
		}).toThrow('subscriber not found');

		// Test invalid subscribers throw errors
		var invalidsubscribers = [
			null,
			1,
			"invalid",
			new Error()
		];
		invalidsubscribers.forEach((invalidsubscriber)=> {
			expect(() => {
				subscriptionHandler.unsubscribe(invalidsubscriber)
			}).toThrow('subscriber not found');
		});
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
			expect(subscriber.mock.calls[0][0]).toBe(publishedVal)
		});

		var publishedVal2 = { publishedVal2: true };
		var publishedVal3 = { publishedVal3: true };
		var publishedVal4 = { publishedVal4: true };

		// Test subscriber was can be called multiple times w/ diffrent published values
		subscriptionHandler.publish(publishedVal2);
		subscriptionHandler.publish(publishedVal3);
		subscriptionHandler.publish(publishedVal4);
		subscribers.forEach((subscriber) => {
			expect(subscriber.mock.calls).toEqual([
				[publishedVal],
				[publishedVal2],
				[publishedVal3],
				[publishedVal4]
			]);
		});
	});
});
