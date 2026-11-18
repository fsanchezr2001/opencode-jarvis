package com.ejemplo.jarvis;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/jarvis")
public class JarvisController {

    private final ChatClient chat;

    public JarvisController(ChatClient chat) {
        this.chat = chat;
    }

    @PostMapping("/ask")
    public Map<String, String> ask(@RequestParam String q,
                                   @RequestParam(defaultValue = "default") String conversationId) {
        String answer = chat.prompt()
                .user(q)
                .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, conversationId))
                .call()
                .content();
        return Map.of("answer", answer);
    }
}
