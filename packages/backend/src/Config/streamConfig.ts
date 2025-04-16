import dotenv from 'dotenv';

dotenv.config();

export const streamConfig = {
  // Livepeer configuration (kept for backward compatibility)
  livepeerApiClient: process.env['LIVEPEER_API_KEY'],
  livepeerSharedSecret: process.env['LIVEPEER_SHARED_SECRET'],
  livepeerWebhookID: process.env['LIVEPEER_WEBHOOK_ID'],
  
  // Janus configuration
  janusServerUrl: process.env['JANUS_SERVER_URL'] || 'http://localhost:8088/janus',
  janusRoomId: parseInt(process.env['JANUS_ROOM_ID'] || '1234'),
  janusApiSecret: process.env['JANUS_API_SECRET'] || 'janusrocks',
};
