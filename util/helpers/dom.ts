export function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw Error(`Required element #${id} was not found`);
  return element as T;
}
