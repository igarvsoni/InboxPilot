package com.inboxpilot.core;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller exposing InboxPilot's two main features:
 *   POST /api/mail/reply    — generate an AI email reply
 *   POST /api/mail/insights — extract action items & meetings from an email
 *   POST /api/mail/format   — polish a rough draft into a well-written email
 *   POST /api/mail/enhance  — enhance a draft to be more compelling and professional
 */
@RestController
@RequestMapping("/api/mail")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ReplyController {

    private final InboxPilotService service;

    /** Accepts an email body + optional tone and returns a generated reply string. */
    @PostMapping("/reply")
    public ResponseEntity<String> reply(@RequestBody MailPayload payload) {
        String result = service.craftReply(payload.getBody(), payload.getTone());
        return ResponseEntity.ok(result);
    }

    /** Accepts an email body and returns structured action items & meeting details. */
    @PostMapping("/insights")
    public ResponseEntity<MailInsights> insights(@RequestBody MailPayload payload) {
        MailInsights result = service.extractInsights(payload.getBody());
        return ResponseEntity.ok(result);
    }

    /** Accepts a rough draft + optional tone and returns a polished version. */
    @PostMapping("/format")
    public ResponseEntity<String> format(@RequestBody MailPayload payload) {
        String result = service.formatMessage(payload.getBody(), payload.getTone());
        return ResponseEntity.ok(result);
    }

    /** Accepts a draft + optional tone and returns an enhanced, more compelling version. */
    @PostMapping("/enhance")
    public ResponseEntity<String> enhance(@RequestBody MailPayload payload) {
        String result = service.enhanceMessage(payload.getBody(), payload.getTone());
        return ResponseEntity.ok(result);
    }
}
