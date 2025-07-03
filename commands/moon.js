const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const moonCorrespondences = {
  "New Moon": {
    keywords: "Beginnings, intention-setting, rest",
    deity: "Hecate – Crossroads, transitions, new beginnings, magick, guiding through darkness.",
    description: "This is the beginning of the lunar cycle—a time to set intentions, dream, and plant new seeds. The energy is quiet and receptive, making it ideal for introspection, goal-setting, and fresh starts."
  },
  "Waxing Crescent": {
    keywords: "Growth, hope, motivation",
    deity: "Artemis – Growth, wild nature, youthful energy, independence, courage in pursuit.",
    description: "As the moon grows, so does your motivation; nurture your intentions with hope and gentle action. This phase is about taking the first steps and building momentum toward your goals."
  },
  "First Quarter": {
    keywords: "Action, challenges, commitment",
    deity: "Athena – Wisdom, strategic action, problem-solving, clarity, overcoming obstacles.",
    description: "Challenges may arise, asking you to make decisions and take bold action. Its a time for courage, problem-solving, and pushing through any resistance that stands in your way."
  },
  "Waxing Gibbous": {
    keywords: "Refinement, patience, analysis",
    deity: "Brigid – Inspiration, creativity, perseverance, preparation, refining intentions.",
    description: "Refinement is key—tweak your plans, review your progress, and prepare for the results you desire. The energy encourages perseverance, focus, and making the final adjustments before completion."
  },
  "Full Moon": {
    keywords: "Completion, illumination, celebration",
    deity: "Luna – Fullness, illumination, manifestation, intuition, heightened magick.",
    description: "The moon is at its brightest, amplifying clarity, power, and manifestation—this is the time to celebrate achievements and release whats come to fruition. Emotions run high, making it potent for magick, insight, and gratitude rituals."
  },
  "Waning Gibbous": {
    keywords: "Sharing, gratitude, introspection",
    deity: "Demeter – Harvest, gratitude, sharing, nurturing, reflection on abundance.",
    description: "The light begins to fade, supporting reflection, sharing, and giving thanks for what has been gained. Use this phase to express gratitude, teach, and pass on wisdom while you begin to let go of what you no longer need."
  },
  "Last Quarter": {
    keywords: "Release, forgiveness, transition",
    deity: "Kali – Release, destruction of obstacles, endings, transformation, fierce clearing.",
    description: "Now is the time for release, forgiveness, and breaking unhealthy patterns or habits. The energy supports clearing, closure, and tying up loose ends as you move toward renewal."
  },
  "Waning Crescent": {
    keywords: "Surrender, rest, closure",
    deity: "Cerridwen – Wisdom, transformation, deep rest, renewal, the cauldron of rebirth.",
    description: "Restoration and surrender take center stage—slow down, reflect, and make space for healing. This phase invites deep rest and preparation, gently clearing away the old before the next new moon begins."
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

      apiPhase = data.moon_phase || "Unknown Phase";
      phase = formatPhaseName(apiPhase); // Fix phase name
      illumination = data.moon_illumination || null;
      sign = data.moon_zodiac_sign || null;
    } catch (err) {
      console.error(err);
      return interaction.editReply("Sorry, I couldn't fetch the moon phase right now.");
    }

    const corr = moonCorrespondences[phase] || { keywords: "N/A", deity: "N/A", description: "No info available yet." };
    const fields = [
      { name: "Keywords", value: corr.keywords, inline: true },
      { name: "Deity", value: corr.deity, inline: true }
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