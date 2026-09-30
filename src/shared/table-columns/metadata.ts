export interface TableColumnDefinition<Id extends string = string> {
  readonly id: Id
  readonly label: string
  readonly defaultVisible: boolean
  readonly hideable: boolean
  readonly reorderable: boolean
}
