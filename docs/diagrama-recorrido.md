# Diagrama del recorrido

Mesa de ayuda ACME · Prototipo académico · Datos ficticios

## Pantallas y navegación

```mermaid
flowchart TD
    I["Inicio<br/>Elegir vista"] -->|Entrar como trabajador| R["Reportar problema<br/>nombre · área · equipo · descripción"]
    I -->|Entrar como soporte TI| P["Panel de soporte<br/>lista y filtro por estado"]

    R -->|Faltan datos o son muy cortos| R
    R -->|Registrar problema| C["Confirmación<br/>número ACME-00X"]
    C -->|Ver seguimiento del caso| S["Seguimiento<br/>buscar por número"]
    S -->|Número inexistente| N["Mensaje: caso no encontrado"]
    N --> S

    P -->|Abrir caso| D["Detalle del caso (soporte)<br/>asignar · comentar · resolver"]
    D -->|Volver al panel| P

    S <-->|"Selector «Ver como»<br/>(mantiene el mismo caso)"| D
```

## Estados del caso

```mermaid
stateDiagram-v2
    state "Recibido" as Recibido
    state "En atención" as EnAtencion
    state "Resuelto" as Resuelto
    state "Cerrado" as Cerrado

    [*] --> Recibido: el trabajador registra el problema
    Recibido --> EnAtencion: soporte inicia la atención<br/>(requiere responsable asignado)
    EnAtencion --> Resuelto: soporte escribe la solución aplicada
    Resuelto --> Cerrado: el trabajador confirma que funciona
    Resuelto --> EnAtencion: el trabajador indica que el problema continúa<br/>(debe explicar qué sigue fallando)
    Cerrado --> [*]
```

Cada transición queda registrada en el historial con fecha, hora y autor.
Soporte puede agregar comentarios mientras el caso no esté cerrado.

## Versión en texto (por si el visor no muestra diagramas)

```
Inicio ──► Trabajador ──► Reportar ──► Confirmación (ACME-00X) ──► Seguimiento
   │                        ▲  │                                       ▲
   │                        └──┘ errores: se conserva lo escrito       │ «Ver como»
   └──► Soporte TI ──► Panel (filtro por estado) ──► Detalle del caso ◄─┘

Recibido ──(responsable asignado)──► En atención ──(solución escrita)──► Resuelto
                                          ▲                               │   │
                                          └──── el problema continúa ─────┘   │
                                                                              ▼
                                                     el trabajador confirma ► Cerrado
```
