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