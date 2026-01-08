export interface NavItem {
  title: string;
  href?: string;
  items?: NavItem[];
}

export const docsConfig: NavItem[] = [
  {
    title: "Introduction",
    href: "/docs",
  },
  {
    title: "Getting Started",
    href: "/docs/getting-started",
  },
  {
    title: "Guides",
    items: [
      { title: "Annotation Tools", href: "/docs/guides/tools" },
      { title: "SAM (Segment Anything)", href: "/docs/guides/sam-tool" },
      { title: "Event System", href: "/docs/guides/events" },
      { title: "Layer System", href: "/docs/guides/layers" },
      { title: "Styling", href: "/docs/guides/styling" },
      { title: "Data Loaders", href: "/docs/guides/loaders" },
      { title: "Popup System", href: "/docs/guides/popups" },
      { title: "Context Menu", href: "/docs/guides/context-menu" },
      { title: "Vertex Editing", href: "/docs/guides/vertex-editing" },
      { title: "Undo/Redo", href: "/docs/guides/undo-redo" },
      { title: "Integration Guide", href: "/docs/guides/integration" },
    ],
  },
  {
    title: "Use Cases",
    items: [
      { title: "Basic Viewer", href: "/docs/use-cases/basic-viewer" },
      { title: "Image Overlays", href: "/docs/use-cases/image-overlays" },
      // Add others as needed from directory listing
    ]
  },
  {
    title: "API",
    href: "/api"
  },
  {
    title: "Roadmap",
    href: "/docs/roadmap"
  },
  {
    title: "Changelog",
    href: "/docs/changelog"
  }
];
