/**
 * @flow
 */

/**
* A helper class for the ES6 Promise class. It allows resolve / reject functions to be called
* outside the Promise constructor argument.
*/
export default class PromisePlaceholder<V> {
	_promise: Promise<V>;
	_resolve: (val: V) => void;
	_reject: (err: Error) => void;

	/**
	 * Create a new PromisePlaceholder.
	 */
	constructor() {
		this._promise = new Promise((resolve, reject) => {
			this._resolve = resolve;
			this._reject = reject;
		});
	}

	/**
	 * Get the Promise this is a placeholder for.
	 *
	 * @return	{Promise}	The promise
	 */
	getPromise(): Promise<V> {
		return this._promise;
	}

	/**
	 * Resolve the Promise this is a placeholder for.
	 *
	 * @param val	{any}		The value to resolve
	 *
	 * @return		{Promise}	The promise that was resolved
	 */
	resolve(val: V): Promise<V> {
		this._resolve(val);

		return this.getPromise();
	}

	/**
	 * Reject the Promise this is a placeholder for.
	 *
	 * @param err	{Error}		The error to use to reject the promise
	 *
	 * @return		{Promise}	The promise that was rejected
	 */
	reject(err: Error): Promise<V> {
		this._reject(err);

		return this.getPromise();
	}
}
