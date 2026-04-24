// handlers/journalPaginationHandler.js

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const JournalEntry = require("../models/JournalEntry");

const ENTRIES_PER_PAGE = 3;

module.exports = async function handleJournalPagination(interaction) {
  if (!interaction.isButton() || !interaction.customId.startsWith("journal_")) {
    return false;
  }

  const [, direction, pageStr] = interaction.customId.split("_");

  let page = parseInt(pageStr, 10);
  if (isNaN(page) || page < 1) page = 1;

  const userId = interaction.user.id;

  if (
    interaction.message.interaction?.user?.id &&
    interaction.message.interaction.user.id !== userId
  ) {
    await interaction.reply({
      content: "You can't use these buttons.",
      ephemeral: true,
    });

    return true;
  }

  const entries = await JournalEntry.find({ userId }).sort({
    createdAt: -1,
  });

  const totalEntries = entries.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / ENTRIES_PER_PAGE));

  if (page > totalPages) page = totalPages;

  const noEntries = totalEntries === 0;
  const start = (page - 1) * ENTRIES_PER_PAGE;
  const pageEntries = entries.slice(start, start + ENTRIES_PER_PAGE);

  const embed = new EmbedBuilder()
    .setTitle(
      `<:lebuk:1393628610169933824> Your Journal Entries (Page ${page}/${totalPages})`,
    )
    .setColor(0x9370db)
    .setDescription(
      pageEntries.length
        ? pageEntries
            .map(
              (entry, index) =>
                `**${start + index + 1}.** [${new Date(
                  entry.createdAt,
                ).toLocaleDateString()}] ${entry.entry.slice(0, 35)}`,
            )
            .join("\n")
        : "No entries found.",
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`journal_previous_${Math.max(page - 1, 1)}`)
      .setLabel("Previous")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("1368587424556646420")
      .setDisabled(page === 1 || noEntries),

    new ButtonBuilder()
      .setCustomId(`journal_next_${Math.min(page + 1, totalPages)}`)
      .setLabel("Next")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("1368587337646211082")
      .setDisabled(page === totalPages || noEntries),
  );

  await interaction.update({
    embeds: [embed],
    components: [row],
  });

  return true;
};
