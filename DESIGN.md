---
name: OneServe Civic Services
colors:
  background: "#ffffff"
  on-background: "#030213"
  surface: "#ffffff"
  surface-dim: "#f3f3f5"
  surface-bright: "#ffffff"
  surface-container: "#ffffff"
  surface-container-low: "#f9fafb"
  surface-container-high: "#e5e7eb"
  on-surface: "#030213"
  on-surface-variant: "#717182"
  primary: "#2563eb"
  on-primary: "#ffffff"
  primary-container: "#dbeafe"
  on-primary-container: "#1e3a8a"
  secondary: "#030213"
  on-secondary: "#ffffff"
  secondary-container: "#ececf0"
  on-secondary-container: "#030213"
  tertiary: "#3b82f6"
  on-tertiary: "#ffffff"
  tertiary-container: "#eff6ff"
  on-tertiary-container: "#1d4ed8"
  error: "#d4183d"
  on-error: "#ffffff"
  error-container: "#fef2f2"
  on-error-container: "#991b1b"
  outline: "rgba(0, 0, 0, 0.1)"
  outline-variant: "#cbced4"
typography:
  display-lg:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "36px"
    fontWeight: "700"
    lineHeight: "40px"
  headline-lg:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: "500"
    lineHeight: "32px"
  headline-md:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: "500"
    lineHeight: "28px"
  body-lg:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: "400"
    lineHeight: "24px"
  body-md:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: "400"
    lineHeight: "20px"
  label-md:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: "500"
    lineHeight: "20px"
  label-sm:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: "500"
    lineHeight: "16px"
rounded:
  sm: "0.375rem"
  DEFAULT: "0.5rem"
  md: "0.5rem"
  lg: "0.625rem"
  xl: "0.875rem"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  container: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  card-standard:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  input-field:
    backgroundColor: "{colors.surface-dim}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
---

## Brand & Style
The OneServe Civic Services design system aims to project reliability, authority, and accessibility. Operating as a public service portal connecting citizens, administrators, and workers, the brand personality is trustworthy, professional, and clear. 

The aesthetic is **Enterprise Clean**. It relies heavily on high-contrast backgrounds, structured data presentation, and clear interactive states. By avoiding extraneous visual noise, the platform reduces cognitive load, allowing users of all technical proficiencies to navigate services, submit complaints, and track bills efficiently.

## Colors
The palette is rooted in a highly legible, high-contrast scheme that balances a deep, almost black primary text color with vibrant, action-oriented blues.

- **Action Blue:** A vibrant blue (e.g., Tailwind's `blue-600`) serves as the primary action color, guiding users toward critical paths like submitting forms or paying bills.
- **Deep Navy/Black:** The very dark blue/black (`#030213`) acts as the anchor for primary text and secondary high-emphasis buttons, ensuring maximum legibility and a grounded, authoritative feel.
- **Neutrals & Surfaces:** Pure white backgrounds are juxtaposed with subtle, cool-toned grays (`#f3f3f5`, `#ececf0`) to delineate different sections and interactive elements without relying on heavy borders.
- **Semantic Alerts:** A sharp, accessible red (`#d4183d`) is strictly reserved for destructive actions or critical system alerts.

## Typography
The typographic system leverages standard, highly legible geometric sans-serifs (like Inter or system defaults) to prioritize function over form.

- **Hierarchy:** Clear distinction between display headings and body text ensures that dashboards remain scannable. 
- **Weights:** Medium (500) font weights are used extensively for headings, labels, and buttons to provide sufficient emphasis without feeling overly heavy or cluttered. Normal (400) is reserved strictly for long-form data reading and standard input fields.

## Layout & Spacing
The layout is designed for dense data environments, utilizing a systematic approach to whitespace.

- **Containerization:** Content is housed in modular cards with consistent internal padding (`spacing.lg` / 24px) to separate independent workflows (e.g., Complaint Tracking vs. Bill Payment).
- **Rhythm:** A standard 4/8/16px scale governs all margins and gaps.
- **Alignment:** Left-aligned text and structured CSS grid or flexbox layouts provide a predictable scanning pattern, which is essential for forms and data tables.

## Elevation & Depth
Depth is created through subtle layering rather than heavy drop shadows, reinforcing the modern, flat aesthetic.

- **Borders over Shadows:** Instead of relying on shadows, the system often uses a very faint border (`rgba(0, 0, 0, 0.1)`) to define component edges against the pure white background.
- **Tonal Layers:** Input fields and muted elements sit on slightly darker surfaces (`#f3f3f5`) to create an "inset" feel, distinguishing them from the main canvas.
- **Modals & Popovers:** Elevated elements utilize higher contrast outlines and full-screen scrims to pull focus entirely away from the background.

## Shapes
The shape language is slightly rounded to soften the enterprise feel, making the platform feel more approachable to everyday citizens.

- **Radii Structure:** The base radius is defined at `0.625rem` (10px) for larger components like cards, creating a friendly but structured container. Interactive elements like buttons and inputs scale this down slightly (`0.5rem` or 8px) to feel more precise and clickable.
- **Consistency:** All interactive touchpoints maintain this rounded aesthetic, avoiding harsh 90-degree corners that might feel overly rigid or aggressive. 

### Action Elements
Primary buttons utilize the vibrant action blue with a white label for maximum contrast. Secondary actions fall back to the deep navy/black or subtle gray containers. The interactive states are fast and responsive, favoring slight color shifts rather than complex animations.

### Data Displays
Dashboards, tables, and metric cards rely on the pure white `surface` color with subtle outlines. This ensures that the data itself—rather than the container—remains the focal point of the user's attention. Status badges utilize the semantic container colors (like `primary-container` or `error-container`) with corresponding highly legible text to provide quick, scannable context for tasks and complaints.
