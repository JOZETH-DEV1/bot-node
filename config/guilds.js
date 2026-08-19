export const GUILD_CONFIG = {
  // Servidor 1 — tiene bienvenida (con links de TikTok/YouTube) Y anti-raid
  '1352848330966827089': {
    welcomeChannelId: '1352848330966827091',
    raidAlertChannelId: '1539062705766277260',
  },

  // Servidor 2 — SOLO anti-raid, sin bienvenida (a propósito, no se pone welcomeChannelId)
  '1533223612377727086': {
    raidAlertChannelId: '1539350644618436708',
  },

  // Agrega más servidores aquí siguiendo el mismo patrón:
  // 'ID_DEL_SERVIDOR': {
  //   welcomeChannelId: 'ID_DEL_CANAL', // opcional: omite esta línea si no quieres bienvenida ahí
  //   raidAlertChannelId: 'ID_DEL_CANAL',
  // },
}; // <--- 

// Helper: devuelve la config de un servidor, o null si no está configurado
export function getGuildConfig(guildId) {
  const config = GUILD_CONFIG[guildId];
  if (!config) {
    console.warn(`⚠️ El servidor con ID ${guildId} no está en config/guilds.js — bienvenida y alerta de raid desactivadas ahí hasta que lo agregues.`);
    return null;
  }
  return config;
}
