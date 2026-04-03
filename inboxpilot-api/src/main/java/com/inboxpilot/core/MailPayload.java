package com.inboxpilot.core;

import lombok.Data;

/** Incoming request DTO — carries the email body and an optional reply tone. */
@Data
public class MailPayload {
    /** The raw email text to process. */
    private String body;
    /** Optional tone for reply generation (e.g. "professional", "casual"). */
    private String tone;
}
