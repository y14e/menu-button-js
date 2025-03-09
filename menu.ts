type MenuOptions = {
  selector: {
    button: string;
    list: string;
    item: string;
  };
};

class Menu {
  rootElement: HTMLElement;
  name?: string;
  defaults: MenuOptions;
  settings: MenuOptions;
  buttonElement: HTMLElement;
  listElement: HTMLElement;
  itemElements: NodeListOf<HTMLElement>;
  itemElementsByInitial!: Record<string, HTMLElement[]>;

  static hasOpen: Record<string, boolean> = {};

  constructor(root: HTMLElement, options?: Partial<MenuOptions>) {
    this.rootElement = root;
    if (this.rootElement.hasAttribute('data-menu-name')) this.name = this.rootElement.getAttribute('data-menu-name') || '';
    this.defaults = {
      selector: {
        button: '[data-menu-button]',
        list: '[role="menu"]',
        item: '[role="menuitem"]',
      },
    };
    this.settings = {
      selector: { ...this.defaults.selector, ...options?.selector },
    };
    this.buttonElement = this.rootElement.querySelector(this.settings.selector.button) as HTMLElement;
    this.listElement = this.rootElement.querySelector(this.settings.selector.list) as HTMLElement;
    this.itemElements = this.rootElement.querySelectorAll(this.settings.selector.item);
    if (!this.listElement || !this.itemElements.length) return;
    this.itemElementsByInitial = {};
    if (this.name && this.isFocusable(this.buttonElement)) Menu.hasOpen[this.name] ||= false;
    this.initialize();
  }

  private initialize(): void {
    document.addEventListener('pointerdown', event => {
      if (!this.rootElement.contains(event.target as HTMLElement)) this.handleOutsidePointerDown();
    });
    this.rootElement.addEventListener('focusout', event => this.handleRootFocusOut(event));
    if (this.buttonElement) {
      let id = Math.random().toString(36).slice(-8);
      this.buttonElement.setAttribute('id', this.buttonElement.getAttribute('id') || `menu-button-${id}`);
      this.listElement.setAttribute('id', this.listElement.getAttribute('id') || `menu-list-${id}`);
      this.buttonElement.setAttribute('aria-controls', this.listElement.getAttribute('id')!);
      this.buttonElement.setAttribute('aria-expanded', 'false');
      this.buttonElement.setAttribute('aria-haspopup', 'true');
      this.buttonElement.setAttribute('tabindex', this.isFocusable(this.buttonElement) ? '0' : '-1');
      if (!this.isFocusable(this.buttonElement)) this.buttonElement.style.setProperty('pointer-events', 'none');
      this.buttonElement.addEventListener('pointerover', event => this.handleButtonPointerOver(event));
      this.buttonElement.addEventListener('click', event => this.handleButtonClick(event));
      this.buttonElement.addEventListener('keydown', event => this.handleButtonKeyDown(event));
      this.listElement.setAttribute('aria-labelledby', this.buttonElement.getAttribute('id')!);
    }
    this.listElement.addEventListener('keydown', event => this.handleListKeyDown(event));
    this.itemElements.forEach(item => {
      let initial = item.textContent!.trim().charAt(0).toLowerCase();
      if (/[a-z]/.test(initial)) {
        item.setAttribute('aria-keyshortcuts', initial);
        (this.itemElementsByInitial[initial] ||= []).push(item);
      }
    });
    this.resetTabIndex();
    this.rootElement.setAttribute('data-menu-initialized', '');
  }

  private isFocusable(element: HTMLElement): boolean {
    return element.getAttribute('aria-disabled') !== 'true' && !element.hasAttribute('disabled');
  }

  private resetTabIndex(): void {
    this.itemElements.forEach(item => item.removeAttribute('tabindex'));
    this.itemElements.forEach(item => item.setAttribute('tabindex', this.isFocusable(item) && [...this.itemElements].filter(this.isFocusable).findIndex(item => item.getAttribute('tabindex') === '0') === -1 ? '0' : '-1'));
  }

