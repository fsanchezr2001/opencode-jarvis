# Implementación de J.A.R.V.I.S. en cualquier proyecto

Guía agnóstica al lenguaje para desplegar el asistente Jarvis en un proyecto nuevo o existente.

## 1. Objetivo
Jarvis es un asistente privado que responde preguntas sobre un proyecto usando RAG (búsqueda semántica) sobre sus archivos, con lectura restringida y memoria conversacional.

## 2. Requisitos previos
- JDK 17+ y Maven 3.9+ (o Docker)
- Cuenta de Google AI Studio (API key de Gemini) — o sustituir por Ollama para privacidad total
- El código fuente del proyecto a indexar accesible en disco

## 3. Variables de entorno (obligatorias)
| Variable | Descripción | Ejemplo |
|---|---|---|
| `GEMINI_API_KEY` | API key de Google AI Studio | `AIza...` |
| `JARVIS_PASSWORD` | Contraseña HTTP Basic del usuario `jarvis` | `mi-pass-segura` |
| `PROJECT_PATH` | Ruta absoluta al código a indexar | `C:\mi-proyecto\src` |

Crea un archivo local `env.local.ps1` (gitignored) o exporta las variables en tu shell/servidor.

## 4. Pasos de implementación

### Paso 1 — Copiar el módulo Jarvis
1. Copia la carpeta `src/main/java/com/ejemplo/jarvis` a tu proyecto (renombra el paquete si lo deseas).
2. Copia `src/main/resources` (application.yml + carpeta `static/`).
3. Ajusta `pom.xml`: añade las dependencias de Spring AI (ver sección 5) y `java.version=17`.
4. Asegura que `@SpringBootApplication` escanee el paquete de Jarvis.

### Paso 2 — Ajustar qué archivos se indexan
En `ProjectIndexer.java`, modifica el filtro de extensiones según tu proyecto:
```java
.filter(x -> x.toString().endsWith(".java") || x.toString().endsWith(".kt")
        || x.toString().endsWith(".py") || x.toString().endsWith(".ts")
        || x.toString().endsWith(".md"))
```
Y en `ProjectTools.java` actualiza `ALLOWED_EXTENSIONS` con las extensiones de tu stack.

### Paso 3 — Configurar modelos
En `application.yml`, ajusta los modelos disponibles para tu cuenta:
```yaml
chat: { options: { model: gemini-3.5-flash-lite } }
embedding: { text: { options: { model: gemini-embedding-001 } } }
```
Verifica modelos disponibles con:
```
curl "https://generativelanguage.googleapis.com/v1beta/models?key=TU_CLAVE"
```

### Paso 4 — Compilar
```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
. .\env.local.ps1
mvn -DskipTests package
```

### Paso 5 — Ejecutar
```powershell
java -jar target/*.jar --server.port=8081
```
Abre http://localhost:8081/ e ingresa usuario `jarvis` + tu contraseña.

### Paso 6 — Docker (opcional)
```powershell
docker compose up -d --build
```
Ajusta `docker-compose.yml` para montar tu proyecto en `/workspace/project:ro`.

## 5. Dependencias Maven
```xml
<parent>spring-boot-starter-parent 3.5.15</parent>
<properties><java.version>17</java.version></properties>
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>org.springframework.ai</groupId>
      <artifactId>spring-ai-bom</artifactId>
      <version>1.1.8</version>
      <type>pom</type><scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>
<dependencies>
  <dependency><groupId>org.springframework.ai</groupId><artifactId>spring-ai-starter-model-google-genai</artifactId></dependency>
  <dependency><groupId>org.springframework.ai</groupId><artifactId>spring-ai-starter-model-google-genai-embedding</artifactId></dependency>
  <dependency><groupId>org.springframework.ai</groupId><artifactId>spring-ai-advisors-vector-store</artifactId></dependency>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-security</artifactId></dependency>
</dependencies>
```

## 6. Adaptación por lenguaje
- **Java/Kotlin**: indexa `.java`/`.kt`, `.xml`, `.yml`, `.properties`, `.md`.
- **Python**: añade `.py`, `.toml`, `.cfg`, `.ini`, `.md`.
- **Node/TS**: añade `.ts`, `.js`, `.json`, `.md`, `.yaml`.
- **C#/.NET**: añade `.cs`, `.csproj`, `.json`, `.md`.
- **Go**: añade `.go`, `.mod`, `.yaml`, `.md`.

Solo cambia los filtros de extensión en `ProjectIndexer` y `ProjectTools`.

## 7. Seguridad
- No commitees secretos: usa `env.local.ps1` (gitignored) o variables del servidor.
- El asistente solo lee archivos dentro de `PROJECT_PATH` (validación de path traversal).
- HTTP Basic protege `/jarvis/**`; la UI estática es pública.
- Revoca claves/tokens si se exponen.

## 8. Verificación
1. La app arranca sin errores: `Started JarvisApplication`.
2. http://localhost:8081/ carga la UI (sin errores de consola).
3. Login con `jarvis` + contraseña funciona.
4. `/jarvis/ask` responde con contenido del proyecto.
5. La voz (Chrome/Edge) transcribe y responde.

## 9. Mejoras opcionales
- Persistir el vector store (pgvector) para no re-indexar en cada arranque.
- Rate limiting (Bucket4j).
- Auditoría de preguntas sin secretos.
- Cambiar Gemini por Ollama para privacidad total.