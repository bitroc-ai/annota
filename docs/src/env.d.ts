/// <reference types="astro/client" />
/// <reference path="./starlight.d.ts" />

declare module "*.mdx" {
  let MDXComponent: (props: any) => JSX.Element;
  export default MDXComponent;
}

declare module "hast" {
  export interface Root {
    type: "root";
    children: Array<Element | Text | Comment>;
  }

  export interface Element {
    type: "element";
    tagName: string;
    properties?: Record<string, any>;
    children: Array<Element | Text | Comment>;
  }

  export interface Text {
    type: "text";
    value: string;
  }

  export interface Comment {
    type: "comment";
    value: string;
  }
}