  private toggle(isOpen: boolean): void {
    if (this.name) Menu.hasOpen[this.name] = isOpen;
    this.buttonElement.setAttribute('aria-expanded', String(isOpen));
  }
  private handleOutsidePointerDown(): void {
    if (!this.buttonElement) return;
    this.close();
  }

  private handleRootFocusOut(event: FocusEvent): void {
    if (this.buttonElement && this.buttonElement.getAttribute('aria-expanded') !== 'true') return;
    if (!this.rootElement.contains(event.relatedTarget as HTMLElement)) {
      if (this.buttonElement) {
        this.close();
      } else {
        this.resetTabIndex();
      }
    }
  }

  private handleButtonPointerOver(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || !this.name || !Menu.hasOpen[this.name]) return;
    this.buttonElement.focus();
    this.open();
  }

  private handleButtonClick(event: MouseEvent): void {
    event.preventDefault();
    let isOpen = this.buttonElement.getAttribute('aria-expanded') === 'true';
    this.toggle(!isOpen);
    let focusableItems = [...this.itemElements].filter(this.isFocusable);
    if (!focusableItems.length) return;
    if (!isOpen) window.requestAnimationFrame(() => window.requestAnimationFrame(() => focusableItems[0].focus()));
  }

  private handleButtonKeyDown(event: KeyboardEvent): void {
    let { key } = event;
    if (![' ', 'Enter', 'ArrowUp', 'ArrowDown', 'Escape'].includes(key)) return;
    event.preventDefault();
    if (!['Escape'].includes(key)) {
      this.open();
      let focusableItems = [...this.itemElements].filter(this.isFocusable);
      if (!focusableItems.length) return;
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => focusableItems[key !== 'ArrowUp' ? 0 : focusableItems.length - 1].focus()));
      return;
    }
    this.close();
  }

  private handleListKeyDown(event: KeyboardEvent): void {
    let { key, shiftKey } = event;
    if (!this.buttonElement && shiftKey && key === 'Tab') return;
    let isAlpha = (value: string): boolean => /^[a-z]$/i.test(value);
    if (!([' ', 'Enter', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Escape'].includes(key) || (shiftKey && key === 'Tab') || (isAlpha(key) && this.itemElementsByInitial[key.toLowerCase()]?.filter(this.isFocusable).length))) return;
    event.preventDefault();
    let active = document.activeElement as HTMLElement;
    if ([' ', 'Enter'].includes(key)) {
      active.click();
      return;
    }
    let focusableItems = [...this.itemElements].filter(this.isFocusable);
    if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key)) {
      let currentIndex = focusableItems.indexOf(active);
      let length = focusableItems.length;
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
      if (!this.buttonElement) {
        focusableItems[currentIndex].setAttribute('tabindex', '-1');
        focusableItems[newIndex].setAttribute('tabindex', '0');
      }
      focusableItems[newIndex].focus();
      return;
    }
    if (['Tab', 'Escape'].includes(key)) {
      this.close();
      return;
    }
    let focusableItemsByInitial = this.itemElementsByInitial[key.toLowerCase()].filter(this.isFocusable);
    let index = focusableItemsByInitial.findIndex(item => focusableItems.indexOf(item) > focusableItems.indexOf(active));
    focusableItemsByInitial[index !== -1 ? index : 0].focus();
  }

  open(): void {
    if (!this.buttonElement || this.buttonElement.getAttribute('aria-expanded') === 'true') return;
    this.toggle(true);
  }

  close(): void {
    if (!this.buttonElement || this.buttonElement.getAttribute('aria-expanded') !== 'true') return;
    this.toggle(false);
    if (this.buttonElement && this.rootElement.contains(document.activeElement)) this.buttonElement.focus();
  }
}

export default Menu;
