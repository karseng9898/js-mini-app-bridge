/**
 * SuperApp Bridge - TypeScript Declarations
 * A JavaScript bridge for communication between mini-apps and a SuperApp.
 */

declare namespace SuperApp {
  interface BridgeResponse<T = any> {
    success: boolean;
    data?: T;
    error?: any;
  }

  interface EventData {
    [key: string]: any;
  }

  interface Params {
    [key: string]: any;
  }

  interface BridgeMeta {
    miniAppId?: string;
    [key: string]: any;
  }

  interface BridgeCallOptions {
    meta?: BridgeMeta;
  }

  interface EventListener<T = EventData> {
    (data: T): void;
  }

  interface UnsubscribeFunction {
    (): void;
  }

  interface Bridge {
    /** Version of the bridge. */
    readonly version: string;

    /** Call a native method on the SuperApp. */
    call<T = any>(
      className: string,
      methodName: string,
      params?: Params,
      options?: BridgeCallOptions,
    ): Promise<T>;

    /** Handle a successful response (internal use). */
    handleSuccess(requestId: string, response: any): void;

    /** Handle an error response (internal use). */
    handleFailure(requestId: string, error: any): void;

    /** Add an event listener and return a function that removes it. */
    addListener<T = EventData>(
      eventName: string,
      callback: EventListener<T>,
    ): UnsubscribeFunction;

    /** Remove an event listener. */
    removeListener<T = EventData>(
      eventName: string,
      callback: EventListener<T>,
    ): void;

    /** Dispatch an event to registered listeners. */
    dispatchEvent<T = EventData>(eventName: string, data: T): void;

    /** Get all registered event names. */
    getRegisteredEvents(): string[];

    /** Store parameters received from the SuperApp. */
    setParams(newParams: Params): void;

    /** Get all stored parameters or one value by key. */
    getParams(): Params;
    getParams<T = any>(key: string): T;

    /** Set metadata sent with every bridge request. */
    setDefaultMeta(meta?: BridgeMeta): void;

    /** Get configured default metadata. */
    getDefaultMeta(): BridgeMeta;

    /** Clear configured default metadata. */
    clearDefaultMeta(): void;

    /** Process incoming messages from the SuperApp (internal use). */
    receiveMessage(response: string | object): void;
  }
}

declare global {
  interface Window {
    superapp: SuperApp.Bridge;
    lib: {
      superapp: SuperApp.Bridge;
      [key: string]: any;
    };
    SuperAppChannel?: {
      postMessage(message: string): void;
    };
  }

  const superapp: SuperApp.Bridge;
}

export = SuperApp;
export as namespace SuperApp;
