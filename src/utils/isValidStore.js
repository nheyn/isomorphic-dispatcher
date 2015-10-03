/**
 * @flow
 */

/**
 * Checks if the passed value meets the Store API.
 *
 * @param possibleStore {any}   The value to check if it is a store
 *
 * @return				{bool}	TRUE if the passed object fits the Store API, else FALSE.
 */
function isValidStore(possibleStore: any): boolean {
	const publicStoreMethods = [
		'useIsoDispatcher',
		'register',
		'dispatch',
		'startDispatchAt',
		'getState'
	];

	return publicStoreMethods.reduce(
		(containsPervMethod, methodName) => {
			if(!containsPervMethod) return false;

			return possibleStore[methodName] && typeof possibleStore[methodName] === 'function';
		},
		true
	);
}

/*------------------------------------------------------------------------------------------------*/
//	--- Exports ---
/*------------------------------------------------------------------------------------------------*/
module.exports = isValidStore;
