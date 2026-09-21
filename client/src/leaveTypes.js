// Fallback names when /api/balances hasn't loaded (ids match the seeded leave_types).
export const DEFAULT_LEAVE_TYPES = [
  { id: 1, name: 'Annual' },
  { id: 2, name: 'Casual' },
  { id: 3, name: 'Sick' },
];

export function typeName(types, id) {
  const list = types && types.length ? types : DEFAULT_LEAVE_TYPES;
  return list.find((t) => Number(t.id) === Number(id))?.name || `Type ${id}`;
}
