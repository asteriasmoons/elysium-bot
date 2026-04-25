const {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
} = require("discord.js");

const { buildPanelEmbed } = require("./sendTicketPanel");

// reuse same helpers from ticket file behavior
function cleanString(value) {
  const cleaned = String(value ?? "")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned || null;
}

function buildSelectMenu(panel) {
  const customId = `role_select:${panel.panelName}`;

  const options = (panel.roles ?? []).map((role) => {
    const option = {
      label: cleanString(role.label) || "Role",
      value: role.roleId,
    };

    const description = cleanString(role.description);
    if (description) option.description = description;

    const emoji = cleanString(role.emoji);
    if (emoji) option.emoji = emoji;

    return option;
  });

  const menu = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder("Select a role")
    .addOptions(options);

  if (panel.selectMode === "multiple") {
    menu.setMinValues(0);
    menu.setMaxValues(options.length);
  } else {
    menu.setMinValues(0);
    menu.setMaxValues(1);
  }

  return new ActionRowBuilder().addComponents(menu);
}

function buildButtons(panel) {
  const rows = [];

  let currentRow = new ActionRowBuilder();
  let count = 0;

  for (const role of panel.roles ?? []) {
    if (count === 5) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder();
      count = 0;
    }

    const button = new ButtonBuilder()
      .setCustomId(`role_button:${panel.panelName}:${role.roleId}`)
      .setLabel(cleanString(role.label) || "Role")
      .setStyle(ButtonStyle.Secondary);

    const emoji = cleanString(role.emoji);
    if (emoji) {
      button.setEmoji(emoji);
    }

    currentRow.addComponents(button);
    count++;
  }

  if (count > 0) {
    rows.push(currentRow);
  }

  return rows;
}

async function sendRolePanel({ panel, channel }) {
  if (!channel || !channel.isTextBased()) {
    throw new Error("Invalid channel");
  }

  const embed = buildPanelEmbed({
    embed: {
      title: panel.embedTitle,
      description: panel.embedDescription,
      color: panel.embedColor,
    },
  });

  let components = [];

  if (panel.type === "buttons") {
    components = buildButtons(panel);
  } else {
    components = [buildSelectMenu(panel)];
  }

  return channel.send({
    embeds: [embed],
    components,
  });
}

module.exports = {
  sendRolePanel,
};
