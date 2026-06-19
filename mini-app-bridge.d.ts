// mini-app-bridge.d.ts
declare namespace SuperApp {
  interface BridgeResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
  }

  interface EventListener<T = any> {
    (data: T): void;
  }

  interface BridgeMeta {
    miniAppId?: string;
    authorization?: string;
    [key: string]: any;
  }

  interface BridgeCallOptions {
    meta?: BridgeMeta;
  }

  interface Bridge {
    /** Call a native method in the SuperApp */
    call<T = any>(className: string, methodName: string, params?: object, options?: BridgeCallOptions): Promise<T>;
    
    /** Register an event listener */
    addListener<T = any>(eventName: string, callback: EventListener<T>): void;
    
    /** Remove an event listener */
    removeListener<T = any>(eventName: string, callback: EventListener<T>): void;
    
    /** Get stored parameters */
    getParams<T = any>(key?: string): T;

    /** Set metadata sent with every bridge request */
    setDefaultMeta(meta?: BridgeMeta): void;

    /** Get configured default metadata */
    getDefaultMeta(): BridgeMeta;

    /** Clear configured default metadata */
    clearDefaultMeta(): void;
    
    /** Internal use: Process incoming messages from the SuperApp */
    receiveMessage(response: string | object): void;
  }
}

declare interface Window {
  superapp: SuperApp.Bridge;
}
