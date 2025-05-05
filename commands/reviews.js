const {
	SlashCommandBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType
  } = require('discord.js');
  const Review = require('../models/Review.js'); // Adjust path as needed
  
  const norm = str => str.trim().toLowerCase();
  
  function truncateWords(text, wordLimit = 4) {
	const words = text.trim().split(/\s+/);
	if (words.length <= wordLimit) return text;
	return words.slice(0, wordLimit).join(' ') + '...';
  }
  
  function createListEmbed(reviews, page, perPage) {
	const totalPages = Math.ceil(reviews.length / perPage) || 1;
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
		  .setStyle(ButtonStyle.Secondary)
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
		`<:sprkstr2:1368587309733118014> **${r.rating}** — "${r.book}" by ${r.author}\nby **${r.username}**\n${r.review}`
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
		  .addStringOption(opt => opt.setName('review').setDescription('New review text').setRequired(true))
		  .addIntegerOption(opt => opt.setName('rating').setDescription('New rating (1-5)').setMinValue(1).setMaxValue(5).setRequired(true))
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
	  const sub = interaction.options.getSubcommand();
  
	  // ADD
	  if (sub === 'add') {
		const book = interaction.options.getString('book').trim();
		const author = interaction.options.getString('author').trim();
		const rating = interaction.options.getInteger('rating');
		const reviewText = interaction.options.getString('review').trim();
  
		// Check for existing review
		const exists = await Review.findOne({
		  userId: interaction.user.id,
		  book: new RegExp(`^${book}$`, 'i'),
		  author: new RegExp(`^${author}$`, 'i')
		});
  
		if (exists) {
		  return interaction.reply({
			embeds: [new EmbedBuilder().setColor('0b94b8').setDescription('You already reviewed this book by this author. Use `/review edit` to update it.')],
			ephemeral: false
		  });
		}
  
		const newReview = new Review({
		  userId: interaction.user.id,
		  username: interaction.user.username,
		  book,
		  author,
		  review: reviewText,
		  rating
		});
		await newReview.save();
  
		return interaction.reply({
		  embeds: [new EmbedBuilder().setColor('0b94b8').setDescription(`<a:zpyesno2:1368590432488915075> Review for **${book}** by **${author}** added!`)]
		});
	  }
  
	  // BOOK or VIEW
	  if (sub === 'book' || sub === 'view') {
		const book = interaction.options.getString('book').trim();
		const bookReviews = await Review.find({ book: new RegExp(`^${book}$`, 'i') }).sort({ timestamp: -1 }).lean();
		if (bookReviews.length === 0)
		  return interaction.reply({
			embeds: [new EmbedBuilder().setColor('0b94b8').setDescription('No reviews found for that book.')]
		  });
  
		const embed = new EmbedBuilder()
		  .setTitle(`Reviews for "${book}"`)
		  .setDescription(bookReviews.slice(0, 3).map((r, idx) =>
			`**${idx + 1}.** <:sprkstr2:1368587309733118014> **${r.rating}** by **${r.username}**\n${truncateWords(r.review, 4)}\n*by ${r.author}*`
		  ).join('\n\n'))
		  .setFooter({ text: `${bookReviews.length} review(s) found.` });
  
		// Add a row of "Show Full Review" buttons
		const row = new ActionRowBuilder();
		bookReviews.slice(0, 3).forEach((r, idx) => {
		  row.addComponents(
			new ButtonBuilder()
			  .setCustomId(`full_book_${r._id}`)
			  .setLabel('Show Full Review')
			  .setStyle(ButtonStyle.Secondary)
		  );
		});
  
		const reply = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
  
		const collector = reply.createMessageComponentCollector({
		  componentType: ComponentType.Button,
		  time: 60 * 1000,
		  filter: i => !i.user.bot
		});
  
		collector.on('collect', async i => {
		  if (i.customId.startsWith('full_book_')) {
			const id = i.customId.split('_')[2];
			const review = await Review.findById(id).lean();
			if (!review) return i.reply({ embeds: [new EmbedBuilder().setColor('0b94b8').setDescription('Review not found.')] });
			return i.reply({ embeds: [createReviewEmbedSingle(review, 0)] });
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
		const author = interaction.options.getString('author').trim();
		const authorReviews = await Review.find({ author: new RegExp(`^${author}$`, 'i') }).sort({ timestamp: -1 }).lean();
		if (authorReviews.length === 0)
		  return interaction.reply({
			embeds: [new EmbedBuilder().setColor('0b94b8').setDescription('No reviews found for that author.')]
		  });
  
		const embed = new EmbedBuilder()
		  .setTitle(`Reviews for books by "${author}"`)
		  .setDescription(authorReviews.slice(0, 3).map((r, idx) =>
			`**${idx + 1}.** <:sprkstr2:1368587309733118014> **${r.rating}** for "${r.book}" by **${r.username}**\n${truncateWords(r.review, 4)}`
		  ).join('\n\n'))
		  .setFooter({ text: `${authorReviews.length} review(s) found.` });
  
		// Add a row of "Show Full Review" buttons
		const row = new ActionRowBuilder();
		authorReviews.slice(0, 3).forEach((r, idx) => {
		  row.addComponents(
			new ButtonBuilder()
			  .setCustomId(`full_author_${r._id}`)
			  .setLabel('Show Full Review')
			  .setStyle(ButtonStyle.Secondary)
		  );
		});
  
		const reply = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
  
		const collector = reply.createMessageComponentCollector({
		  componentType: ComponentType.Button,
		  time: 60 * 1000,
		  filter: i => !i.user.bot
		});
  
		collector.on('collect', async i => {
		  if (i.customId.startsWith('full_author_')) {
			const id = i.customId.split('_')[2];
			const review = await Review.findById(id).lean();
			if (!review) return i.reply({ embeds: [new EmbedBuilder().setColor('0b94b8').setDescription('Review not found.')] });
			return i.reply({ embeds: [createReviewEmbedSingle(review, 0)] });
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
		const book = interaction.options.getString('book').trim();
		const author = interaction.options.getString('author').trim();
		const newReviewText = interaction.options.getString('review').trim();
		const newRating = interaction.options.getInteger('rating');
  
		// All fields required
		if (!newReviewText || !newRating) {
		  return interaction.reply({
			embeds: [new EmbedBuilder().setColor('0b94b8').setDescription('You must provide both a new review and new rating.')],
		  });
		}
  
		const review = await Review.findOne({
		  userId: interaction.user.id,
		  book: new RegExp(`^${book}$`, 'i'),
		  author: new RegExp(`^${author}$`, 'i')
		});
  
		if (!review) {
		  return interaction.reply({
			embeds: [new EmbedBuilder().setColor('0b94b8').setDescription('You have not reviewed this book by this author yet.')],
		  });
		}
  
		review.review = newReviewText;
		review.rating = newRating;
		review.timestamp = Date.now();
		await review.save();
  
		return interaction.reply({
		  embeds: [new EmbedBuilder().setColor('0b94b8').setDescription('<a:zpyesno2:1368590432488915075> Your review has been updated.')],
		});
	  }
  
	  // DELETE
	  if (sub === 'delete') {
		const book = interaction.options.getString('book').trim();
		const author = interaction.options.getString('author').trim();
  
		const review = await Review.findOneAndDelete({
		  userId: interaction.user.id,
		  book: new RegExp(`^${book}$`, 'i'),
		  author: new RegExp(`^${author}$`, 'i')
		});
  
		if (!review) {
		  return interaction.reply({
			embeds: [new EmbedBuilder().setColor('0b94b8').setDescription('You have not reviewed this book by this author yet.')],
		  });
		}
  
		return interaction.reply({
		  embeds: [new EmbedBuilder().setColor('0b94b8').setDescription('<a:zpyesno2:1368590432488915075> Your review has been deleted.')],
		});
	  }
  
	  // LIST ALL REVIEWS WITH BUTTON PAGINATION
	  if (sub === 'list') {
		const reviews = await Review.find().sort({ timestamp: -1 }).lean();
  
		if (reviews.length === 0)
		  return interaction.reply({
			embeds: [new EmbedBuilder().setColor('0b94b8').setDescription('No reviews have been added yet.')]
		  });
  
		const perPage = 5;
		const totalPages = Math.ceil(reviews.length / perPage) || 1;
		let page = 1;
  
		const embed = createListEmbed(reviews, page, perPage);
		const row = createPaginationRow(page, totalPages);
		const fullReviewRow = createFullReviewRow(reviews, page, perPage);
  
		const reply = await interaction.reply({
		  embeds: [embed],
		  components: [row, fullReviewRow],
		  fetchReply: true
		});
  
		const collector = reply.createMessageComponentCollector({
		  componentType: ComponentType.Button,
		  time: 60 * 1000,
		  filter: i => !i.user.bot
		});
  
		collector.on('collect', async i => {
		  if (i.customId === 'prev' && page > 1) page--;
		  else if (i.customId === 'next' && page < totalPages) page++;
		  else if (i.customId.startsWith('full_list_')) {
			const idx = parseInt(i.customId.split('_')[2]);
			const review = reviews[idx];
			if (!review) return i.reply({ embeds: [new EmbedBuilder().setColor('0b94b8').setDescription('Review not found.')] });
			return i.reply({ embeds: [createReviewEmbedSingle(review, idx)] });
		  }
  
		  // Update both paginated list and buttons
		  await i.update({
			embeds: [createListEmbed(reviews, page, perPage)],
			components: [createPaginationRow(page, totalPages), createFullReviewRow(reviews, page, perPage)]
		  });
		});
  
		collector.on('end', async () => {
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