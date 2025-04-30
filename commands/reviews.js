// review.js
const {
	SlashCommandBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType
  } = require('discord.js');
  const fs = require('fs');
  const path = require('path');
  
  const reviewsPath = path.join(__dirname, 'reviews.json');
  
  function loadReviews() {
	if (!fs.existsSync(reviewsPath)) fs.writeFileSync(reviewsPath, '[]');
	return JSON.parse(fs.readFileSync(reviewsPath));
  }
  function saveReviews(data) {
	fs.writeFileSync(reviewsPath, JSON.stringify(data, null, 2));
  }
  const norm = str => str.trim().toLowerCase();
  
  function createListEmbed(reviews, page, perPage) {
	const totalPages = Math.ceil(reviews.length / perPage);
	const start = (page - 1) * perPage;
	const end = start + perPage;
	const pageReviews = reviews.slice(start, end);
  
	return new EmbedBuilder()
	  .setTitle(`All Book Reviews (Page ${page}/${totalPages})`)
	  .setDescription(pageReviews.map((r, i) =>
		`**${start + i + 1}.** ⭐ **${r.rating}** — "${r.book}" by ${r.author}\nby **${r.username}**\n${r.review}`
	  ).join('\n\n') || '*No reviews on this page.*')
	  .setFooter({ text: `Showing ${start + 1}-${Math.min(end, reviews.length)} of ${reviews.length} reviews.` });
  }
  
  function createPaginationRow(page, totalPages) {
	return new ActionRowBuilder().addComponents(
	  new ButtonBuilder()
		.setCustomId('prev')
		.setLabel('Previous')
		.setStyle(ButtonStyle.Primary)
		.setDisabled(page === 1),
	  new ButtonBuilder()
		.setCustomId('next')
		.setLabel('Next')
		.setStyle(ButtonStyle.Primary)
		.setDisabled(page === totalPages)
	);
  }
  
  module.exports = {
	data: new SlashCommandBuilder()
	  .setName('review')
	  .setDescription('Add, view, edit, list, or delete book reviews')
	  .addSubcommand(sub =>
		sub.setName('add')
		  .setDescription('Add a book review')
		  .addStringOption(opt => opt.setName('book').setDescription('Book title').setRequired(true))
		  .addStringOption(opt => opt.setName('author').setDescription('Author name').setRequired(true))
		  .addIntegerOption(opt => opt.setName('rating').setDescription('Rating (1-5)').setMinValue(1).setMaxValue(5).setRequired(true))
		  .addStringOption(opt => opt.setName('review').setDescription('Your review').setRequired(true))
	  )
	  .addSubcommand(sub =>
		sub.setName('book')
		  .setDescription('View reviews by book title')
		  .addStringOption(opt => opt.setName('book').setDescription('Book title').setRequired(true))
	  )
	  .addSubcommand(sub =>
		sub.setName('author')
		  .setDescription('View reviews by author')
		  .addStringOption(opt => opt.setName('author').setDescription('Author name').setRequired(true))
	  )
	  .addSubcommand(sub =>
		sub.setName('edit')
		  .setDescription('Edit your review')
		  .addStringOption(opt => opt.setName('book').setDescription('Book title').setRequired(true))
		  .addStringOption(opt => opt.setName('author').setDescription('Author name').setRequired(true))
		  .addStringOption(opt => opt.setName('review').setDescription('New review text').setRequired(false))
		  .addIntegerOption(opt => opt.setName('rating').setDescription('New rating (1-5)').setMinValue(1).setMaxValue(5).setRequired(false))
	  )
	  .addSubcommand(sub =>
		sub.setName('delete')
		  .setDescription('Delete your review')
		  .addStringOption(opt => opt.setName('book').setDescription('Book title').setRequired(true))
		  .addStringOption(opt => opt.setName('author').setDescription('Author name').setRequired(true))
	  )
	  .addSubcommand(sub =>
		sub.setName('view')
		  .setDescription('View reviews for a book (shortcut)')
		  .addStringOption(opt => opt.setName('book').setDescription('Book title').setRequired(true))
	  )
	  .addSubcommand(sub =>
		sub.setName('list')
		  .setDescription('List all reviews')
	  ),
  
	async execute(interaction) {
	  let reviews = loadReviews();
	  const sub = interaction.options.getSubcommand();
  
	  // ADD
	  if (sub === 'add') {
		const book = norm(interaction.options.getString('book'));
		const author = norm(interaction.options.getString('author'));
		const rating = interaction.options.getInteger('rating');
		const reviewText = interaction.options.getString('review').trim();
  
		if (reviews.find(r =>
		  r.userId === interaction.user.id &&
		  norm(r.book) === book &&
		  norm(r.author) === author
		)) {
		  return interaction.reply({ content: 'You already reviewed this book by this author. Use `/review edit` to update it.', ephemeral: true });
		}
  
		reviews.push({
		  userId: interaction.user.id,
		  username: interaction.user.username,
		  book: interaction.options.getString('book').trim(),
		  author: interaction.options.getString('author').trim(),
		  review: reviewText,
		  rating,
		  timestamp: Date.now()
		});
		saveReviews(reviews);
		return interaction.reply(`✅ Review for **${interaction.options.getString('book')}** by **${interaction.options.getString('author')}** added!`);
	  }
  
	  // BOOK or VIEW (shortcut)
	  if (sub === 'book' || sub === 'view') {
		const book = norm(interaction.options.getString('book'));
		const bookReviews = reviews.filter(r => norm(r.book) === book);
		if (bookReviews.length === 0)
		  return interaction.reply('No reviews found for that book.');
		const embed = new EmbedBuilder()
		  .setTitle(`Reviews for "${interaction.options.getString('book')}"`)
		  .setDescription(bookReviews.slice(0, 3).map(r =>
			`⭐ **${r.rating}** by **${r.username}**\n${r.review}\n*by ${r.author}*`
		  ).join('\n\n'))
		  .setFooter({ text: `${bookReviews.length} review(s) found.` });
		return interaction.reply({ embeds: [embed] });
	  }
  
	  // AUTHOR
	  if (sub === 'author') {
		const author = norm(interaction.options.getString('author'));
		const authorReviews = reviews.filter(r => norm(r.author) === author);
		if (authorReviews.length === 0)
		  return interaction.reply('No reviews found for that author.');
		const embed = new EmbedBuilder()
		  .setTitle(`Reviews for books by "${interaction.options.getString('author')}"`)
		  .setDescription(authorReviews.slice(0, 3).map(r =>
			`⭐ **${r.rating}** for "${r.book}" by **${r.username}**\n${r.review}`
		  ).join('\n\n'))
		  .setFooter({ text: `${authorReviews.length} review(s) found.` });
		return interaction.reply({ embeds: [embed] });
	  }
  
	  // EDIT
	  if (sub === 'edit') {
		const book = norm(interaction.options.getString('book'));
		const author = norm(interaction.options.getString('author'));
		const newReviewText = interaction.options.getString('review');
		const newRating = interaction.options.getInteger('rating');
		const idx = reviews.findIndex(r =>
		  r.userId === interaction.user.id &&
		  norm(r.book) === book &&
		  norm(r.author) === author
		);
		if (idx === -1)
		  return interaction.reply({ content: 'You have not reviewed this book by this author yet.', ephemeral: true });
		if (!newReviewText && !newRating)
		  return interaction.reply({ content: 'You must provide a new review or new rating.', ephemeral: true });
		if (newReviewText) reviews[idx].review = newReviewText.trim();
		if (newRating) reviews[idx].rating = newRating;
		reviews[idx].timestamp = Date.now();
		saveReviews(reviews);
		return interaction.reply('✅ Your review has been updated.');
	  }
  
	  // DELETE
	  if (sub === 'delete') {
		const book = norm(interaction.options.getString('book'));
		const author = norm(interaction.options.getString('author'));
		const idx = reviews.findIndex(r =>
		  r.userId === interaction.user.id &&
		  norm(r.book) === book &&
		  norm(r.author) === author
		);
		if (idx === -1)
		  return interaction.reply({ content: 'You have not reviewed this book by this author yet.', ephemeral: true });
		reviews.splice(idx, 1);
		saveReviews(reviews);
		return interaction.reply('✅ Your review has been deleted.');
	  }
  
	  // LIST ALL REVIEWS WITH BUTTON PAGINATION
	  if (sub === 'list') {
		if (reviews.length === 0)
		  return interaction.reply('No reviews have been added yet.');
  
		const perPage = 5;
		const totalPages = Math.ceil(reviews.length / perPage);
		let page = 1;
  
		const embed = createListEmbed(reviews, page, perPage);
		const row = createPaginationRow(page, totalPages);
  
		const reply = await interaction.reply({
		  embeds: [embed],
		  components: [row],
		  fetchReply: true,
		  ephemeral: false
		});
  
		if (totalPages === 1) return; // No need for buttons
  
		const collector = reply.createMessageComponentCollector({
		  componentType: ComponentType.Button,
		  time: 60 * 1000, // 1 minute
		  filter: i => i.user.id === interaction.user.id
		});
  
		collector.on('collect', async i => {
		  if (i.customId === 'prev' && page > 1) page--;
		  else if (i.customId === 'next' && page < totalPages) page++;
  
		  await i.update({
			embeds: [createListEmbed(reviews, page, perPage)],
			components: [createPaginationRow(page, totalPages)]
		  });
		});
  
		collector.on('end', async () => {
		  // Disable buttons after timeout
		  try {
			await reply.edit({
			  components: [createPaginationRow(page, totalPages).setComponents(
				...createPaginationRow(page, totalPages).components.map(b => b.setDisabled(true))
			  )]
			});
		  } catch (e) { /* message may have been deleted, ignore */ }
		});
		return;
	  }
	}
  };  