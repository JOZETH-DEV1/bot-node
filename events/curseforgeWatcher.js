// events/curseforgeWatcher.js
// Revisa periódicamente si hay una versión nueva del addon en CurseForge
// y, si la hay, publica el link automáticamente en el canal configurado.
//
// Necesita una CURSEFORGE_API_KEY (gratis, se solicita en:
// https://support.curseforge.com/en/support/solutions/articles/9000208346-about-the-curseforge-api-and-how-to-apply-for-a-key)

const PROJECT_ID = '1631188'; // OneTouch Essentials (sacado de la página del addon)
const ADDON_URL = 'https://www.curseforge.com/minecraft-bedrock/addons/onetouch-essentials';
const CHECK_INTERVAL_MS = 15 * 60 * 1000; // revisa cada 15 minutos

// 👉 Cambia esto por el ID del canal del Servidor 1 donde quieres el aviso
const ANNOUNCE_CHANNEL_ID = '1352848330966827091';
const ANNOUNCE_GUILD_ID = '1539062705766277260';

let lastAnnouncedFileId = null;

async function fetchLatestFile() {
  const apiKey = process.env.CURSEFORGE_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ CURSEFORGE_API_KEY no está configurada. El aviso de actualizaciones está desactivado.');
    return null;
  }

  const res = await fetch(`https://api.curseforge.com/v1/mods/${PROJECT_ID}/files?pageSize=1`, {
    headers: {
      'x-api-key': apiKey,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    console.error(`⚠️ Error consultando CurseForge (status ${res.status}). Revisa que la API key sea válida.`);
    return null;
  }

  const data = await res.json();
  const files = data.data;
  if (!files || files.length === 0) return null;

  // La API devuelve los archivos más recientes primero
  return files[0];
}

export function registerCurseForgeWatcher(client) {
  async function checkForUpdate() {
    const latestFile = await fetchLatestFile();
    if (!latestFile) return;

    // Primera vez que corre el bot: solo memoriza el archivo actual, no anuncia
    // (para no mandar un aviso "falso" de algo que ya llevaba tiempo publicado)
    if (lastAnnouncedFileId === null) {
      lastAnnouncedFileId = latestFile.id;
      console.log(`ℹ️ Vigilando CurseForge. Archivo actual: ${latestFile.displayName} (id ${latestFile.id})`);
      return;
    }

    if (latestFile.id !== lastAnnouncedFileId) {
      lastAnnouncedFileId = latestFile.id;
      await announceUpdate(client, latestFile);
    }
  }

  // Primera revisión al arrancar, y luego cada CHECK_INTERVAL_MS
  checkForUpdate();
  setInterval(checkForUpdate, CHECK_INTERVAL_MS);
}

async function announceUpdate(client, file) {
  try {
    const guild = await client.guilds.fetch(ANNOUNCE_GUILD_ID).catch(() => null);
    if (!guild) {
      console.warn(`⚠️ No encontré el servidor (${ANNOUNCE_GUILD_ID}) configurado para el aviso de CurseForge.`);
      return;
    }

    const channel = await guild.channels.fetch(ANNOUNCE_CHANNEL_ID).catch(() => null);
    if (!channel) {
      console.warn(`⚠️ No encontré el canal (${ANNOUNCE_CHANNEL_ID}) configurado para el aviso de CurseForge.`);
      return;
    }

    await channel.send(
      `🎉 **¡Nueva actualización de OneTouch Essentials!**\n` +
      `📦 Versión: **${file.displayName}**\n` +
      `🔗 ${ADDON_URL}`
    );
  } catch (err) {
    console.error('Error anunciando actualización de CurseForge:', err.message);
  }
}
