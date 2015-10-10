/**
 * @flow
 */

type MapFunction<V, R> =  (val: V, key: string) => R;

/**
 * Peforms a map accrose a javascript Object.
 *
 * @param obj       {Object}                The object to perform the map onServer
 * @param mapFunc   {(any, string) => any}  The function to map over the given object
 *
 * @return          {Object}				The object with the new values
 */
function mapObject<V, R>(obj: {[key: string]: V}, mapFunc: MapFunction): {[key: string]: R} {
	let results = {};
	for(let key in obj) {
		results[key] = mapFunc(obj[key], key);
	}
	return results;
}

/*------------------------------------------------------------------------------------------------*/
//	--- Exports ---
/*------------------------------------------------------------------------------------------------*/
module.exports = mapObject;
