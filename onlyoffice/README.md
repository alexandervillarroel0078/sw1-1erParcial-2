# OnlyOffice Document Server — FlowGov

Microservicio de edición colaborativa de documentos para el proyecto FlowGov.

## Requisitos

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Levantar el servicio

Desde este directorio:

```bash
docker-compose up -d
```

Para detenerlo:

```bash
docker-compose down
```

## URL del servicio

- **Document Server:** http://localhost:80

## Verificar que funciona

Abre en el navegador la página de bienvenida de OnlyOffice:

http://localhost/welcome

Si la página carga correctamente, el servicio está operativo.

## Configuración de desarrollo

| Variable       | Valor   | Descripción                                      |
|----------------|---------|--------------------------------------------------|
| `JWT_ENABLED`  | `false` | Desactiva la autenticación JWT para desarrollo local |

> **Importante:** `JWT_ENABLED=false` es **solo para desarrollo local**. En producción debes habilitar JWT (`JWT_ENABLED=true`) y configurar un secreto seguro para proteger las peticiones al Document Server.

## Volúmenes

| Ruta local | Ruta en contenedor              | Uso                    |
|------------|---------------------------------|------------------------|
| `./data`   | `/var/www/onlyoffice/Data`      | Persistencia de documentos |
| `./logs`   | `/var/log/onlyoffice`           | Logs del servicio      |

Los directorios `data/` y `logs/` se crean automáticamente al iniciar el contenedor.
