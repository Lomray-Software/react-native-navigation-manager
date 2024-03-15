import _ from 'lodash';
import type {
  Layout,
  LayoutBottomTabs,
  LayoutComponent,
  LayoutRoot,
  LayoutStack,
  NavigationComponent,
  Options,
  OptionsStatusBar,
  ProcessorSubscription,
} from 'react-native-navigation';
import { Navigation as Nav } from 'react-native-navigation';
import LogLevel from '@constants/log-level';
import pushModal from '@helpers/push-modal';
import pushScreen from '@helpers/push-screen';
import type { INavigationManagerOptions, IStoreId, ITree } from '@interfaces/index';

class NavigationManager {
  /**
   * Navigation tree state
   */
  private tree: ITree = this.emptyState();

  /**
   * Generated id's
   */
  private storeId: IStoreId = {
    bottomTabs: 0,
    stack: 0,
    screen: 0,
  };

  /**
   * Navigation processor for status bar
   * If any overlay showed - we need to control status bar style
   * in another case any attempt to change status bar can be skipped
   */
  private statusBarProcessor: ProcessorSubscription | null = null;

  /**
   * Log function
   */
  private readonly logger: NonNullable<INavigationManagerOptions['logger']>;

  /**
   * @constructor
   */
  constructor({ logger }: INavigationManagerOptions = {}) {
    this.logger = (msg, level) => logger?.(`NM: ${msg}`, level);
  }

  /**
   * Current state
   */
  public current = {
    getStackId: (): string | null => {
      const {
        bottomTab: { tabIndex, tabStack },
        stack,
        modal,
      } = this.tree;
      const modalId = this.current.getModalId();
      const modalStackId = modal.get(modalId!);

      return modalStackId ?? tabStack?.get(tabIndex!) ?? [...stack.keys()][0] ?? null;
    },
    getComponentId: (): string | null => {
      const stackId = this.current.getStackId();
      const { id } = this.tree.stack.get(stackId!)?.at(-1) ?? {};

      return id ?? null;
    },
    getModalId: (): string | null => {
      const {
        bottomTab: { tabIndex, modalStack },
      } = this.tree;

      return [...(modalStack?.get(tabIndex!)?.values() ?? [])].at(-1) ?? null;
    },
    getOverlayId: (): string | null => [...this.tree.overlay.entries()].at(-1)?.[0] ?? null,
    getBottomTabIndex: (): number | null => this.tree.bottomTab.tabIndex ?? null,
  };

  /**
   * Listen navigation events
   */
  public listen(): () => void {
    const unsubBottomTabs = Nav.events().registerBottomTabSelectedListener(
      ({ selectedTabIndex }) => {
        this.tree.bottomTab.tabIndex = selectedTabIndex;
      },
    );
    const unsubModalDismiss = Nav.events().registerModalDismissedListener(({ componentId }) => {
      void this.dismissModal(componentId);
    });

    return () => {
      unsubBottomTabs.remove();
      unsubModalDismiss.remove();
    };
  }

  /**
   * Generate unique id for navigation elements
   */
  private generateId(type: keyof IStoreId): string {
    this.storeId[type]++;

    return `${type}-${this.storeId[type]}`;
  }

  /**
   * Return clean tree state
   * @private
   */
  private emptyState(): ITree {
    const state = {
      bottomTab: {
        tabIndex: 0,
        tabStack: new Map(),
        modalStack: new Map(),
      },
      stack: new Map(),
      modal: new Map(),
      overlay: new Map(),
    };

    // transfer overlays to new tree (overlay not reset when new root is set)
    [...(this.tree?.overlay.entries() ?? [])].forEach(([overlayId, stackId]) => {
      state.overlay.set(overlayId, stackId);
      state.stack.set(stackId, [...(this.tree.stack.get(stackId) ?? [])]);
    });

    return state;
  }

