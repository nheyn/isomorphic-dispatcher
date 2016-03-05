/**
 * @flow
 */

/**
 * Takes an object that contains Promises and turns it into a Promise that contains an object,
 * where its values are the resolved Promises of the orginal object.
 *
 * @param promises  Object<Promise> The object that contains the promise to resolve
 *
 * @return      Promise<Object> The Promise that contains the resolved values
 */
export default function objectPromise(
  promises: {[key: string]: Promise<any>}
): Promise<{[key: string]: any}> {
  const keys = Object.keys(promises);
  const promiseArray = keys.map((key) => promises[key]);

  return Promise.all(promiseArray).then((vals) => {
    let results = {};
    vals.forEach((val, index) => {
      results[keys[index]] = val;
    });
    return results;
  });
}
