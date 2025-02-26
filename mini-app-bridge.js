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
  let callbackRegistry = {};
  let requestIdCounter = 1;
  const timeoutDuration = 60000;
  let eventListeners = {};
  
  // Helper function to generate unique request IDs
  function generateRequestId() {
    return `sa_${Date.now()}_${requestIdCounter++}`;
  }
  
  // Helper function for safe JSON parsing
  function safeParseJSON(str) {
    try {
      return typeof str === 'string' ? JSON.parse(str) : str;
    } catch (e) {
      logger.error('Invalid JSON:', str, e);
      return null;
    }
  }
  
  // Bridge implementation with enhanced timeout management
  const bridge = {
    // Version information
    version: VERSION,
    
    // Call a native method
    call(className, methodName, params = {}) {
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
        
        const requestId = generateRequestId();
        // Set a timeout for the request and store the timeout ID
        const timeoutId = setTimeout(() => {
          if (callbackRegistry[requestId]) {
            bridge.handleFailure(requestId, { error: "Request Timeout" });
          }
        }, timeoutDuration);
        
        callbackRegistry[requestId] = { resolve, reject, timestamp: Date.now(), timeoutId };
        
        const payload = JSON.stringify({
          id: requestId,
          className: className,
          method: methodName,
          params: params
        });
        
        logger.log(`Sending to Flutter:`, payload);
        
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
        logger.log('Success Response:', response);
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
        logger.error('Error Response:', error);
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
      logger.log(`Dispatching event '${eventName}' with data:`, data);
      
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
      logger.log('Params updated:', paramsStore);
      // Dispatch a 'paramsUpdated' event
      bridge.dispatchEvent('paramsUpdated', paramsStore);
    },
    
    // Retrieve stored parameters
    getParams(key) {
      return key ? paramsStore[key] : { ...paramsStore };
    },
    
    // Process incoming messages from the SuperApp
    receiveMessage(response) {
      try {
        logger.log('Received from Flutter:', response);
        const res = safeParseJSON(response);
        if (!res) return;
        
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
