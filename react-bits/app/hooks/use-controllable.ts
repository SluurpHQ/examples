import * as React from "react"

/**
 * A value a component holds itself unless its caller does: `value` given, the caller's (told of changes by
 * `onChange`); not given, the component's own, starting at `defaultValue`.
 */
export function useControllable<T>(value: T | undefined, defaultValue: T | (() => T), onChange?: (value: T) => void): [T, (next: T) => void] {
  const [own, setOwn] = React.useState(defaultValue)
  const controlled = value !== undefined
  const set = React.useCallback(
    (next: T) => {
      if (!controlled) setOwn(() => next)
      onChange?.(next)
    },
    [controlled, onChange],
  )
  return [controlled ? value : own, set]
}
