import { Component, input, output, HostListener, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.html',
  styleUrl: './modal.css'
})
export class ModalComponent {
  readonly isOpen = input<boolean>(false);
  readonly title = input<string>('');
  readonly subtitle = input<string>('');
  readonly badge = input<string>('');
  readonly showClose = input<boolean>(true);
  readonly showIndicator = input<boolean>(true);

  readonly closed = output<void>();

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });
  }

  @HostListener('window:keydown.escape', ['$event'])
  onEscape(event?: Event): void {
    if (this.isOpen()) {
      event?.preventDefault();
      this.closeModal();
    }
  }

  closeModal(): void {
    this.closed.emit();
  }
}
