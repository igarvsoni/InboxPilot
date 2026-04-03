package com.inboxpilot.core;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Handles Google OAuth 2.0 flow and creates events via the Google Calendar REST API.
 * Tokens are stored in memory (suitable for single-user dev use).
 */
@Service
public class GoogleCalendarService {

    private final WebClient http;
    private final ObjectMapper json = new ObjectMapper();

    @Value("${google.client.id}")
    private String clientId;

    @Value("${google.client.secret}")
    private String clientSecret;

    @Value("${google.redirect.uri}")
    private String redirectUri;

    private static final String AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
    private static final String TOKEN_URL = "https://oauth2.googleapis.com/token";
    private static final String CALENDAR_API = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
    private static final String SCOPE = "https://www.googleapis.com/auth/calendar.events";

    // In-memory token store (single user)
    private final ConcurrentHashMap<String, String> tokens = new ConcurrentHashMap<>();

    public GoogleCalendarService(WebClient.Builder builder) {
        this.http = builder.build();
    }

    /** Returns the Google OAuth consent URL the user should be redirected to. */
    public String getAuthUrl() {
        return AUTH_URL
            + "?client_id=" + encode(clientId)
            + "&redirect_uri=" + encode(redirectUri)
            + "&response_type=code"
            + "&scope=" + encode(SCOPE)
            + "&access_type=offline"
            + "&prompt=consent";
    }

    /** Exchanges the authorization code for access + refresh tokens. Returns null on success, error message on failure. */
    public String exchangeCode(String code) {
        String body = "code=" + encode(code)
            + "&client_id=" + encode(clientId)
            + "&client_secret=" + encode(clientSecret)
            + "&redirect_uri=" + encode(redirectUri)
            + "&grant_type=authorization_code";

        try {
            String response = http.post()
                .uri(TOKEN_URL)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .block();

            storeTokens(response);
            return null;
        } catch (WebClientResponseException ex) {
            return "Google token error (" + ex.getStatusCode().value() + "): " + ex.getResponseBodyAsString();
        } catch (Exception ex) {
            return "Token exchange failed: " + ex.getMessage();
        }
    }

    /** Refreshes the access token using the stored refresh token. */
    private void refreshAccessToken() {
        String refreshToken = tokens.get("refresh_token");
        if (refreshToken == null) throw new RuntimeException("Not authenticated");

        String body = "refresh_token=" + encode(refreshToken)
            + "&client_id=" + encode(clientId)
            + "&client_secret=" + encode(clientSecret)
            + "&grant_type=refresh_token";

        String response = http.post()
            .uri(TOKEN_URL)
            .header("Content-Type", "application/x-www-form-urlencoded")
            .bodyValue(body)
            .retrieve()
            .bodyToMono(String.class)
            .block();

        storeTokens(response);
    }

    private void storeTokens(String response) {
        try {
            JsonNode root = json.readTree(response);
            if (root.has("access_token")) tokens.put("access_token", root.get("access_token").asText());
            if (root.has("refresh_token")) tokens.put("refresh_token", root.get("refresh_token").asText());
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse token response");
        }
    }

    /** Returns true if we have a valid access token (or refresh token to get one). */
    public boolean isAuthenticated() {
        return tokens.containsKey("access_token") || tokens.containsKey("refresh_token");
    }

    /**
     * Creates a Google Calendar event from a meeting extracted by the AI.
     * Returns the event link on success or an error message on failure.
     */
    public String createEvent(MailInsights.CalendarEntry meeting) {
        if (!isAuthenticated()) return "Not authenticated. Please connect Google Calendar first.";

        String startDateTime = buildDateTime(meeting.getDate(), meeting.getTime());
        String endDateTime = buildEndDateTime(startDateTime);

        Map<String, Object> event = Map.of(
            "summary", meeting.getName() != null ? meeting.getName() : "Meeting",
            "location", meeting.getVenue() != null ? meeting.getVenue() : "",
            "start", Map.of("dateTime", startDateTime, "timeZone", "Asia/Kolkata"),
            "end", Map.of("dateTime", endDateTime, "timeZone", "Asia/Kolkata")
        );

        try {
            return postEvent(event);
        } catch (WebClientResponseException.Unauthorized e) {
            // Token expired — refresh and retry once
            refreshAccessToken();
            return postEvent(event);
        }
    }

    private String postEvent(Map<String, Object> event) {
        String response = http.post()
            .uri(CALENDAR_API)
            .header("Authorization", "Bearer " + tokens.get("access_token"))
            .header("Content-Type", "application/json")
            .bodyValue(event)
            .retrieve()
            .bodyToMono(String.class)
            .block();

        try {
            JsonNode root = json.readTree(response);
            return root.has("htmlLink") ? root.get("htmlLink").asText() : "Event created";
        } catch (Exception e) {
            return "Event created";
        }
    }

    // ── Date/time parsing helpers ───────────────────────────────────

    private String buildDateTime(String date, String time) {
        String isoDate = parseDate(date);
        String isoTime = parseTime(time);
        return isoDate + "T" + isoTime;
    }

    private String buildEndDateTime(String startDateTime) {
        // Add 1 hour to start time
        try {
            String timePart = startDateTime.substring(11);
            LocalTime t = LocalTime.parse(timePart);
            t = t.plusHours(1);
            return startDateTime.substring(0, 11) + t.format(DateTimeFormatter.ofPattern("HH:mm:ss"));
        } catch (Exception e) {
            return startDateTime;
        }
    }

    private String parseDate(String dateStr) {
        if (dateStr == null) return LocalDate.now().toString();

        // Try ISO format first (2026-04-05)
        try {
            return LocalDate.parse(dateStr).toString();
        } catch (DateTimeParseException ignored) {}

        // Try common formats
        String[] patterns = {"d MMMM yyyy", "d MMM yyyy", "MMM d, yyyy", "MMMM d, yyyy", "dd/MM/yyyy", "MM/dd/yyyy"};
        for (String p : patterns) {
            try {
                return LocalDate.parse(dateStr, DateTimeFormatter.ofPattern(p)).toString();
            } catch (DateTimeParseException ignored) {}
        }

        return LocalDate.now().toString();
    }

    private String parseTime(String timeStr) {
        if (timeStr == null) return "09:00:00";

        String normalized = timeStr.trim().toUpperCase();

        // 12-hour format: "3:30 PM", "3 PM"
        Pattern p12 = Pattern.compile("(\\d{1,2}):?(\\d{2})?\\s*(AM|PM)");
        Matcher m12 = p12.matcher(normalized);
        if (m12.find()) {
            int h = Integer.parseInt(m12.group(1));
            int m = m12.group(2) != null ? Integer.parseInt(m12.group(2)) : 0;
            if ("PM".equals(m12.group(3)) && h != 12) h += 12;
            if ("AM".equals(m12.group(3)) && h == 12) h = 0;
            return String.format("%02d:%02d:00", h, m);
        }

        // 24-hour format: "15:30"
        Pattern p24 = Pattern.compile("(\\d{1,2}):(\\d{2})");
        Matcher m24 = p24.matcher(normalized);
        if (m24.find()) {
            return String.format("%02d:%s:00", Integer.parseInt(m24.group(1)), m24.group(2));
        }

        return "09:00:00";
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
