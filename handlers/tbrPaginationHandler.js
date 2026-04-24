// handlers/tbrPaginationHandler.js

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const TBR = require("../models/TBR");

const customEmoji = "<a:twrly3:1369321311423434946>";
const BOOKS_PER_PAGE = 4;

function paginateBooks(books, page) {
  const start = (page - 1) * BOOKS_PER_PAGE;
  const end = start + BOOKS_PER_PAGE;
  return books.slice(start, end);
}

function buildTbrEmbed(user, books, page, totalPages) {
  const paginated = paginateBooks(books, page);

  const description = paginated
    .map((b, i) => {
      let statusText =
        b.status === "finished"
          ? "Finished"
          : b.status === "dnf"
            ? "Did Not Finish"
            : "To Be Read";

      return `${customEmoji} ${i + 1 + BOOKS_PER_PAGE * (page - 1)}. **${
        b.title
      }**\n**Author:** *${b.author}*\n**Status:** ${statusText}`;
    })
    .join("\n\n");

  return new EmbedBuilder()
    .setTitle(`${user.username}'s TBR List`)
    .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
    .setDescription(description || "No books on this page.")
    .setFooter({ text: `Page ${page} of ${totalPages}` })
    .setColor("#ff95f2");
}

function buildActionRow(page, totalPages, targetUserId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`tbr_prev_${targetUserId}_${page}`)
      .setLabel("Previous")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 1),

    new ButtonBuilder()
      .setCustomId(`tbr_next_${targetUserId}_${page}`)
      .setLabel("Next")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === totalPages),
  );
}

module.exports = async function handleTbrPagination(interaction) {
  if (
    !interaction.isButton() ||
    !(
      interaction.customId.startsWith("tbr_prev_") ||
      interaction.customId.startsWith("tbr_next_")
    )
  ) {
    return false;
  }

  const [, action, userId, pageStr] = interaction.customId.split("_");
  const oldPage = parseInt(pageStr, 10);
  const newPage = action === "prev" ? oldPage - 1 : oldPage + 1;

  if (interaction.user.id !== userId) {
    await interaction.reply({
      content: "You can't turn pages on someone else's TBR list!",
      ephemeral: true,
    });

    return true;
  }

  const targetUser = await interaction.client.users.fetch(userId);

  let tbr = await TBR.findOne({ userId });
  if (!tbr) tbr = new TBR({ userId, books: [] });

  const totalPages = Math.ceil(tbr.books.length / BOOKS_PER_PAGE);

  if (newPage < 1 || newPage > totalPages) {
    await interaction.deferUpdate();
    return true;
  }

  const embed = buildTbrEmbed(targetUser, tbr.books, newPage, totalPages);
  const row = buildActionRow(newPage, totalPages, userId);

  await interaction.update({
    embeds: [embed],
    components: [row],
  });

  return true;
};
