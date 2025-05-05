const {
	SlashCommandBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
  } = require('discord.js');
  const BuddyReadAnnouncement = require('../models/BuddyReadAnnouncement');
  const BuddyReadSession = require('../models/BuddyReadSession');
  const BuddyReadMessage = require('../models/BuddyReadMessage');
  
  function normalizeBookTitle(book) {
	return book.trim().toLowerCase();
  }
  
  module.exports = {
	data: new SlashCommandBuilder()
	  .setName('buddyread')
	  .setDescription('BuddyRead commands')
	  // announce
	  .addSubcommand(sub =>
		sub.setName('announce')
		  .setDescription('Announce you want a buddy for a specific book!')
		  .addStringOption(option =>
			option.setName('book').setDescription('Book title').setRequired(true))
		  .addStringOption(option =>
			option.setName('audience').setDescription('Audience').setRequired(true)
			  .addChoices(
				{ name: 'All Ages', value: 'All Ages' },
				{ name: 'Teen/YA', value: 'Teen/YA' },
				{ name: 'Adult', value: 'Adult' },
				{ name: 'Mature', value: 'Mature' }
			  ))
		  .addStringOption(option =>
			option.setName('note').setDescription('Optional note').setRequired(false))
	  )
	  // announcements
	  .addSubcommand(sub =>
		sub.setName('announcements')
		  .setDescription('View all BuddyRead announcements (any server)')
	  )
	  // search
	  .addSubcommand(sub =>
		sub.setName('search')
		  .setDescription('Search for buddy read partners by book and audience (cross-server).')
		  .addStringOption(option =>
			option.setName('book').setDescription('Book title to search for').setRequired(true))
		  .addStringOption(option =>
			option.setName('audience').setDescription('Audience filter').setRequired(false)
			  .addChoices(
				{ name: 'All Ages', value: 'All Ages' },
				{ name: 'Teen/YA', value: 'Teen/YA' },
				{ name: 'Adult', value: 'Adult' },
				{ name: 'Mature', value: 'Mature' }
			  ))
	  )
	  // dm
	  .addSubcommand(sub =>
		sub.setName('dm')
		  .setDescription('Send a message to your buddy')
		  .addStringOption(option =>
			option.setName('message').setDescription('Message to send').setRequired(true))
		  .addStringOption(option =>
			option.setName('book').setDescription('Book title (if you have multiple sessions)').setRequired(false))
	  )
	  // messages
	  .addSubcommand(sub =>
		sub.setName('messages')
		  .setDescription('View your message history with your buddy')
		  .addStringOption(option =>
			option.setName('book').setDescription('Book title (if you have multiple sessions)').setRequired(false))
	  )
	  // sessions
	  .addSubcommand(sub =>
		sub.setName('sessions')
		  .setDescription('View all your BuddyRead sessions (active and past)')
	  )
	  // status
	  .addSubcommand(sub =>
		sub.setName('status')
		  .setDescription('Show the status of your active BuddyRead session(s)')
		  .addStringOption(option =>
			option.setName('book').setDescription('Book title (optional)').setRequired(false))
	  )
	  // finish
	  .addSubcommand(sub =>
		sub.setName('finish')
		  .setDescription('Mark a BuddyRead session as finished for both participants.')
		  .addStringOption(option =>
			option.setName('book').setDescription('Book title').setRequired(true))
	  )
	  // leave
	  .addSubcommand(sub =>
		sub.setName('leave')
		  .setDescription('Leave a BuddyRead session (the other user will be notified).')
		  .addStringOption(option =>
			option.setName('book').setDescription('Book title').setRequired(true))
	  )
	  // pair
	  .addSubcommand(sub =>
		sub.setName('pair')
		  .setDescription('Pair with a buddyread announcement by ID')
		  .addStringOption(opt =>
			opt.setName('id')
			  .setDescription('The unique announcement ID (first 6 chars shown in /buddyread announcements)')
			  .setRequired(true)
		  )
	  )
	  .addSubcommand(sub =>
		sub.setName('delete')
		  .setDescription('Delete one of your BuddyRead announcements by ID.')
		  .addStringOption(opt =>
			opt.setName('id')
			  .setDescription('The announcement ID to delete (see /buddyread announcements)')
			  .setRequired(true)
		  )
	  ),
  
	async execute(interaction) {
	  const sub = interaction.options.getSubcommand();
	  const authorTag = interaction.user.tag;
	  const authorIcon = interaction.user.displayAvatarURL();
	  const options = interaction.options;
  
	  function buildEmbed({ title, description, footer, ephemeral = false }) {
		const embed = new EmbedBuilder()
		  .setAuthor({ name: authorTag, iconURL: authorIcon })
		  .setColor(0xb399ff)
		  .setTitle(title)
		  .setDescription(description)
		  .setFooter({ text: footer })
		  .setTimestamp();
		return { embeds: [embed], ephemeral };
	  }
  
	  // ========== ANNOUNCE ==========
	  if (sub === 'announce') {
		const book = interaction.options.getString('book').trim();
		const audience = interaction.options.getString('audience');
		const note = interaction.options.getString('note') || '';
		const userId = interaction.user.id;
		const username = interaction.user.tag;
		const serverId = interaction.guild?.id || null;
		// FIND ONLY ANNOUNCEMENTS WITH STATUS "OPEN" OR "PAIRED" (TO PREVENT DUPLICATES)
		const existing = await BuddyReadAnnouncement.findOne({ userId, book });
		if (existing)
		  return interaction.reply(buildEmbed({
			title: '<:zmark:1368337664784470038> Announcement Already Exists!',
			description: 'You have already announced for this book!',
			footer: 'BuddyRead Announcement'
		  }));
  
		// SET STATUS TO "OPEN" ON CREATION
		const announcement = new BuddyReadAnnouncement({ userId, username, book, audience, note, serverId, status: 'open' }); // <-- ADDED status: 'open'
		await announcement.save();
		return interaction.reply(buildEmbed({
		  title: '<:bk4:1368587956364771349> New BuddyRead Announcement!',
		  description: `**${username}** is looking for a buddy to read **${book}**!\n**Audience:** ${audience}${note ? `\n**Note:** ${note}` : ''}`,
		  footer: 'Find your next reading partner!',
		  ephemeral: false
		}));
	  }
  
	  // ========== DELETE ANNOUNCEMENT =========
	  if (sub === 'delete') {
		const announcementId = options.getString('id');
		if (!announcementId)
		  return interaction.reply(buildEmbed({
			title: 'Missing Announcement ID',
			description: 'You must provide the announcement ID to delete.',
			footer: 'BuddyRead Announcement',
			color: 0xb399ff,
			ephemeral: true
		  }));
  
		if (!/^[0-9a-fA-F]{3,24}$/.test(announcementId)) {
		  return interaction.reply(buildEmbed({
			title: 'Invalid ID',
			description: 'Please provide a valid announcement ID (hex characters only).',
			footer: 'BuddyRead Announcement',
			color: 0xb399ff,
			ephemeral: true
		  }));
		}
  
		const allAnnouncements = await BuddyReadAnnouncement.find({ userId: interaction.user.id });
		const matches = allAnnouncements.filter(a => a._id.toString().startsWith(announcementId));
  
		if (matches.length === 0) {
		  return interaction.reply(buildEmbed({
			title: 'Announcement Not Found',
			description: 'No announcement found with that ID belonging to you.',
			footer: 'BuddyRead Announcement',
			color: 0xb399ff,
			ephemeral: true
		  }));
		}
  
		if (matches.length > 1) {
		  return interaction.reply(buildEmbed({
			title: 'Ambiguous ID',
			description: 'More than one announcement matches that ID. Please use more characters.',
			footer: 'BuddyRead Announcement',
			color: 0xb399ff,
			ephemeral: true
		  }));
		}
  
		await matches[0].deleteOne();
  
		return interaction.reply(buildEmbed({
		  title: 'Announcement Deleted',
		  description: `Your announcement for **${matches[0].book}** has been deleted.`,
		  footer: 'BuddyRead Announcement',
		  color: 0xb399ff,
		  ephemeral: true
		}));
	  }
  
	  // ========== SEARCH ==========
	  if (sub === 'search') {
		const book = interaction.options.getString('book').trim();
		const audience = interaction.options.getString('audience');
		const query = { book: new RegExp(book, 'i'), status: 'open' }; // <-- ONLY SHOW "OPEN" ANNOUNCEMENTS
		if (audience) query.audience = audience;
  
		const results = await BuddyReadAnnouncement.find(query);
  
		if (!results.length)
		  return interaction.reply(buildEmbed({
			title: '<a:noyes2:1339801001057849477> No Announcements Found',
			description: `No buddy read announcements found for **${book}**${audience ? ` (${audience})` : ''}.`,
			footer: 'Try another book or audience!'
		  }));
  
		const embed = new EmbedBuilder()
		  .setAuthor({ name: authorTag, iconURL: authorIcon })
		  .setTitle(`<:bk4:1368587956364771349> Buddy Read Announcements for "${book}"`)
		  .setColor(0xb399ff)
		  .setDescription(results.slice(0, 5).map((a, i) =>
			`**${i + 1}. ${a.username}**\nAudience: ${a.audience}${a.note ? `\n_Note: ${a.note}_` : ''}\n`
		  ).join('\n'))
		  .addFields(
			{ name: 'Important Info!', value: 'In order to pair you have to have the ID of the announcement for the book you searched if you find matches. Use `/buddyread announcements` to see the ID of the announcement for the book', inline: false }
		  )
		  .setFooter({ text: 'Use the `/buddyread pair` command to pair with a user!' })
		  .setTimestamp();
  
		return interaction.reply({ embeds: [embed], ephemeral: false });
	  }
  
	  // ========== ANNOUNCEMENTS ==========
	  if (sub === 'announcements') {
		// ONLY SHOW "OPEN" ANNOUNCEMENTS
		const announcements = await BuddyReadAnnouncement.find({ status: 'open' }) // <-- ONLY SHOW "OPEN"
		  .sort({ createdAt: -1, _id: -1 })
		  .limit(10);
  
		if (!announcements.length)
		  return interaction.reply(buildEmbed({
			title: '<:bk4:1368587956364771349> No Announcements Found',
			description: 'No BuddyRead announcements are currently posted!',
			footer: 'Be the first to announce!'
		  }));
  
		const embed = new EmbedBuilder()
		  .setAuthor({ name: authorTag, iconURL: authorIcon })
		  .setTitle('<:bk4:1368587956364771349> Recent BuddyRead Announcements')
		  .setColor(0xb399ff)
		  .setDescription(
			announcements.map((a, i) =>
			  `**${i + 1}. [ID: \`${a._id.toString().slice(0, 6)}\`] ${a.book}**\n` +
			  `**By:** ${a.username}\n**Audience:** ${a.audience}` +
			  (a.note ? `\n**Note:** ${a.note}` : '') +
			  `\n**Announced:** <t:${Math.floor(new Date(a.createdAt || a._id.getTimestamp()).getTime() / 1000)}:d>`
			).join('\n\n') +
			`\n\n*To pair with someone, use* \`/buddyread pair <ID>\` *with the ID shown above.*`
		  )
		  .setFooter({ text: 'Showing up to 10 most recent announcements.' })
		  .setTimestamp();
  
		return interaction.reply({
		  embeds: [embed],
		  ephemeral: false,
		});
	  }
  
	  // ========== DM ==========
	  if (sub === 'dm') {
		const messageContent = interaction.options.getString('message');
		const bookTitle = interaction.options.getString('book');
		const userId = interaction.user.id;
		const sessions = await BuddyReadSession.find({ status: 'active', 'participants.userId': userId });
		if (!sessions.length)
		  return interaction.reply(buildEmbed({
			title: '<a:noyes2:1339801001057849477> No Active Sessions',
			description: 'You are not in any active buddyread sessions.',
			footer: 'Start a session to send messages!'
		  }));
  
		let session;
		if (sessions.length === 1) session = sessions[0];
		else {
		  if (!bookTitle)
			return interaction.reply(buildEmbed({
			  title: '<:bk4:1368587956364771349> Multiple Sessions Found',
			  description: `You are in multiple buddyread sessions. Please specify the book with the \`book\` option.\n\n${sessions.map(s => `• ${s.book}`).join('\n')}`,
			  footer: 'Specify the book title!'
			}));
		  session = sessions.find(s => s.book.toLowerCase() === bookTitle.toLowerCase());
		  if (!session)
			return interaction.reply(buildEmbed({
			  title: '<a:noyes2:1339801001057849477> Session Not Found',
			  description: 'No session found with that book title.',
			  footer: 'Check your session list!'
			}));
		}
		const buddy = session.participants.find(p => p.userId !== userId);
		if (!buddy)
		  return interaction.reply(buildEmbed({
			title: '<a:noyes2:1339801001057849477> Buddy Not Found',
			description: 'Could not find your buddy for this session.',
			footer: 'Contact support if this is an error.'
		  }));
  
		await BuddyReadMessage.create({
		  sessionId: session._id,
		  senderId: userId,
		  senderTag: interaction.user.tag,
		  content: messageContent,
		  sentAt: new Date()
		});
  
		try {
		  const user = await interaction.client.users.fetch(buddy.userId);
  
		  const embed = new EmbedBuilder()
			.setColor(0xb399ff)
			.setTitle('<:zemail:1368337647554134067> BuddyRead Message')
			.setDescription(`**Book:** ${session.book}`)
			.addFields(
			  { name: `From ${interaction.user.tag}:`, value: messageContent }
			)
			.setTimestamp();
  
		  await user.send({ embeds: [embed] });
  
		  await interaction.reply(buildEmbed({
			title: '<a:noyes1:1339800615622152237> Message Sent!',
			description: 'Your message has been sent to your buddyread partner!',
			footer: 'Happy reading!'
		  }));
  
		} catch (err) {
		  await interaction.reply(buildEmbed({
			title: '<a:noyes2:1339801001057849477> Delivery Failed',
			description: 'Sorry, I could not deliver your message (maybe their DMs are closed).',
			footer: 'Try contacting them another way.'
		  }));
		}
		return;
	  }
  
	  // ========== MESSAGES ==========
	  if (sub === 'messages') {
		const bookTitle = interaction.options.getString('book');
		const userId = interaction.user.id;
		const sessions = await BuddyReadSession.find({ status: 'active', 'participants.userId': userId });
		if (!sessions.length)
		  return interaction.reply(buildEmbed({
			title: '<a:noyes2:1339801001057849477> No Active Sessions',
			description: 'You are not in any active buddyread sessions.',
			footer: 'Start a session to view messages!'
		  }));
  
		let session;
		if (sessions.length === 1) session = sessions[0];
		else {
		  if (!bookTitle)
			return interaction.reply(buildEmbed({
			  title: '<:bk4:1368587956364771349> Multiple Sessions Found',
			  description: `You are in multiple buddyread sessions. Please specify the book with the \`book\` option.\n\n${sessions.map(s => `• ${s.book}`).join('\n')}`,
			  footer: 'Specify the book title!'
			}));
		  session = sessions.find(s => s.book.toLowerCase() === bookTitle.toLowerCase());
		  if (!session)
			return interaction.reply(buildEmbed({
			  title: '<a:noyes2:1339801001057849477> Session Not Found',
			  description: 'No session found with that book title.',
			  footer: 'Check your session list!'
			}));
		}
		const messages = await BuddyReadMessage.find({ sessionId: session._id }).sort({ sentAt: 1 });
		if (!messages.length)
		  return interaction.reply(buildEmbed({
			title: '<a:noyes2:1339801001057849477> No Messages',
			description: 'No messages found for this buddyread session.',
			footer: 'Start a conversation!'
		  }));
  
		const history = messages.slice(-10).map(m => `**${m.senderTag}:** ${m.content} _(${m.sentAt.toLocaleString()})_`).join('\n');
		await interaction.reply(buildEmbed({
		  title: `<:zemail:1368337647554134067> BuddyRead Message History (${session.book})`,
		  description: history,
		  footer: 'Showing last 10 messages.'
		}));
		return;
	  }
  
	  // ========== SESSIONS ==========
	  if (sub === 'sessions') {
		const userId = interaction.user.id;
		const sessions = await BuddyReadSession.find({ 'participants.userId': userId }).sort({ startedAt: -1 });
		if (!sessions.length)
		  return interaction.reply(buildEmbed({
			title: '<:bk4:1368587956364771349> No Sessions Found',
			description: 'You are not in any BuddyRead sessions yet!',
			footer: 'Start a new session to begin!'
		  }));
  
		const embed = new EmbedBuilder()
		  .setAuthor({ name: authorTag, iconURL: authorIcon })
		  .setTitle('<:bk4:1368587956364771349> Your BuddyRead Sessions')
		  .setColor(0xb399ff)
		  .setDescription(
			sessions.map((s, i) => {
			  const buddy = s.participants.find(p => p.userId !== userId);
			  return `**${i + 1}. ${s.book}**\n**Buddy:** ${buddy ? buddy.username : 'N/A'}\n**Status:** ${s.status.charAt(0).toUpperCase() + s.status.slice(1)}\n**Started:** <t:${Math.floor(new Date(s.startedAt).getTime() / 1000)}:d>`;
			}).join('\n\n')
		  )
		  .setFooter({ text: 'All your buddyread adventures!' })
		  .setTimestamp();
		await interaction.reply({ embeds: [embed], ephemeral: false });
		return;
	  }
  
	  // ========== STATUS ==========
	  if (sub === 'status') {
		const userId = interaction.user.id;
		const book = interaction.options.getString('book');
		const query = { status: 'active', 'participants.userId': userId };
		if (book) query.book = new RegExp(`^${book}$`, 'i');
		const sessions = await BuddyReadSession.find(query);
		if (!sessions.length)
		  return interaction.reply(buildEmbed({
			title: '<:bk4:1368587956364771349> No Active Sessions',
			description: book ? `You have no active BuddyRead session for **${book}**.` : 'You have no active BuddyRead sessions.',
			footer: 'Start a new session to get reading!'
		  }));
  
		const embeds = sessions.map(session => {
		  const buddy = session.participants.find(p => p.userId !== userId);
		  return new EmbedBuilder()
			.setAuthor({ name: authorTag, iconURL: authorIcon })
			.setTitle(`<:bk4:1368587956364771349> BuddyRead: ${session.book}`)
			.setColor(0xb399ff)
			.addFields(
			  { name: 'Buddy', value: buddy ? buddy.username : 'N/A', inline: false },
			  { name: 'Audience', value: session.audience, inline: false },
			  { name: 'Status', value: session.status.charAt(0).toUpperCase() + session.status.slice(1), inline: false },
			  { name: 'Started', value: `<t:${Math.floor(new Date(session.startedAt).getTime() / 1000)}:d>`, inline: false }
			)
			.setFooter({ text: 'Session status overview' })
			.setTimestamp();
		});
		await interaction.reply({ embeds, ephemeral: false });
		return;
	  }
  
	  // ========== FINISH ==========
	  if (sub === 'finish') {
		const userId = interaction.user.id;
		const book = interaction.options.getString('book');
		const session = await BuddyReadSession.findOne({ status: 'active', 'participants.userId': userId, book: new RegExp(`^${book}$`, 'i') });
		if (!session)
		  return interaction.reply(buildEmbed({
			title: '<:bk4:1368587956364771349> Session Not Found',
			description: `No active BuddyRead session found for **${book}**.`,
			footer: 'Check your active sessions!'
		  }));
  
		session.status = 'finished';
		session.endedAt = new Date();
		await session.save();
		const buddy = session.participants.find(p => p.userId !== userId);
		if (buddy) {
		  try {
			const buddyUser = await interaction.client.users.fetch(buddy.userId);
			await buddyUser.send(`<a:noyes1:1339800615622152237> Your BuddyRead session for **${session.book}** has been marked as **finished** by your buddy (${interaction.user.tag}).`);
		  } catch (e) { }
		}
		await interaction.reply(buildEmbed({
		  title: '<:lbolt2:1307190732863311902> Session Finished!',
		  description: `Marked your BuddyRead session for **${session.book}** as finished!`,
		  footer: 'Congratulations on finishing your book!'
		}));
		return;
	  }
  
	  // ========== LEAVE ==========
	  if (sub === 'leave') {
		const userId = interaction.user.id;
		const book = interaction.options.getString('book');
		const session = await BuddyReadSession.findOne({ status: 'active', 'participants.userId': userId, book: new RegExp(`^${book}$`, 'i') });
		if (!session)
		  return interaction.reply(buildEmbed({
			title: '<:bk4:1368587956364771349> Session Not Found',
			description: `No active BuddyRead session found for **${book}**.`,
			footer: 'Check your active sessions!'
		  }));
  
		session.status = 'unmatched';
		session.endedAt = new Date();
		await session.save();
		const buddy = session.participants.find(p => p.userId !== userId);
  
		// RESTORE ORIGINAL ANNOUNCEMENT FOR THE USER WHO WAS LEFT UNMATCHED
		if (buddy) {
		  // FIND THE BUDDY'S ANNOUNCEMENT FOR THIS BOOK (SHOULD BE status: 'paired')
		  const buddyAnnouncement = await BuddyReadAnnouncement.findOne({
			userId: buddy.userId,
			book: session.book,
			status: 'paired'
		  });
		  if (buddyAnnouncement) {
			buddyAnnouncement.status = 'open'; // <-- RESTORE TO "OPEN"
			await buddyAnnouncement.save();
		  }
		  try {
			const buddyUser = await interaction.client.users.fetch(buddy.userId);
  
			const leftEmbed = new EmbedBuilder()
			  .setColor(0xb399ff)
			  .setTitle('<:stahp:1291858085127913514> Buddy Read Update')
			  .setDescription(`Your BuddyRead partner (${interaction.user.tag}) has **left** your session for **${session.book}**.\n\nThe session is now unmatched.`)
			  .setFooter({ text: 'You can start a new session anytime.' })
			  .setTimestamp();
  
			await buddyUser.send({ embeds: [leftEmbed] });
		  } catch (e) { }
		}
		await interaction.reply(buildEmbed({
		  title: '<:stahp:1291858085127913514> You Left the Session',
		  description: `You have left your BuddyRead session for **${session.book}**. Your buddy has been notified.`,
		  footer: 'We hope you join another session soon!'
		}));
		return;
	  }
  
	  // ========== PAIR ==========
	  if (sub === 'pair') {
		try {
		  const inputId = interaction.options.getString('id').trim();
		  // ONLY PAIR WITH "OPEN" ANNOUNCEMENTS
		  const announcements = await BuddyReadAnnouncement.find({ status: 'open' }); // <-- ONLY "OPEN"
		  const announcement = announcements.find(a => a._id.toString().startsWith(inputId));
		  if (!announcement)
			return interaction.reply({
			  content: `No announcement found with ID \`${inputId}\`.`,
			  ephemeral: true
			});
		  if (announcement.userId === interaction.user.id)
			return interaction.reply({
			  content: "You can't pair with your own announcement.",
			  ephemeral: true
			});
		  // Check for existing session for this book and these users
		  const existingSession = await BuddyReadSession.findOne({
			book: new RegExp(`^${announcement.book}$`, 'i'),
			'participants.userId': { $all: [announcement.userId, interaction.user.id] },
			status: 'active'
		  });
		  if (existingSession)
			return interaction.reply({
			  content: "You're already paired with this user for this book.",
			  ephemeral: true
			});
  
		  // Build session data
		  const sessionData = {
			book: announcement.book,
			book_normalized: normalizeBookTitle(announcement.book),
			audience: announcement.audience,
			participants: [
			  { userId: announcement.userId, username: announcement.username },
			  { userId: interaction.user.id, username: interaction.user.tag }
			],
			status: 'active'
		  };
		  if (interaction.guildId) {
			sessionData.serverId = interaction.guildId;
		  }
  
		  const session = new BuddyReadSession(sessionData);
		  await session.save();
  
		  // SET ANNOUNCEMENT STATUS TO "PAIRED" INSTEAD OF DELETING
		  announcement.status = 'paired'; // <-- SET TO "PAIRED"
		  await announcement.save();      // <-- SAVE IT
  
		  // DM both users (unchanged)
		  try {
			const announcer = await interaction.client.users.fetch(announcement.userId);
  
			const announcerEmbed = new EmbedBuilder()
			  .setColor(0xb399ff)
			  .setTitle('<:bk4:1368587956364771349> You have been paired for a buddy read!')
			  .addFields(
				{ name: 'Book', value: announcement.book, inline: false },
				{ name: 'With', value: interaction.user.tag, inline: false },
				{ name: 'Audience', value: announcement.audience, inline: false }
			  )
			  .setFooter({ text: 'Happy reading!' });
			if (announcement.note) {
			  announcerEmbed.addFields({ name: 'Note', value: announcement.note, inline: false });
			}
  
			const userEmbed = new EmbedBuilder()
			  .setColor(0xb399ff)
			  .setTitle('<:bk4:1368587956364771349> You have been paired for a buddy read!')
			  .addFields(
				{ name: 'Book', value: announcement.book, inline: false },
				{ name: 'With', value: announcement.username, inline: false },
				{ name: 'Audience', value: announcement.audience, inline: false }
			  )
			  .setFooter({ text: 'Happy reading!' });
			if (announcement.note) {
			  userEmbed.addFields({ name: 'Note', value: announcement.note, inline: false });
			}
  
			await announcer.send({ embeds: [announcerEmbed] });
			await interaction.user.send({ embeds: [userEmbed] });
  
		  } catch (e) {
			// Ignore DM error
		  }
		  // Confirm to the user WITH EMBED
		const confirmEmbed = new EmbedBuilder()
		.setColor(0xb399ff)
		.setTitle('<:bk4:1368587956364771349> Paired Successfully!')
		.setDescription(`You are now paired with **${announcement.username}** for **${announcement.book}**!\n\nBoth of you have been notified.`)
		.setFooter({ text: 'Happy reading!' })
		.setTimestamp();

		return interaction.reply({
		embeds: [confirmEmbed],
		ephemeral: true
		});
	}
	catch (err) {
		console.error('Error in /buddyread pair:', err);
		const errorEmbed = new EmbedBuilder()
		  .setColor(0xff3333)
		  .setTitle('<a:noyes2:1339801001057849477> Pairing Error')
		  .setDescription('An error occurred while pairing. Please contact an admin.')
		  .setTimestamp();
		return interaction.reply({
		  embeds: [errorEmbed],
		  ephemeral: true
		});
	  }
	}
  },
}