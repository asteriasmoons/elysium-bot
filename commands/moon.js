const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const moonCorrespondences = {
  "New Moon": {
    keywords: "Beginnings, intention-setting, rest",
    description: "This is the beginning of the lunar cycle—a time to set intentions, dream, and plant new seeds. The energy is quiet and receptive, making it ideal for introspection, goal-setting, and fresh starts."
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

function formatPhaseName(apiPhase) {
  // "FIRST_QUARTER" -> "First Quarter"
  return apiPhase
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moon')
    .setDescription('See the current moon phase and magical correspondences!'),
  async execute(interaction) {
    await interaction.deferReply();

    const API_KEY = '4d77e67a4ba44616b9e8e6d1109d8824';
    const location = 'Chicago';
    const url = `https://api.ipgeolocation.io/astronomy?apiKey=${API_KEY}&location=${encodeURIComponent(location)}`;

    let apiPhase, phase, illumination, sign;
    try {
      const res = await fetch(url);
      const data = await res.json();

      // Log the data for debugging!
      // console.log(data);

      apiPhase = data.moon_phase || "Unknown Phase";
      phase = formatPhaseName(apiPhase); // Fix phase name
      illumination = data.moon_illumination || null;
      sign = data.moon_zodiac_sign || null;
    } catch (err) {
      console.error(err);
      return interaction.editReply("Sorry, I couldn't fetch the moon phase right now.");
    }

    const corr = moonCorrespondences[phase] || { keywords: "N/A", description: "No info available yet." };
    const fields = [
      { name: "Keywords", value: corr.keywords, inline: true }
    ];
    if (illumination) {
      fields.push({ name: "Illumination", value: `${illumination}%`, inline: true });
    }
    if (sign) {
      fields.push({ name: "Zodiac Sign", value: sign, inline: true });
    }

    const embed = new EmbedBuilder()
      .setTitle(`${phase}`)
      .setDescription(corr.description)
      .addFields(fields)
      .setColor(0x6a0dad)
      .setFooter({ text: "Magical Moon Insights by Elysium" });

    await interaction.editReply({ embeds: [embed] });
  },
};