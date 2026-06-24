import axios from "axios";

export const sendTelegramMessage = async (message) => {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    await axios.post(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        chat_id: chatId,
        text: message,
      }
    );
  } catch (error) {
    console.log("Telegram Error:", error.message);
  }
};