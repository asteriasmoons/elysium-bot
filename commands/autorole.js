// commands/autorole.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const Autorole = require("../models/Autorole");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("autorole")
    .setDescription("Manage the server autoroles")
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Add a role to autorole")
        .addRoleOption((opt) =>
          opt
            .setName("role")
            .setDescription("Role to automatically assign to new members")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("view").setDescription("View all autoroles")
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove a role from autorole")
        .addRoleOption((opt) =>
          opt
            .setName("role")
            .setDescription("Role to remove from autorole")
            .setRequired(true)
        )
    ),
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      const embed = new EmbedBuilder()
        .setColor(0xb4b500)
        .setTitle("Permission Denied")
        .setDescription(
          "You need the **Manage Server** permission to use this command."
        );
      return interaction.reply({ embeds: [embed], ephemeral: false });
    }

    const sub = interaction.options.getSubcommand();

    // ADD
    if (sub === "add") {
      const role = interaction.options.getRole("role");
      if (role.id === interaction.guild.id) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xb4b500)
              .setTitle("Invalid Role")
              .setDescription("You cannot set **@everyone** as autorole."),
          ],
          ephemeral: false,
        });
      }
      if (role.managed) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xb4b500)
              .setTitle("Invalid Role")
              .setDescription(
                "You cannot set a bot/integration role as autorole."
              ),
          ],
          ephemeral: false,
        });
      }

      let data = await Autorole.findOne({ guildId: interaction.guild.id });
      if (!data) {
        data = await Autorole.create({
          guildId: interaction.guild.id,
          roleIds: [role.id],
        });
      } else {
        if (data.roleIds.includes(role.id)) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(0xb4b500)
                .setTitle("Already Set")
                .setDescription(`${role} is already an autorole.`),
            ],
            ephemeral: false,
          });
        }
        data.roleIds.push(role.id);
        await data.save();
      }
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xb4b500)
            .setTitle("Autorole Added")
            .setDescription(`${role} will now be assigned to new members.`),
        ],
      });
    }

    // VIEW
    if (sub === "view") {
      const data = await Autorole.findOne({ guildId: interaction.guild.id });
      if (!data || !data.roleIds.length) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xb4b500)
              .setTitle("No Autoroles Set")
              .setDescription(
                "There are currently no autoroles set for this server."
              ),
          ],
        });
      }
      const roles = data.roleIds
        .map((id) => interaction.guild.roles.cache.get(id))
        .filter((r) => r)
        .map((r) => `${r}`)
        .join("\n");
      const embed = new EmbedBuilder()
        .setColor(0xb4b500)
        .setTitle("Current Autoroles")
        .setDescription(roles || "No valid roles found.");
      return interaction.reply({ embeds: [embed] });
    }

    // REMOVE
    if (sub === "remove") {
      const role = interaction.options.getRole("role");
      let data = await Autorole.findOne({ guildId: interaction.guild.id });
      if (!data || !data.roleIds.includes(role.id)) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xb4b500)
              .setTitle("Not Found")
              .setDescription(`${role} is not an autorole.`),
          ],
          ephemeral: false,
        });
      }
      data.roleIds = data.roleIds.filter((id) => id !== role.id);
      await data.save();
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xb4b500)
            .setTitle("Autorole Removed")
            .setDescription(`${role} has been removed from autoroles.`),
        ],
      });
    }
  },
};
