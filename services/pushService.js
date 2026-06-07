import admin from "../firebase-admin.js";
import { getMessaging } from "firebase-admin/messaging";

const messaging = getMessaging(admin.app());

/**
 * Send a chat notification to a single FCM device token
 * @param {string} toFcmToken - The FCM device token
 * @param {string} messageText - The chat message text
 * @param {string} senderName - The sender's name
 */
export async function sendChatNotification(toFcmToken, messageText, senderName) {
   try {
    const message = {
        token: toFcmToken,
        notification: {
            title: `${senderName}`,
            body: messageText,
        },
        data: {
            type: "CHAT",
            senderName,
            messageText
        }
    };
    console.log("Sending chat notification:", message);
    await messaging.send(message);
    } catch (error) {
        console.error("Error sending chat notification:", error);
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
    };
    await messaging.send(message);
  } catch (error) {
    console.error("Error sending review prompt notification:", error);
  }
}