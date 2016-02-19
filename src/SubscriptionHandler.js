/**
 * @flow
 */
import Immutable from 'immutable';

/*------------------------------------------------------------------------------------------------*/
//	--- Subscription Handler ---
/*------------------------------------------------------------------------------------------------*/
/**
 * An object that can add and remove functions that recive values when the
 * the publish() method is called.
 */
export default class SubscriptionHandler<V> {
	_subscribers: Immutable.List<SubscriptionFunc<V>>;

	/*
	 * SubscriptionHandler constuctor.
	 *
	 * @param subscribers	{Arrat<any>}	A map that contains
	 */
	constructor(subscribers: Immutable.List<SubscriptionFunc<V>>) {
		this._subscribers = subscribers;
	}

	/**
	 * Create a Subscription Handler to add and remove functions that recive values when the
	 * the publish() method is called.
	 *
	 * @return				{SubscriptionHandler}			The new handler
	 */
	static createSubscriptionHandler(): SubscriptionHandler {
		return new SubscriptionHandler(Immutable.List());
	}

	/**
	 * Add a new subscriber.
	 *
	 * @param subscriber {(any) => void}		The function to handle the published value
	 *
	 * @return			{SubscriptionHandler}	A new Subscription Handler w/ the given function
	 */
	subscribe(subscriber: SubscriptionFunc<V>): SubscriptionHandler<V> {
		if(typeof subscriber !== 'function') throw new Error('subscriber must be a function');

		return new SubscriptionHandler(this._subscribers.push(subscriber));
	};

	/**
	 * Remove an existing subscriber.
	 *
	 * @param subscriber {(any) => void}		The function to remove from the handler
	 *
	 * @return			{SubscriptionHandler}	A new Subscription Handler w/o the given function
	 */
	unsubscribe(subscriber: SubscriptionFunc<V>): SubscriptionHandler<V> {
		const indexOfSubscriber = this._subscribers.indexOf(subscriber);
		if(indexOfSubscriber === -1) throw new Error('subscriber not found');

		return new SubscriptionHandler(this._subscribers.delete(indexOfSubscriber));
	}

	/**
	 * Send the given value to all the subscribed functions.
	 *
	 * @param val	{any}	The value to send to the subscribers
	 */
	publish(val: V) {
		this._subscribers.forEach((subsciber) => {
			subsciber(val);
		});
	}
}

export const createSubscriptionHandler = SubscriptionHandler.createSubscriptionHandler;
