// events/antiRaid.js
// Detecta "raids" (muchos usuarios uniéndose en muy poco tiempo, típico
// de ataques coordinados) y activa medidas de protección automáticas.
//
// Funciona en varios servidores a la vez: cada servidor tiene su propio
// estado (entradas recientes, modo raid activo o no), así un raid en un
// servidor no afecta al otro.

import { getGuildConfig } from '../config/guilds.js';

const JOIN_THRESHOLD = 6;          // cuántas entradas activan la alerta
const TIME_WINDOW_MS = 10 * 1000;  // ventana de tiempo para contar las entradas (10s)
const ACCOUNT_AGE_MIN_MS = 7 * 24 * 60 * 60 * 1000; // cuentas más nuevas que 7 días se consideran sospechosas
const RAID_MODE_DURATION_MS = 10 * 60 * 1000; // cuánto dura activo el modo raid

// Estado independiente por servidor: Map<guildId, { recentJoins: number[], raidModeActive: boolean }>
const raidState = new Map();

function getState(guildId) {
  if (!raidState.has(guildId)) {
    raidState.set(guildId, { recentJoins: [], raidModeActive: false });
  }
  return raidState.get(guildId);
}

export function registerRaidWatcher(client) {
  client.on('guildMemberAdd', async (member) => {
    const guildId = member.guild.id;
    const state = getState(guildId);
    const now = Date.now();

    state.recentJoins.push(now);
    state.recentJoins = state.recentJoins.filter((t) => now - t <= TIME_WINDOW_MS);

    const accountAge = now - member.user.createdTimestamp;

    if (state.raidModeActive && accountAge < ACCOUNT_AGE_MIN_MS) {
      try {
        await member.kick('Modo anti-raid activo: cuenta demasiado nueva.');
      } catch (err) {
        console.error(`[${member.guild.name}] No pude expulsar durante modo raid:`, err.message);
      }
      return;
    }

    if (!state.raidModeActive && state.recentJoins.length >= JOIN_THRESHOLD) {
      state.raidModeActive = true;
      await activateRaidMode(member.guild);

      setTimeout(() => {
        state.raidModeActive = false;
        state.recentJoins = [];
      }, RAID_MODE_DURATION_MS);
    }
  });
}

async function activateRaidMode(guild) {
  const guildConfig = getGuildConfig(guild.id);

  try {
    await guild.setVerificationLevel(4, 'Posible raid detectado: entradas masivas en poco tiempo.'); // 4 = VERY_HIGH
  } catch (err) {
    console.error(`[${guild.name}] No pude subir el nivel de verificación:`, err.message);
  }

  if (guildConfig) {
    const alertChannel = guild.channels.cache.get(guildConfig.raidAlertChannelId);
    if (alertChannel) {
      await alertChannel.send(
        `🚨 **Posible raid detectado.** Se registraron ${JOIN_THRESHOLD}+ entradas en menos de ${TIME_WINDOW_MS / 1000} segundos.\n` +
        `Activé nivel de verificación alto y expulsaré automáticamente cuentas muy nuevas durante los próximos ${RAID_MODE_DURATION_MS / 60000} minutos.`
      );
    }
  }
}
