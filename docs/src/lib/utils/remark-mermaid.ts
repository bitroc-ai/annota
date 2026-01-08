import type { Root } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

/**
 * Remark plugin to transform mermaid code blocks into Mermaid components
 */
export function remarkMermaid(): Plugin<[], Root> {
  return (tree) => {
    visit(tree, 'code', (node, index, parent) => {
      if (node.lang === 'mermaid' && parent && typeof index === 'number') {
        // Replace the code node with an MDX component
        const mermaidComponent = {
          type: 'mdxJsxFlowElement',
          name: 'Mermaid',
          attributes: [
            {
              type: 'mdxJsxAttribute',
              name: 'code',
              value: {
                type: 'mdxJsxAttributeValueExpression',
                value: JSON.stringify(node.value),
              },
            },
          ],
          children: [],
        };

        // Replace the code block in the parent
        parent.children[index] = mermaidComponent as any;
      }
    });
  };
}

