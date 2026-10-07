import { act } from 'react'

export async function openSelect(trigger: HTMLElement) {
  await act(async () => {
    trigger.focus()
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
  })
}

export async function chooseSelectOption(trigger: HTMLElement, value: string) {
  await openSelect(trigger)
  const option = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'))
    .find((item) => item.dataset.value === value)
  if (!option) throw new Error(`Missing select option: ${value}`)
  if (option.getAttribute('aria-disabled') === 'true') throw new Error(`Disabled select option: ${value}`)
  await act(async () => {
    option.focus()
    option.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
  })
}
