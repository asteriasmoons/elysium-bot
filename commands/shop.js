const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ShopItem = require('../models/ShopItem');
const User = require('../models/User');
const UserInventory = require('../models/UserInventory');

const ADMIN_IDS = ['1202652142482231417']; // Replace with your Discord ID

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Shop for items using your XP!')
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View all shop items')
    )
    .addSubcommand(sub =>
      sub.setName('buy')
        .setDescription('Buy an item')
        .addStringOption(opt =>
          opt.setName('item')
            .setDescription('The name of the item to buy')
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('quantity')
            .setDescription('How many would you like to buy?')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a new item to the shop (admin only)')
        .addStringOption(opt =>
          opt.setName('name')
            .setDescription('Item name')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('description')
            .setDescription('Item description')
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('price')
            .setDescription('XP cost')
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('stock')
            .setDescription('Stock (leave blank for unlimited)')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('emoji')
            .setDescription('Emoji for the item')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove an item from the shop (admin only)')
        .addStringOption(opt =>
          opt.setName('item')
            .setDescription('The name of the item to remove')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('edit')
        .setDescription('Edit an item in the shop (admin only)')
        .addStringOption(opt =>
          opt.setName('item')
            .setDescription('The name of the item to edit')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('field')
            .setDescription('The field to edit (name, description, price, stock, emoji)')
            .setRequired(true)
            .addChoices(
              { name: 'name', value: 'name' },
              { name: 'description', value: 'description' },
              { name: 'price', value: 'price' },
              { name: 'stock', value: 'stock' },
              { name: 'emoji', value: 'emoji' }
            )
        )
        .addStringOption(opt =>
          opt.setName('value')
            .setDescription('The new value for the field')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('inventory')
        .setDescription('View your inventory')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    // /shop view
    if (sub === 'view') {
      const items = await ShopItem.find();
      if (!items.length) {
        return interaction.reply({ content: 'The shop is currently empty!', ephemeral: false });
      }
      const embed = new EmbedBuilder()
        .setTitle('Elysium Shop')
        .setColor(0x9370db)
        .setDescription(
          items.map(i =>
            `${i.emoji || ''} **${i.name}**\n${i.description}\nPrice: **${i.price} XP** | Stock: **${i.stock ?? 'Unlimited'}**`
          ).join('\n\n')
        );
      return interaction.reply({ embeds: [embed], ephemeral: false });
    }

    // /shop buy
    if (sub === 'buy') {
      const name = interaction.options.getString('item');
      const quantity = interaction.options.getInteger('quantity') || 1;

      if (quantity < 1) {
        return interaction.reply({ content: 'Quantity must be at least 1.', ephemeral: false });
      }

      const item = await ShopItem.findOne({ name: new RegExp(`^${name}$`, 'i') });
      if (!item) {
        return interaction.reply({ content: 'Item not found in the shop.', ephemeral: false });
      }

      if (item.stock !== null && item.stock < quantity) {
        return interaction.reply({ content: `Not enough stock. Only ${item.stock} left.`, ephemeral: false });
      }

      let user = await User.findOne({ userId });
      if (!user) {
        user = await User.create({ userId, xp: 0 });
      }

      const totalCost = item.price * quantity;
      if (user.xp < totalCost) {
        return interaction.reply({ content: `You need **${totalCost} XP** to buy ${quantity}x ${item.name}, but you only have **${user.xp} XP**.`, ephemeral: false });
      }

      // Deduct XP
      user.xp -= totalCost;
      await user.save();

	// In your shop.js, inside the /shop buy block, after deducting XP and before adding to inventory:
	 if (item.name.toLowerCase() === 'unlimited journal entries') {
  	 if (user.hasUnlimitedJournal) {
     return interaction.reply({ content: 'You already own unlimited journal entries!', ephemeral: false });
	}
  	  user.hasUnlimitedJournal = true;
  	  await user.save();
  	  // Optionally, don't add this to inventory since it's a permanent upgrade
  	  return interaction.reply({ content: 'You have unlocked unlimited journal entries!', ephemeral: false });
	}

      // Add to inventory
      let inventory = await UserInventory.findOne({ userId });
      if (!inventory) inventory = new UserInventory({ userId, items: [] });

      const invItem = inventory.items.find(i => i.itemId.equals(item._id));
      if (invItem) {
        invItem.quantity += quantity;
      } else {
        inventory.items.push({ itemId: item._id, quantity });
      }
      await inventory.save();

      // Decrement stock if not unlimited
      if (item.stock !== null) {
        item.stock -= quantity;
        await item.save();
      }

      return interaction.reply({ content: `You bought **${quantity}x ${item.emoji || ''} ${item.name}** for **${totalCost} XP**!`, ephemeral: false });
    }

    // /shop add (admin only)
    if (sub === 'add') {
      if (!ADMIN_IDS.includes(userId)) {
        return interaction.reply({ content: 'You do not have permission to add shop items.', ephemeral: false });
      }
      const name = interaction.options.getString('name');
      const description = interaction.options.getString('description');
      const price = interaction.options.getInteger('price');
      const stock = interaction.options.getInteger('stock');
      const emoji = interaction.options.getString('emoji') || '';

      // Check if item already exists
      const exists = await ShopItem.findOne({ name });
      if (exists) {
        return interaction.reply({ content: 'An item with that name already exists in the shop.', ephemeral: false });
      }

      await ShopItem.create({
        name,
        description,
        price,
        stock: stock ?? null,
        emoji
      });

      return interaction.reply({ content: `Added **${emoji ? emoji + ' ' : ''}${name}** to the shop!`, ephemeral: false });
    }

    // /shop remove (admin only)
    if (sub === 'remove') {
      if (!ADMIN_IDS.includes(userId)) {
        return interaction.reply({ content: 'You do not have permission to remove shop items.', ephemeral: false });
      }
      const name = interaction.options.getString('item');
      const item = await ShopItem.findOne({ name: new RegExp(`^${name}$`, 'i') });
      if (!item) {
        return interaction.reply({ content: 'Item not found in the shop.', ephemeral: false });
      }
      await ShopItem.deleteOne({ _id: item._id });
      return interaction.reply({ content: `Removed **${item.name}** from the shop.`, ephemeral: false });
    }

    // /shop edit (admin only)
    if (sub === 'edit') {
      if (!ADMIN_IDS.includes(userId)) {
        return interaction.reply({ content: 'You do not have permission to edit shop items.', ephemeral: false });
      }
      const name = interaction.options.getString('item');
      const field = interaction.options.getString('field');
      const value = interaction.options.getString('value');

      const item = await ShopItem.findOne({ name: new RegExp(`^${name}$`, 'i') });
      if (!item) {
        return interaction.reply({ content: 'Item not found in the shop.', ephemeral: false });
      }

      // Validate and update field
      if (field === 'price' || field === 'stock') {
        if (isNaN(Number(value))) {
          return interaction.reply({ content: `❌ \`${field}\` must be a number.`, ephemeral: false });
        }
        item[field] = Number(value);
      } else {
        item[field] = value;
      }

      await item.save();
      return interaction.reply({ content: `Updated **${field}** of **${item.name}** to **${value}**.`, ephemeral: false });
    }

    // /shop inventory
    if (sub === 'inventory') {
      let inventory = await UserInventory.findOne({ userId }).populate('items.itemId');
      if (!inventory || !inventory.items.length) {
        return interaction.reply({ content: 'Your inventory is empty.', ephemeral: false });
      }

      const itemLines = await Promise.all(inventory.items.map(async invItem => {
        // Populate item details
        let item = invItem.itemId;
        // If not populated, fetch manually
        if (!item.name) item = await ShopItem.findById(invItem.itemId);
        return `${item.emoji || ''} **${item.name}** x${invItem.quantity}`;
      }));

      const embed = new EmbedBuilder()
        .setTitle(`${interaction.user.username}'s Inventory`)
        .setColor(0x9370db)
        .setDescription(itemLines.join('\n'));

      return interaction.reply({ embeds: [embed], ephemeral: false });
    }
  }
};