import type LogLevel from '@constants/log-level';

interface IComponent {
  id: string;
  name: string | number;
}

interface ITree {
  bottomTab: {
    tabIndex?: number;
    // tabIndex => stackId
    tabStack?: Map<number, string>;
    // tabIndex => modalId[]
    modalStack?: Map<number, Set<string>>;
  };
  stack: Map<string, IComponent[]>;
  // modalId => stackId
  modal: Map<string, string>;
  // overlayId => stackId
  overlay: Map<string, string>;
}

interface IStoreId {
  bottomTabs: number;
  stack: number;
  screen: number;
}

interface INavigationManagerOptions {
  logger?: (msg: string, level: LogLevel) => void;
}

export type { IComponent, ITree, IStoreId, INavigationManagerOptions };
