# Kevin Campos Vega · Diseño web

Portafolio y página de servicios de diseño web para negocios en Costa Rica.

Sitio en línea: **https://kevincamposcr.github.io**

## Contenido

| Carpeta / archivo | Qué es |
|---|---|
| `index.html` | Página principal: trabajos, servicios (sin precios, se cotiza cada caso), proceso, sobre mí, preguntas frecuentes y contacto |
| `foto.jpg` | Foto de la sección "Sobre mí" (formato vertical 4:5) |
| `demos/soda-la-esquina/` | Demo: soda con menú, plato del día y pedidos express por WhatsApp |
| `demos/barberia-norte/` | Demo: barbería con lista de precios y reserva de citas |
| `demos/veterinaria-patitas/` | Demo: veterinaria con citas, emergencias y consejos |
| `demos/taller-hermanos-solis/` | Demo: taller mecánico bilingüe (español / inglés) con cotizaciones |
| `demos/autos-del-valle/` | Demo: agencia de carros usados con catálogo, filtros y calculadora de cuota |
| `demos/cafe-el-mirador/` | Demo: tienda de café con carrito, envíos y pago por SINPE Móvil o tarjeta |

> Los negocios de las demos son ficticios y se usan solo para mostrar el trabajo.
> Las fotos de la agencia de carros y la tienda de café son de [Pexels](https://www.pexels.com) (licencia libre); las ilustraciones de las demás demos son propias.

## Cómo editar

- **WhatsApp:** en `index.html`, cambie `const WHATSAPP = "50670323812"`. En cada demo, cambie `const KEVIN_WA`.
- **Trabajos del portafolio:** lista `TRABAJOS` en `index.html`.
- **Preguntas frecuentes:** lista `PREGUNTAS` en `index.html`.
- **Servicios:** sección `id="paquetes"` en `index.html`. No muestra precios: cada página se cotiza según lo que pida el cliente.
- **Foto:** reemplace `foto.jpg` por otra foto vertical con el mismo nombre.
- **Imágenes de las demos:** cada demo con ilustraciones tiene su carpeta `img/` con un `LEEME.txt` que indica qué imagen va con qué nombre.
- **Agregar un trabajo nuevo:** cree una carpeta dentro de `demos/` con su `index.html` y agréguela a la lista `TRABAJOS`.

## Publicación

El sitio se publica gratis con **GitHub Pages** desde la rama `main`. Los cambios tardan uno o dos minutos en verse en línea (use Ctrl + F5 para recargar sin caché).
