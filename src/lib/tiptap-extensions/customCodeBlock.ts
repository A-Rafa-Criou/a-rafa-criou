import CodeBlock from '@tiptap/extension-code-block';

export const CustomCodeBlock = CodeBlock.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: element => element.getAttribute('style'),
        renderHTML: attributes => {
          if (!attributes.style) {
            return {};
          }

          // Adiciona propriedades para garantir quebra de linha e sem scroll
          const baseStyles =
            'overflow: hidden; overflow-x: hidden; white-space: pre-wrap; word-wrap: break-word; word-break: break-word; max-width: 100%;';

          return {
            style: `${baseStyles} ${attributes.style}`,
          };
        },
      },
    };
  },
});
