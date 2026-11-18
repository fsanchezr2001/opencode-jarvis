package com.ejemplo.jarvis;

import jakarta.annotation.PostConstruct;
import org.springframework.ai.document.Document;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

@Service
public class ProjectIndexer {

    private final VectorStore store;

    public ProjectIndexer(VectorStore store) {
        this.store = store;
    }

    @PostConstruct
    public void index() throws IOException {
        Path root = Path.of(System.getenv().getOrDefault("PROJECT_PATH", "./src/main/java"));
        List<Document> docs = new ArrayList<>();

        try (var paths = Files.walk(root)) {
            for (Path p : paths.filter(x -> x.toString().endsWith(".java")).toList()) {
                docs.add(Document.builder()
                        .text(Files.readString(p))
                        .metadata("file", p.toString())
                        .build());
            }
        }

        if (!docs.isEmpty()) {
            store.add(new TokenTextSplitter().split(docs));
        }
    }
}
