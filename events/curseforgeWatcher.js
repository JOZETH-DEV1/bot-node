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
const ANNOUNCE_CHANNEL_ID = 'REEMPLAZA_CON_TU_CANAL_DE_ACTUALIZACIONES';
const ANNOUNCE_GUILD_ID = 'REEMPLAZA_CON_ID_SERVIDOR_1';

// Guarda en memoria cuál fue el último archivo anunciado, para no repetir avisos.
// Nota: como esto vive solo en memoria, si Railway reinicia el proceso, en el
// primer chequeo después de reiniciar puede "descubrir" el archivo actual como
// si fuera nuevo. Es un trade-off aceptable para no complicar el proyecto con
// una base de datos solo para esto.
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
    const guild = client.guilds.cache.get(ANNOUNCE_GUILD_ID);
    if (!guild) {
      console.warn('⚠️ No encontré el servidor configurado para el aviso de CurseForge.');
      return;
    }

    const channel = guild.channels.cache.get(ANNOUNCE_CHANNEL_ID);
    if (!channel) {
      console.warn('⚠️ No encontré el canal configurado para el aviso de CurseForge.');
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
