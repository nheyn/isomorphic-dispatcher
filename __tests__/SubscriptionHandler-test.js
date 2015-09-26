var SubscriptionHandler = require.requireActual('../src/SubscriptionHandler');

describe('SubscriptionHandler', () => {
	it('can add subscribers', () => {
		var subscibersToCall = 5;
		var subscibersCalled = 0;
		var subscriptionHandler = SubscriptionHandler.createSubscriptionHandler();

		for(var i = 0; i < subscibersToCall; i++) {
			subscriptionHandler.subscribe(() => {
				subscibersCalled++;
			});
		}

		setTimeout(() => {
			// Test all subscribers where called
			expect(subscibersCalled).toBe(subscibersToCall);
		}, 10);

		// Test invalid subscibers throw errors
		var invalidSubscibers = [
			null,
			1,
			"invalid",
			new Error()
		];
		invalidSubscibers.forEach(()=>{
			expect(() => subscriptionHandler.subscribe(invalidSubsciber)).toThrow();
		});
	});

	it('can remove subscribers', () => {
		var subscibersToCall = 5;
		var subscibers = [];
		var subscibersCalled = null;
		var subscriptionHandler = SubscriptionHandler.createSubscriptionHandler();

		for(var i = 0; i < subscibersToCall; i++) {
			var subsciber = () => { subscibersCalled[i] = true; };
			subscibers.push(subsciber);

			subscriptionHandler = subscriptionHandler.subscribe(subsciber);
		}

		// Test removing a func that has never been added
		expect(() => {
			subscriptionHandler.unsubscribe(() => undefined);
		}).toThrow();

		var fullSubscriptionHandler = subscriptionHandler;
		subscibers.forEach((subsciber, index) => {
			var currSubscriptionHandler = fullSubscriptionHandler.unsubscribe(subsciber);

			subscibersCalled = [];
			currSubscriptionHandler.publish();

			setTimeout(() => {
				for(var i = 0; i<subscibersToCall; i++) {
					if(i > index)	expect(subscibersCalled[i]).toBeFalsy();
					else			expect(subscibersCalled[i]).toBeTruthy();
				}
			}, 10);

			currSubscriptionHandler = subscriptionHandler.unsubscribe(subsciber);
			subscibersCalled = [];
			currSubscriptionHandler.publish();

			setTimeout(() => {
				for(var i = 0; i<subscibersToCall; i++) {
					if(i === index)	expect(subscibersCalled[i]).toBeFalsy();
					else			expect(subscibersCalled[i]).toBeTruthy();
				}
			}, 10);

			// Test removeing same subsciber twice
			expect(() => {
				currSubscriptionHandler.unsubscribe(subsciber)
			});

			subscriptionHandler = currSubscriptionHandler;
		});

		// Test removing a func that has never been added in empty handler
		expect(() => {
			subscriptionHandler.unsubscribe(() => undefined);
		}).toThrow();
	});

	it('can publish a value', () => {
		var publishedVal = { publishedVal: true };
		var subscriptionHandler = SubscriptionHandler.createSubscriptionHandler();

		for(var i = 0; i < 5; i++) {
			subscriptionHandler.subscribe((val) => {
				// Test correct value is published
				expect(val).toBe(publishedVal);
			});
		}

		subscriptionHandler.publish(val);
	});
});
