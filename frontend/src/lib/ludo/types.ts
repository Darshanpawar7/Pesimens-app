// Port of src/containers/Ludo/state/interfaces.ts + src/state/interfaces.ts

export enum BaseColors {
  RED = 'RED',
  GREEN = 'GREEN',
  BLUE = 'BLUE',
  YELLOW = 'YELLOW',
}

export enum WalkwayPosition {
  NORTH = 'NORTH',
  EAST = 'EAST',
  WEST = 'WEST',
  SOUTH = 'SOUTH',
}

export enum BaseID {
  BASE_1 = 'BASE_1',
  BASE_2 = 'BASE_2',
  BASE_3 = 'BASE_3',
  BASE_4 = 'BASE_4',
}

export enum CellType {
  SPAWN = 'SPAWN',
  STAR = 'STAR',
  HOMEPATH = 'HOMEPATH',
  NORMAL = 'NORMAL',
}

export enum BoardEntities {
  BASE = 'BASE',
  WALKWAY = 'WALKWAY',
  HOME = 'HOME',
}

export interface ICoin {
  isRetired: boolean
  isSpawned: boolean
  coinID: string
  color: BaseColors
  baseID: string
  steps: number
  cellID: string | null
  position: WalkwayPosition | null
}

export interface IBase {
  coinIDs: string[]
  color: BaseColors
  ID: BaseID
  nextTurn: BaseID
  spawnable: boolean
  hasWon: boolean
  enabled: boolean
}

export interface ICell {
  cellID: string
  column: number
  row: number
  position: WalkwayPosition
  cellType: CellType
  baseID: string
  coinIDs: string[]
}

export interface IWalkway {
  position: WalkwayPosition
  ID: string
  baseID: string
}

export interface IRelationship {
  ID: string
  type: BoardEntities
  baseIDs?: string[]
}

export interface IServerGameData {
  bases: IBase[]
  coins: ICoin[]
  walkways: IWalkway[]
  relationships: IRelationship[]
  cells: { [walkwayPosition: string]: { [cellID: string]: ICell } }
  links: { [cellID: string]: { cellID: string; position: WalkwayPosition }[] }
}

export interface ILudoGameState {
  bases: { [baseID: string]: IBase }
  cells: { [walkwayPosition: string]: { [cellID: string]: ICell } }
  coins: { [coinID: string]: ICoin }
  links: { [cellID: string]: { cellID: string; position: WalkwayPosition }[] }
  relationships: IRelationship[]
  walkways: { [walkwayID: string]: IWalkway }
  currentTurn: BaseID
  // Dice state
  diceRoll: number | null
  isDiceRollAllowed: boolean
  isDiceRollValid: boolean
  // UI state
  winner: BaseID | null
  phase: 'setup' | 'playing' | 'finished'
  playerCount: 2 | 3 | 4
  loadError: string | null
}