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

## How to use

1. Create instance of navigation manager:
```typescript
import { NavigationManager } from '@lomray/react-native-navigation-manager'

const manager = new NavigationManager();

export default manager;
```
2. Use navigation manager instead original navigation:

```typescript jsx
import NavigationManager from './navigation-manager';

// Run as soon as possible
NavigationManager.listen();

// Use manager instead base navigation
NavigationManager.push({
  component: {
    name: 'my-scfreen',
  },
});

// Get latest component id in tree
console.log(NavigationManager.current.getComponentId());
console.log(NavigationManager.current.getStackId());
console.log(NavigationManager.current.getModalId());
console.log(NavigationManager.current.getOverlayId());
```

## Bugs and feature requests

Bug or a feature request, [please open a new issue](https://github.com/Lomray-Software/react-native-navigation-manager/issues/new).

## License
Made with 💚

Published under [MIT License](./LICENSE).
