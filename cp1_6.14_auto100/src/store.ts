import React, { createContext, useContext, useReducer, ReactNode, useCallback } from 'react'

export type ElementType = 'text' | 'branch' | 'condition'

export interface BranchOption {
  id: string
  label: string
  targetCardId: string
}

export interface CanvasElement {
  id: string
  type: ElementType
  x: number
  y: number
  width: number
  height: number
  content?: string
  branches?: BranchOption[]
  condition?: string
  targetCardId?: string
}

export interface Card {
  id: string
  title: string
  summary: string
  elements: CanvasElement[]
}

export interface Variable {
  id: string
  name: string
  initialValue: string
}

export interface AppState {
  cards: Card[]
  variables: Variable[]
  selectedCardId: string | null
  selectedElementId: string | null
  isPreviewMode: boolean
  previewCurrentCardId: string | null
}

export type Action =
  | { type: 'ADD_CARD' }
  | { type: 'DELETE_CARD'; cardId: string }
  | { type: 'SELECT_CARD'; cardId: string }
  | { type: 'UPDATE_CARD'; cardId: string; patch: Partial<Card> }
  | { type: 'SELECT_ELEMENT'; elementId: string | null }
  | { type: 'ADD_ELEMENT'; element: CanvasElement }
  | { type: 'UPDATE_ELEMENT'; elementId: string; patch: Partial<CanvasElement> }
  | { type: 'DELETE_ELEMENT'; elementId: string }
  | { type: 'ADD_VARIABLE' }
  | { type: 'UPDATE_VARIABLE'; variableId: string; patch: Partial<Variable> }
  | { type: 'DELETE_VARIABLE'; variableId: string }
  | { type: 'TOGGLE_PREVIEW'; startCardId?: string | null }
  | { type: 'SET_PREVIEW_CARD'; cardId: string }
  | { type: 'EXIT_PREVIEW' }
  | { type: 'IMPORT_STATE'; state: AppState }

const uid = (): string => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

const makeCard = (index: number): Card => ({
  id: uid(),
  title: `第 ${index} 章`,
  summary: '点击编辑，添加叙事内容',
  elements: []
})

const initialState: AppState = (() => {
  const starter = makeCard(1)
  starter.summary = '故事的开端，双击此处编辑摘要'
  starter.elements = [{
    id: uid(),
    type: 'text',
    x: 40,
    y: 40,
    width: 320,
    height: 160,
    content: '欢迎来到 StorySlate！\n\n双击此文本框开始编辑你的故事。\n从上方工具栏拖拽分支选项，即可创建互动分支。'
  }]
  return {
    cards: [starter],
    variables: [
      { id: uid(), name: '好感度', initialValue: '0' },
      { id: uid(), name: '血量', initialValue: '100' }
    ],
    selectedCardId: starter.id,
    selectedElementId: null,
    isPreviewMode: false,
    previewCurrentCardId: null
  }
})()

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_CARD': {
      const idx = state.cards.length + 1
      const card = makeCard(idx)
      return {
        ...state,
        cards: [...state.cards, card],
        selectedCardId: card.id
      }
    }
    case 'DELETE_CARD': {
      const cards = state.cards.filter(c => c.id !== action.cardId)
      let selected = state.selectedCardId === action.cardId ? null : state.selectedCardId
      if (!selected && cards.length > 0) {
        selected = cards[0].id
      }
      return { ...state, cards, selectedCardId: selected, selectedElementId: null }
    }
    case 'SELECT_CARD':
      return { ...state, selectedCardId: action.cardId, selectedElementId: null }
    case 'UPDATE_CARD':
      return {
        ...state,
        cards: state.cards.map(c =>
          c.id === action.cardId ? { ...c, ...action.patch } : c
        )
      }
    case 'SELECT_ELEMENT':
      return { ...state, selectedElementId: action.elementId }
    case 'ADD_ELEMENT':
      return {
        ...state,
        cards: state.cards.map(c =>
          c.id === state.selectedCardId
            ? { ...c, elements: [...c.elements, action.element] }
            : c
        ),
        selectedElementId: action.element.id
      }
    case 'UPDATE_ELEMENT':
      return {
        ...state,
        cards: state.cards.map(c =>
          c.id === state.selectedCardId
            ? {
                ...c,
                elements: c.elements.map(el =>
                  el.id === action.elementId ? { ...el, ...action.patch } : el
                )
              }
            : c
        )
      }
    case 'DELETE_ELEMENT':
      return {
        ...state,
        cards: state.cards.map(c =>
          c.id === state.selectedCardId
            ? { ...c, elements: c.elements.filter(el => el.id !== action.elementId) }
            : c
        ),
        selectedElementId: state.selectedElementId === action.elementId ? null : state.selectedElementId
      }
    case 'ADD_VARIABLE': {
      const v: Variable = { id: uid(), name: `变量${state.variables.length + 1}`, initialValue: '0' }
      return { ...state, variables: [...state.variables, v] }