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

  interface Bridge {
    /** Call a native method in the SuperApp */
    call<T = any>(className: string, methodName: string, params?: object): Promise<T>;
    
    /** Register an event listener */
    addListener<T = any>(eventName: string, callback: EventListener<T>): void;
    
    /** Remove an event listener */
    removeListener<T = any>(eventName: string, callback: EventListener<T>): void;
    
    /** Get stored parameters */
    getParams<T = any>(key?: string): T;
    
    /** Internal use: Process incoming messages from the SuperApp */
    receiveMessage(response: string | object): void;
  }
}

declare interface Window {
  superapp: SuperApp.Bridge;
}
