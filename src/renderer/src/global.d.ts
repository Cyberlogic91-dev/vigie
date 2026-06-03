import type { VigieAPI } from '../../shared/types'

declare global {
  interface Window {
    vigie: VigieAPI
  }
}

export {}
