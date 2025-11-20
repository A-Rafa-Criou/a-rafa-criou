import { Extension } from '@tiptap/core';

export interface BackgroundColorOptions {
  types: string[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    backgroundColor: {
      /**
       * Set the background color
       */
      setBackgroundColor: (color: string) => ReturnType;
      /**
       * Unset the background color
       */
      unsetBackgroundColor: () => ReturnType;
    };
  }
}

export const BackgroundColor = Extension.create<BackgroundColorOptions>({
  name: 'backgroundColor',

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
          backgroundColor: {
            default: null,
            parseHTML: element => element.style.backgroundColor?.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.backgroundColor) {
                return {};
              }

              return {
                style: `background-color: ${attributes.backgroundColor} !important`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setBackgroundColor:
        color =>
        ({ commands, state }) => {
          // Obter atributos existentes do textStyle
          const { from, to } = state.selection;
          const marks = state.doc.resolve(from).marks();
          const textStyleMark = marks.find(mark => mark.type.name === 'textStyle');
          const existingAttrs = textStyleMark?.attrs || {};
          
          // Mesclar atributos preservando color e fontSize
          return commands.setMark('textStyle', { 
            ...existingAttrs,
            backgroundColor: color 
          });
        },
      unsetBackgroundColor:
        () =>
        ({ commands, state }) => {
          const { from, to } = state.selection;
          const marks = state.doc.resolve(from).marks();
          const textStyleMark = marks.find(mark => mark.type.name === 'textStyle');
          const existingAttrs = textStyleMark?.attrs || {};
          
          return commands.setMark('textStyle', { 
            ...existingAttrs,
            backgroundColor: null 
          });
        },
    };
  },
});
