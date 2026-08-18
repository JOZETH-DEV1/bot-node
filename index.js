// index.js — jozethdevBot (proceso en vivo)
//
// Este proceso complementa al Worker de Cloudflare. Se encarga de todo
// lo que requiere "escuchar" eventos en tiempo real:
//   - Mensaje de bienvenida al unirse un usuario
//   - Anti-spam (5 mensajes repetidos seguidos -> aislar 1 semana)
//   - Anti-raid (muchas entradas de usuarios en poco tiempo)
//
// Se ejecuta con: node index.js
// Necesita la variable de entorno DISCORD_TOKEN (la misma que usa el Worker).

import { Client, GatewayIntentBits, Partials, EmbedBuilder } from 'discord.js';
import 'dotenv/config';
import { handleMessageForSpam } from './events/antiSpam.js';
import { handleMemberJoin } from './events/welcome.js';
import { registerRaidWatcher } from './events/antiRaid.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,      // necesario para GUILD_MEMBER_ADD (bienvenida, anti-raid)
    GatewayIntentBits.GuildMessages,     // necesario para leer mensajes (anti-spam)
    GatewayIntentBits.MessageContent,    // necesario para comparar el TEXTO del mensaje
    GatewayIntentBits.GuildModeration,   // eventos de baneos, útil para logs
  ],
  partials: [Partials.Channel],
});

client.once('ready', () => {
  console.log(`✅ ${client.user.tag} está en línea.`);
});

// --- Bienvenida ---
client.on('guildMemberAdd', async (member) => {
  await handleMemberJoin(member);
});

// --- Anti-raid (registra el watcher de entradas masivas) ---
registerRaidWatcher(client);

// --- Anti-spam ---
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;
  await handleMessageForSpam(message);
});

client.login(process.env.DISCORD_TOKEN);
