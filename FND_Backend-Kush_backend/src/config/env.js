import joi from 'joi';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envVarsSchema = joi
  .object()
  .keys({
    NODE_ENV: joi
      .string()
      .valid('development', 'production', 'test')
      .default('development'),

    PORT: joi.number().default(5000),

    MONGO_URI: joi.string().required(),

    JWT_SECRET: joi.string().required(),

    JWT_EXPIRES_IN: joi.string().default('7d'),

    GOOGLE_FACT_CHECK_API_KEY: joi.string().required(),

    GEMINI_API_KEY: joi.string().required(),

    GEMINI_MODEL: joi.string().default('gemini-2.5-flash'),

    NEWS_API_KEY: joi.string().allow('').optional().default(''),

    TAVILY_API_KEY: joi.string().allow('').optional().default(''),

    GROQ_API_KEY: joi.string().allow('').optional().default(''),

    GROQ_MODEL: joi.string().default('llama-3.3-70b-versatile'),

    TELEGRAM_BOT_TOKEN: joi.string().allow('').optional().default(''),

    TELEGRAM_CHAT_ID: joi.string().allow('').optional().default(''),

    TELEGRAM_ENABLED: joi.boolean().default(false),

    DNS_SERVERS: joi.string().default('1.1.1.1,1.0.0.1,8.8.8.8,8.8.4.4'),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema
  .prefs({ errors: { label: 'key' } })
  .validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const config = {
  env: envVars.NODE_ENV,

  port: envVars.PORT,

  mongoose: {
    url: envVars.MONGO_URI,
  },

  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
  },

  google: {
    factCheckApiKey: envVars.GOOGLE_FACT_CHECK_API_KEY,

    geminiApiKey: envVars.GEMINI_API_KEY,

    geminiModel: envVars.GEMINI_MODEL,
  },

  news: {
    apiKey: envVars.NEWS_API_KEY,
  },

  tavily: {
    apiKey: envVars.TAVILY_API_KEY,
  },

  groq: {
    apiKey: envVars.GROQ_API_KEY,
    model: envVars.GROQ_MODEL,
  },

  telegram: {
    enabled: envVars.TELEGRAM_ENABLED,
    botToken: envVars.TELEGRAM_BOT_TOKEN,
    chatId: envVars.TELEGRAM_CHAT_ID,
  },

  dnsServers: envVars.DNS_SERVERS
    ? envVars.DNS_SERVERS.split(',').map(ip => ip.trim())
    : ['1.1.1.1', '1.0.0.1', '8.8.8.8', '8.8.4.4'],
};