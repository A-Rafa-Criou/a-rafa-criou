import { Extension } from '@tiptap/core';

export interface FontSizeOptions {
  types: string[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      /**
       * Set the font size
       */
      setFontSize: (fontSize: string) => ReturnType;
      /**
       * Unset the font size
       */
      unsetFontSize: () => ReturnType;
    };
  }
}

export const FontSize = Extension.create<FontSizeOptions>({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }

              return {
                style: `font-size: ${attributes.fontSize} !important`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        fontSize =>
        ({ commands, state }) => {
          // Obter atributos existentes do textStyle
          const { from, to } = state.selection;
          const marks = state.doc.resolve(from).marks();
          const textStyleMark = marks.find(mark => mark.type.name === 'textStyle');
          const existingAttrs = textStyleMark?.attrs || {};

          // Mesclar atributos preservando color e backgroundColor
          return commands.setMark('textStyle', {
            ...existingAttrs,
            fontSize,
          });
        },
      unsetFontSize:
        () =>
        ({ commands, state }) => {
          const { from, to } = state.selection;
          const marks = state.doc.resolve(from).marks();
          const textStyleMark = marks.find(mark => mark.type.name === 'textStyle');
          const existingAttrs = textStyleMark?.attrs || {};

          return commands.setMark('textStyle', {
            ...existingAttrs,
            fontSize: null,
          });
        },
    };
  },
});
