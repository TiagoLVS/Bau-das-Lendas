// Foco e isolamento de diálogos; não controla animações nem dados da aplicação.
export function containDialogFocus(dialog, { onEscape, initialFocus, restoreFocus = true } = {}) {
  const previous = document.activeElement;
  const isolated = [];
  let branch = dialog;
  while (branch.parentElement) {
    const parent = branch.parentElement;
    for (const sibling of parent.children) {
      if (sibling === branch || !(sibling instanceof HTMLElement)) continue;
      isolated.push([sibling, sibling.inert]);
      sibling.inert = true;
    }
    // Um diálogo aninhado isola somente o conteúdo do diálogo externo.
    if (parent.matches('[role="dialog"][aria-modal="true"]')) break;
    branch = parent;
  }
  const focusable = () => [...dialog.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]')]
    .filter(el => el.tabIndex >= 0 && !el.disabled && !el.closest('[inert],[hidden],[aria-hidden="true"]') &&
      el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
  const keydown = event => {
    if (dialog.hidden || dialog.closest('[inert]')) return;
    if (event.key === 'Escape' && onEscape) {
      event.preventDefault(); event.stopPropagation(); onEscape();
    } else if (event.key === 'Tab') {
      const nodes = focusable(), first = nodes[0], last = nodes.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (!dialog.contains(document.activeElement) || event.shiftKey && document.activeElement === first) {
        event.preventDefault(); (event.shiftKey ? last : first).focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
      event.stopPropagation();
    }
  };
  dialog.addEventListener('keydown', keydown);
  if (initialFocus) initialFocus.focus({preventScroll:true});
  else if (!dialog.contains(document.activeElement)) focusable()[0]?.focus({preventScroll:true});
  let closed = false;
  return () => {
    if (closed) return;
    closed = true; dialog.removeEventListener('keydown', keydown);
    for (const [node, inert] of isolated) node.inert = inert;
    if (restoreFocus && previous?.isConnected && !previous.closest('[inert]')) previous.focus({preventScroll:true});
  };
}
