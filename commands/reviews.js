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
  
  function truncateWords(text, wordLimit = 4) {
	const words = text.trim().split(/\s+/);
	if (words.length <= wordLimit) return text;
	return words.slice(0, wordLimit).join(' ') + '...';
  }
  
  function createListEmbed(reviews, page, perPage) {
	const totalPages = Math.ceil(reviews.length / perPage);
	const start = (page - 1) * perPage;
	const end = start + perPage;
	const pageReviews = reviews.slice(start, end);
  
	return new EmbedBuilder()
	  .setTitle(`All Book Reviews (Page ${page}/${totalPages})`)
	  .setDescription(pageReviews.map((r, i) =>
		`**${start + i + 1}.** ⭐ **${r.rating}** — "${r.book}" by ${r.author}\nby **${r.username}**\n${truncateWords(r.review, 4)}`
	  ).join('\n\n') || '*No reviews on this page.*')
	  .setFooter({ text: `Showing ${start + 1}-${Math.min(end, reviews.length)} of ${reviews.length} reviews.` });
  }
  
  function createFullReviewRow(reviews, page, perPage) {
	const start = (page - 1) * perPage;
	const end = start + perPage;
	const pageReviews = reviews.slice(start, end);
  
	const row = new ActionRowBuilder();
	pageReviews.forEach((r, i) => {
	  row.addComponents(
		new ButtonBuilder()
		  .setCustomId(`full_list_${start + i}`)
		  .setLabel('Show Full Review')
		  .setStyle(ButtonStyle.Secondary) // Grey button
	  );
	});
	return row;
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
  
  function createReviewEmbedSingle(r, idx) {
	return new EmbedBuilder()
	  .setTitle(`Full Review #${idx + 1}`)
	  .setDescription(
		`⭐ **${r.rating}** — "${r.book}" by ${r.author}\nby **${r.username}**\n${r.review}`
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
		  .setDescription(bookReviews.slice(0, 3).map((r, idx) =>
			`**${idx + 1}.** ⭐ **${r.rating}** by **${r.username}**\n${truncateWords(r.review, 4)}\n*by ${r.author}*`
		  ).join('\n\n'))
		  .setFooter({ text: `${bookReviews.length} review(s) found.` });
  
		// Add a row of "Show Full Review" buttons
		const row = new ActionRowBuilder();
		bookReviews.slice(0, 3).forEach((r, idx) => {
		  row.addComponents(
			new ButtonBuilder()
			  .setCustomId(`full_book_${reviews.indexOf(r)}`)
			  .setLabel('Show Full Review')
			  .setStyle(ButtonStyle.Secondary)
		  );
		});
  
		const reply = await interaction.reply({ embeds: [embed], components: [row] });
  
		const collector = reply.createMessageComponentCollector({
		  componentType: ComponentType.Button,
		  time: 60 * 1000,
		  filter: i => !i.user.bot
		});
  
		collector.on('collect', async i => {
		  if (i.customId.startsWith('full_book_')) {
			const idx = parseInt(i.customId.split('_')[2]);
			const review = reviews[idx];
			if (!review) return i.reply({ content: 'Review not found.', ephemeral: true });
			return i.reply({ embeds: [createReviewEmbedSingle(review, idx)], allowedMentions: { repliedUser: false } });
		  }
		});
  
		collector.on('end', async () => {
		  try {
			await reply.edit({
			  components: [
				new ActionRowBuilder().addComponents(
				  ...row.components.map(b => b.setDisabled(true))
				)
			  ]
			});
		  } catch (e) { }
		});
		return;
	  }
  
	  // AUTHOR
	  if (sub === 'author') {
		const author = norm(interaction.options.getString('author'));
		const authorReviews = reviews.filter(r => norm(r.author) === author);
		if (authorReviews.length === 0)
		  return interaction.reply('No reviews found for that author.');
		const embed = new EmbedBuilder()
		  .setTitle(`Reviews for books by "${interaction.options.getString('author')}"`)
		  .setDescription(authorReviews.slice(0, 3).map((r, idx) =>
			`**${idx + 1}.** ⭐ **${r.rating}** for "${r.book}" by **${r.username}**\n${truncateWords(r.review, 4)}`
		  ).join('\n\n'))
		  .setFooter({ text: `${authorReviews.length} review(s) found.` });
  
		// Add a row of "Show Full Review" buttons
		const row = new ActionRowBuilder();
		authorReviews.slice(0, 3).forEach((r, idx) => {
		  row.addComponents(
			new ButtonBuilder()
			  .setCustomId(`full_author_${reviews.indexOf(r)}`)
			  .setLabel('Show Full Review')
			  .setStyle(ButtonStyle.Secondary)
		  );
		});
  
		const reply = await interaction.reply({ embeds: [embed], components: [row] });
  
		const collector = reply.createMessageComponentCollector({
		  componentType: ComponentType.Button,
		  time: 60 * 1000,
		  filter: i => !i.user.bot
		});
  
		collector.on('collect', async i => {
		  if (i.customId.startsWith('full_author_')) {
			const idx = parseInt(i.customId.split('_')[2]);
			const review = reviews[idx];
			if (!review) return i.reply({ content: 'Review not found.', ephemeral: true });
			return i.reply({ embeds: [createReviewEmbedSingle(review, idx)], allowedMentions: { repliedUser: false } });
		  }
		});
  
		collector.on('end', async () => {
		  try {
			await reply.edit({
			  components: [
				new ActionRowBuilder().addComponents(
				  ...row.components.map(b => b.setDisabled(true))
				)
			  ]
			});
		  } catch (e) { }
		});
		return;
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
		const fullReviewRow = createFullReviewRow(reviews, page, perPage);
  
		const reply = await interaction.reply({
		  embeds: [embed],
		  components: [row, fullReviewRow],
		  fetchReply: true,
		  ephemeral: false
		});
  
		if (totalPages === 1) ; // No need for buttons
  
		const collector = reply.createMessageComponentCollector({
		  componentType: ComponentType.Button,
		  time: 60 * 1000, // 1 minute
		  filter: i => !i.user.bot
		});
  
		collector.on('collect', async i => {
		  if (i.customId === 'prev' && page > 1) page--;
		  else if (i.customId === 'next' && page < totalPages) page++;
		  else if (i.customId.startsWith('full_list_')) {
			const idx = parseInt(i.customId.split('_')[2]);
			const review = reviews[idx];
			if (!review) return i.reply({ content: 'Review not found.', ephemeral: true });
			return i.reply({ embeds: [createReviewEmbedSingle(review, idx)], allowedMentions: { repliedUser: false } });
		  }
  
		  // Update both paginated list and buttons
		  await i.update({
			embeds: [createListEmbed(reviews, page, perPage)],
			components: [createPaginationRow(page, totalPages), createFullReviewRow(reviews, page, perPage)]
		  });
		});
  
		collector.on('end', async () => {
		  // Disable buttons after timeout
		  try {
			await reply.edit({
			  components: [
				createPaginationRow(page, totalPages).setComponents(
				  ...createPaginationRow(page, totalPages).components.map(b => b.setDisabled(true))
				),
				createFullReviewRow(reviews, page, perPage).setComponents(
				  ...createFullReviewRow(reviews, page, perPage).components.map(b => b.setDisabled(true))
				)
			  ]
			});
		  } catch (e) { /* message may have been deleted, ignore */ }
		});
		return;
	  }
	}
  };  