  /**
   * Handle and add layout to tree
   */
  private handleLayout(layout: Layout): { id: string | null; stackId: string | null } {
    if (layout?.component) {
      const stackId = this.generateId('stack');
      const id = this.handleComponent(stackId, layout.component);

      return {
        id,
        stackId,
      };
    }

    if (layout?.stack) {
      const id = this.handleStack(layout.stack);

      return {
        id,
        stackId: id,
      };
    }

    return {
      id: null,
      stackId: null,
    };
  }

  /**
   * Handle component layout
   * - add missing id's
   */
  private handleComponent(stackId: string, component?: LayoutComponent): string | null {
    if (!component) {
      return null;
    }

    const { stack } = this.tree;

    component.id = component.id ?? this.generateId('screen');

    if (!stack.has(stackId)) {
      stack.set(stackId, []);
    }

    stack.get(stackId)!.push({
      id: component.id,
      name: component.name,
    });

    return component.id;
  }

  /**
   * Handle stack layout
   * - add missing id's
   */
  private handleStack(stack?: LayoutStack, isRoot = false): string | null {
    if (!stack) {
      return null;
    }

    stack.id = stack.id ?? this.generateId('stack');
    this.tree.stack.set(stack.id, []);

    stack?.children?.forEach(({ component }) => {
      this.handleComponent(stack.id!, component);
    });

    // emulate for getting current stack @see this.current.getComponentId
    if (isRoot) {
      this.tree.bottomTab.tabStack!.set(0, stack.id);
    }

    return stack.id;
  }

  /**
   * Handle bottom tabs layout
   * - add missing id's
   */
  private handleBottomTabs(bottomTabs?: LayoutBottomTabs): void {
    if (!bottomTabs) {
      return;
    }

    bottomTabs.id = bottomTabs.id ?? this.generateId('bottomTabs');

    const tabStack: ITree['bottomTab']['tabStack'] = new Map();

    this.tree.bottomTab = {
      tabIndex: bottomTabs?.options?.bottomTabs?.currentTabIndex ?? 0,
      tabStack,
      modalStack: new Map(),
    };

    bottomTabs.children?.forEach(({ stack }, index) => {
      tabStack.set(index, this.handleStack(stack)!);
    });
  }

  /**
   * Set current navigation root layout
   */
  public async setRoot(layout: LayoutRoot): Promise<void> {
    this.tree = this.emptyState();

    // handle bottom stack root
    this.handleBottomTabs(layout?.root?.bottomTabs);

    // handle simple stack root
    this.handleStack(layout?.root?.stack, true);

    await Nav.setRoot(layout);
  }

  /**
   * Push new screen to stack
   */
  public async push(layout: Layout, stackId?: string): Promise<void> {
    const targetStackId = stackId ?? this.current.getStackId();

    if (!targetStackId) {
      this.logger('Cannot find stack id to push screen.', LogLevel.error);

      return;
    }

    this.handleComponent(targetStackId, layout.component);

    await pushScreen(targetStackId, layout);
  }

  /**
   * Close screen on stack
   */
  public async pop(options?: Options, stackId?: string): Promise<void> {
    const targetStackId = stackId ?? this.current.getStackId();

    if (!targetStackId) {
      this.logger('Cannot find stack id to pop screen.', LogLevel.error);

      return;
    }

    this.tree.stack.get(targetStackId)?.pop();

    await Nav.pop(targetStackId, options);
  }

