package com.email.writer.app;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class EmailGeneratorService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${grok.api.url}")
    private String grokApiUrl;

    @Value("${grok.api.key}")
    private String grokApiKey;

    @Value("${grok.model}")
    private String grokModel;

    public EmailGeneratorService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    // ── Generate email reply ──────────────────────────────────────────────────

    public String generateEmailReply(EmailRequest emailRequest) {
        String prompt = buildReplyPrompt(emailRequest);
        return callGroq(prompt);
    }

    // ── Analyze email for tasks and events ───────────────────────────────────

    public EmailAnalysis analyzeEmail(String emailContent) {
        String prompt = "Analyze the following email and extract:\n"
            + "1. Any action items or tasks the recipient needs to do (as a JSON array of strings under key 'tasks')\n"
            + "2. Any events or meetings mentioned (as a JSON array under key 'events', each with fields: title, date, time, location — use null if not mentioned)\n\n"
            + "Respond ONLY with a valid JSON object in this exact format, no extra text:\n"
            + "{\n"
            + "  \"tasks\": [\"task1\", \"task2\"],\n"
            + "  \"events\": [{\"title\": \"...\", \"date\": \"...\", \"time\": \"...\", \"location\": \"...\"}]\n"
            + "}\n\n"
            + "Email:\n" + emailContent;

        String raw = callGroq(prompt);
        return parseAnalysis(raw);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String callGroq(String prompt) {
        Map<String, Object> requestBody = Map.of(
            "model", grokModel,
            "messages", List.of(
                Map.of("role", "user", "content", prompt)
            )
        );

        String response = webClient.post()
            .uri(grokApiUrl)
            .header("Content-Type", "application/json")
            .header("Authorization", "Bearer " + grokApiKey)
            .bodyValue(requestBody)
            .retrieve()
            .bodyToMono(String.class)
            .block();

        return extractResponseContent(response);
    }

    private String buildReplyPrompt(EmailRequest emailRequest) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("Generate a professional email reply for the following email content. ");
        prompt.append("Please don't add subject line in reply, only provide the body. ");

        if (emailRequest.getTone() != null && !emailRequest.getTone().isEmpty()) {
            prompt.append("Use a ").append(emailRequest.getTone()).append(" tone. ");
        }

        prompt.append("\nOriginal Email:\n").append(emailRequest.getEmailContent());
        return prompt.toString();
    }

    private String extractResponseContent(String response) {
        try {
            JsonNode root = objectMapper.readTree(response);
            String content = root.path("choices")
                .get(0)
                .path("message")
                .path("content")
                .asText();
            // Qwen3 includes <think>...</think> reasoning blocks — strip them
            return content.replaceAll("(?s)<think>.*?</think>", "").trim();
        } catch (Exception e) {
            return "Error parsing response: " + e.getMessage();
        }
    }

    private EmailAnalysis parseAnalysis(String raw) {
        EmailAnalysis analysis = new EmailAnalysis();
        analysis.setTasks(new ArrayList<>());
        analysis.setEvents(new ArrayList<>());
        try {
            // Extract JSON block from the response
            String json = raw;
            int start = raw.indexOf('{');
            int end = raw.lastIndexOf('}');
            if (start != -1 && end != -1) {
                json = raw.substring(start, end + 1);
            }
            JsonNode root = objectMapper.readTree(json);

            // Parse tasks
            List<String> tasks = new ArrayList<>();
            root.path("tasks").forEach(t -> tasks.add(t.asText()));
            analysis.setTasks(tasks);

            // Parse events
            List<EmailAnalysis.EventDetail> events = new ArrayList<>();
            root.path("events").forEach(e -> {
                EmailAnalysis.EventDetail event = new EmailAnalysis.EventDetail();
                event.setTitle(e.path("title").asText(null));
                event.setDate(e.path("date").asText(null));
                event.setTime(e.path("time").asText(null));
                event.setLocation(e.path("location").asText(null));
                events.add(event);
            });
            analysis.setEvents(events);

        } catch (Exception e) {
            // Return empty analysis on parse failure
        }
        return analysis;
    }
}
