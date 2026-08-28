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
const {
  handleComponent: handleReminderComponent,
} = require("../handlers/reminderHandler");
const { agenda } = require("../index");

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    // --- ROLE PANEL ROUTER ---
    if (
      interaction.customId?.startsWith("rolepanel_button_") ||
      interaction.customId?.startsWith("rolepanel_select_")
    ) {
      console.log(
        `[interactionCreate] Routing to rolePanelHandler, customId: ${interaction.customId}`,
      );
      return handleRolePanelInteraction(interaction);
    }

    // --- VERIFY BUTTON LOGIC ---
    if (
      interaction.isButton() &&
      interaction.customId === "verify_panel_button"
    ) {
      return require("../handlers/verifyHandler").handleButton(interaction);
    }

    // --- APPEAL BUTTONS ---
    if (
      interaction.isButton() &&
      (interaction.customId?.startsWith("appeal_approve:") ||
        interaction.customId?.startsWith("appeal_deny:"))
    ) {
      return require("../handlers/appealHandler").handleAppealButton(interaction);
    }

    // --- HISTORY: view case button ---
    if (interaction.isButton() && interaction.customId?.startsWith("history_view_case:")) {
      return require("../handlers/historyHandler").handleViewCase(interaction);
    }

    // --- HISTORY: pagination ---
    if (interaction.isButton() && interaction.customId?.startsWith("history_page:")) {
      return require("../handlers/historyHandler").handleHistoryPage(interaction);
    }

    // --- CONFESSION BUTTON ---
    if (
      interaction.isButton() &&
      interaction.customId === "confession_open_modal"
    ) {
      return require("../handlers/confessionHandler").handleButton(interaction);
    }

    // --- CONFESSION REPLY BUTTON ---
    if (
      interaction.isButton() &&
      interaction.customId?.startsWith("confession_reply:")
    ) {
      return require("../handlers/confessionHandler").handleReplyButton(interaction);
    }

    // --- CONFESSION REPORT BUTTON ---
    if (
      interaction.isButton() &&
      interaction.customId?.startsWith("confession_report:")
    ) {
      return require("../handlers/confessionHandler").handleReportButton(interaction);
    }

    // --- CONFESSION APPROVE BUTTON (DM) ---
    if (
      interaction.isButton() &&
      interaction.customId?.startsWith("confession_approve:")
    ) {
      return require("../handlers/confessionHandler").handleApproveButton(interaction);
    }

    // --- CONFESSION DECLINE BUTTON (DM) ---
    if (
      interaction.isButton() &&
      interaction.customId?.startsWith("confession_decline:")
    ) {
      return require("../handlers/confessionHandler").handleDeclineButton(interaction);
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

    // --- CONFESSION MODAL ROUTER ---
    if (
      interaction.isModalSubmit() &&
      interaction.customId === "confession_submit"
    ) {
      return require("../handlers/confessionHandler").handleModalSubmit(
        interaction,
      );
    }

    // --- CONFESSION REPLY MODAL ROUTER ---
    if (
      interaction.isModalSubmit() &&
      interaction.customId?.startsWith("confession_reply_submit:")
    ) {
      return require("../handlers/confessionHandler").handleReplySubmit(interaction);
    }

    // --- CONFESSION REPORT MODAL ROUTER ---
    if (
      interaction.isModalSubmit() &&
      interaction.customId?.startsWith("confession_report_submit:")
    ) {
      return require("../handlers/confessionHandler").handleReportSubmit(interaction);
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

    // --- REMINDER COMPONENT ROUTER ---
    if (
      (interaction.isStringSelectMenu() || interaction.isButton()) &&
      interaction.customId?.startsWith("reminder-")
    ) {
      return handleReminderComponent(interaction, client);
    }

    // --- GITHUB FEED SELECT MENUS ---
    if (
      interaction.isStringSelectMenu() &&
      interaction.customId?.startsWith("github_unwatch:")
    ) {
      return require("../handlers/githubFeedHandler").handleUnwatchSelect(
        interaction,
      );
    }

    // --- LOG CONFIG: event type select ---
    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === "selectLogEvent"
    ) {
      return require("../handlers/logConfigHandler").handleEventSelect(
        interaction,
      );
    }

    // --- LOG CONFIG: channel select ---
    if (
      interaction.isChannelSelectMenu() &&
      interaction.customId === "selectLogChannel"
    ) {
      return require("../handlers/logConfigHandler").handleChannelSelect(
        interaction,
      );
    }

    // --- LOG CONFIG: disable event select ---
    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === "disableLogEvent"
    ) {
      return require("../handlers/logConfigHandler").handleDisableSelect(
        interaction,
      );
    }

    // --- AUTO THREAD LOGIC ---
    if (
      interaction.isChannelSelectMenu() &&
      interaction.customId === "autothread_channel_select"
    ) {
      return require("../handlers/autoThreadHandler").handleChannelSelect(
        interaction,
      );
    }

    // --- AUTOCOMPLETE HANDLER ---
    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command?.autocomplete) return;

      try {
        await command.autocomplete(interaction, agenda);
      } catch (error) {
        console.error(error);
      }
      return;
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
