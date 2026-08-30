import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalComponent } from './modal';
import { Component, signal } from '@angular/core';

@Component({
  standalone: true,
  imports: [ModalComponent],
  template: `
    <app-modal 
      [isOpen]="isOpen()" 
      [title]="'Test Title'" 
      [subtitle]="'Test Subtitle'" 
      [badge]="'TEST'"
      (closed)="onClose()">
      <div modal-actions>
        <button id="custom-action-btn">Custom Action</button>
      </div>
      <p id="modal-inner-content">Modal Content</p>
    </app-modal>
  `
})
class TestHostComponent {
  isOpen = signal<boolean>(true);
  isClosed = false;

  onClose(): void {
    this.isClosed = true;
  }
}

describe('ModalComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let hostComponent: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('powinien wyrenderować modal na pełny ekran z tytułem i zawartością', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.modal-title')?.textContent).toContain('Test Title');
    expect(compiled.querySelector('#modal-inner-content')?.textContent).toContain('Modal Content');
    expect(compiled.querySelector('#custom-action-btn')).toBeTruthy();
  });

  it('powinien wyemitować zdarzenie zamknięcia po kliknięciu przycisku close', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const closeBtn = compiled.querySelector('.modal-close-btn') as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();

    closeBtn.click();
    fixture.detectChanges();

    expect(hostComponent.isClosed).toBe(true);
  });
});
