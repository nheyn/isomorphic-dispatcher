/**
 * @flow
 */
import type Immutable from 'immutable';
import type Store from '../Store';

type StoresMap = Immutable.Map<string, Store<any>>;

function performDispatch(stores: StoresMap, action: Action): Promise<StoresMap> {
	if(!action || typeof action !== 'object') {
		throw new Error('actions must be objects');
	}

	// Perform dispatch
	const dispatchedStoresPromises = stores.map((store) => store.dispatch(action));

	return resolveMapOfPromises(dispatchedStoresPromises);
}