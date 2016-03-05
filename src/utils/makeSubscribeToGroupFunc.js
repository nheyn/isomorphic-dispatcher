/**
 * @flow
 */

/**
 * Create a Subscription Func that can subscribe to a single group, if the publish functions is
 * passed an Object (and group is an entry in the Object).
 *
 * @param subscriber  {(any) => void}           The function to wrap for the handler
 *
 * @return        {({[key: string]: any}) => void}  The subsciber to add to the handler
 */
export default function makeSubscribeToGroupFunc<V>(
  groupName: string,
  subscriber: SubscriptionFunc<V>
) : SubscriptionFunc<{[key: string]: V}> {
  return (groupsObj) => subscriber(groupsObj[groupName]);
}
