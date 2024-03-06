import _ from 'lodash';
import type { Layout } from 'react-native-navigation';
import { Navigation } from 'react-native-navigation';

/**
 * Push modal to navigation stack
 */
const pushModal = _.throttle((layout: Layout) => Navigation.showModal(layout), 500, {
  leading: true,
  trailing: false,
});

export default pushModal;
