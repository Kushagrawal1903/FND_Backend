import axios from "axios";
import { config } from "../config/env.js";

export const sendTelegramMessage = async (message) => {
  try {
    if (!config.telegram.enabled) {
      console.log("[Telegram] Disabled");
      return;
    }

    const url = `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`;

    const response = await axios.post(url, {
      chat_id: config.telegram.chatId,
      text: message,
    });

    console.log("[Telegram] Message sent successfully.");

    return response.data;
  } catch (error) {
    console.error(
      "[Telegram] Error:",
      error.response?.data || error.message
    );
  }
};