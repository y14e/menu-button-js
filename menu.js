class Menu {
  static hasOpen = {};

  constructor(root, options) {
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
    const NOT_NESTED = `:not(:scope ${this.settings.selector.item} *)`;
    this.buttonElement = this.rootElement.querySelector(`${this.settings.selector.button}${NOT_NESTED}`);
    this.listElement = this.rootElement.querySelector(`${this.settings.selector.list}${NOT_NESTED}`);
    this.itemElements = this.rootElement.querySelectorAll(`${this.settings.selector.item}${NOT_NESTED}`);
    if (!this.listElement || !this.itemElements.length) return;
    this.itemsByInitial = {};
    if (this.name && this.isFocusable(this.buttonElement)) Menu.hasOpen[this.name] ||= false;
    this.initialize();
  }

  initialize() {
    document.addEventListener('mousedown', event => {
      if (!this.rootElement.contains(event.target)) this.handleOutsideMouseDown();
    });
    this.rootElement.addEventListener('focusout', event => this.handleRootFocusOut(event));
    if (this.buttonElement) {
      const id = Math.random().toString(36).slice(-8);
      this.buttonElement.setAttribute('id', this.buttonElement.getAttribute('id') || `menu-button-${id}`);
      this.listElement.setAttribute('id', this.listElement.getAttribute('id') || `menu-list-${id}`);
      this.buttonElement.setAttribute('aria-controls', this.listElement.getAttribute('id'));
      this.buttonElement.setAttribute('aria-expanded', 'false');
      this.buttonElement.setAttribute('aria-haspopup', 'true');
      this.buttonElement.setAttribute('tabindex', this.isFocusable(this.buttonElement) ? '0' : '-1');
      if (!this.isFocusable(this.buttonElement)) this.buttonElement.style.setProperty('pointer-events', 'none');
      this.buttonElement.addEventListener('pointerover', event => this.handleButtonPointerOver(event));
      this.buttonElement.addEventListener('click', event => this.handleButtonClick(event));
      this.buttonElement.addEventListener('keydown', event => this.handleButtonKeyDown(event));
      this.listElement.setAttribute('aria-labelledby', this.buttonElement.getAttribute('id'));
    }
    this.listElement.addEventListener('keydown', event => this.handleListKeyDown(event));
    this.itemElements.forEach(item => {
      const initial = item.textContent.trim().charAt(0).toLowerCase();
      if (/[a-z]/.test(initial)) {
        item.setAttribute('aria-keyshortcuts', initial);
        (this.itemsByInitial[initial] ||= []).push(item);
      }
    });
    this.resetTabIndex();
    this.rootElement.setAttribute('data-menu-initialized', '');
  }

  toggle(isOpen) {
    if (!this.buttonElement || (this.buttonElement.getAttribute('aria-expanded') === 'true') === isOpen) return;
    if (this.name) Menu.hasOpen[this.name] = isOpen;
    this.buttonElement.setAttribute('aria-expanded', String(isOpen));
  }

  resetTabIndex() {
    this.itemElements.forEach(item => item.removeAttribute('tabindex'));
    this.itemElements.forEach(item => item.setAttribute('tabindex', this.isFocusable(item) && [...this.itemElements].filter(this.isFocusable).findIndex(item => item.getAttribute('tabindex') === '0') === -1 ? '0' : '-1'));
  }

  isFocusable(element) {
    return element.getAttribute('aria-disabled') !== 'true' && !element.hasAttribute('disabled');
  }

  handleOutsideMouseDown() {
    if (!this.buttonElement) return;
    this.close();
  }

  handleRootFocusOut(event) {
    if (this.buttonElement && this.buttonElement.getAttribute('aria-expanded') !== 'true') return;
    if (!this.rootElement.contains(event.relatedTarget)) {
      if (this.buttonElement) {
        this.close();
      } else {
        this.resetTabIndex();
      }
    }
  }

  handleButtonPointerOver(event) {
    if (event.pointerType !== 'mouse') return;
    if (this.name && Menu.hasOpen[this.name]) {
      this.buttonElement.focus();
      this.open();
    }
  }

  handleButtonClick(event) {
    event.preventDefault();
    const isOpen = this.buttonElement.getAttribute('aria-expanded') === 'true';
    this.toggle(!isOpen);
    const focusables = [...this.itemElements].filter(this.isFocusable);
    if (!focusables.length) return;
    if (!isOpen) window.requestAnimationFrame(() => window.requestAnimationFrame(() => focusables[0].focus()));
  }

  handleButtonKeyDown(event) {
    const { key } = event;
    if (![' ', 'Enter', 'ArrowUp', 'ArrowDown', 'Escape'].includes(key)) return;
    event.preventDefault();
    if (!['Escape'].includes(key)) {
      this.open();
      const focusables = [...this.itemElements].filter(this.isFocusable);
      if (!focusables.length) return;
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => focusables[key !== 'ArrowUp' ? 0 : focusables.length - 1].focus()));
      return;
    }
    this.close();
  }

  handleListKeyDown(event) {
    const { key, shiftKey } = event;
    if (!this.buttonElement && shiftKey && key === 'Tab') return;
    const isAlpha = value => /^[a-z]$/i.test(value);
    if (!([' ', 'Enter', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Escape'].includes(key) || (shiftKey && key === 'Tab') || (isAlpha(key) && this.itemsByInitial[key.toLowerCase()]?.filter(this.isFocusable).length))) return;
    event.preventDefault();
    const active = document.activeElement;
    if ([' ', 'Enter'].includes(key)) {
      active.click();
      return;
    }
    const focusableItems = [...this.itemElements].filter(this.isFocusable);
    if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key)) {
      const currentIndex = focusableItems.indexOf(active);
      const length = focusableItems.length;
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
    const nonDisabledItemsByInitial = this.itemsByInitial[key.toLowerCase()].filter(this.isFocusable);
    const index = nonDisabledItemsByInitial.findIndex(item => focusableItems.indexOf(item) > focusableItems.indexOf(active));
    nonDisabledItemsByInitial[index !== -1 ? index : 0].focus();
  }

  open() {
    this.toggle(true);
  }

  close() {
    this.toggle(false);
    if (this.buttonElement && this.rootElement.contains(document.activeElement)) this.buttonElement.focus();
  }
}

export default Menu;
