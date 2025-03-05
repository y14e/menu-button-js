type MenuButtonOptions = {
  selector: {
    trigger: string;
    menu: string;
    item: string;
  };
};

class MenuButton {
  root: HTMLElement;
  defaults: MenuButtonOptions;
  settings: MenuButtonOptions;
  trigger: HTMLElement;
  menu: HTMLElement;
  items: NodeListOf<HTMLElement>;
  itemsByInitial: Record<string, HTMLElement[]> = {};

  constructor(root: HTMLElement, options?: Partial<MenuButtonOptions>) {
    this.root = root;
    this.defaults = {
      selector: {
        trigger: '[data-menu-button-trigger]',
        menu: '[role="menu"]',
        item: '[role="menuitem"]',
      },
    };
    this.settings = {
      selector: { ...this.defaults.selector, ...options?.selector },
    };
    const NOT_NESTED = `:not(:scope ${this.settings.selector.item} *)`;
    this.trigger = this.root.querySelector(`${this.settings.selector.trigger}${NOT_NESTED}`) as HTMLElement;
    this.menu = this.root.querySelector(`${this.settings.selector.menu}${NOT_NESTED}`) as HTMLElement;
    this.items = this.root.querySelectorAll(`${this.settings.selector.item}${NOT_NESTED}`);
    if (!this.trigger || !this.menu || !this.items.length) return;
    this.itemsByInitial = {};
    this.initialize();
  }

  private initialize(): void {
    document.addEventListener('mousedown', event => {
      if (!this.root.contains(event.target as HTMLElement)) this.close();
    });
    this.root.addEventListener('focusout', event => this.handleFocusOut(event));
    const id = Math.random().toString(36).slice(-8);
    this.trigger.setAttribute('id', this.trigger.getAttribute('id') || `menu-trigger-${id}`);
    this.menu.setAttribute('id', this.menu.getAttribute('id') || `menu-list-${id}`);
    this.trigger.setAttribute('aria-controls', this.menu.getAttribute('id')!);
    this.trigger.setAttribute('aria-expanded', 'false');
    this.trigger.setAttribute('aria-haspopup', 'true');
    this.trigger.setAttribute('tabindex', '0');
    this.trigger.addEventListener('click', event => this.handleClick(event));
    this.trigger.addEventListener('keydown', event => this.handleTriggerKeyDown(event));
    this.menu.setAttribute('aria-labelledby', this.trigger.getAttribute('id')!);
    this.menu.addEventListener('keydown', event => this.handleMenuKeyDown(event));
    this.items.forEach(item => {
      const initial = item.textContent!.trim().charAt(0).toLowerCase();
      if (/[a-z]/.test(initial)) {
        item.setAttribute('aria-keyshortcuts', initial);
        (this.itemsByInitial[initial] ||= []).push(item);
      }
      item.setAttribute('tabindex', this.isFocusable(item) && [...this.items].filter(this.isFocusable).findIndex(item => item.getAttribute('tabindex') === '0') === -1 ? '0' : '-1');
    });
  }

  private toggle(isOpen: boolean): void {
    if ((this.trigger.getAttribute('aria-expanded') === 'true') === isOpen) return;
    this.trigger.setAttribute('aria-expanded', String(isOpen));
  }

  private isFocusable(element: HTMLElement): boolean {
    return element.getAttribute('aria-disabled') !== 'true' && !element.hasAttribute('disabled');
  }

  private handleFocusOut(event: FocusEvent): void {
    if (this.trigger.getAttribute('aria-expanded') !== 'true') return;
    const target = event.relatedTarget as HTMLElement;
    if (target && !this.root.contains(target)) this.close();
  }

  private handleClick(event: MouseEvent): void {
    event.preventDefault();
    const isOpen = this.trigger.getAttribute('aria-expanded') === 'true';
    this.toggle(!isOpen);
    const focusables = [...this.items].filter(this.isFocusable);
    if (!focusables.length) return;
    if (!isOpen) window.requestAnimationFrame(() => window.requestAnimationFrame(() => focusables[0].focus()));
  }

  private handleTriggerKeyDown(event: KeyboardEvent): void {
    const { key } = event;
    if (![' ', 'Enter', 'ArrowUp', 'ArrowDown', 'Escape'].includes(key)) return;
    event.preventDefault();
    if (!['Escape'].includes(key)) {
      this.open();
      const focusables = [...this.items].filter(this.isFocusable);
      if (!focusables.length) return;
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => focusables[key !== 'ArrowUp' ? 0 : focusables.length - 1].focus()));
      return;
    }
    this.close();
  }

  private handleMenuKeyDown(event: KeyboardEvent): void {
    const { key, shiftKey } = event;
    const isAlpha = (value: string): boolean => /^[a-z]$/i.test(value);
    if (!([' ', 'Enter', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Escape'].includes(key) || (shiftKey && key === 'Tab') || (isAlpha(key) && this.itemsByInitial[key.toLowerCase()]?.filter(this.isFocusable).length))) return;
    event.preventDefault();
    const active = document.activeElement as HTMLElement;
    if ([' ', 'Enter'].includes(key)) {
      active.click();
      return;
    }
    const focusables = [...this.items].filter(this.isFocusable);
    if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key)) {
      const currentIndex = focusables.indexOf(active);
      const length = focusables.length;
      let newIndex = currentIndex;
      switch (key) {
        case 'ArrowUp':
          newIndex = (currentIndex - 1 + length) % length;
          break;
        case 'ArrowDown':
          newIndex = (currentIndex + 1) % length;
          break;
        case 'Home':
          newIndex = 0;
          break;
        case 'End':
          newIndex = length - 1;
          break;
      }
      focusables[newIndex].focus();
      return;
    }
    if (isAlpha(key)) {
      const focusablesByInitial = this.itemsByInitial[key.toLowerCase()].filter(this.isFocusable);
      const index = focusablesByInitial.findIndex(item => focusables.indexOf(item) > focusables.indexOf(active));
      focusablesByInitial[index !== -1 ? index : 0].focus();
      return;
    }
    this.close();
  }

  open(): void {
    this.toggle(true);
  }

  close(): void {
    this.toggle(false);
    if (this.root.contains(document.activeElement)) this.trigger.focus();
  }
}

export default MenuButton;
