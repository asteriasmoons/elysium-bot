// handlers/rolePanelHandler.js

const RolePanel = require("../models/RolePanel");

module.exports = async function handleRolePanelInteraction(interaction) {
  const member = interaction.member;

  // ===== BUTTON HANDLER =====
  if (
    interaction.isButton() &&
    interaction.customId.startsWith("rolepanel_button_")
  ) {
    // customId format: rolepanel_button_<panelId>_<roleId>
    const [, , panelId, roleId] = interaction.customId.split("_");

    const panel = await RolePanel.findById(panelId);
    if (!panel) {
      return interaction.reply({
        content: "Role panel not found.",
        ephemeral: true,
      });
    }

    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) {
      return interaction.reply({
        content: "Role not found.",
        ephemeral: true,
      });
    }

    const hasRole = member.roles.cache.has(roleId);

    if (hasRole) {
      await member.roles.remove(roleId);
      return interaction.reply({
        content: `Removed ${role} role.`,
        ephemeral: true,
      });
    } else {
      await member.roles.add(roleId);
      return interaction.reply({
        content: `Added ${role} role.`,
        ephemeral: true,
      });
    }
  }

  // ===== SELECT MENU HANDLER =====
  if (
    interaction.isStringSelectMenu() &&
    interaction.customId.startsWith("rolepanel_select_")
  ) {
    // customId format: rolepanel_select_<panelId>
    const [, , panelId] = interaction.customId.split("_");

    const panel = await RolePanel.findById(panelId);
    if (!panel) {
      return interaction.reply({
        content: "Role panel not found.",
        ephemeral: true,
      });
    }

    const validRoleIds = panel.roles.map((r) => r.roleId);
    const selectedRoleIds = interaction.values;

    // Remove roles that are part of panel but not selected
    const toRemove = member.roles.cache.filter(
      (role) =>
        validRoleIds.includes(role.id) && !selectedRoleIds.includes(role.id),
    );

    // Add newly selected roles
    const toAdd = selectedRoleIds.filter(
      (roleId) => !member.roles.cache.has(roleId),
    );

    await member.roles.remove(toRemove);
    await member.roles.add(toAdd);

    return interaction.reply({
      content: `Your roles have been updated.`,
      ephemeral: true,
    });
  }
};
