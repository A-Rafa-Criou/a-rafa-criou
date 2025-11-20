import { Extension } from '@tiptap/core';

export interface TextColorOptions {
  types: string[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    textColor: {
      /**
       * Set the text color
       */
      setTextColor: (color: string) => ReturnType;
      /**
       * Unset the text color
       */
      unsetTextColor: () => ReturnType;
    };
  }
}

export const TextColor = Extension.create<TextColorOptions>({
  name: 'textColor',

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
          color: {
            default: null,
            parseHTML: element => element.style.color?.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.color) {
                return {};
              }

              return {
                style: `color: ${attributes.color} !important`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setTextColor:
        color =>
        ({ commands, state }) => {
          // Obter atributos existentes do textStyle
          const { from } = state.selection;
          const marks = state.doc.resolve(from).marks();
          const textStyleMark = marks.find(mark => mark.type.name === 'textStyle');
          const existingAttrs = textStyleMark?.attrs || {};

          // Mesclar atributos preservando backgroundColor e fontSize
          return commands.setMark('textStyle', {
            ...existingAttrs,
            color,
          });
        },
      unsetTextColor:
        () =>
        ({ commands, state }) => {
          const { from, to } = state.selection;
          const marks = state.doc.resolve(from).marks();
          const textStyleMark = marks.find(mark => mark.type.name === 'textStyle');
          const existingAttrs = textStyleMark?.attrs || {};

          return commands.setMark('textStyle', {
            ...existingAttrs,
            color: null,
          });
        },
    };
  },
});
