// Firefox Console Capture Content Script
// This script runs in the page context to capture console logs

(function () {
  "use strict";

  // Only run once per page
  if (window.browserToolsConsoleCapture) {
    return;
  }
  window.browserToolsConsoleCapture = true;

  console.log("Firefox Console Capture: Initializing console interception");

  // Store original console methods
  const originalConsole = {
    log: console.log.bind(console),
    error: console.error.bind(console),
    warn: console.warn.bind(console),
    info: console.info.bind(console),
    debug: console.debug.bind(console),
  };

  // Function to send console messages to the extension
  function sendToExtension(level, args) {
    try {
      // Format the message
      const message = args
        .map((arg) => {
          if (typeof arg === "object") {
            try {
              return JSON.stringify(arg, null, 2);
            } catch (e) {
              return "[Object]";
            }
          }
          return String(arg);
        })
        .join(" ");

      // Send to extension via custom event
      const event = new CustomEvent("browserToolsConsoleMessage", {
        detail: {
          type: level === "error" ? "console-error" : "console-log",
          level: level,
          message: message,
          timestamp: Date.now(),
        },
      });

      document.dispatchEvent(event);
    } catch (error) {
      // Fail silently to avoid infinite loops
    }
  }

  // Intercept console methods
  function interceptConsole(method, level) {
    console[method] = function (...args) {
      // Call original method first
      originalConsole[method](...args);

      // Send to extension
      sendToExtension(level, args);
    };
  }

  // Set up interception for all console methods
  interceptConsole("log", "log");
  interceptConsole("error", "error");
  interceptConsole("warn", "warn");
  interceptConsole("info", "info");
  interceptConsole("debug", "debug");

  // Capture unhandled errors
  window.addEventListener("error", function (event) {
    const message = event.error
      ? `${event.error.name}: ${event.error.message}\n${event.error.stack}`
      : `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`;

    sendToExtension("error", [message]);
  });

  // Capture unhandled promise rejections
  window.addEventListener("unhandledrejection", function (event) {
    const message = event.reason
      ? `Unhandled Promise Rejection: ${event.reason}`
      : "Unhandled Promise Rejection";

    sendToExtension("error", [message]);
  });

  console.log("Firefox Console Capture: Console interception active");
})();
