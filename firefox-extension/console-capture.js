// Firefox Console Capture Content Script
// This script runs in the page context to capture console logs

(function() {
  'use strict';

  // Only run once per page
  if (window.browserToolsConsoleCapture) {
    return;
  }
  window.browserToolsConsoleCapture = true;

  console.log('Firefox Console Capture: Initializing console interception');

  // Store original console methods
  const originalConsole = {
    log: console.log.bind(console),
    error: console.error.bind(console),
    warn: console.warn.bind(console),
    info: console.info.bind(console),
    debug: console.debug.bind(console)
  };

  // Function to send console messages to the extension
  function sendToExtension(level, args) {
    try {
      // Skip our own debug messages to prevent infinite loops
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch (e) {
            return '[Object]';
          }
        }
        return String(arg);
      }).join(' ');

      // Skip messages from our own content script to prevent infinite loops
      if (message.includes('Content Script:') || message.includes('Firefox Console Capture:')) {
        return;
      }

      const messageData = {
        type: level === 'error' ? 'console-error' : 'console-log',
        level: level,
        message: message,
        timestamp: Date.now()
      };

      // Try multiple methods to send the message (without logging to prevent loops)

      // Send directly to background script which will relay to DevTools
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'CONSOLE_MESSAGE_FROM_CONTENT',
          data: messageData,
          tabId: null // Background script will determine the tab
        });
      } else if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.sendMessage) {
        browser.runtime.sendMessage({
          type: 'CONSOLE_MESSAGE_FROM_CONTENT',
          data: messageData,
          tabId: null
        });
      }
    } catch (error) {
      // Fail silently to avoid infinite loops
    }
  }

  // Fallback method using custom events
  function sendViaCustomEvent(messageData) {
    // Don't log here to prevent infinite loops
    const event = new CustomEvent('browserToolsConsoleMessage', {
      detail: messageData
    });
    document.dispatchEvent(event);
  }

  // Intercept console methods
  function interceptConsole(method, level) {
    console[method] = function(...args) {
      // Call original method first
      originalConsole[method](...args);

      // Send to extension
      sendToExtension(level, args);
    };
  }

  // Set up interception for all console methods
  interceptConsole('log', 'log');
  interceptConsole('error', 'error');
  interceptConsole('warn', 'warn');
  interceptConsole('info', 'info');
  interceptConsole('debug', 'debug');

  // Capture unhandled errors
  window.addEventListener('error', function(event) {
    const message = event.error ?
      `${event.error.name}: ${event.error.message}\n${event.error.stack}` :
      `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`;

    sendToExtension('error', [message]);
  });

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    const message = event.reason ?
      `Unhandled Promise Rejection: ${event.reason}` :
      'Unhandled Promise Rejection';

    sendToExtension('error', [message]);
  });

  console.log('Firefox Console Capture: Console interception active');
})();
