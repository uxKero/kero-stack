<div align="center">

# Kero-stack

El stack de diseño detrás de cada interfaz que dirijo con agentes de IA.

<a href="https://x.com/uxKero"><img alt="Hecho por @uxKero" src="https://img.shields.io/badge/HECHO%20POR-%40uxKero-000000.svg?style=for-the-badge&logo=x&labelColor=000000"></a> <a href="LICENSE"><img alt="Licencia MIT" src="https://img.shields.io/badge/LICENCIA-MIT-000000.svg?style=for-the-badge&labelColor=000000"></a> <a href="skills"><img alt="Formato Agent Skills" src="https://img.shields.io/badge/FORMATO-AGENT%20SKILLS-000000.svg?style=for-the-badge&labelColor=000000"></a>

[English](README.md) · **Español**

</div>

<br>

El buen diseño con IA no sale de un prompt mejor. Sale de un ciclo: una persona trae la dirección, los agentes construyen, cada pantalla se mide antes de que alguien la mire, las decisiones se juzgan a ciegas y cada corrección se vuelve una regla que el proyecto conserva. Kero-stack es ese ciclo, empaquetado en skills que tu agente carga solo.

## Tres entradas

| Desde cero | Rediseño | Desde una referencia |
|:--|:--|:--|
| Todavía no hay producto. Se investiga lo que existe y por qué falla, se escribe la tesis en una oración, se enlista qué hace el producto y recién después entran la dirección y el ciclo. | El producto existe. Se releva lo que el código ya dice, se traen las referencias y se entra al ciclo en Dirigir. | Solo una captura, un sitio o un archivo de Figma. anydesign lo convierte en un design.md y el ciclo arranca desde ahí. |

## El ciclo

| Dirigir | Sistematizar | Construir | Medir | Juzgar | Registrar |
|:--|:--|:--|:--|:--|:--|
| La persona trae la idea y las referencias. | La referencia se vuelve una skill de diseño dentro del proyecto. | Los agentes construyen con reglas de oficio y el sistema del proyecto. | Cada pantalla se revisa en un navegador real. | Dos opciones se comparan sin saber cuál es cuál. | Cada corrección se vuelve una regla con su motivo. |

## Qué trae

Siete skills.

| Skill | Qué hace |
|:--|:--|
| [kero-method](skills/kero-method/SKILL.md) | El método: las tres entradas, roles, el ciclo, cómo orquestar agentes, cómo medir, cómo iterar sin romper lo que funciona y los principios de criterio que lo sostienen. Decide qué skill sigue. |
| [kero-research](skills/kero-research/SKILL.md) | Desde cero: hechos con su fuente, la competencia leída desde sus usuarios, el dato que cambia la conversación y una tesis de una oración. |
| [kero-scope](skills/kero-scope/SKILL.md) | La lista de qué hace el producto: código, función y qué hace. Sin fases ni responsables, cada función rastreada hasta la tesis. |
| [kero-system](skills/kero-system/SKILL.md) | Convierte un design.md, unos tokens o el código que ya corre en una skill de diseño que vive en el proyecto y manda sobre el código. |
| [kero-audit](skills/kero-audit/SKILL.md) | Mide las pantallas dibujadas en Chrome: contraste sobre el color pintado, tamaño de texto, áreas táctiles, foco con teclado, movimiento reducido, titulares, íconos, zoom, desbordes y errores de consola. Una captura por pantalla y un código de salida para CI. |
| [kero-blind](skills/kero-blind/SKILL.md) | Una página local para comparar dos conjuntos de diseños lado a lado, mezclados, con una línea de por qué en cada voto. |
| [kero-orchestrate](skills/kero-orchestrate/SKILL.md) | Si conviene repartir el trabajo entre agentes y cómo: encargos autosuficientes, aislamiento, revisión con evidencia. Delegación opcional en subagentes propios, Orca, Cursor, Codex, Grok y herramientas de imagen o video. |

Las skills están escritas en inglés, que es el idioma que mejor siguen los agentes. Trabajan igual con briefs en español.

## Instalación

```bash
npx skills add uxKero/kero-stack
```

O copia las carpetas de `skills` donde tu agente lee skills y reinícialo.

| Agente | Personal | Por proyecto |
|:--|:--|:--|
| Claude Code | `~/.claude/skills/` | `.claude/skills/` |
| Codex | `~/.agents/skills/` | `.agents/skills/` |
| Cursor | `~/.cursor/skills/` | `.cursor/skills/` |

`kero-audit` funciona con cualquier herramienta de navegador que ejecute JavaScript (Claude en Chrome, Chrome DevTools, agent-browser, la consola) inyectando `scripts/checks.js`. Con Playwright en el proyecto, además recorre el foco con teclado, fuerza los estados de hover y foco, revisa el movimiento reducido y saca capturas:

```bash
npm i -D playwright-core
```

## El resto del stack

El método las llama en el paso donde encaja cada una. Instala las que necesites.

| Skill | Paso | Instalación |
|:--|:--|:--|
| [anydesign](https://github.com/uxKero/anydesign) | Convierte una captura, un sitio o un Figma en un design.md con tokens y componentes. | `npx skills add uxKero/anydesign` |
| [BADESIGN](https://github.com/uxKero/badesign-skill) | Criterio de diseño: composición, tipografía, color, estados, movimiento y los hábitos de las interfaces generadas. | `npx skills add uxKero/badesign-skill` |
| [Skills de Emil Kowalski](https://github.com/emilkowalski/skills) | Oficio de movimiento e interacción de Vercel y Linear: construir, revisar y mejorar animaciones, sensación nativa en el celular y elegir la librería de UI correcta. Por [@emilkowalski](https://x.com/emilkowalski). | `npx skills add emilkowalski/skills` |
| [typebien](https://github.com/uxKero/typebien) | Copy de landing que se lee como escrito por una persona. | `npx skills add uxKero/typebien` |
| [SAGA](https://github.com/uxKero/optimize-search-answers-agents) | Decide qué tiene que ser cierto y encontrable del producto antes de que la página lo diga. | `npx skills add uxKero/optimize-search-answers-agents` |

## Úsalo

Dile a tu agente qué estás haciendo. Desde cero:

```text
Quiero hacer una app para el shopping de mi ciudad. Empieza por la investigación.
```

O trae tus referencias para un rediseño:

```text
Rediseña la página de precios. Estas son tres referencias que me gustan: <enlaces o capturas>.
```

O construye a partir de una sola referencia:

```text
Arma nuestra landing a partir de este archivo de Figma: <enlace>.
```

<br>

<div align="center">

Hecho por [@uxKero](https://x.com/uxKero) con [licencia MIT](LICENSE).

</div>
