const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("booksummary")
    .setDescription(
      "Get a summary of a book by title and author (fuzzy search supported)"
    )
    .addStringOption((option) =>
      option.setName("title").setDescription("Book title").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("author").setDescription("Author name").setRequired(false)
    ), // Author is optional for fuzzy search
  async execute(interaction) {
    const title = interaction.options.getString("title");
    const author = interaction.options.getString("author");

    let query = `intitle:${title}`;
    if (author) query += `+inauthor:${author}`;

    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
      query
    )}`;
    const response = await fetch(url);
    const data = await response.json();

    // Handle no results (error in embed)
    if (!data.items || data.items.length === 0) {
      const errorEmbed = new EmbedBuilder()
        .setTitle("Book Not Found")
        .setDescription(
          "❌ Sorry, I couldn’t find a summary for that book.\n\nTry using a simpler title, checking the spelling, or leaving the author field blank for a broader search."
        )
        .setColor(0xe74c3c);
      return await interaction.reply({ embeds: [errorEmbed] });
    }

    // Use the first result (best fuzzy match)
    const book = data.items[0].volumeInfo;
    const summary = book.description || "No summary available.";
    const bookTitle = book.title || title;
    const bookAuthor =
      (book.authors && book.authors.join(", ")) || author || "Unknown Author";
    const thumbnail = book.imageLinks?.thumbnail;
    const infoLink = book.infoLink;
    const publisher = book.publisher;
    const pageCount = book.pageCount;

    const embed = new EmbedBuilder()
      .setTitle(bookTitle)
      .setAuthor({ name: bookAuthor })
      .setDescription(
        summary.length > 4000 ? summary.slice(0, 3997) + "..." : summary
      )
      .setColor(0x6c3483)
      .setFooter({ text: "Book summary provided by Google Books API" });

    if (infoLink) embed.setURL(infoLink);
    if (thumbnail) embed.setThumbnail(thumbnail);
    if (publisher)
      embed.addFields({ name: "Publisher", value: publisher, inline: true });
    if (pageCount)
      embed.addFields({
        name: "Page Count",
        value: pageCount.toString(),
        inline: true,
      });

    await interaction.reply({ embeds: [embed] });
  },
};
