# AGENTS.md — Jarvis (Spring Boot + Gemini + RAG)

Guía completa para replicar/implementar este proyecto en otro repositorio.

## 1. Descripción

Asistente privado (J.A.R.V.I.S.) para un proyecto Java. Combina:
- **RAG**: indexa el código del proyecto en un vector store al arrancar.
- **Tools restringidas**: lectura de archivos dentro de `PROJECT_PATH`.
- **Memoria conversacional** por `conversationId`.
- **UI web con voz** (Web Speech API) servida por la propia app.
- **Seguridad**: HTTP Basic para `/jarvis/**`.

Gemini es cloud: prompt/contexto/embeddings se envían a Google. Para privacidad total, sustituir por Ollama.

## 2. Stack

- Java 17
- Spring Boot 3.5.15
- Spring AI 1.1.8 (starter Google GenAI chat + embedding)
- Spring Security (HTTP Basic)
- Maven 3.9+
- Frontend: HTML/CSS/JS vanilla + Canvas (sin framework)

## 3. Estructura de archivos

```
jarvis/
├── pom.xml
├── Dockerfile
├── docker-compose.yml
├── AGENTS.md
├── GUIA_JARVIS_SPRING_BOOT.md
├── env.example                 # plantilla de variables (sin secretos)
├── env.local.ps1               # secretos locales (gitignored)
├── .gitignore
└── src/main/
    ├── java/com/ejemplo/jarvis/
    │   ├── JarvisApplication.java      # @SpringBootApplication
    │   ├── JarvisConfig.java           # beans: VectorStore, ChatMemory, ChatClient
    │   ├── ProjectIndexer.java         # @PostConstruct indexa fuentes
    │   ├── ProjectTools.java           # @Tool listSources / readSource
    │   ├── JarvisController.java       # POST /jarvis/ask
    │   └── SecurityConfig.java         # SecurityFilterChain
    └── resources/
        ├── application.yml
        └── static/
            ├── index.html
            ├── jarvis.css
            └── jarvis.js
```

## 4. Dependencias (pom.xml)

```xml
<parent>spring-boot-starter-parent 3.5.15</parent>
<properties><java.version>17</java.version></properties>

<dependencyManagement>
  spring-ai-bom 1.1.8
</dependencyManagement>

<dependencies>
  spring-ai-starter-model-google-genai
  spring-ai-starter-model-google-genai-embedding
  spring-ai-advisors-vector-store
  spring-boot-starter-web
  spring-boot-starter-security
</dependencies>
```

## 5. Configuración

### application.yml
```yaml
spring:
  ai:
    google:
      genai:
        api-key: ${GEMINI_API_KEY}
        chat:
          options:
            model: gemini-3.5-flash-lite
        embedding:
          api-key: ${GEMINI_API_KEY}
          text:
            options:
              model: gemini-embedding-001
  security:
    user:
      name: jarvis
      password: ${JARVIS_PASSWORD}
server:
  port: 8080
```

### Variables de entorno
| Variable | Descripción |
|---|---|
| `GEMINI_API_KEY` | API key de Google AI Studio |
| `JARVIS_PASSWORD` | Contraseña HTTP Basic del usuario `jarvis` |
| `PROJECT_PATH` | Ruta absoluta al código a indexar (default `./src/main/java`) |

### .gitignore mínimo
```
target/
*.class
.env
env.local.ps1
.idea/
*.iml
```

## 6. Código clave

### JarvisApplication
```java
@SpringBootApplication
public class JarvisApplication {
  public static void main(String[] args) { SpringApplication.run(JarvisApplication.class, args); }
}
```

### JarvisConfig
- `VectorStore`: `SimpleVectorStore.builder(embeddingModel).build()`
- `ChatMemory`: `MessageWindowChatMemory` (max 20 mensajes, InMemory repo)
- `ChatClient`: system prompt restrictivo + advisors (QuestionAnswerAdvisor + MessageChatMemoryAdvisor) + tools

### ProjectIndexer
- `@PostConstruct index()`: camina `PROJECT_PATH`, filtra archivos regulares `.java`/`.kt`/`.md`, crea `Document` con metadata `file` relativizada, split con `TokenTextSplitter`, `store.add(...)`.

### ProjectTools
- `root` normalizado a absoluto.
- `ALLOWED_EXTENSIONS`: `.java,.kt,.xml,.yml,.yaml,.properties,.md,.txt,.json`
- `listSources()`: walk + filtro regular file + extensión → rutas relativas.
- `readSource(path)`: valida no vacío, regular file, dentro de root, extensión permitida.

### JarvisController
- `POST /jarvis/ask?q=...&conversationId=default` → `chat.prompt().user(q).advisors(...conversationId).call().content()`

### SecurityConfig
- CSRF deshabilitado.
- `permitAll`: `/`, `/index.html`, `/jarvis.js`, `/jarvis.css`.
- `authenticated`: `/jarvis/**`.
- `denyAll` para el resto.
- HTTP Basic.

## 7. Frontend (static/)

- `index.html`: HUD de 3 columnas (credenciales/controles, núcleo con orbe canvas + transcripción, respuesta/historial).
- `jarvis.css`: tema oscuro cyan/amber, glassmorphism, animaciones.
- `jarvis.js`: estado (IDLE/LISTENING/THINKING/SPEAKING), orbe canvas animado, visualizador Web Audio, reconocimiento/síntesis de voz, tipeo de respuesta, historial.

## 8. Docker

### Dockerfile
```dockerfile
FROM eclipse-temurin:17-jre
COPY target/*.jar app.jar
ENTRYPOINT ["java","-jar","/app.jar"]
```

### docker-compose.yml
```yaml
services:
  jarvis:
    build: .
    ports: ["127.0.0.1:8080:8080"]
    environment:
      GEMINI_API_KEY: ${GEMINI_API_KEY}
      JARVIS_PASSWORD: ${JARVIS_PASSWORD}
      PROJECT_PATH: /workspace/project
    volumes: ["./mi-proyecto:/workspace/project:ro"]
```

## 9. Cómo replicar en otro proyecto

1. Copia la carpeta `src/main/java/com/ejemplo/jarvis` y renombra el paquete.
2. Copia `src/main/resources` (application.yml + static/).
3. Ajusta `pom.xml` (groupId/artifactId) y `@SpringBootApplication` package.
4. Crea `env.local.ps1` con tus secretos (o variables de entorno).
5. Ajusta `PROJECT_PATH` al código del nuevo proyecto.
6. (Opcional) Cambia el modelo en `application.yml` según disponibilidad de tu cuenta.
7. Compila y ejecuta:
   ```powershell
   $env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot"
   $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
   . .\env.local.ps1
   mvn -DskipTests package
   java -jar target/*.jar --server.port=8081
   ```

## 10. Mejoras pendientes (de la guía)

- Sustituir `SimpleVectorStore` por pgvector (persistencia entre reinicios).
- Limitar `readSource` a lista blanca de extensiones (ya implementado).
- Rate limiting (Bucket4j).
- Auditoría de preguntas sin secretos.
- Cambiar Gemini por Ollama si la privacidad debe ser total.

## 11. Notas de seguridad

- No commitees `env.local.ps1` ni `.env` (están en `.gitignore`).
- Revoca tokens/claves si se exponen.
- El asistente solo responde desde el contexto del proyecto; no ejecuta acciones fuera de él.