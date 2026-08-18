// events/antiSpam.js
// Detecta cuando un usuario envía el MISMO mensaje 5 veces seguidas
// (comportamiento típico de bot/spam) y lo aísla (timeout) por 1 semana.

// Guardamos en memoria el historial reciente de cada usuario.
// Estructura: Map<userId, { lastContent: string, count: number, lastTimestamp: number }>
const userMessageHistory = new Map();

const REPEAT_THRESHOLD = 5;           // cuántas veces repetidas activan el castigo
const TIME_WINDOW_MS = 15 * 1000;     // deben ser "seguidas" dentro de esta ventana (15s entre mensajes)
const TIMEOUT_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 1 semana en milisegundos
// Nota: el máximo de timeout que permite Discord es 28 días, así que 1 semana entra sin problema.

export async function handleMessageForSpam(message) {
  const userId = message.author.id;
  const content = message.content.trim().toLowerCase();

  // Ignora mensajes vacíos (por ejemplo, solo una imagen/archivo)
  if (!content) return;

  const now = Date.now();
  const history = userMessageHistory.get(userId);

  if (history && history.lastContent === content && (now - history.lastTimestamp) <= TIME_WINDOW_MS) {
    history.count += 1;
    history.lastTimestamp = now;
  } else {
    userMessageHistory.set(userId, { lastContent: content, count: 1, lastTimestamp: now });
  }

  const updated = userMessageHistory.get(userId);

  if (updated.count >= REPEAT_THRESHOLD) {
    await punishRepeatedSpam(message, updated.count);
    userMessageHistory.delete(userId); // reinicia el contador tras castigar
  }
}

async function punishRepeatedSpam(message, timesRepeated) {
  const member = message.member;
  if (!member) return;

  // No intentes aislar a alguien con permisos de administrador (evita errores/abusos)
  if (member.permissions.has('Administrator')) return;

  try {
    await member.timeout(TIMEOUT_DURATION_MS, `Spam automático: mismo mensaje repetido ${timesRepeated} veces seguidas.`);
    await message.channel.send(
      `🚫 <@${member.id}> fue aislado por 1 semana por enviar el mismo mensaje repetido (comportamiento de bot/spam).`
    );
  } catch (err) {
    console.error(`No pude aislar a ${member.user.tag}:`, err.message);
    await message.channel.send(
      `⚠️ Detecté spam de <@${member.id}> pero no pude aislarlo automáticamente (verifica mis permisos y jerarquía de roles).`
    );
  }

  // Borra los últimos mensajes repetidos para limpiar el canal
  try {
    const recentMessages = await message.channel.messages.fetch({ limit: 20 });
    const toDelete = recentMessages.filter(
      (m) => m.author.id === member.id && m.content.trim().toLowerCase() === message.content.trim().toLowerCase()
    );
    await message.channel.bulkDelete(toDelete, true);
  } catch (err) {
    console.error('No pude borrar los mensajes de spam:', err.message);
  }
}
