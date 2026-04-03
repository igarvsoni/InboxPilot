package com.inboxpilot.core;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.List;
import java.util.Map;

/**
 * Low-level HTTP client for the AI provider (Groq / OpenAI-compatible API).
 * Sends a user prompt and returns the assistant's reply as plain text.
 */
@Component
public class AiClient {

    private final WebClient http;
    private final ObjectMapper json = new ObjectMapper();

    // AI provider settings loaded from application.properties
    @Value("${ai.endpoint}")
    private String endpoint;

    @Value("${ai.token}")
    private String token;

    @Value("${ai.model}")
    private String model;

    public AiClient(WebClient.Builder builder) {
        this.http = builder.build();
    }

    /**
     * Sends an instruction to the AI model and returns the text reply.
     * Builds an OpenAI-compatible chat-completion request, posts it,
     * and extracts the assistant message from the response JSON.
     * Returns a human-readable error string on failure instead of throwing.
     */
    public String prompt(String instruction) {
        // Build the chat-completion request payload
        Map<String, Object> payload = Map.of(
            "model", model,
            "messages", List.of(Map.of("role", "user", "content", instruction))
        );

        try {
            // POST to the AI endpoint and block until response arrives
            String raw = http.post()
                .uri(endpoint)
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + token)
                .bodyValue(payload)
                .retrieve()
                .bodyToMono(String.class)
                .block();

            return parseReply(raw);
        } catch (WebClientResponseException ex) {
            // AI provider returned an HTTP error (401, 429, etc.)
            return "AI service error (" + ex.getStatusCode().value() + "): " + ex.getResponseBodyAsString();
        } catch (Exception ex) {
            // Network timeout, DNS failure, etc.
            return "Unable to reach AI service.";
        }
    }

    /**
     * Extracts the assistant message text from an OpenAI-format JSON response.
     * Also strips {@code <think>...</think>} blocks that reasoning models
     * like Qwen3 include for chain-of-thought output.
     */
    private String parseReply(String raw) {
        try {
            JsonNode root = json.readTree(raw);
            String text = root.path("choices").get(0)
                .path("message").path("content").asText();
            return text.replaceAll("(?s)<think>.*?</think>", "").trim();
        } catch (Exception ex) {
            return "Unable to process response.";
        }
    }
}
