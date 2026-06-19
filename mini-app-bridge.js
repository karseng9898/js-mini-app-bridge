/* mini-app-bridge.js */
(function(global, lib) {
  'use strict';
  
  const VERSION = '0.1.0';
  const DEBUG = true; // Set to false for production
  
  // Logging utility with basic log levels
  const logger = {
    log: (...args) => DEBUG && console.log('[MiniApp]', ...args),
    error: (...args) => console.error('[MiniApp]', ...args),
    warn: (...args) => console.warn('[MiniApp]', ...args),
  };
  
  logger.log(`Initializing SuperApp Bridge v${VERSION}...`);
  
  // Storage for parameters and callbacks
  let paramsStore = {};
  let defaultMeta = {};
  let callbackRegistry = {};
  let requestIdCounter = 1;
  const timeoutDuration = 60000;
  let eventListeners = {};
  const SENSITIVE_KEY_PATTERN = /authorization|token|password|secret|cookie|api[-_]?key/i;
  
  // Helper function to generate unique request IDs
  function generateRequestId() {
    return `sa_${Date.now()}_${requestIdCounter++}`;
  }
  
  // Helper function for safe JSON parsing
  function safeParseJSON(str) {
    try {
      return typeof str === 'string' ? JSON.parse(str) : str;
    } catch (e) {
      logger.error('Invalid JSON received:', e);
      return null;
    }
  }

  function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  function isSensitiveKey(key) {
    return SENSITIVE_KEY_PATTERN.test(String(key));
  }

  function redactSensitiveData(value, seen) {
    if (typeof value !== 'object' || value === null) {
      return value;
    }

    const activeSeen = seen || new WeakSet();
    if (activeSeen.has(value)) {
      return '[Circular]';
    }
    activeSeen.add(value);

    if (Array.isArray(value)) {
      const redactedArray = value.map(item => redactSensitiveData(item, activeSeen));
      activeSeen.delete(value);
      return redactedArray;
    }

    const redactedObject = {};
    Object.keys(value).forEach(key => {
      redactedObject[key] = isSensitiveKey(key) ? '[REDACTED]' : redactSensitiveData(value[key], activeSeen);
    });
    activeSeen.delete(value);
    return redactedObject;
  }

  function normalizeMeta(meta, label) {
    if (meta === undefined || meta === null) {
      return {};
    }
    if (!isPlainObject(meta)) {
      throw new Error(`${label} must be an object`);
    }
    return { ...meta };
  }

  function normalizeCallOptions(options) {
    if (options === undefined || options === null) {
      return {};
    }
    if (!isPlainObject(options)) {
      throw new Error('call options must be an object');
    }

    const normalizedOptions = { ...options };
    if ('meta' in normalizedOptions) {
      normalizedOptions.meta = normalizeMeta(normalizedOptions.meta, 'options.meta');
    }
    return normalizedOptions;
  }
  
  // Bridge implementation with enhanced timeout management
  const bridge = {
    // Version information
    version: VERSION,
    
    // Call a native method
    call(className, methodName, params = {}, options = {}) {
      return new Promise((resolve, reject) => {
        // Validate inputs
        if (typeof className !== 'string' || !className) {
          reject(new Error('Invalid className'));
          return;
        }
        if (typeof methodName !== 'string' || !methodName) {
          reject(new Error('Invalid methodName'));
          return;
        }

        let callOptions;
        try {
          callOptions = normalizeCallOptions(options);
        } catch (e) {
          logger.error('Invalid call options:', e);
          reject(e);
          return;
        }
        
        const requestId = generateRequestId();
        const meta = { ...defaultMeta, ...(callOptions.meta || {}) };
        const payloadObject = {
          id: requestId,
          className: className,
          method: methodName,
          params: params
        };

        if (Object.keys(meta).length > 0) {
          payloadObject.meta = meta;
        }

        let payload;
        try {
          payload = JSON.stringify(payloadObject);
        } catch (e) {
          reject(new Error(`Failed to serialize message: ${e.message}`));
          return;
        }

        // Set a timeout for the request and store the timeout ID
        const timeoutId = setTimeout(() => {
          if (callbackRegistry[requestId]) {
            bridge.handleFailure(requestId, { error: "Request Timeout" });
          }
        }, timeoutDuration);
        
        callbackRegistry[requestId] = { resolve, reject, timestamp: Date.now(), timeoutId };
        
        logger.log(`Sending to Flutter:`, redactSensitiveData(payloadObject));
        
        // Check if the communication channel exists
        if (window.SuperAppChannel) {
          try {
            window.SuperAppChannel.postMessage(payload);
          } catch (e) {
            clearTimeout(timeoutId);
            reject(new Error(`Failed to send message: ${e.message}`));
            delete callbackRegistry[requestId];
          }
        } else {
          logger.error('SuperAppChannel is NOT available!');
          clearTimeout(timeoutId);
          reject(new Error('SuperAppChannel is not available!'));
          delete callbackRegistry[requestId];
        }
      });
    },
    
    // Handle successful responses by clearing the timeout and resolving the promise
    handleSuccess(requestId, response) {
      if (callbackRegistry[requestId]) {
        clearTimeout(callbackRegistry[requestId].timeoutId);
        logger.log('Success Response:', redactSensitiveData(response));
        const duration = Date.now() - callbackRegistry[requestId].timestamp;
        logger.log(`Request took ${duration}ms`);
        callbackRegistry[requestId].resolve(response);
        delete callbackRegistry[requestId];
      }
    },
    
    // Handle error responses by clearing the timeout and rejecting the promise
    handleFailure(requestId, error) {
      if (callbackRegistry[requestId]) {
        clearTimeout(callbackRegistry[requestId].timeoutId);
        logger.error('Error Response:', redactSensitiveData(error));
        callbackRegistry[requestId].reject(error);
        delete callbackRegistry[requestId];
      }
    },
    
    // Register event listeners
    addListener(eventName, callback) {
      if (typeof eventName !== 'string' || !eventName) {
        logger.error('Invalid event name');
        return;
      }
      if (typeof callback !== 'function') {
        logger.error('Event callback must be a function');
        return;
      }
      if (!eventListeners[eventName]) {
        eventListeners[eventName] = [];
      }
      eventListeners[eventName].push(callback);
      logger.log(`Added listener for event: ${eventName}`);
      
      // Return an unregistration function
      return () => bridge.removeListener(eventName, callback);
    },
    
    // Remove event listeners
    removeListener(eventName, callback) {
      if (!eventListeners[eventName]) {
        return;
      }
      const initialSize = eventListeners[eventName].length;
      eventListeners[eventName] = eventListeners[eventName].filter(cb => cb !== callback);
      
      if (initialSize !== eventListeners[eventName].length) {
        logger.log(`Removed listener for event: ${eventName}`);
      }
      
      if (eventListeners[eventName].length === 0) {
        delete eventListeners[eventName];
      }
    },
    
    // Dispatch events to registered listeners
    dispatchEvent(eventName, data) {
      logger.log(`Dispatching event '${eventName}' with data:`, redactSensitiveData(data));
      
      if (!eventListeners[eventName]) {
        return;
      }
      
      eventListeners[eventName].forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          logger.error(`Error in event listener for '${eventName}':`, err);
        }
      });
    },
    
    // Get all registered event names
    getRegisteredEvents() {
      return Object.keys(eventListeners);
    },
    
    // Store parameters from the SuperApp
    setParams(newParams) {
      if (typeof newParams !== 'object' || newParams === null) {
        logger.error('Invalid params object');
        return;
      }
      paramsStore = { ...paramsStore, ...newParams };
      logger.log('Params updated:', redactSensitiveData(paramsStore));
      // Dispatch a 'paramsUpdated' event
      bridge.dispatchEvent('paramsUpdated', paramsStore);
    },
    
    // Retrieve stored parameters
    getParams(key) {
      return key ? paramsStore[key] : { ...paramsStore };
    },

    // Configure metadata that should be sent with every bridge request.
    setDefaultMeta(meta = {}) {
      try {
        defaultMeta = normalizeMeta(meta, 'meta');
      } catch (e) {
        logger.error('Invalid default metadata:', e);
        throw e;
      }

      logger.log('Default metadata updated:', redactSensitiveData(defaultMeta));
    },

    // Retrieve configured default metadata.
    getDefaultMeta() {
      return { ...defaultMeta };
    },

    // Clear configured default metadata.
    clearDefaultMeta() {
      defaultMeta = {};
      logger.log('Default metadata cleared');
    },
    
    // Process incoming messages from the SuperApp
    receiveMessage(response) {
      try {
        const res = safeParseJSON(response);
        if (!res) return;
        logger.log('Received from Flutter:', redactSensitiveData(res));
        
        // If it's an event, dispatch it
        if (res.event) {
          bridge.dispatchEvent(res.event, res.data);
          return;
        }
        
        // If it has an id and a success flag, handle it as a response
        if (res.id && typeof res.success === 'boolean') {
          if (res.success) {
            bridge.handleSuccess(res.id, res.data);
          } else {
            bridge.handleFailure(res.id, res.error || { error: 'Unknown error' });
          }
        }
      } catch (e) {
        logger.error('Error processing message:', e);
      }
    }
  };
  
  // Expose the bridge
  lib.superapp = global.superapp = bridge;
  logger.log('SuperApp Bridge is Ready!');
  
  // Auto-initialization: Notify the SuperApp when the mini-app is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      bridge.call("superAppBase", "initialized", {})
        .then(() => logger.log('Notified SuperApp that MiniApp is initialized'))
        .catch(err => logger.error('Error notifying SuperApp:', err));
    });
  } else {
    bridge.call("superAppBase", "initialized", {})
      .then(() => logger.log('Notified SuperApp that MiniApp is initialized'))
      .catch(err => logger.error('Error notifying SuperApp:', err));
  }
})(window, window.lib || (window.lib = {}));
