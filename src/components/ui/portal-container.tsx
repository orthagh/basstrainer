import * as React from "react"

export const PortalContainerContext = React.createContext<HTMLElement | null>(null)

export function usePortalContainer(): HTMLElement | undefined {
  return React.useContext(PortalContainerContext) ?? undefined
}
