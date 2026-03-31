package com.email.writer.app;

import lombok.Data;
import java.util.List;

@Data
public class EmailAnalysis {
    private List<String> tasks;
    private List<EventDetail> events;

    @Data
    public static class EventDetail {
        private String title;
        private String date;
        private String time;
        private String location;
    }
}
