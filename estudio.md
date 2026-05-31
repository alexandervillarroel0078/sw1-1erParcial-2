Frontend (JSON)
    ↓
Controller → recibe el JSON y lo mapea al DTO
    ↓
Mapper → convierte DTO → Model (entidad real)
    ↓
Service → ejecuta la lógica de negocio
    ↓
Repository → interfaz que habla con MongoDB
    ↓
MongoDB → guarda el documento


DEVUELVE

MongoDB → devuelve el Model
    ↓
Mapper → convierte Model → DTO
    ↓
Controller → devuelve el DTO como JSON al frontend




HTML → ¿Qué se ve?
SCSS → ¿Cómo se ve?
TS → ¿Qué hace?



compara trámites de abril vs mayo
tareas por departamento


Funcionario habla
      ↓
Web Speech API captura el audio → texto
      ↓
Angular manda el texto a ia-service
      ↓
ia-service manda a OpenAI con la lista 
de políticas activas y el texto
      ↓
OpenAI dice "esta política le corresponde"
      ↓
Angular preselecciona esa política 
en el dropdown automáticamente
      ↓
Funcionario confirma o cambia manualmente
      ↓
Spring Boot valida que la política 
existe y está activa antes de crear el trámite

Caso 1 — Debe sugerir política: (HECHO)
Decí: "Necesito solicitar un cambio de medidor porque el mío está dañado"
Esperás: que preseleccione una política y muestre justificación abajo

Caso 2 — Debe decir política no disponible:
Decí: "hola me llamo Juan y me gustan los perros"
Esperás: snack "Política no disponible para esta solicitud. Comuníquese con un funcionario para más información." y justificación abajo

Caso 3 — Debe pedir más detalle:
Decí algo corto como: "hola"
Esperás: snack "Describe mejor la situación" y no llama a la IA







POLITICAS 
1. Solicitud de nuevo servicio
Subtítulo: Proceso para clientes que requieren la contratación o instalación de un nuevo servicio por primera vez.
2. Cambio o actualización de datos
Subtítulo: Proceso para clientes que necesitan modificar información personal, dirección o datos de contacto registrados.
3. Reclamo o queja formal
Subtítulo: Proceso para clientes que desean presentar una queja, reclamo o disconformidad con un servicio recibido.
4. Solicitud de baja o cancelación
Subtítulo: Proceso para clientes que desean cancelar o dar de baja un servicio contratado.
5. Inspección técnica
Subtítulo: Proceso para clientes que reportan fallas, daños o problemas técnicos que requieren visita de un técnico.
6. Solicitud de crédito o financiamiento
Subtítulo: Proceso para clientes que solicitan un plan de pago, crédito o financiamiento para un servicio o deuda.
7. Renovación de contrato
Subtítulo: Proceso para clientes cuyo contrato está por vencer y desean renovar o actualizar sus condiciones.

































(Transcrito por TurboScribe. Actualizar a Ilimitado para eliminar este mensaje.)

Ya ven, les voy a publicar dos importantes... Pongo y lo llevo el tuyo, señor. 

//ING
Eso implica un incremento en todo, en todo significa por lo menos los siguientes puntos. Primero, en el proceso de desarrollo, es decir, me refiero a los juegos, es un nuevo ciclo.

Dos, es un incremento también en el software, porque es la funcionalidad que han introducido y también algunos ajustes que seguramente van a hacer. Tres, se supone que también es la documentación. El software prácticamente está definido, ya lo hemos comentado en el caso anterior.

El proceso también, porque lo hemos dicho antes, lo que tenemos que hacer es aplicar el nuevo ciclo y obviamente, colocar toda la documentación que se haya generado. Pero vamos a hablar ahora de algunos puntos de la documentación. Ustedes recuerdan que la documentación tenía la primera parte.

En la primera parte hay la documentación, recuerdan. A esa fundamentación teórica van a... En la documentación teórica van a colocar todos los temas que se han tratado en los primeros empaseados. Es decir, que hablaba desde arquitectura, de software, desarrollo de software, etc.

Esos son los primeros empaseados, los primeros empaseados. Esos puntos tienen que ir. Los mismos puntos van a ir.

Pero vamos a agregar nuevos. Esto luego obviamente tiene que ver con el nuevo alcance de tiempo definido. Y serían los siguientes temas.

En la parte que dice fundamentación teórica. 

1. 
Primero, un tema que es pertinente. Lo que se denomina sistema de gestión documental.

Todo referente a lo más esencial dentro del ámbito de los sistemas de gestión documental. En cada capítulo. Porque se supone que dentro del software que estamos desarrollando hay algo que tiene que ver con eso.

Otro. Simple. Porque vamos a utilizar bastante.

Nos quedamos que eso van a aplicar, ¿cierto? Por favor. Bueno, Deep Learning, porque estamos en ese tema. Pero no hablen de todo lo que es Deep Learning.

Hablen de lo que es. Porque en gestión documental hablen de lo que está aplicado en el proyecto. En Deep Learning hablen de lo que está aplicado en el proyecto.

Una vez que van a decir a la línea general sobre Deep Learning y eso van a imprimir. No, sí. Hablen de lo que está aplicado en el proyecto.

Por ejemplo, es de las cosas que seguramente van a hablar. Es solo que es hablar de texto o NLP. Cosas por el tipo.

