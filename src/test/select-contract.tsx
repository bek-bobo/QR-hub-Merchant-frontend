import type { SelectProps } from '@/components/ui/select'

// Server-rendered feature tests inspect the option/value contract, rather than
// expecting a closed Radix portal to render its options on the server. The real
// primitive, keyboard interaction and portal are covered by select.test.tsx and
// feature lifecycle tests; this test-only native control is never shipped.
export function SelectContract(props: SelectProps) {
  return <select id={props.id} name={props.name} form={props.form}
    value={props.value} defaultValue={props.defaultValue} disabled={props.disabled}
    required={props.required} className={props.className} data-slot="select"
    aria-label={props['aria-label']} aria-invalid={props['aria-invalid']}
    aria-describedby={props['aria-describedby']}
    onChange={(event) => props.onChange?.(event)}>{props.children}</select>
}
