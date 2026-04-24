const handleRolePanelInteraction = require("../handlers/rolePanelHandler");
const handleTbrPagination = require("../handlers/tbrPaginationHandler");
const handleJournalPagination = require("../handlers/journalPaginationHandler");
const handleHabitButtons = require("../handlers/habitButtonHandler");
const handleHabitFrequency = require("../handlers/habitFrequencyHandler");
const handleEmbedEditorButtons = require("../handlers/embedEditorButtonHandler");
const handleEmbedEditorModal = require("../handlers/embedEditorModalHandler");
const handleHabitCreateModal = require("../handlers/habitCreateModalHandler");
const handleEmbedQuickPreview = require("../handlers/embedQuickPreviewHandler");
const handleTicketPanelButtons = require("../handlers/ticketPanelButtonHandler");
const handleTicketOpen = require("../handlers/ticketOpenHandler");
const handleTicketControls = require("../handlers/ticketControlHandler");
const { agenda } = require("../index");

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    // --- ROLE PANEL ROUTER ---
    if (
      interaction.customId?.startsWith("rolepanel_button_") ||
      interaction.customId?.startsWith("rolepanel_select_")
    ) {
      return handleRolePanelInteraction(interaction);
    }

    // --- TBR PAGINATION ROUTER ---
    if (
      interaction.customId?.startsWith("tbr_prev_") ||
      interaction.customId?.startsWith("tbr_next_")
    ) {
      return handleTbrPagination(interaction);
    }
    
    // --- JOURNAL PAGINATION ROUTER ---
    if (interaction.customId?.startsWith("journal_")) {
      return handleJournalPagination(interaction);
    }

    // --- HABIT BUTTON ROUTER ---
    if (interaction.customId?.startsWith("habit_dm_")) {
      return handleHabitButtons(interaction);
    }

    // --- HABIT FREQUENCY ROUTER ---
    if (
      interaction.customId === "habit_frequency_daily" ||
      interaction.customId === "habit_frequency_weekly"
    ) {
      return handleHabitFrequency(interaction);
    }

    // --- EMBED EDITOR BUTTON ROUTER ---
    if (interaction.customId?.startsWith("embed_edit_")) {
      return handleEmbedEditorButtons(interaction);
    }

    // --- EMBED EDITOR MODAL ROUTER ---
    if (interaction.customId?.startsWith("embed_modal_")) {
      return handleEmbedEditorModal(interaction);
    }

    // --- HABIT CREATE MODAL ROUTER ---
    if (interaction.customId?.startsWith("habit_modal_create_")) {
      return handleHabitCreateModal(interaction, client);
    }

    // --- EMBEDQUICK PREVIEW ROUTER ---
    if (
      interaction.customId?.startsWith("eqsend:") ||
      interaction.customId?.startsWith("eqcancel:")
    ) {
      return handleEmbedQuickPreview(interaction);
    }

    // --- TICKET PANEL BUTTON ROUTER ---
    if (
      interaction.customId?.startsWith("ticketpanel_toggle_transcript:") ||
      interaction.customId?.startsWith("ticketpanel_publish_preview:") ||
      interaction.customId?.startsWith("ticketpanel_edit_greeting_embed:") ||
      interaction.customId?.startsWith("greeting_edit_embed_basic:") ||
      interaction.customId?.startsWith("greeting_edit_embed_author:") ||
      interaction.customId?.startsWith("greeting_edit_embed_footer:") ||
      interaction.customId?.startsWith("greeting_edit_embed_images:") ||
      interaction.customId?.startsWith("ticketpanel_edit_embed_basic:") ||
      interaction.customId?.startsWith("ticketpanel_edit_embed_author:") ||
      interaction.customId?.startsWith("ticketpanel_edit_embed_footer:") ||
      interaction.customId?.startsWith("ticketpanel_edit_embed_images:") ||
      interaction.customId?.startsWith("ticketpanel_set_emoji:")
    ) {
      return handleTicketPanelButtons(interaction);
    }

    // --- TICKET OPEN ROUTER ---
    if (
      interaction.customId?.startsWith("open_ticket_modal:") ||
      interaction.customId?.startsWith("ticket_modal_submit:")
    ) {
      return handleTicketOpen(interaction);
    }

    // --- TICKET CONTROL ROUTER ---
    if (
      interaction.customId === "ticket_claim" ||
      interaction.customId === "ticket_close" ||
      interaction.customId === "ticket_close_cancel" ||
      interaction.customId === "ticket_close_confirm" ||
      interaction.customId === "ticket_delete" ||
      interaction.customId === "ticket_delete_confirm" ||
      interaction.customId === "ticket_delete_cancel" ||
      interaction.customId === "ticket_close_reason_modal"
    ) {
      return handleTicketControls(interaction);
    }

    // --- SLASH COMMAND HANDLER ---
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction, agenda);
      } catch (error) {
        console.error(error);
        // Prevent double reply/edit and avoid "Unknown interaction" error
        try {
          if (interaction.deferred || interaction.replied) {
            await interaction.editReply({
              content: "There was an error executing this command!",
              ephemeral: true,
            });
          } else {
            await interaction.reply({
              content: "There was an error executing this command!",
              ephemeral: true,
            });
          }
        } catch (err) {
          // If the interaction is already expired, just log the error.
          console.error("Failed to reply to interaction:", err);
        }
      }
    }
  },
};
