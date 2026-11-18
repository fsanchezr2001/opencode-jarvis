package com.ejemplo.jarvis;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@Component
public class ProjectTools {

    private final Path root = Path.of(
            System.getenv().getOrDefault("PROJECT_PATH", "./src/main/java"));

    @Tool(description = "Lista los archivos Java del proyecto")
    public List<String> listSources() throws IOException {
        try (var paths = Files.walk(root)) {
            return paths.filter(x -> x.toString().endsWith(".java"))
                    .map(Path::toString)
                    .toList();
        }
    }

    @Tool(description = "Lee un archivo del proyecto por su ruta relativa")
    public String readSource(String path) throws IOException {
        Path target = root.resolve(path).normalize();
        if (!target.startsWith(root)) {
            return "Acceso denegado: la ruta está fuera del proyecto";
        }
        return Files.readString(target);
    }
}
