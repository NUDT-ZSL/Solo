import React, { useMemo } from 'react'
import './renderer.css'

export type Theme = 'monokai' | 'dracula' | 'solarized-light' | 'github-dark'

export type GradientPreset = 'none' | 'pink-purple' | 'blue-cyan' | 'gray-white'

export interface CardStyle {
  borderRadius: number
  shadowOffsetX: number
  shadowOffsetY: number
  gradient: GradientPreset
  fontSize: number
}

export interface RendererProps {
  highlightedHtml: string
  theme: Theme
  cardStyle: CardStyle
  language: string
}

const themeColors: Record<Theme, {
  background: string
  foreground: string
  comment: string
  keyword: string
  string: string
  function: string
  number: string
  operator: string
  class: string
  variable: string
}> = {
  monokai: {
    background: '#272822',
    foreground: '#f8f8f2',
    comment: '#75715e',
    keyword: '#f92672',
    string: '#e6db74',
    function: '#a6e22e',
    number: '#ae81ff',
    operator: '#f92672',
    class: '#66d9ef',
    variable: '#f8f8f2',
  },
  dracula: {
    background: '#282a36',
    foreground: '#f8f8f2',
    comment: '#6272a4',
    keyword: '#ff79c6',
    string: '#f1fa8c',
    function: '#50fa7b',
    number: '#bd93f9',
    operator: '#ff79c6',
    class: '#8be9fd',
    variable: '#f8f8f2',
  },
  'solarized-light': {
    background: '#fdf6e3',
    foreground: '#657b83',
    comment: '#93a1a1',
    keyword: '#859900',
    string: '#2aa198',
    function: '#268bd2',
    number: '#d33682',
    operator: '#859900',
    class: '#b58900',
    variable: '#657b83',
  },
  'github-dark': {
    background: '#0d1117',
    foreground: '#c9d1d9',
    comment: '#8b949e',
    keyword: '#ff7b72',
    string: '#a5d6ff',
    function: '#d2a8ff',
    number: '#79c0ff',
    operator: '#ff7b72',
    class: '#ffa657',
    variable: '#c9d1d9',
  },
}

const gradients: Record<GradientPreset, string> = {
  none: 'none',
  'pink-purple': 'linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)',
  'blue-cyan': 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)',
  'gray-white': 'linear-gradient(135deg, #e0e0e0 0%, #ffffff 100%)',
}

const cardBackgrounds: Record<Theme, string> = {
  monokai: '#282c34',
  dracula: '#282c34',
  'solarized-light': '#fdf6e3',
  'github-dark': '#282c34',
}

const languageLabelColors: Record<Theme, { bg: string; text: string }> = {
  monokai: { bg: 'rgba(249, 38, 114, 0.15)', text: '#f92672' },
  dracula: { bg: 'rgba(189, 147, 249, 0.15)', text: '#bd93f9' },
  'solarized-light': { bg: 'rgba(181, 137, 0, 0.15)', text: '#b58900' },
  'github-dark': { bg: 'rgba(121, 192, 255, 0.15)', text: '#79c0ff' },
}

const languageDisplayNames: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  html: 'HTML',
  css: 'CSS',
}

function formatLanguageName(lang: string): string {
  return languageDisplayNames[lang.toLowerCase()] || lang.toUpperCase()
}

export const Renderer: React.ForwardRefExoticComponent<RendererProps & React.RefAttributes<HTMLDivElement>> =
  React.forwardRef<HTMLDivElement, RendererProps>(({ highlightedHtml, theme, cardStyle, language }, ref) => {
    const colors = themeColors[theme]
    const gradient = gradients[cardStyle.gradient]
    const cardBg = cardBackgrounds[theme]
    const labelColors = languageLabelColors[theme]

    const containerStyle = useMemo<React.CSSProperties>(() => ({
      '--card-bg': cardBg,
      '--code-bg': colors.background,
      '--fg': colors.foreground,
      '--comment': colors.comment,
      '--keyword': colors.keyword,
      '--string': colors.string,
      '--function': colors.function,
      '--number': colors.number,
      '--operator': colors.operator,
      '--class': colors.class,
      '--variable': colors.variable,
      '--font-size': `${cardStyle.fontSize}px`,
      '--border-radius': `${cardStyle.borderRadius}px`,
      '--shadow-x': `${cardStyle.shadowOffsetX}px`,
      '--shadow-y': `${cardStyle.shadowOffsetY}px`,
      '--gradient': gradient,
      '--label-bg': labelColors.bg,
      '--label-text': labelColors.text,
    } as React.CSSProperties), [cardStyle, colors, gradient, cardBg, labelColors])

    const cardStyleObj = useMemo<React.CSSProperties>(() => {
      const style: React.CSSProperties = {
        borderRadius: cardStyle.borderRadius,
        boxShadow: `${cardStyle.shadowOffsetX}px ${cardStyle.shadowOffsetY}px 30px rgba(0, 0, 0, 0.3)`,
        fontSize: cardStyle.fontSize,
        background: cardBg,
        transition: 'all 0.2s ease-in-out',
      }

      if (gradient !== 'none') {
        style.background = gradient
      }

      return style
    }, [cardStyle, gradient, cardBg])

    const codeContainerStyle: React.CSSProperties = {
      background: colors.background,
      borderRadius: cardStyle.borderRadius / 2,
      padding: '24px',
      overflow: 'auto',
    }

    return (
      <div className="renderer-container" style={containerStyle}>
        <div className="card-wrapper" ref={ref} style={cardStyleObj}>
          <div className="card-header">
            <div className="window-dots">
              <span className="dot dot-red"></span>
              <span className="dot dot-yellow"></span>
              <span className="dot dot-green"></span>
            </div>
            <span className="language-label">{formatLanguageName(language)}</span>
          </div>
          <div className="code-container" style={codeContainerStyle}>
            <pre
              className="code-pre"
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          </div>
        </div>
      </div>
    )
  })

Renderer.displayName = 'Renderer'
