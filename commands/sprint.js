const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField,
} = require("discord.js");
const Sprint = require("../models/Sprint");
const Leaderboard = require("../models/Leaderboard");
const SprintConfig = require("../models/SprintConfig");
const SprintPingRole = require("../models/SprintPingRole");

// Helper: Get designated sprint channel (uses MongoDB now)
async function getSprintChannel(interaction) {
  if (!interaction.guild) return interaction.channel;
  const config = await SprintConfig.findOne({ guildId: interaction.guild.id });
  if (config) {
    const channel = interaction.guild.channels.cache.get(config.channelId);
    if (channel) return channel;
  }
  return interaction.channel;
}

// Helper: Find active sprint for this guild/DM
async function findActiveSprint(interaction) {
  const now = new Date();
  const query = interaction.guild
    ? { guildId: interaction.guild.id, active: true }
    : { guildId: null, channelId: interaction.channel.id, active: true };
  const sprint = await Sprint.findOne(query);
  if (sprint && sprint.endTime <= now) {
    sprint.active = false;
    await sprint.save();
    return null;
  }
  return sprint;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sprint")
    .setDescription("Reading sprint commands")
    .addSubcommand((sub) =>
      sub
        .setName("start")
        .setDescription("Start a new sprint")
        .addStringOption((opt) =>
          opt
            .setName("duration")
            .setDescription("Duration (e.g., 30m or 1h)")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("join")
        .setDescription("Join the current sprint")
        .addIntegerOption((opt) =>
          opt
            .setName("starting_pages")
            .setDescription("Your starting page number")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("finish")
        .setDescription("Submit your ending page for the sprint")
        .addIntegerOption((opt) =>
          opt
            .setName("ending_pages")
            .setDescription("Your ending page number")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("timeleft")
        .setDescription("See how much time is left in the sprint")
    )
    .addSubcommand((sub) =>
      sub
        .setName("end")
        .setDescription("Manually end the current sprint and show results")
    )
    .addSubcommand((sub) =>
      sub.setName("leaderboard").setDescription("Show the sprint leaderboard")
    )
    .addSubcommandGroup((group) =>
      group
        .setName("set")
        .setDescription("Sprint settings")
        .addSubcommand((sub) =>
          sub
            .setName("role")
            .setDescription(
              "Set the role to ping for sprint warnings and endings"
            )
            .addRoleOption((opt) =>
              opt
                .setName("role")
                .setDescription("The role to ping")
                .setRequired(true)
            )
        )
    ),

  async execute(interaction, agenda) {
    // /sprint set role
    if (
      interaction.options.getSubcommandGroup() === "set" &&
      interaction.options.getSubcommand() === "role"
    ) {
      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.ManageGuild
        )
      ) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("No Permission")
              .setDescription(
                "Only server managers can set the sprint ping role."
              )
              .setColor("#4ac4d7"),
          ],
          ephemeral: true,
        });
      }
      const role = interaction.options.getRole("role");
      await SprintPingRole.findOneAndUpdate(
        { guildId: interaction.guild.id },
        { roleId: role.id },
        { upsert: true }
      );
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Sprint Ping Role Set")
            .setDescription(`Sprint ping role set to ${role}`)
            .setColor("#4ac4d7"),
        ],
        ephemeral: true,
      });
    }

    const sub = interaction.options.getSubcommand();

    // /sprint start
    if (sub === "start") {
      const existing = await findActiveSprint(interaction);
      if (existing) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("Sprint Already Running")
              .setDescription(
                "A sprint is already active! Use `/sprint join` to participate."
              )
              .setColor("#4ac4d7"),
          ],
          ephemeral: true,
        });
      }

      const durationInput = interaction.options
        .getString("duration")
        .trim()
        .toLowerCase();
      let durationMinutes = 0;
      if (/^\d+\s*m(in)?$/.test(durationInput)) {
        durationMinutes = parseInt(durationInput);
      } else if (/^\d+\s*h(ours?)?$/.test(durationInput)) {
        durationMinutes = parseInt(durationInput) * 60;
      } else if (/^\d+$/.test(durationInput)) {
        durationMinutes = parseInt(durationInput);
      } else {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("Invalid Duration")
              .setDescription(
                "Please provide a valid duration (e.g., `30m` or `1h`)."
              )
              .setColor("#4ac4d7"),
          ],
          ephemeral: true,
        });
      }

      if (durationMinutes < 5 || durationMinutes > 120) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("Invalid Duration")
              .setDescription(
                "Sprint duration must be between 5 and 120 minutes."
              )
              .setColor("#4ac4d7"),
          ],
          ephemeral: true,
        });
      }

      // Create sprint in DB
      const sprint = await Sprint.create({
        guildId: interaction.guild ? interaction.guild.id : null,
        channelId: interaction.channel.id,
        active: true,
        duration: durationMinutes,
        endTime: new Date(Date.now() + durationMinutes * 60 * 1000),
        participants: [],
      });

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Sprint Started! <a:noyes1:1339800615622152237>")
            .setDescription(
              `A reading sprint has started for **${durationMinutes}** minutes!\nUse \`/sprint join\` to participate!`
            )
            .setColor("#4ac4d7"),
        ],
      });

      const now = new Date();
      const warningTime = new Date(
        Date.now() + (durationMinutes - 5) * 60 * 1000
      );
      const endTime = new Date(Date.now() + durationMinutes * 60 * 1000);

      console.log("Now:", now, "Local:", now.toLocaleString());
      console.log(
        "Warning will fire at:",
        warningTime,
        "Local:",
        warningTime.toLocaleString()
      );
      console.log(
        "End will fire at:",
        endTime,
        "Local:",
        endTime.toLocaleString()
      );

      // Schedule warning and finish using Agenda
      const sprintId = sprint._id.toString();
      if (durationMinutes > 5) {
        console.log("DEBUG schedule function:", typeof agenda.schedule);
        await agenda.schedule(
          new Date(Date.now() + (durationMinutes - 5) * 60 * 1000),
          "sprint-5min-warning",
          {
            sprintId,
            guildId: interaction.guild?.id,
            channelId: interaction.channel.id,
          }
        );
      }

      await agenda.schedule(
        new Date(Date.now() + durationMinutes * 60 * 1000),
        "sprint-end",
        {
          sprintId,
          guildId: interaction.guild?.id,
          channelId: interaction.channel.id,
        }
      );
      return;
    }

    // /sprint join
    if (sub === "join") {
      const sprint = await findActiveSprint(interaction);
      if (!sprint) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("No Active Sprint")
              .setDescription(
                "There is no active sprint to join. Start one with `/sprint start`!"
              )
              .setColor("#4ac4d7"),
          ],
          ephemeral: true,
        });
      }

      const userId = interaction.user.id;
      const startingPages = interaction.options.getInteger("starting_pages");

      if (sprint.participants.some((p) => p.userId === userId)) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("Already Joined")
              .setDescription("You have already joined this sprint!")
              .setColor("#4ac4d7"),
          ],
          ephemeral: true,
        });
      }

      sprint.participants.push({
        userId,
        username: interaction.user.username,
        startingPages,
        endingPages: null,
      });
      await sprint.save();

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Joined Sprint! <:xbuuke:1369320075126898748>")
            .setDescription(
              `You joined the sprint at page **${startingPages}**!`
            )
            .setColor("#4ac4d7"),
        ],
      });
    }

    // /sprint finish
    if (sub === "finish") {
      const sprint = await findActiveSprint(interaction);
      if (!sprint) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("No Active Sprint")
              .setDescription("There is no active sprint running.")
              .setColor("#4ac4d7"),
          ],
          ephemeral: true,
        });
      }
      const userId = interaction.user.id;
      const endingPages = interaction.options.getInteger("ending_pages");
      const participant = sprint.participants.find((p) => p.userId === userId);

      if (!participant) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("Not Joined")
              .setDescription(
                "You have not joined this sprint yet. Use `/sprint join` first!"
              )
              .setColor("#4ac4d7"),
          ],
          ephemeral: true,
        });
      }

      participant.endingPages = endingPages;
      await sprint.save();

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Sprint Finished! <a:zpopz:1366768293368827964>")
            .setDescription(
              `You finished the sprint at page **${endingPages}**!`
            )
            .setColor("#4ac4d7"),
        ],
      });
    }

    // /sprint timeleft
    if (sub === "timeleft") {
      const sprint = await findActiveSprint(interaction);
      if (!sprint) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("No Active Sprint")
              .setDescription("There is no active sprint running.")
              .setColor("#4ac4d7"),
          ],
          ephemeral: true,
        });
      }

      const msLeft = sprint.endTime - Date.now();
      if (msLeft <= 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("Sprint Ended")
              .setDescription("The sprint has just ended!")
              .setColor("#4ac4d7"),
          ],
        });
      }

      const totalSeconds = Math.floor(msLeft / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("<:zxblt:1370269490885034095> Sprint Time Left")
            .setDescription(
              `**${minutes}** minutes **${seconds}** seconds left!`
            )
            .setColor("#4ac4d7"),
        ],
      });
    }

    // /sprint end
    if (sub === "end") {
      if (
        interaction.guild &&
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        )
      ) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("No Permission")
              .setDescription("Only server admins can end the sprint early.")
              .setColor("#4ac4d7"),
          ],
          ephemeral: true,
        });
      }
      const sprint = await findActiveSprint(interaction);
      if (!sprint) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("No Active Sprint")
              .setDescription("There is no active sprint to end.")
              .setColor("#4ac4d7"),
          ],
          ephemeral: true,
        });
      }

      sprint.active = false;
      await sprint.save();

      // Update leaderboard
      for (const p of sprint.participants) {
        if (p.endingPages !== undefined && p.endingPages !== null) {
          const pagesRead = p.endingPages - p.startingPages;
          if (pagesRead > 0) {
            await Leaderboard.findOneAndUpdate(
              { userId: p.userId, guildId: interaction.guild.id },
              { $inc: { totalPages: pagesRead } },
              { upsert: true, new: true }
            );
          }
        }
      }

      // Build results message
      let results = "";
      if (sprint.participants.length === 0) {
        results = "No one joined this sprint!";
      } else {
        results = sprint.participants
          .map((p) => {
            if (p.endingPages !== undefined && p.endingPages !== null) {
              const pagesRead = p.endingPages - p.startingPages;
              return `<@${p.userId}>: ${p.startingPages} → ${p.endingPages} (**${pagesRead} pages**)`;
            } else {
              return `<@${p.userId}>: started at ${p.startingPages}, did not submit ending page.`;
            }
          })
          .join("\n");
      }

      const sprintChannel = await getSprintChannel(interaction);
      await sprintChannel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle("Sprint Ended Early! <a:zpopz:1366768293368827964>")
            .setDescription(
              `The reading sprint was ended manually!\n\n__**Results:**__\n${results}\n\nUse \`/sprint start\` to begin another.`
            )
            .setColor("#4ac4d7"),
        ],
      });

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#4ac4d7")
            .setDescription(
              "Sprint results posted in the designated sprint channel!"
            ),
        ],
        ephemeral: true,
      });
      return;
    }

    // /sprint leaderboard
    if (sub === "leaderboard") {
      const top = await Leaderboard.find({ guildId: interaction.guild.id }) // <-- ADD THIS FILTER
        .sort({ totalPages: -1 })
        .limit(10);

      if (!top.length) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("Sprint Leaderboard")
              .setDescription(
                `No one is on the leaderboard for **${interaction.guild.name}** yet! Join a sprint to get started.`
              ) // Maybe add server name?
              .setColor("#4ac4d7"),
          ],
        });
      }

      let desc = "";
      for (let i = 0; i < top.length; i++) {
        const entry = top[i];
        desc += `**${i + 1}.** <@${entry.userId}> — **${
          entry.totalPages
        }** pages\n`;
      }

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(
              `<:xbuuke:1369320075126898748> Sprint Leaderboard for ${interaction.guild.name}`
            ) // Add server name?
            .setDescription(desc)
            .setColor("#4ac4d7"),
        ],
      });
    }
  },
};
