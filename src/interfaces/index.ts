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
  // stackId => IComponent[]
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

interface IPushParams {
  isUnique?: boolean;
}

interface IOverlayParams {
  isUnique?: boolean;
}

interface IModalParams {
  isUnique?: boolean;
}

export type {
  IComponent,
  ITree,
  IStoreId,
  INavigationManagerOptions,
  IPushParams,
  IOverlayParams,
  IModalParams,
};
