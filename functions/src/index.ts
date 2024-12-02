import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

export const magicSecretAPI = onCall({
    secrets: ["MAGIC_SECRET_API_KEY"],
}, async () => {
    const secretKey = process.env.MAGIC_SECRET_API_KEY;
    logger.info('Hello logs!', { structuredData: true });
    return `Hello from Firebase! Secret: ${secretKey}`;
});