// events/welcome.js
// Envía un mensaje de bienvenida cuando un usuario se une al servidor,
// incluyendo los links de TikTok y YouTube.

import { EmbedBuilder } from 'discord.js';
import { getGuildConfig } from '../config/guilds.js';

export async function handleMemberJoin(member) {
  const guildConfig = getGuildConfig(member.guild.id);
  if (!guildConfig) return; // servidor no configurado todavía en config/guilds.js

  const channel = member.guild.channels.cache.get(guildConfig.welcomeChannelId);
  if (!channel) {
    console.warn(`⚠️ No encontré el canal de bienvenida configurado para el servidor ${member.guild.name} (${member.guild.id}).`);
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x00d9ff)
    .setTitle(`¡Bienvenido/a, ${member.user.username}! 🎉`)
    .setDescription(
      `Nos alegra tenerte en el servidor, <@${member.id}>.\n\n` +
      `Síguenos también en nuestras redes:\n` +
      `🎵 TikTok: [@jozethdev](https://tiktok.com/@jozethdev)\n` +
      `🎵 TikTok: [@voxiny](https://tiktok.com/@voxiny)\n` +
      `▶️ YouTube: [@voxiny](https://www.youtube.com/@voxiny)`
    )
    .setThumbnail(member.user.displayAvatarURL())
    .setFooter({ text: 'jozethdevBot' })
    .setTimestamp();

  try {
    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('Error enviando mensaje de bienvenida:', err);
  }
}
