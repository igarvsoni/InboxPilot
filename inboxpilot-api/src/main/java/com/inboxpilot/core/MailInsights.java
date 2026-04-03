package com.inboxpilot.core;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Response DTO for the /insights endpoint — holds extracted tasks and meetings. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MailInsights {
    /** Things the email recipient needs to do. */
    private List<String> actionItems;
    /** Meetings or events mentioned in the email. */
    private List<CalendarEntry> meetings;

    /** A single meeting/event extracted from the email. */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CalendarEntry {
        private String name;
        private String date;
        private String time;
        private String venue;
    }
}
