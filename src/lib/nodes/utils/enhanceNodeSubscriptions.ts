import { ObjectNode } from "../types";

interface SubscriberCallback {
  (value: any): void;
  _subscriberId?: string;
}

/**
 * Enhances an ObjectNode to support multiple subscribers to onNewValue
 * while maintaining the exact same API: node.onNewValue = callback
 */
export function enhanceNodeWithMultipleSubscribers(node: ObjectNode) {
  // Skip if already enhanced
  if ((node as any)._isSubscriptionEnhanced) {
    return;
  }

  const subscribers = new Map<string, SubscriberCallback>();
  let subscriberCounter = 0;

  // Store the original onNewValue if it exists
  const originalCallback = node.onNewValue;
  if (originalCallback) {
    const originalId = `original_${++subscriberCounter}`;
    subscribers.set(originalId, originalCallback);
  }

  // Replace the onNewValue property with our proxy
  Object.defineProperty(node, "onNewValue", {
    set: function (callback: SubscriberCallback | null) {
      if (callback) {
        // Generate unique subscriber ID
        const subscriberId = `sub_${++subscriberCounter}_${Date.now()}`;

        // Remove old subscription if this callback was already registered
        if (callback._subscriberId) {
          subscribers.delete(callback._subscriberId);
        }

        // Add new subscription
        callback._subscriberId = subscriberId;
        subscribers.set(subscriberId, callback);
      }
    },

    get: function () {
      // Return function that calls all subscribers
      return (value: any) => {
        if (subscribers.size === 0) {
          return;
        }

        // Call all subscribers
        subscribers.forEach((callback, id) => {
          try {
            callback(value);
          } catch (error) {
            console.warn(`Error in onNewValue subscriber ${id}:`, error);
            // Optionally remove failed subscribers
            // subscribers.delete(id);
          }
        });
      };
    },

    configurable: true,
    enumerable: true,
  });

  // Add method to manually remove subscribers (for advanced cleanup)
  (node as any).removeOnNewValueSubscriber = function (subscriberId: string) {
    subscribers.delete(subscriberId);
  };

  // Add method to get current subscriber count (for debugging)
  (node as any).getSubscriberCount = function () {
    return subscribers.size;
  };

  // Add method to clear all subscribers
  (node as any).clearAllSubscribers = function () {
    subscribers.clear();
  };

  // Mark as enhanced to prevent duplicate enhancement
  (node as any)._isSubscriptionEnhanced = true;
}

/**
 * Enhanced version of setNodeToWatch that automatically enables multiple subscribers
 */
export function setNodeToWatchWithMultipleSubscribers(
  targetNode: ObjectNode,
  callback: SubscriberCallback,
) {
  // Enhance the target node if not already enhanced
  enhanceNodeWithMultipleSubscribers(targetNode);

  // Now we can safely assign the callback
  targetNode.onNewValue = callback;

  // Return cleanup function
  return () => {
    if (callback._subscriberId && (targetNode as any).removeOnNewValueSubscriber) {
      (targetNode as any).removeOnNewValueSubscriber(callback._subscriberId);
    }
  };
}

/**
 * Hook to get subscription info for debugging
 */
export function getNodeSubscriptionInfo(node: ObjectNode) {
  return {
    isEnhanced: !!(node as any)._isSubscriptionEnhanced,
    subscriberCount: (node as any).getSubscriberCount?.() || 0,
  };
}
