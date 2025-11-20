import CodeBlock from '@tiptap/extension-code-block';

export const CustomCodeBlock = CodeBlock.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: element => element.getAttribute('data-bg-color'),
        renderHTML: attributes => {
          if (!attributes.backgroundColor) {
            return {};
          }
          return {
            'data-bg-color': attributes.backgroundColor,
          };
        },
      },
      textColor: {
        default: null,
        parseHTML: element => element.getAttribute('data-text-color'),
        renderHTML: attributes => {
          if (!attributes.textColor) {
            return {};
          }
          return {
            'data-text-color': attributes.textColor,
          };
        },
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const backgroundColor = node.attrs.backgroundColor;
    const textColor = node.attrs.textColor;
    
    let style = '';
    if (backgroundColor) {
      style += `background-color: ${backgroundColor} !important; `;
    }
    if (textColor) {
      style += `color: ${textColor} !important;`;
    }

    const attrs: Record<string, string | undefined> = {
      ...HTMLAttributes,
      'data-bg-color': backgroundColor || undefined,
      'data-text-color': textColor || undefined,
    };

    if (style) {
      attrs.style = style;
    }

    return [
      'pre',
      attrs,
      ['code', {}, 0],
    ];
  },
});