  /**
   * Close screens stack to selected
   */
  public async popTo(
    params: { stackId?: string } & (
      | { screenName: string }
      | { screenId: string }
      | { count: number }
    ),
    options?: Options,
  ): Promise<void> {
    const targetStackId = params?.stackId ?? this.current.getStackId();
    let popCount = 0;
    let index = -1;
    let popId = '';

    if (!targetStackId) {
      this.logger('Cannot find stack id to popTo screens.', LogLevel.error);

      return;
    }

    const stack = this.tree.stack.get(targetStackId);

    if (!stack) {
      this.logger('Cannot find stack.', LogLevel.error);

      return;
    }

    if ('screenName' in params) {
      index = stack.findIndex(({ name }) => name === params.screenName);
    }

    if ('screenId' in params) {
      index = stack.findIndex(({ id }) => id === params.screenId);
    }

    if ('count' in params) {
      index = stack.length - params.count - 1;
    }

    popId = stack[index].id;
    popCount = stack.length - (index + 1);

    const newStack = stack.slice(0, stack.length - popCount);

    this.tree.stack.set(targetStackId, newStack);

    await Nav.popTo(popId, options);
  }

  /**
   * Close all screens in stack
   */
  public async popToRoot(options?: Options, stackId?: string): Promise<void> {
    const targetStackId = stackId ?? this.current.getStackId();

    if (!targetStackId) {
      this.logger('Cannot find stack id to pop to root.', LogLevel.error);

      return;
    }

    // keep only first screen
    this.tree.stack.set(targetStackId, [this.tree.stack.get(targetStackId)![0]]);

    await Nav.popToRoot(targetStackId, options);
  }

  /**
   * Apply new navigation options to screen
   */
  public mergeOptions(options: Options, id?: string): void {
    const componentId = id ?? this.current.getComponentId();

    if (!componentId) {
      this.logger('Cannot find component id to merge layout options.', LogLevel.error);

      return;
    }

    Nav.mergeOptions(componentId, options);
  }

  /**
   * Attach processor to handle status bar styles
   * @see this.statusBarProcessor
   */
  private attachStatusBarProcessor(): void {
    if (this.statusBarProcessor) {
      return;
    }

    this.statusBarProcessor = Nav.addOptionProcessor<OptionsStatusBar>(
      'statusBar',
      (statusBar: OptionsStatusBar): OptionsStatusBar => {
        // prevent loop
        // @ts-ignore
        if (!statusBar['preventLoop']) {
          this.mergeOptions(
            {
              statusBar: {
                ...statusBar,
                // @ts-ignore prevent loop
                preventLoop: true,
              },
            },
            this.current.getOverlayId(),
          );
        }

        return statusBar;
      },
    );

    this.logger('Status bar processor attached.', LogLevel.info);
  }

  /**
   * Show new overlay
   */
  public async showOverlay(layout: Layout): Promise<void> {
    const { id, stackId } = this.handleLayout(layout);

    if (!id) {
      this.logger('Cannot handle layout for provided overlay.', LogLevel.warn);

      return;
    }

    this.attachStatusBarProcessor();
    this.tree.overlay.set(id, stackId!);

    await Nav.showOverlay(layout);
  }

  /**
   * Close overlay
   */
  public async dismissOverlay(id: string): Promise<void> {
    const { overlay, stack } = this.tree;

    if (!overlay.has(id)) {
      return;
    }

    const stackId = overlay.get(id);

    overlay.delete(id);
    stack.delete(stackId!);

    await Nav.dismissOverlay(id);

    // remove status bar processor if are no overlays
    if (this.statusBarProcessor && !overlay.size) {
      this.statusBarProcessor.remove();

      this.statusBarProcessor = null;

      this.logger('Status bar processor removed.', LogLevel.info);
    }
  }

  /**
   * Show modal
   */
  public async showModal(layout: Layout): Promise<void> {
    const { id, stackId } = this.handleLayout(layout);
    const { tabIndex, modalStack } = this.tree.bottomTab;

    if (!id) {
      this.logger('Cannot handle layout for provided modal.', LogLevel.warn);

      return;
    }

    this.tree.modal.set(id, stackId!);

    if (!modalStack!.has(tabIndex!)) {
      modalStack!.set(tabIndex!, new Set());
    }

    modalStack!.get(tabIndex!)!.add(id);

    await pushModal(layout);
  }