Seguramente también van a hablar de alguna herramienta o componente como el software. Que es algo que se va a utilizar. 

Luego, otro tema que... Que también van a tener que revisar por las características del proyecto.

En este caso es la infraestructura basada en AWS. Por lo menos tienen que hacerse especialistas en los siguientes servicios. Y este proyecto va a tener unos tutoriales.

Se entiende muy bien. Trabajador correcto. 

El primero es el clásico.

Para desplegar aplicaciones. Usando Android S. Eso viene a ser lo que es una información nueva. Pero lo que seguramente hoy es algo que vendría a ser el segundo.

Es S3. El servicio de S3. Con todas sus características.

Pero hay un tercero más. ¿Cuál es la que hemos quedado? ¿Alguien se acuerda? Ustedes son los que no pidieron el margen. ¿Pidieron el margen o no? ¿Cuál? Hay un tercero más.

¿Qué quiero? Eso, ¿no? Exacto. Base de datos no se puede. En este caso, el conglomerado de AWS.

Digno modelo. Sin embargo, hemos quedado que esto es opcional. Es decir, no todo.

No es obligatorio. Así que vamos, ¿no? Sí. ¿Os queda algo obligatorio? No, no, no.

Se opciona. Por ejemplo, para la compra de cosas ahorita. Como por ejemplo, que es algo basado en AWS S3.

Yo le saco un TNB. Un panel de TNB. Un panel de TNB.

Y toda nuestra arquitectura viene con un TNB. Entonces. Esos son los temas nuevos en la fundamentación teórica.

Ustedes pueden agregar otros si les es conveniente. De acuerdo a lo que hayan realizado. Entonces, el síntesis.

La documentación. En esta parte de fundamentación teórica es así. Primero, todos los puntos que hicimos en el primer parcial.

No sé cuántos temas son. Segundo. Pero a eso lo agrega que todos los que estamos.

Luego ya viene obviamente la segunda parte de la documentación. Que es. El proceso de desarrollo.

Y como hemos acordado. El proceso de desarrollo. Está basado.

Entonces que tiene que ser. Un nuevo ciclo. Que la documentación tiene que aparecer.

Los dos ciclos. El primer ciclo. Que hicieron en el primer parcial.

Y el segundo ciclo. Que están haciendo ahora. Y el segundo.

Están realizando. Ese modelo. Debe representar.

Dentro del contexto. De lo que es UMN. C4.

C4. Para mostrar la arquitectura del software. Y todo lo demás.

Con UMN 2.5. En este. Ciclo. Todo lo que es la arquitectura.

Lo vamos a modelar. Utilizando C4. Todo lo demás.

Es decir. Arqueológica. Etcétera.

Lo van a modelar. Utilizando UMN 2.5. Luego. Ya viene la tercera parte.

La tercera parte. Obviamente. Tiene que ver todo.

Mejarismo. Que usted le considere conveniente. Para.

Lograr que los usuarios. Utilicen correctamente. La aplicación.

Habíamos planteado varias opciones. ¿Cierto? Desde lo más básico. Que es un manual.

Usuario. Pasando por. Tutoriales.

Etcétera. Y llegando a lo más óptimo. Que es lo más óptimo.

En el reportaje. Eso. Un asistente.

Para dar soporte. En el miasto. Monitoriando.

Lo que está haciendo el usuario. Para asistirlo. O lo que sea.

Hay unas recomendaciones. Como siempre. Donde se coloca.

En la recomendación. Todo lo que han utilizado. Por ejemplo.

100%. De las herramientas. Todos los modelos.

Se supone. Que tiene que. Trabajar.

Bajar. Lo que se denomina. Con lo limpio.

Utilizando. La defectualificación. Eso tendrá que estar.

Hecho al éxito. Bien descrito. Que es lo que han utilizado.

En el reportaje. Se supone. Que todo debe funcionar.

En línea. Es decir. De forma.

Por la. La guiada del balcón. La carátula.

Van a colocar. O si quieren. Una hoja.

Después. Jueces. Para acceder.

A su código. Jueces, por ejemplo. Para acceder.

A sus tutoriales. Si el caso tiene. Déjenme ver.

Ay mi. No sé si les queda alguna pregunta, en cuanto a la documentación, como ya vemos todos los parques, 12 creo, 13, 11, 11 alútenlo, hasta las 8 de la mañana, o sea, ese 11, máximo hasta las 8 de la mañana deben publicar la documentación. Los que publicaron, vienen una tarde y presentan, y van a, no tienen que imprimir el documento, lo que tienen que imprimir son los características de esa documentación que ya han imprimido.

Señor, la base de datos, ¿podemos mantenerlo en inglés? Sí, pueden mantenerlo, o sea, el coche de Dinamo es opcional. ¿Alguna pregunta más? Sí, el proyecto va a acceder a su típico sitio donde está accesible, para poder accederlo, va a descargar su aplicación móvil porque va a estar en un drive, bien, no se vaya todavía, vamos a acceder al móvil. Estos móviles que voy a llevar, esta carácter que les voy a devolver, lo voy a borrar, y al final del semestre me lo presentan para un voto.

Tapia y Molina, ¿qué va a ocurrir? Bernardo... Rodrigo Rivero... Lo demás por el instamiento, nos vemos el día...

(Transcrito por TurboScribe. Actualizar a Ilimitado para eliminar este mensaje.)