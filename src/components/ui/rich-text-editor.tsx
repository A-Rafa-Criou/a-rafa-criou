"use client"
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { FontSize } from '@/lib/tiptap-extensions/fontSize'
import { TextColor } from '@/lib/tiptap-extensions/textColor'
import { BackgroundColor } from '@/lib/tiptap-extensions/backgroundColor'
import { CustomCodeBlock } from '@/lib/tiptap-extensions/customCodeBlock'
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
    Type,
    Highlighter,
    Code
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
    const [showBgColorPicker, setShowBgColorPicker] = useState(false)
    const [showCodeBlockColorPicker, setShowCodeBlockColorPicker] = useState(false)
    const [showFontSizePicker, setShowFontSizePicker] = useState(false)
    const [editorBgColor, setEditorBgColor] = useState<string>('#ffffff') // Cor de fundo do preview

    const colorPickerRef = useRef<HTMLDivElement>(null)
    const bgColorPickerRef = useRef<HTMLDivElement>(null)
    const codeBlockColorPickerRef = useRef<HTMLDivElement>(null)
    const fontSizePickerRef = useRef<HTMLDivElement>(null)

    // Fechar dropdowns ao clicar fora
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement

            // Verificar cada picker individualmente
            if (showColorPicker && colorPickerRef.current && !colorPickerRef.current.contains(target)) {
                setShowColorPicker(false)
            }
            if (showBgColorPicker && bgColorPickerRef.current && !bgColorPickerRef.current.contains(target)) {
                setShowBgColorPicker(false)
            }
            if (showCodeBlockColorPicker && codeBlockColorPickerRef.current && !codeBlockColorPickerRef.current.contains(target)) {
                setShowCodeBlockColorPicker(false)
            }
            if (showFontSizePicker && fontSizePickerRef.current && !fontSizePickerRef.current.contains(target)) {
                setShowFontSizePicker(false)
            }
        }

        if (showColorPicker || showBgColorPicker || showCodeBlockColorPicker || showFontSizePicker) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showColorPicker, showBgColorPicker, showCodeBlockColorPicker, showFontSizePicker])

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
                codeBlock: false, // Desabilita o CodeBlock padrão
            }),
            CustomCodeBlock, // Usa nosso CodeBlock customizado
            Underline,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            TextStyle,
            TextColor,
            BackgroundColor,
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
                <div className="relative color-picker-button" ref={fontSizePickerRef}>
                    <MenuButton
                        onClick={(e) => {
                            e?.stopPropagation()
                            setShowFontSizePicker(!showFontSizePicker)
                            setShowColorPicker(false)
                            setShowBgColorPicker(false)
                            setShowCodeBlockColorPicker(false)
                        }}
                        title="Tamanho da fonte"
                    >
                        <Type className="w-4 h-4" />
                    </MenuButton>
                    {showFontSizePicker && (
                        <div
                            className="color-picker-dropdown absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10 p-2 w-[120px]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {FONT_SIZES.map((size) => (
                                <button
                                    key={size.value}
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        editor.commands.setFontSize(size.value)
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

                {/* Text color picker */}
                <div className="relative color-picker-button" ref={colorPickerRef}>
                    <MenuButton
                        onClick={(e) => {
                            e?.stopPropagation()
                            setShowColorPicker(!showColorPicker)
                            setShowBgColorPicker(false)
                            setShowCodeBlockColorPicker(false)
                            setShowFontSizePicker(false)
                        }}
                        title="Cor do texto"
                    >
                        <Palette className="w-4 h-4" />
                    </MenuButton>
                    {showColorPicker && (
                        <div
                            className="color-picker-dropdown absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10 p-2"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <p className="text-xs font-semibold text-gray-800 mb-2 px-1 border-b pb-1">Cor do Texto</p>
                            <div className="grid grid-cols-10 gap-1 w-[220px]">
                                {COLORS.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onMouseDown={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()

                                            const { from, to } = editor.state.selection

                                            // Se não há seleção, selecionar tudo primeiro
                                            if (from === to) {
                                                editor.chain()
                                                    .selectAll()
                                                    .setTextColor(color)
                                                    .setTextSelection({ from, to })
                                                    .run()
                                            } else {
                                                editor.commands.setTextColor(color)
                                            }

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
                                onMouseDown={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    editor.commands.unsetTextColor()
                                    setShowColorPicker(false)
                                }}
                                className="mt-2 w-full text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                            >
                                Remover cor
                            </button>
                        </div>
                    )}
                </div>

                {/* Background color picker */}
                <div className="relative color-picker-button" ref={bgColorPickerRef}>
                    <MenuButton
                        onClick={(e) => {
                            e?.stopPropagation()
                            setShowBgColorPicker(!showBgColorPicker)
                            setShowColorPicker(false)
                            setShowCodeBlockColorPicker(false)
                            setShowFontSizePicker(false)
                        }}
                        title="Cor de fundo do preview"
                    >
                        <Highlighter className="w-4 h-4" />
                    </MenuButton>
                    {showBgColorPicker && (
                        <div
                            className="color-picker-dropdown absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10 p-2"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <p className="text-xs font-semibold text-gray-800 mb-2 px-1 border-b pb-1">Cor de Fundo do Preview</p>
                            <div className="grid grid-cols-10 gap-1 w-[220px]">
                                {COLORS.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onMouseDown={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()

                                            // Alterar cor de fundo do editor (preview)
                                            setEditorBgColor(color)
                                            setShowBgColorPicker(false)
                                        }}
                                        className="w-5 h-5 rounded border border-gray-300 hover:scale-110 transition-transform"
                                        style={{ backgroundColor: color }}
                                        title={color}
                                    />
                                ))}
                            </div>
                            <button
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setEditorBgColor('#ffffff')
                                    setShowBgColorPicker(false)
                                }}
                                className="mt-2 w-full text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                            >
                                Restaurar cor padrão (branco)
                            </button>
                        </div>
                    )}
                </div>

                <div className="w-px h-6 bg-gray-300 mx-1" />

                {/* Code Block with custom color */}
                <div className="relative color-picker-button" ref={codeBlockColorPickerRef}>
                    <MenuButton
                        onClick={(e) => {
                            e?.stopPropagation()
                            if (editor.isActive('codeBlock')) {
                                // Se já está em um bloco de código, mostra o seletor de cor
                                setShowCodeBlockColorPicker(!showCodeBlockColorPicker)
                                setShowColorPicker(false)
                                setShowBgColorPicker(false)
                                setShowFontSizePicker(false)
                            } else {
                                // Se não está, cria um bloco de código com cor padrão
                                editor.chain().focus().toggleCodeBlock().run()
                            }
                        }}
                        isActive={editor.isActive('codeBlock')}
                        title="Bloco de código (para textos com fundo colorido)"
                    >
                        <Code className="w-4 h-4" />
                    </MenuButton>
                    {showCodeBlockColorPicker && editor.isActive('codeBlock') && (
                        <div
                            className="color-picker-dropdown absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10 p-2 w-[220px]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <p className="text-xs font-bold text-blue-700 mb-3 px-1 border-b-2 border-blue-300 pb-1">Cores do Bloco de Código</p>
                            {/* Seção Cor de Fundo */}
                            <div className="mb-3">
                                <p className="text-xs font-medium text-gray-700 mb-2 px-1">Cor do fundo:</p>
                                <div className="grid grid-cols-10 gap-1">
                                    {COLORS.map((color) => (
                                        <button
                                            key={`bg-${color}`}
                                            type="button"
                                            onMouseDown={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                const currentAttrs = editor.getAttributes('codeBlock')

                                                editor.commands.updateAttributes('codeBlock', {
                                                    backgroundColor: color,
                                                    textColor: currentAttrs.textColor || '#FFFFFF'
                                                })
                                            }}
                                            className="w-5 h-5 rounded border border-gray-300 hover:scale-110 transition-transform"
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Seção Cor do Texto */}
                            <div className="mb-3">
                                <p className="text-xs font-medium text-gray-700 mb-2 px-1">Cor do texto:</p>
                                <div className="grid grid-cols-10 gap-1">
                                    {COLORS.map((color) => (
                                        <button
                                            key={`text-${color}`}
                                            type="button"
                                            onMouseDown={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                const currentAttrs = editor.getAttributes('codeBlock')

                                                editor.commands.updateAttributes('codeBlock', {
                                                    backgroundColor: currentAttrs.backgroundColor || '#1e293b',
                                                    textColor: color
                                                })
                                            }}
                                            className="w-5 h-5 rounded border border-gray-300 hover:scale-110 transition-transform"
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Botões de Ação */}
                            <button
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    editor.commands.updateAttributes('codeBlock', {
                                        backgroundColor: null,
                                        textColor: null
                                    })
                                    setShowCodeBlockColorPicker(false)
                                }}
                                className="w-full text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded mb-1"
                            >
                                Padrão (azul/branco)
                            </button>
                            <button
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setShowCodeBlockColorPicker(false)
                                }}
                                className="w-full text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                            >
                                Fechar
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
            <div
                className="editor-content-wrapper rounded-b-lg p-4 min-h-[200px] border border-gray-200"
                style={{
                    ['--editor-bg-color' as string]: editorBgColor
                } as React.CSSProperties}
            >
                <div className="prose prose-sm max-w-none">
                    <EditorContent
                        editor={editor}
                        placeholder={placeholder}
                    />
                </div>
            </div>
        </div>
    )
}
