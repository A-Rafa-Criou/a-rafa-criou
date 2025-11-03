"use client"

import React, { useState, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { FontSize } from '@/lib/tiptap-extensions/fontSize'
import { TextColor } from '@/lib/tiptap-extensions/textColor'
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Undo,
    Redo,
    Palette,
    Type
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
    content?: string
    onChange?: (html: string) => void
    placeholder?: string
    className?: string
}

// Cores predefinidas
const COLORS = [
    '#000000', '#434343', '#666666', '#999999', '#B7B7B7', '#CCCCCC', '#D9D9D9', '#EFEFEF', '#F3F3F3', '#FFFFFF',
    '#980000', '#FF0000', '#FF9900', '#FFFF00', '#00FF00', '#00FFFF', '#4A86E8', '#0000FF', '#9900FF', '#FF00FF',
    '#E6B8AF', '#F4CCCC', '#FCE5CD', '#FFF2CC', '#D9EAD3', '#D0E0E3', '#C9DAF8', '#CFE2F3', '#D9D2E9', '#EAD1DC',
    '#DD7E6B', '#EA9999', '#F9CB9C', '#FFE599', '#B6D7A8', '#A2C4C9', '#A4C2F4', '#9FC5E8', '#B4A7D6', '#D5A6BD',
    '#CC4125', '#E06666', '#F6B26B', '#FFD966', '#93C47D', '#76A5AF', '#6D9EEB', '#6FA8DC', '#8E7CC3', '#C27BA0',
    '#A61C00', '#CC0000', '#E69138', '#F1C232', '#6AA84F', '#45818E', '#3C78D8', '#3D85C6', '#674EA7', '#A64D79',
]

// Tamanhos de fonte predefinidos
const FONT_SIZES = [
    { label: 'Pequeno', value: '12px' },
    { label: 'Normal', value: '16px' },
    { label: 'Médio', value: '18px' },
    { label: 'Grande', value: '24px' },
    { label: 'Muito Grande', value: '32px' },
]

