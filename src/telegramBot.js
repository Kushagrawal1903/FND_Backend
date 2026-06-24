import TelegramBot from "node-telegram-bot-api";
import { agentExecutor } from "./agent/truthLensAgent.js";

const bot = new TelegramBot(
  process.env.TELEGRAM_BOT_TOKEN,
  { polling: true }
);

bot.on("message", async (msg) => {
  try {
    const result = await agentExecutor.invoke({
      input: msg.text,
    });

    bot.sendMessage(
      msg.chat.id,
      JSON.stringify(result, null, 2)
    );
  } catch (error) {
    bot.sendMessage(
      msg.chat.id,
      "Error while verifying claim."
    );
  }
});

export default bot;