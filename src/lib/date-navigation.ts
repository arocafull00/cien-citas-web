export type DateNavigation = (href: string) => void;
export function handleDateNavigation(
  event: React.MouseEvent<HTMLAnchorElement>,
  href: string,
  navigate?: DateNavigation,
) {
  if (
    !navigate ||
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  event.preventDefault();
  navigate(href);
}
