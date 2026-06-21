import admin from "../firebase-admin.js";
import { getMessaging } from "firebase-admin/messaging";

const messaging = getMessaging(admin.app());

/**
 * Send a chat notification to a single FCM device token
 * @param {string} toFcmToken - The FCM device token
 * @param {string} messageText - The chat message text
 * @param {string} senderName - The sender's name
 */
export async function sendChatNotification(toFcmToken, messageText, senderName, extraData = {}) {
   try {
    // FCM data values must all be strings, and certain keys are reserved by FCM
    // (e.g. "from", "notification", "message_type", anything starting with
    // "google" or "gcm"). Including a reserved key makes messaging.send() throw.
    const RESERVED = new Set(["from", "notification", "message_type", "collapse_key"]);
    const stringData = {};
    for (const [key, value] of Object.entries(extraData)) {
        if (value === undefined || value === null) continue;
        if (RESERVED.has(key) || key.startsWith("google") || key.startsWith("gcm")) continue;
        stringData[key] = String(value);
    }

    const message = {
        token: toFcmToken,
        notification: {
            title: `${senderName}`,
            body: messageText,
        },
        data: {
            type: "CHAT",
            senderName,
            messageText,
            ...stringData,
        },
        android: {
            notification: {
                channelId: "default",
            },
        },
    };
    console.log("Sending chat notification to token:", toFcmToken.slice(0, 12) + "...");
    await messaging.send(message);
    console.log("Chat notification sent successfully");
    } catch (error) {
        console.error("Error sending chat notification:", error?.code || error?.message || error);
        if (error?.code === "messaging/registration-token-not-registered"
            || error?.code === "messaging/invalid-registration-token"
            || error?.code === "messaging/mismatched-credential") {
            console.error(
                "FCM token rejected. Ensure GOOGLE_APPLICATION_CREDENTIALS_JSON on Render uses the same Firebase project as the mobile app (dealr-app-494db)."
            );
        }
    }
}

/**
 * Prompt a user to leave a review after a completed sale
 */
export async function sendReviewPromptNotification(toFcmToken, adTitle, revieweeName) {
  try {
    const message = {
      token: toFcmToken,
      notification: {
        title: "How was your experience?",
        body: `Rate your experience for "${adTitle}" with ${revieweeName}.`,
      },
      data: {
        type: "REVIEW_PROMPT",
        adTitle,
        revieweeName,
      },
      android: {
        notification: {
          channelId: "default",
        },
      },
    };
    await messaging.send(message);
  } catch (error) {
    console.error("Error sending review prompt notification:", error?.code || error?.message || error);
  }
}