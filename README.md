<h1 align='center'>React native navigation manager</h1>

### Manager for [react-native-navigation](https://github.com/wix/react-native-navigation)

### Key features:

- More flexible control your navigation.
- Navigation tree under hand.
- Get state in any time.

## Table of contents
- [Getting started](#getting-started)
- [How to use](#how-to-use)
- [License](#license)

## Getting started

The package is distributed using [npm](https://www.npmjs.com/), the node package manager.

```
npm i --save @lomray/react-native-navigation-manager
```

## Fit and version

`@lomray/react-native-navigation-manager@1.4.1` wraps Wix `react-native-navigation` and keeps a JavaScript tree of stacks, screens, modals and overlays. It does not wrap `@react-navigation/native` or Expo Router. Set up Wix's native navigation integration in your app first.

The declared `react-native-navigation` peer range is `>=7.37.2`, not a tested compatibility matrix. Native screen rendering and navigation must be checked on your app's iOS/Android builds.

## How to use

Register screen names with Wix Navigation, create one app-owned manager, and use that manager for root and subsequent navigation operations. A `push()` without a tracked stack returns without navigating. Calls made directly to Wix Navigation can bypass this manager's tree.

<!-- docs-example: navigation -->
```tsx
import React from 'react';
import { Text } from 'react-native';
import { Navigation } from 'react-native-navigation';
import { NavigationManager } from '@lomray/react-native-navigation-manager';

const manager = new NavigationManager();
const Home = () => <Text>Home</Text>;
const Details = () => <Text>Details</Text>;

Navigation.registerComponent('home', () => Home);
Navigation.registerComponent('details', () => Details);
const stopListening = manager.listen();

const appLaunched = Navigation.events().registerAppLaunchedListener(() => {
  void manager.setRoot({
    root: { stack: { children: [{ component: { name: 'home' } }] } },
  }).catch(console.error);
});

// Call from a user action after the root is ready.
export async function openDetails() {
  await manager.push({ component: { name: 'details' } });
  return manager.current.getComponentId();
}

// Call when tearing down this app bootstrap (for example, in a test).
export function disposeNavigation() {
  stopListening();
  appLaunched.remove();
}
```

`listen()` returns a disposer for its bottom-tab and modal-dismiss listeners; it does not dispose the manager or native navigation. Do not call it repeatedly without disposing the earlier subscription. Current ID getters can return `null` before a root exists or when no corresponding modal/overlay is open.

## Bugs and feature requests

Bug or a feature request, [please open a new issue](https://github.com/Lomray-Software/react-native-navigation-manager/issues/new).

## License
Made with 💚

Published under [MIT License](./LICENSE).
