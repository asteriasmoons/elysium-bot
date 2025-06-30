const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const BookInventory = require("../models/BookInventory"); // Adjust path as needed

const BOOKS_PER_PAGE = 3;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("inventory")
    .setDescription("Manage the global book inventory.")
    .addSubcommand((sub) =>
      sub
        .setName("addbook")
        .setDescription("Add a book to the global inventory!")
        .addStringOption((opt) =>
          opt
            .setName("title")
            .setDescription("Title of the book")
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("author")
            .setDescription("Author of the book")
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("goodreads")
            .setDescription("Goodreads link (required)")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("listbooks")
        .setDescription("List all books in the global inventory!")
    )
    .addSubcommand((sub) =>
      sub
        .setName("bookremove")
        .setDescription("Remove a book from the global inventory!")
        .addStringOption((opt) =>
          opt
            .setName("title")
            .setDescription("Title of the book")
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("author")
            .setDescription("Author of the book")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("search")
        .setDescription("Search for books by title or author!")
        .addStringOption((opt) =>
          opt
            .setName("query")
            .setDescription("Title or author to search for")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "addbook") {
      // ADD BOOK SUBCOMMAND
      const title = interaction.options.getString("title").trim();
      const author = interaction.options.getString("author").trim();
      const goodreads = interaction.options.getString("goodreads").trim();

      // Check for duplicates (case-insensitive)
      const exists = await BookInventory.findOne({
        title: { $regex: new RegExp(`^${title}$`, "i") },
        author: { $regex: new RegExp(`^${author}$`, "i") },
      });
      if (exists) {
        await interaction.reply({
          content: "That book is already in the inventory!",
          ephemeral: true,
        });
        return;
      }

      // Create and save the book
      await BookInventory.create({
        title,
        author,
        goodreads,
        addedBy: interaction.user.id, // tracks who added it
      });

      await interaction.reply({
        content: `Book **${title}** by **${author}** added to the inventory!`,
        ephemeral: false,
      });
    } else if (sub === "listbooks") {
      // LIST BOOKS SUBCOMMAND

      // Fetch all books, sorted by title
      const books = await BookInventory.find().sort({ title: 1 });
      if (books.length === 0) {
        await interaction.reply("No books have been added yet!");
        return;
      }

      // Helper: Generate embed for a page of books
      function generateEmbed(page) {
        const start = page * BOOKS_PER_PAGE;
        const end = start + BOOKS_PER_PAGE;
        const booksToShow = books.slice(start, end);

        const embed = new EmbedBuilder()
          .setTitle("Books Inventory")
          .setColor("#572194")
          .setFooter({
            text: `Page ${page + 1} of ${Math.ceil(
              books.length / BOOKS_PER_PAGE
            )}`,
          });

        booksToShow.forEach((b, i) => {
          embed.addFields({
            name: `${start + i + 1}. ${b.title}`,
            value:
              `**Title:** ${b.title}\n` +
              `**Author:** ${b.author}\n` +
              `**Goodreads:** [Link](${b.goodreads})`,
          });
        });

        return embed;
      }

      // Helper: Generate pagination row
      function generateRow(page, maxPage) {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("back")
            .setLabel("Back")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
          new ButtonBuilder()
            .setCustomId("next")
            .setLabel("Next")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === maxPage)
        );
      }

      let page = 0;
      const maxPage = Math.floor((books.length - 1) / BOOKS_PER_PAGE);

      const embed = generateEmbed(page);
      const row = generateRow(page, maxPage);

      const reply = await interaction.reply({
        embeds: [embed],
        components: [row],
        fetchReply: true,
      });

      // Set up a collector for pagination buttons
      const collector = reply.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id,
        time: 300000, // 5 minutes
      });

      collector.on("collect", async (i) => {
        if (i.customId === "next" && page < maxPage) page++;
        else if (i.customId === "back" && page > 0) page--;

        const newEmbed = generateEmbed(page);
        const newRow = generateRow(page, maxPage);

        await i.update({ embeds: [newEmbed], components: [newRow] });
      });

      collector.on("end", async () => {
        // Disable buttons after collector ends
        const disabledRow = generateRow(page, maxPage);
        disabledRow.components.forEach((btn) => btn.setDisabled(true));
        await reply.edit({ components: [disabledRow] });
      });
    } else if (sub === "bookremove") {
      // REMOVE BOOK SUBCOMMAND
      const title = interaction.options.getString("title").trim();
      const author = interaction.options.getString("author").trim();

      // Try to find and delete the book
      const result = await BookInventory.findOneAndDelete({
        title: { $regex: new RegExp(`^${title}$`, "i") },
        author: { $regex: new RegExp(`^${author}$`, "i") },
      });

      if (!result) {
        await interaction.reply({
          content: `That book was not found in the inventory.`,
          ephemeral: true,
        });
        return;
      }

      await interaction.reply({
        content: `Book **${title}** by **${author}** has been removed from the inventory.`,
        ephemeral: false,
      });
    } else if (sub === "search") {
      const query = interaction.options.getString("query").trim();

      // Use Atlas Search with fuzzy
      const books = await BookInventory.aggregate([
        {
          $search: {
            index: "default", // or whatever you named your index
            compound: {
              should: [
                {
                  text: {
                    query: query,
                    path: "title",
                    fuzzy: { maxEdits: 2, prefixLength: 1 },
                  },
                },
                {
                  text: {
                    query: query,
                    path: "author",
                    fuzzy: { maxEdits: 2, prefixLength: 1 },
                  },
                },
              ],
            },
          },
        },
        { $sort: { title: 1 } },
      ]);

      if (books.length === 0) {
        await interaction.reply({
          content: `No books found matching **${query}** (fuzzy search).`,
          ephemeral: true,
        });
        return;
      }

      // Pagination helpers (reuse your code)
      function generateEmbed(page) {
        const start = page * BOOKS_PER_PAGE;
        const end = start + BOOKS_PER_PAGE;
        const booksToShow = books.slice(start, end);

        const embed = new EmbedBuilder()
          .setTitle(`Fuzzy Search Results for "${query}"`)
          .setColor("#572194")
          .setFooter({
            text: `Page ${page + 1} of ${Math.ceil(
              books.length / BOOKS_PER_PAGE
            )}`,
          });

        booksToShow.forEach((b, i) => {
          embed.addFields({
            name: `${start + i + 1}. ${b.title}`,
            value:
              `**Title:** ${b.title}\n` +
              `**Author:** ${b.author}\n` +
              `**Goodreads:** [Link](${b.goodreads})`,
          });
        });

        return embed;
      }

      function generateRow(page, maxPage) {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("back")
            .setLabel("Back")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
          new ButtonBuilder()
            .setCustomId("next")
            .setLabel("Next")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === maxPage)
        );
      }

      let page = 0;
      const maxPage = Math.floor((books.length - 1) / BOOKS_PER_PAGE);

      const embed = generateEmbed(page);
      const row = generateRow(page, maxPage);

      const reply = await interaction.reply({
        embeds: [embed],
        components: [row],
        fetchReply: true,
      });

      const collector = reply.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id,
        time: 300000, // 5 minutes
      });

      collector.on("collect", async (i) => {
        if (i.customId === "next" && page < maxPage) page++;
        else if (i.customId === "back" && page > 0) page--;

        const newEmbed = generateEmbed(page);
        const newRow = generateRow(page, maxPage);

        await i.update({ embeds: [newEmbed], components: [newRow] });
      });

      collector.on("end", async () => {
        const disabledRow = generateRow(page, maxPage);
        disabledRow.components.forEach((btn) => btn.setDisabled(true));
        await reply.edit({ components: [disabledRow] });
      });
    }
  },
};

/*
  inventory.js
  - /inventory addbook: Adds a book to the global MongoDB inventory, checks for duplicates (case-insensitive). Goodreads link is REQUIRED.
  - /inventory listbooks: Lists all books with pagination, shows Goodreads as clickable hyperlink.
  - /inventory bookremove: Removes a book by title and author (case-insensitive match).
  - Uses Mongoose model BookInventory.
  - Comments included for clarity and future maintainers.
*/
