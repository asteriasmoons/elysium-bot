const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const tbrPath = './tbr.json';

function getTBRData() {
  if (!fs.existsSync(tbrPath)) return {};
  return JSON.parse(fs.readFileSync(tbrPath, 'utf8'));
}

function saveTBRData(data) {
  fs.writeFileSync(tbrPath, JSON.stringify(data, null, 2));
}

// Your custom emoji
const customEmoji= '<a:twirlystar2:1339802627810005042>';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tbr')
    .setDescription('Manage your To Be Read (TBR) list')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a book to your TBR list')
        .addStringOption(opt =>
          opt.setName('book')
            .setDescription('The book to add')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a book from your TBR list')
        .addStringOption(opt =>
          opt.setName('book')
            .setDescription('The book to remove')
            .setRequired(true)
        )
    )
	.addSubcommand(sub =>
		sub.setName('list')
		  .setDescription('Show your TBR list')
		  .addUserOption(option => 
			option.setName('user')
			  .setDescription('The user whose TBR list you want to view (optional)')
			  .setRequired(false)
		  )
	  ),
	  
	  async execute(interaction) {
		const tbrData = getTBRData();
		const customEmoji = '<:zts7:1343353133425885284>'; // Set your emoji here
	  
		// /tbr add
		if (interaction.options.getSubcommand() === 'add') {
		  const userId = interaction.user.id;
		  const book = interaction.options.getString('book').trim();
		  if (!tbrData[userId]) tbrData[userId] = [];
		  if (tbrData[userId].includes(book)) {
			return interaction.reply({
			  embeds: [
				new EmbedBuilder()
				  .setTitle('Already on TBR')
				  .setDescription(`"${book}" is already on your TBR list!`)
				  .setColor('#f1c40f')
			  ],
			});
		  }
		  tbrData[userId].push(book);
		  saveTBRData(tbrData);
		  return interaction.reply({
			embeds: [
			  new EmbedBuilder()
				.setTitle('Book Added!')
				.setDescription(`Added "${book}" to your TBR list.`)
				.setColor('#4ac4d7')
			],
		  });
		}
	  
		// /tbr remove
		if (interaction.options.getSubcommand() === 'remove') {
		  const userId = interaction.user.id;
		  const book = interaction.options.getString('book').trim();
		  if (!tbrData[userId] || !tbrData[userId].includes(book)) {
			return interaction.reply({
			  embeds: [
				new EmbedBuilder()
				  .setTitle('Book Not Found')
				  .setDescription(`"${book}" is not on your TBR list.`)
				  .setColor('#e74c3c')
			  ],
			});
		  }
		  tbrData[userId] = tbrData[userId].filter(b => b !== book);
		  saveTBRData(tbrData);
		  return interaction.reply({
			embeds: [
			  new EmbedBuilder()
				.setTitle('Book Removed')
				.setDescription(`Removed "${book}" from your TBR list.`)
				.setColor('#4ac4d7')
			],
		  });
		}
	  
		// /tbr list
		if (interaction.options.getSubcommand() === 'list') {
		  // Get the user to show the list for, or default to the command invoker
		  const user = interaction.options.getUser('user') || interaction.user;
		  const list = tbrData[user.id] || [];
	  
		  if (list.length === 0) {
			return interaction.reply({
			  embeds: [
				new EmbedBuilder()
				  .setTitle(`${user.username}'s TBR List`)
				  .setAuthor({
					name: user.username,
					iconURL: user.displayAvatarURL()
				  })
				  .setDescription(
					user.id === interaction.user.id
					  ? 'Your TBR list is empty! Add books with `/tbr add`.'
					  : 'Their TBR list is empty!'
				  )
				  .setColor('#4ac4d7')
			  ],
			});
		  }
	  
		  return interaction.reply({
			embeds: [
			  new EmbedBuilder()
				.setTitle(`${user.username}'s TBR List`)
				.setAuthor({
				  name: user.username,
				  iconURL: user.displayAvatarURL()
				})
				.setDescription(
				  list.map((b, i) => `${customEmoji} ${i + 1}. ${b}`).join('\n')
				)
				.setColor('#4ac4d7')
			],
		  });
		}
	}
}