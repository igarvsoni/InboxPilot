package com.inboxpilot.core;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Core business logic for InboxPilot.
 * Provides two capabilities:
 *   1. Generate an email reply using a specified tone.
 *   2. Extract action items and meeting details from an email.
 */
@Service
@RequiredArgsConstructor
public class InboxPilotService {

    private final AiClient ai;
    private final ObjectMapper json = new ObjectMapper();

    /**
     * Builds a prompt asking the AI to write an email reply, optionally
     * in a given tone, and returns the generated reply text.
     */
    public String craftReply(String mailBody, String tone) {
        StringBuilder instruction = new StringBuilder()
            .append("Write a reply to the email below. Only output the reply body, no subject line.");

        if (tone != null && !tone.isBlank()) {
            instruction.append(" Keep the tone ").append(tone).append(".");
        }

        instruction.append("\n\n---\n").append(mailBody);
        return ai.prompt(instruction.toString());
    }

    /**
     * Enhances a draft email — improves word choice, makes it more
     * compelling and professional while preserving the original intent.
     */
    public String enhanceMessage(String draft, String tone) {
        StringBuilder instruction = new StringBuilder()
            .append("Enhance the email draft below. Improve word choice, make it more compelling and impactful.")
            .append(" Add appropriate greetings and sign-offs if missing.")
            .append(" Make sentences more concise and professional.")
            .append(" Preserve the original intent and all key details.")
            .append(" Only output the enhanced email body, nothing else.");

        if (tone != null && !tone.isBlank()) {
            instruction.append(" Keep the tone ").append(tone).append(".");
        }

        instruction.append("\n\n---\n").append(draft);
        return ai.prompt(instruction.toString());
    }

    /**
     * Polishes a rough draft into a well-written email.
     * Preserves the original meaning and all details.
     */
    public String formatMessage(String draft, String tone) {
        StringBuilder instruction = new StringBuilder()
            .append("Polish the rough draft below into a well-written email.")
            .append(" Fix grammar, spelling, and punctuation. Improve clarity and flow.")
            .append(" Preserve the original meaning and all details.")
            .append(" Do not add a subject line or sign-off unless one is already present.")
            .append(" Only output the polished email body, nothing else.");

        if (tone != null && !tone.isBlank()) {
            instruction.append(" Keep the tone ").append(tone).append(".");
        }

        instruction.append("\n\n---\n").append(draft);
        return ai.prompt(instruction.toString());
    }

    /**
     * Sends the email body to the AI with a JSON-extraction prompt,
     * then parses the response into structured {@link MailInsights}.
     */
    public MailInsights extractInsights(String mailBody) {
        String instruction = """
            Read the email below. Return a JSON object with:
            - "actionItems": array of strings (things the recipient must do)
            - "meetings": array of objects with fields "name", "date", "time", "venue" (use null if unknown)

            Only output valid JSON, nothing else.

            ---
            """ + mailBody;

        String raw = ai.prompt(instruction);
        return toInsights(raw);
    }

    /**
     * Parses the AI's raw text response into a {@link MailInsights} object.
     * Locates the first JSON object in the string (the AI sometimes adds
     * extra text around it), then maps the fields to the DTO.
     * Returns empty lists on any parse failure.
     */
    private MailInsights toInsights(String raw) {
        MailInsights result = MailInsights.builder()
            .actionItems(new ArrayList<>())
            .meetings(new ArrayList<>())
            .build();

        try {
            // Isolate the JSON object from any surrounding text
            String trimmed = raw;
            int open = raw.indexOf('{');
            int close = raw.lastIndexOf('}');
            if (open >= 0 && close > open) {
                trimmed = raw.substring(open, close + 1);
            }

            JsonNode root = json.readTree(trimmed);

            // Parse action items array
            List<String> items = new ArrayList<>();
            root.path("actionItems").forEach(n -> items.add(n.asText()));
            result.setActionItems(items);

            // Parse meetings array into CalendarEntry objects
            List<MailInsights.CalendarEntry> meetings = new ArrayList<>();
            root.path("meetings").forEach(n -> {
                MailInsights.CalendarEntry entry = MailInsights.CalendarEntry.builder()
                    .name(n.path("name").asText(null))
                    .date(n.path("date").asText(null))
                    .time(n.path("time").asText(null))
                    .venue(n.path("venue").asText(null))
                    .build();
                meetings.add(entry);
            });
            result.setMeetings(meetings);
        } catch (Exception ignored) {
        }

        return result;
    }
}
