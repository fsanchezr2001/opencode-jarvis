package com.ejemplo.jarvis;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;

@Component
public class ProjectTools {

    private final Path root = Path.of(
            System.getenv().getOrDefault("PROJECT_PATH", "./src/main/java")).toAbsolutePath().normalize();

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            ".java", ".kt", ".xml", ".yml", ".yaml", ".properties", ".md", ".txt", ".json");

    @Tool(description = "Lista los archivos fuente del proyecto")
    public List<String> listSources() throws IOException {
        try (var paths = Files.walk(root)) {
            return paths.filter(Files::isRegularFile)
                    .filter(p -> ALLOWED_EXTENSIONS.stream().anyMatch(ext -> p.toString().endsWith(ext)))
                    .map(p -> root.relativize(p).toString())
                    .toList();
        }
    }

    @Tool(description = "Lee un archivo del proyecto por su ruta relativa")
    public String readSource(String path) throws IOException {
        if (path == null || path.isBlank()) {
            return "Ruta vacía";
        }
        Path target = root.resolve(path).normalize();
        if (!target.startsWith(root) || !Files.isRegularFile(target)) {
            return "Acceso denegado: la ruta está fuera del proyecto o no es un archivo permitido";
        }
        String name = target.getFileName().toString().toLowerCase();
        if (ALLOWED_EXTENSIONS.stream().noneMatch(name::endsWith)) {
            return "Extensión no permitida";
        }
        return Files.readString(target);
    }
}
