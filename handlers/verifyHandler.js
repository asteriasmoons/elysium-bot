const VerifyPanel = require("../models/VerifyPanel");

async function handleButton(interaction) {
  const config = await VerifyPanel.findOne({ guildId: interaction.guild.id });
  if (!config) {
    return interaction.reply({
      content: "Verification panel config not found. Please notify an admin.",
      ephemeral: true,
    });
  }

  const role = interaction.guild.roles.cache.get(config.roleId);
  if (!role) {
    return interaction.reply({
      content: "Verification role not found. Please notify an admin.",
      ephemeral: true,
    });
  }

  const removeRole = config.removeRoleId
    ? interaction.guild.roles.cache.get(config.removeRoleId)
    : null;

  if (removeRole && interaction.member.roles.cache.has(removeRole.id)) {
    await interaction.member.roles.remove(removeRole.id).catch(() => {});
  }

  if (!interaction.member.roles.cache.has(role.id)) {
    await interaction.member.roles.add(role).catch(() => {});
    return interaction.reply({
      content: "You are now verified!",
      ephemeral: true,
    });
  } else {
    return interaction.reply({
      content: "You are already verified!",
      ephemeral: true,
    });
  }
}

module.exports = { handleButton };
