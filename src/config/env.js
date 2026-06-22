import joi from 'joi';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env files
dotenv.config({ path: path.join(__dirname, '../../.env') });

const envVarsSchema = joi.object()
  .keys({
    NODE_ENV: joi.string().valid('development', 'production', 'test').default('development'),
    PORT: joi.number().default(5000),
    MONGO_URI: joi.string().required().description('MongoDB connection string'),
    JWT_SECRET: joi.string().required().description('JWT Secret Key'),
    JWT_EXPIRES_IN: joi.string().default('7d').description('JWT Expiry duration'),
    GOOGLE_FACT_CHECK_API_KEY: joi.string().required().description('Google Fact Check Tools API Key'),
    DNS_SERVERS: joi.string().default('1.1.1.1,1.0.0.1,8.8.8.8,8.8.4.4').description('Custom DNS servers list'),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

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
  },
  dnsServers: envVars.DNS_SERVERS ? envVars.DNS_SERVERS.split(',').map(ip => ip.trim()) : ['1.1.1.1', '1.0.0.1', '8.8.8.8', '8.8.4.4'],
};
