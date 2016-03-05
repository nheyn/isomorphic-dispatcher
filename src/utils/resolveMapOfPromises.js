/**
 * @flow
 */
import Immutable from 'immutable';

/**
* Takes an Immtable Map that contains Promises and turns it into a Promise that contains an
* object, where its values are the resolved Promises of the orginal object.
*
* @param promises  Map<K, Promise<V>> The object that contains the promise to resolve
*
* @return     Promise<Map<K, V>>The Promise that contains the resolved values
*/
export default function resolveMapOfPromises<K, V>(
  promises: Immutable.Map<K, Promise<V>>
): Promise<Immutable.Map<K, V>> {
  // $FlowIssue: flow not using flowlib/immutable.types.js correctly
  const keys = Array.from(promises.keys());

  // $FlowIssue: flow not using flowlib/immutable.types.js correctly
  const promiseList = Array.from(promises.values());

  return Promise.all(promiseList).then((vals) => {
    let results = Immutable.Map();
    vals.forEach((val, index) => {
      results = results.set(keys[index], val);
    });
    return results;
  });
}
