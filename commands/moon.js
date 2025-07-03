// commands/moon.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// Customize this with your own phase descriptions!
const moonCorrespondences = {
  "New Moon": {
    keywords: "Beginnings, intention-setting, rest",
    description: "A time for reflection, rest, and planting seeds for new projects."
  },
  "Waxing Crescent": {
    keywords: "Growth, hope, motivation",
    description: "Energy is building. Focus on nurturing your intentions."
  },
  "First Quarter": {
    keywords: "Action, challenges, commitment",
    description: "Take decisive action and push through obstacles. Trust your momentum."
  },
  "Waxing Gibbous": {
    keywords: "Refinement, patience, analysis",
    description: "Review your progress, make adjustments, and prepare for fruition."
  },
  "Full Moon": {
    keywords: "Completion, illumination, celebration",
    description: "Energy peaks—celebrate achievements and let go of what's not serving you."
  },
  "Waning Gibbous": {
    keywords: "Sharing, gratitude, introspection",
    description: "Share wisdom, express gratitude, and reflect on your journey."
  },
  "Last Quarter": {
    keywords: "Release, forgiveness, transition",
    description: "Let go of the old, forgive, and prepare for renewal."
  },
  "Waning Crescent": {
    keywords: "Surrender, rest, closure",
    description: "Rest, restore, and surrender before the cycle begins anew."
  },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moon')
    .setDescription('See the current moon phase and magical correspondences!'),
  async execute(interaction) {
    await interaction.deferReply();

    const API_KEY = '4d77e67a4ba44616b9e8e6d1109d8824'; // Paste your key here!
    const location = 'Chicago'; // You can let users choose later if you want
    const url = `https://api.ipgeolocation.io/astronomy?apiKey=${API_KEY}&location=${encodeURIComponent(location)}`;

    let phase, illumination, sign;
    try {
      const res = await fetch(url);
      const data = await res.json();

      phase = data.moon_phase || "Unknown Phase";
      illumination = data.moon_illumination || null;
      sign = data.moon_zodiac_sign || null;
    } catch (err) {
      console.error(err);
      return interaction.editReply("Sorry, I couldn't fetch the moon phase right now.");
    }

    const corr = moonCorrespondences[phase] || { keywords: "N/A", description: "No info available yet." };

    const embed = new EmbedBuilder()
      .setTitle(`${phase}`)
      .setDescription(corr.description)
      .addFields(
        { name: "Keywords", value: corr.keywords, inline: false },
        illumination ? { name: "Illumination", value: `${illumination}%`, inline: false } : null,
        sign ? { name: "Zodiac Sign", value: sign, inline: false } : null
      )
      .setColor(0x6a0dad)
      .setFooter({ text: "Magical Moon Insights by Elysium" });

    await interaction.editReply({ embeds: [embed] });
  },
};