  /**
   * Close modal
   */
  public async dismissModal(id: string): Promise<void> {
    if (!this.tree.modal.has(id)) {
      return;
    }

    const {
      modal,
      stack,
      bottomTab: { tabIndex, modalStack },
    } = this.tree;

    const stackId = modal.get(id);

    modal.delete(id);
    stack.delete(stackId!);

    // remove modal id from tab modal stack
    modalStack!.get(tabIndex!)!.delete(id);

    try {
      await Nav.dismissModal(id);
    } catch (e) {
      const errMsg = (e as Error).message;

      // skip, e.g. on ios we can dismiss by swipe down and in this case dismissModal call is redundant
      if (errMsg.includes('is not a modal')) {
        return;
      }

      this.logger(errMsg, LogLevel.warn);
    }
  }

  /**
   * Get navigation screen options
   */
  private getScreenOptions(component: NavigationComponent, defaultOptions: Options = {}): Options {
    const pickDefaultOptions = [
      'topBar.background.color',
      'topBar.title.color',
      'topBar.leftButtons',
      'topBar.rightButtons',
      'layout.componentBackgroundColor',
      'bottomTabs.backgroundColor',
      'bottomTab.selectedIconColor',
      'bottomTab.selectedTextColor',
    ];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const options =
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      typeof component.options === 'function' ? component.options({}) : component.options;
    const allowedOptions = _.pick(options, ['topBar', 'bottomTab']);
    const pickDefaultNavOptions = _.pick(defaultOptions, pickDefaultOptions);

    return NavigationManager.mergeScreenOptions(pickDefaultNavOptions, allowedOptions);
  }

  /**
   * Merge navigation options
   */
  private static mergeScreenOptions = (opt1: Options, opt2: Options): Options =>
    _.mergeWith({}, opt1, opt2, (__, obj2, key) => {
      // buttons should not merger deeply
      if (['leftButtons', 'rightButtons'].includes(key)) {
        return obj2 as Options;
      }

      return undefined;
    });

  /**
   * Update options for initiated screens in stack
   */
  public updateScreens(defaultOptions: Options = {}): void {
    const { stack, overlay } = this.tree;
    const overlayStackIds = new Set([...overlay.values()]);

    const stackOptions: Record<string, Options> = {};
    const stackIdByComponentId: Record<string, string> = [...stack.entries()].reduce(
      (res, [stackId, components]) => ({
        ...res,
        ...components.reduce(
          (res2, { id }) => ({
            ...res2,
            // exclude overlay's
            ...(overlayStackIds.has(stackId) ? {} : { [id]: stackId }),
          }),
          {},
        ),
      }),
      {},
    );

    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access
    Object.entries(Nav.concreteNavigation.store.componentsInstancesById).forEach(
      (componentInstance) => {
        const [componentId, wrappedComponent] = componentInstance as [string, Record<string, any>];
        const stackId = stackIdByComponentId[componentId];

        if (!stackId) {
          return;
        }

        // @ts-ignore
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const component = wrappedComponent?.['_reactInternals']?.type as NavigationComponent;

        stackOptions[stackId] = NavigationManager.mergeScreenOptions(
          stackOptions[stackId] ?? {},
          this.getScreenOptions(component, defaultOptions),
        );

        Nav.mergeOptions(componentId, stackOptions[stackId]);
      },
    );

    // update not mounted stack
    [...stack.entries()].forEach(([stackId, components]) => {
      // skip stack from previous step and skip overlays
      if (stackOptions[stackId] || overlayStackIds.has(stackId)) {
        return;
      }

      const { id, name } = components?.at(0) ?? {};

      if (!id) {
        return;
      }

      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const component = Nav.concreteNavigation.store.wrappedComponents[name] as NavigationComponent;
      const options = this.getScreenOptions(component, defaultOptions);

      Nav.mergeOptions(stackId, options);
    });
  }
}

export default NavigationManager;
