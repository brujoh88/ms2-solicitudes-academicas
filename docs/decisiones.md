# Decisiones técnicas

Cada decisión con su alternativa descartada y el motivo, en el orden en que se
tomaron.

| # | Decisión | Alternativa descartada | Por qué |
|---|---|---|---|
| D1 | **NestJS con TypeScript** | Java, el lenguaje de los ejemplos de la cátedra | Es el stack que el equipo usa en su Trabajo Final, y la defensa exige poder justificar cada línea. SOLID y los refactorings se nombran igual en cualquier lenguaje |
| D2 | **Persistencia en archivos JSON** | Base de datos (SQLite con Prisma) o datos en memoria | La consigna admite archivo, base o memoria. En memoria los datos se pierden al reiniciar y la persistencia no se ve en la demo. Una base suma configuración que no aporta a lo que se evalúa, que es la calidad interna. Con JSON los datos sobreviven a un reinicio, no hay nada que instalar y el cambio queda a la vista en el repositorio. El costo (no hay transacciones) está declarado en CR3 |
| D3 | **Un sistema base con problemas deliberados**, siguiendo el caso que sugiere la cátedra | Tomar un proyecto previo del equipo | Los problemas reproducen errores comunes de quien empieza con NestJS: todo en el controlador, sin inyección de dependencias. El diagnóstico los trata como si los hubiera encontrado otro equipo |
| D4 | **Tests de caracterización antes de refactorizar** | Escribir las pruebas al final | Sin una red de seguridad previa no hay forma de afirmar que el refactoring no cambió el comportamiento. Los tests registran incluso los defectos |
| D5 | **Conservar los defectos durante el refactoring** (los `200` con error) | Corregirlos en el mismo commit | Un refactoring no cambia el comportamiento externo. Mezclar una corrección con un refactoring impide saber cuál de los dos rompió algo. La corrección se hizo después, aparte (CR1) |
| D6 | **Un commit por refactoring** | Un solo commit con todo el refactoring | Cada técnica queda aislada y se puede mostrar con `git show`; si un paso hubiera roto un test, se sabría cuál |
| D7 | **Puertos como clases abstractas** | Interfaces de TypeScript | Las interfaces desaparecen al compilar y NestJS necesita un valor en tiempo de ejecución como token de inyección. La clase abstracta cumple los dos papeles |
| D8 | **Tabla de tipos con datos** (`TIPOS_DE_SOLICITUD`) | Una clase por tipo con polimorfismo (patrón Strategy) | Hoy los tipos solo se diferencian por valores (prioridad, plazo, área), no por comportamiento. Una clase por tipo sería más código para lo mismo. Si un tipo llegara a necesitar lógica propia, la tabla se puede convertir en clases sin tocar a quienes la usan |
| D9 | **Códigos 400, 404 y 409** para los errores | Un único `400` para todo | Distinguen tres situaciones que el cliente maneja distinto: corregir lo que mandó (400), la solicitud no existe (404) o el estado actual no lo permite aunque los datos estén bien (409) |
| D10 | **Separar `LectorSolicitudes` de `RepositorioSolicitudes`** | Un solo repositorio | El reporte solo lee. Que dependa solo de la lectura (ISP) hace imposible que modifique datos por error |
