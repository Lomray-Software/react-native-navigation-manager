import _ from 'lodash';
import type { Layout } from 'react-native-navigation';
import { Navigation } from 'react-native-navigation';

/**
 * Push screen to navigation stack
 */
const pushScreen = _.throttle(
  (componentId: string, layout: Layout) => Navigation.push(componentId, layout),
  500,
  {
    leading: true,
    trailing: false,
  },
);

export default pushScreen;