export function RichTextEditor({
    content = '',
    onChange,
    placeholder = 'Digite aqui...',
    className
}: RichTextEditorProps) {
    const [showColorPicker, setShowColorPicker] = useState(false)
    const [showFontSizePicker, setShowFontSizePicker] = useState(false)

    // Fechar dropdowns ao clicar fora
    useEffect(() => {
        const handleClickOutside = () => {
            setShowColorPicker(false)
            setShowFontSizePicker(false)
        }

        if (showColorPicker || showFontSizePicker) {
            document.addEventListener('click', handleClickOutside)
            return () => document.removeEventListener('click', handleClickOutside)
        }
    }, [showColorPicker, showFontSizePicker])

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Underline,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            TextStyle,
            TextColor,
            FontSize,
        ],
        content,
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            onChange?.(editor.getHTML())
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose max-w-none focus:outline-none min-h-[150px] p-4',
                style: 'white-space: pre-wrap;',
            },
        },
    })

    if (!editor) {
        return null
    }

    const MenuButton = ({
        onClick,
        isActive = false,
        children,
        title
    }: {
        onClick: (e?: React.MouseEvent) => void
        isActive?: boolean
        children: React.ReactNode
        title: string
    }) => (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={cn(
                'p-2 rounded hover:bg-gray-100 transition-colors',
                isActive && 'bg-gray-200 text-black'
            )}
        >
            {children}
        </button>
    )

    return (
        <div className={cn('border border-gray-300 rounded-lg overflow-hidden', className)}>
            {/* Toolbar */}
            <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap gap-1 items-center">
                {/* Text formatting */}
                <MenuButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive('bold')}
                    title="Negrito (Ctrl+B)"
                >
                    <Bold className="w-4 h-4" />
                </MenuButton>

                <MenuButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                    title="Itálico (Ctrl+I)"
                >
                    <Italic className="w-4 h-4" />
                </MenuButton>

                <MenuButton
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    isActive={editor.isActive('underline')}
                    title="Sublinhado (Ctrl+U)"
                >
                    <UnderlineIcon className="w-4 h-4" />
                </MenuButton>

                <MenuButton
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    isActive={editor.isActive('strike')}
                    title="Tachado"
                >
                    <Strikethrough className="w-4 h-4" />
                </MenuButton>

                <div className="w-px h-6 bg-gray-300 mx-1" />

                {/* Font size picker */}
                <div className="relative">
                    <MenuButton
                        onClick={(e) => {
                            e?.stopPropagation()
                            setShowFontSizePicker(!showFontSizePicker)
                            setShowColorPicker(false)
                        }}
                        title="Tamanho da fonte"
                    >
                        <Type className="w-4 h-4" />
                    </MenuButton>
                    {showFontSizePicker && (
                        <div
                            className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10 p-2 min-w-[150px]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {FONT_SIZES.map((size) => (
                                <button
                                    key={size.value}
                                    type="button"
                                    onClick={() => {
                                        editor.chain().focus().setFontSize(size.value).run()
                                        setShowFontSizePicker(false)
                                    }}
                                    className="block w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                                    style={{ fontSize: size.value }}
                                >
                                    {size.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Color picker */}
                <div className="relative">
                    <MenuButton
                        onClick={(e) => {
                            e?.stopPropagation()
                            setShowColorPicker(!showColorPicker)
                            setShowFontSizePicker(false)
                        }}
                        title="Cor do texto"
                    >
                        <Palette className="w-4 h-4" />
                    </MenuButton>
                    {showColorPicker && (
                        <div
                            className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10 p-2"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="grid grid-cols-10 gap-1 w-[220px]">
                                {COLORS.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => {
                                            // Aplica a cor usando nosso comando customizado
                                            editor.chain()
                                                .focus()
                                                .setTextColor(color)
                                                .run()
                                            setShowColorPicker(false)
                                        }}
                                        className="w-5 h-5 rounded border border-gray-300 hover:scale-110 transition-transform"
                                        style={{ backgroundColor: color }}
                                        title={color}
                                    />
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    editor.chain().focus().unsetTextColor().run()
                                    setShowColorPicker(false)
                                }}
                                className="mt-2 w-full text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                            >
                                Remover cor
                            </button>
                        </div>
                    )}
                </div>

                <div className="w-px h-6 bg-gray-300 mx-1" />

                {/* Lists */}
                <MenuButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive('bulletList')}
                    title="Lista com marcadores"
                >
                    <List className="w-4 h-4" />
                </MenuButton>

                <MenuButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive('orderedList')}
                    title="Lista numerada"
                >
                    <ListOrdered className="w-4 h-4" />
                </MenuButton>

                <div className="w-px h-6 bg-gray-300 mx-1" />

                {/* Alignment */}
                <MenuButton
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    isActive={editor.isActive({ textAlign: 'left' })}
                    title="Alinhar à esquerda"
                >
                    <AlignLeft className="w-4 h-4" />
                </MenuButton>

                <MenuButton
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    isActive={editor.isActive({ textAlign: 'center' })}
                    title="Centralizar"
                >
                    <AlignCenter className="w-4 h-4" />
                </MenuButton>

                <MenuButton
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    isActive={editor.isActive({ textAlign: 'right' })}
                    title="Alinhar à direita"
                >
                    <AlignRight className="w-4 h-4" />
                </MenuButton>

                <div className="w-px h-6 bg-gray-300 mx-1" />

                {/* Undo/Redo */}
                <MenuButton
                    onClick={() => editor.chain().focus().undo().run()}
                    title="Desfazer (Ctrl+Z)"
                >
                    <Undo className="w-4 h-4" />
                </MenuButton>

                <MenuButton
                    onClick={() => editor.chain().focus().redo().run()}
                    title="Refazer (Ctrl+Y)"
                >
                    <Redo className="w-4 h-4" />
                </MenuButton>
            </div>

            {/* Editor content */}
            <EditorContent
                editor={editor}
                placeholder={placeholder}
            />
        </div>
    )
}
