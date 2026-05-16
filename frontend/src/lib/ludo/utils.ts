import type React from 'react'
import { BASE_COLORS, CELL_DIMENSION } from './constants'
import { BaseColors, WalkwayPosition } from './types'

export const mapByProperty = <T>(arr: T[], prop: keyof T): Record<string, T> => {
  const map: Record<string, T> = {}
  arr.forEach((item) => { map[item[prop] as string] = item })
  return map
}

export const flatArray = <T>(arr: T[][]): T[] =>
  arr.reduce((acc, val) => acc.concat(val), [] as T[])

export const getBaseHexColor = (color: BaseColors): string =>
  BASE_COLORS[color] ?? '#888'

export const getStyleObject = (
  widthCells: number,
  heightCells: number,
  color?: BaseColors,
): React.CSSProperties => ({
  width:  `${widthCells  * CELL_DIMENSION}px`,
  height: `${heightCells * CELL_DIMENSION}px`,
  backgroundColor: color ? getBaseHexColor(color) : undefined,
})

export const generateCellID = (
  position: WalkwayPosition,
  row: number,
  column: number,
): string => `${position}_${row}_${column}`
