package com.inboxpilot.core;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.Map;

/**
 * REST controller for Google Calendar integration:
 *   GET  /api/calendar/auth     — redirects to Google OAuth consent
 *   GET  /api/calendar/callback — handles OAuth redirect, stores tokens
 *   GET  /api/calendar/status   — returns whether the user is authenticated
 *   POST /api/calendar/event    — creates a single calendar event
 *   POST /api/calendar/events   — creates multiple calendar events at once
 */
@RestController
@RequestMapping("/api/calendar")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CalendarController {

    private final GoogleCalendarService calendar;

    /** Redirects the user to Google's OAuth consent screen. */
    @GetMapping("/auth")
    public ResponseEntity<Void> auth() {
        return ResponseEntity.status(302)
            .location(URI.create(calendar.getAuthUrl()))
            .build();
    }

    /** Google redirects here after consent. Exchanges code for tokens. */
    @GetMapping("/callback")
    public ResponseEntity<String> callback(@RequestParam("code") String code) {
        String error = calendar.exchangeCode(code);
        if (error != null) {
            return ResponseEntity.status(500).body(
                "<html><body style='font-family:sans-serif;text-align:center;padding:60px;background:#1e1b3a;color:#fff;'>"
                + "<h2>Failed to connect Google Calendar</h2>"
                + "<p style='color:#ff6b6b;'>" + error + "</p>"
                + "<p><a href='/api/calendar/auth' style='color:#7c6fff;'>Try again</a></p>"
                + "</body></html>"
            );
        }
        return ResponseEntity.ok(
            "<html><body style='font-family:sans-serif;text-align:center;padding:60px;background:#1e1b3a;color:#fff;'>"
            + "<h2>Google Calendar connected!</h2>"
            + "<p>You can close this tab and go back to InboxPilot.</p>"
            + "</body></html>"
        );
    }

    /** Returns auth status so the frontend/extension knows whether to show the auth button. */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Boolean>> status() {
        return ResponseEntity.ok(Map.of("authenticated", calendar.isAuthenticated()));
    }

    /** Creates a single calendar event from a meeting object. */
    @PostMapping("/event")
    public ResponseEntity<Map<String, String>> createEvent(@RequestBody MailInsights.CalendarEntry meeting) {
        String result = calendar.createEvent(meeting);
        return ResponseEntity.ok(Map.of("result", result));
    }

    /** Creates multiple calendar events at once. Returns a result per meeting. */
    @PostMapping("/events")
    public ResponseEntity<List<Map<String, String>>> createEvents(@RequestBody List<MailInsights.CalendarEntry> meetings) {
        List<Map<String, String>> results = meetings.stream()
            .map(m -> Map.of("name", m.getName() != null ? m.getName() : "Meeting", "result", calendar.createEvent(m)))
            .toList();
        return ResponseEntity.ok(results);
    }
}
