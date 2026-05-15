# Markdown sanitization

Cuando una API debe aceptar contenido enriquecido en formato Markdown, conviene sanitizar cualquier HTML embebido antes de persistir para evitar que entren tags inseguros sin romper la sintaxis markdown válida. En esta tarea se usó `sanitize-html` con `allowedTags: []` y `allowedAttributes: {}` para strippear HTML y conservar texto, links e imágenes expresados como markdown, reutilizando además un campo `Text` existente sin requerir migraciones de schema. Referencia: [[TC-15-posts-comments-rich-content]].

## Updated 2026-05-15

<!-- Trazabilidad: insight escrito/actualizado por Archivist en 2026-05-15 00:00:00 en cierre de [[TC-15-posts-comments-rich-content]] -->
